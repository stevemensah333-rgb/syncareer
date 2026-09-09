import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for all DB writes (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Anon client only for auth token verification
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { reference, plan } = body;

    // Validate reference format
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referencePattern = /^[a-zA-Z0-9_-]{1,100}$/;
    if (!referencePattern.test(reference)) {
      return new Response(JSON.stringify({ error: "Invalid reference format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate plan parameter
    const validPlans = ["monthly", "yearly"] as const;
    if (plan && !validPlans.includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate reference — return early with success if already processed
    const { data: existingPayment } = await serviceClient
      .from("payments")
      .select("id, status")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (existingPayment?.status === "success") {
      // Still ensure subscription is premium (idempotent fix)
      await serviceClient
        .from("subscriptions")
        .update({ tier: "premium", status: "active" })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ status: "success", message: "Payment already verified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with Paystack API
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } }
    );

    if (!verifyRes.ok) {
      console.error("Paystack verify failed:", verifyRes.status);
      return new Response(
        JSON.stringify({ error: "Paystack verification failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyData = await verifyRes.json();
    const txData = verifyData.data;

    if (!txData || txData.status !== "success") {
      // Record failed payment
      await serviceClient.from("payments").upsert(
        {
          user_id: user.id,
          email: user.email || "",
          amount: txData?.amount || 0,
          currency: txData?.currency || "GHS",
          status: "failed",
          paystack_reference: reference,
          payment_method: txData?.channel || "unknown",
          metadata: txData || {},
        },
        { onConflict: "paystack_reference" }
      );

      return new Response(
        JSON.stringify({ status: "failed", message: "Payment was not successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Record successful payment ────────────────────────────────
    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .upsert(
        {
          user_id: user.id,
          email: txData.customer?.email || user.email || "",
          amount: txData.amount,
          currency: txData.currency || "GHS",
          status: "success",
          paystack_reference: reference,
          payment_method: txData.channel || "card",
          metadata: {
            paystack_id: txData.id,
            paid_at: txData.paid_at,
            plan: plan || "monthly",
            plan_code: txData.plan_object?.plan_code || null,
            authorization: txData.authorization
              ? {
                  channel: txData.authorization.channel,
                  card_type: txData.authorization.card_type,
                  bank: txData.authorization.bank,
                  brand: txData.authorization.brand,
                }
              : null,
          },
        },
        { onConflict: "paystack_reference" }
      )
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Calculate subscription period ───────────────────────────
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // ── Upsert subscription to premium IMMEDIATELY ───────────────
    // Uses service role key so it bypasses RLS restrictions on subscriptions table
    const { error: subError } = await serviceClient
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          tier: "premium",
          status: "active",
          payment_id: payment.id,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (subError) {
      console.error("Subscription upsert error:", subError);
      // Still return success since payment was recorded — we can fix sub manually
      return new Response(
        JSON.stringify({ error: "Payment recorded but subscription update failed. Contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send in-app premium activation notification ──────────────
    await serviceClient.from("notifications").insert({
      user_id: user.id,
      title: "Premium Activated",
      message: `Your Syncareer Premium (${plan === "yearly" ? "Annual" : "Monthly"}) plan is now active. Enjoy unlimited access to all features.`,
      type: "system",
      category: "subscription",
      priority: "high",
      link: "/settings",
    }).catch((e: any) => console.warn("Notification insert failed:", e));

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Payment verified and subscription activated",
        subscription: {
          tier: "premium",
          status: "active",
          period_end: periodEnd.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Verify payment error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
