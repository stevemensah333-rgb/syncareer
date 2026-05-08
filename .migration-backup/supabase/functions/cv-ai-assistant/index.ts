import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("CV AI request from user:", userId);

    // ── Rate limiting ─────────────────────────────────────────────
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    const isPremium =
      subscription?.tier === "premium" &&
      subscription?.status === "active" &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

    if (!isPremium) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const { data: usageRow } = await supabase
        .from("usage_logs")
        .select("usage_count")
        .eq("user_id", userId)
        .eq("feature_key", "cv_ai_assist")
        .eq("month", month)
        .maybeSingle();

      const used = usageRow?.usage_count ?? 0;
      const limit = 20;
      if (used >= limit) {
        return new Response(
          JSON.stringify({
            error: "limit_reached",
            message: `You have used all ${limit} CV AI suggestions for this month. Upgrade to Premium for unlimited access.`,
            used,
            limit,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { prompt, cvData, section } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional CV/resume writing assistant on the Syncareer platform. Your job is to help students create compelling, professional CVs that follow best practices.

SCOPE ENFORCEMENT — CRITICAL:
You are strictly scoped to CV and resume writing assistance only. If the user asks anything unrelated to CV writing, resume improvement, or professional profile content, respond with:
"I'm only able to assist with CV and resume writing. That's outside my scope. I'm here to help you craft compelling professional content for your resume."

Current section being edited: ${section}

Guidelines:
- Use strong action verbs (e.g., Developed, Led, Implemented, Increased, Designed)
- Quantify achievements with numbers when possible
- Keep bullet points concise but impactful
- Focus on results and impact, not just responsibilities
- Tailor content to be relevant for job applications
- Use professional language appropriate for academic/professional settings

The CV is for a student applying to jobs/internships. Keep suggestions practical and achievable.`;

    const userMessage = `
Here is the current CV data:
${JSON.stringify(cvData, null, 2)}

User request: ${prompt}

Please provide 3-5 specific, actionable suggestions. Format each suggestion as a complete sentence or bullet point that the user can directly use in their CV.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse suggestions from the response
    const suggestions = content
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .filter((line: string) => !line.startsWith('#') && !line.startsWith('##'))
      .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line: string) => line.length > 10)
      .slice(0, 5);

    // ── Increment usage (fire-and-forget) ─────────────────────────
    if (!isPremium) {
      (async () => {
        try {
          const now = new Date();
          const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const { data: existing } = await serviceSupabase
            .from("usage_logs")
            .select("id, usage_count")
            .eq("user_id", userId)
            .eq("feature_key", "cv_ai_assist")
            .eq("month", month)
            .maybeSingle();
          if (existing) {
            await serviceSupabase
              .from("usage_logs")
              .update({ usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await serviceSupabase
              .from("usage_logs")
              .insert({ user_id: userId, feature_key: "cv_ai_assist", month, usage_count: 1 });
          }
        } catch (e) {
          console.error("Failed to log cv_ai_assist usage:", e);
        }
      })();
    }

    return new Response(
      JSON.stringify({ suggestions, rawContent: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CV AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
