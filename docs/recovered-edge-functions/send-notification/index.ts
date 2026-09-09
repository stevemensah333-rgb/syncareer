import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps notification category string to the notification_preferences column name
const CATEGORY_PREF_MAP: Record<string, string> = {
  application: "application_updates",
  interview: "interview_reminders",
  booking: "counsellor_bookings",
  system: "system_announcements",
  marketing: "marketing_emails",
};

interface NotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message: string;
  category?: string;
  link?: string;
  priority?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client for caller verification
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = body as NotificationRequest;

    if (!payload.user_id || !payload.title || !payload.message || !payload.type) {
      return new Response(
        JSON.stringify({ error: "user_id, type, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: users can only send notifications to themselves
    // unless they have an admin role
    if (payload.user_id !== user.id) {
      // Use service role client to check admin role
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: isAdmin } = await adminClient.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Not authorized to send notifications to other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate field lengths
    if (payload.title.length > 200 || payload.message.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Title max 200 chars, message max 1000 chars" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const category = payload.category || "general";
    const priority = payload.priority || "normal";

    // Use service role client for cross-user operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch recipient's notification preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    // Default preferences if none exist
    const userPrefs = prefs || {
      email_enabled: true,
      push_enabled: true,
      application_updates: true,
      interview_reminders: true,
      counsellor_bookings: true,
      system_announcements: true,
      marketing_emails: false,
      weekly_digest: false,
    };

    // Check if the category is enabled for this user
    const prefKey = CATEGORY_PREF_MAP[payload.type] || CATEGORY_PREF_MAP[category];
    const categoryEnabled = prefKey ? (userPrefs as Record<string, boolean>)[prefKey] !== false : true;

    let inAppCreated = false;
    let emailSent = false;

    // Create in-app notification if push is enabled AND category is enabled
    if (userPrefs.push_enabled && categoryEnabled) {
      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: payload.user_id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          category,
          priority,
          link: payload.link || null,
        });

      if (insertError) {
        console.error("[send-notification] Insert error:", insertError);
      } else {
        inAppCreated = true;
      }
    }

    // Send email notification if email is enabled AND category is enabled
    if (userPrefs.email_enabled && categoryEnabled) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        // Fetch recipient's email from auth.users
        const { data: recipientUser } = await supabaseAdmin.auth.admin.getUserById(payload.user_id);

        if (recipientUser?.user?.email) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Syncareer <no-reply@syncareer.me>",
                to: [recipientUser.user.email],
                subject: payload.title,
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <h2 style="color: #1a1a1a; margin-bottom: 16px;">${escapeHtml(payload.title)}</h2>
                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        ${escapeHtml(payload.message)}
                      </p>
                      ${payload.link ? `
                        <a href="https://syncareer.lovable.app${escapeHtml(payload.link)}" 
                           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
                          View Details
                        </a>
                      ` : ''}
                      <p style="color: #888; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
                        You received this email because you have email notifications enabled on Syncareer. 
                        You can manage your notification preferences in Settings.
                      </p>
                    </div>
                  </body>
                  </html>
                `,
              }),
            });

            if (emailRes.ok) {
              emailSent = true;
              console.log("[send-notification] Email sent to:", recipientUser.user.email);
            } else {
              const errText = await emailRes.text();
              console.error("[send-notification] Resend error:", errText);
            }
          } catch (emailErr) {
            console.error("[send-notification] Email send failed:", emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        in_app_created: inAppCreated,
        email_sent: emailSent,
        category_enabled: categoryEnabled,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
