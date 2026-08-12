// SynAI career guidance edge function.
//
// v2 (current): bounded contextual assistant. Validated JSON in, validated JSON
//   out, server-side auth + entitlement + durable per-request idempotency.
// v1 (legacy):  generic messages/userContext SSE stream. Retained for
//   HISTORICAL COMPATIBILITY only. No live caller has been observed in the
//   retained log window and the frontend no longer sends it. Remove after
//   2026-09-30 if the invocation logs still show no v1 traffic.

import { createClient } from "npm:@supabase/supabase-js@2";
import { QUOTA_FEATURE_KEY, type AssistantTask, type Proposal } from "./contract.ts";
import { handleV2, type Deps, type LogEntry, type QuotaState } from "./handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const AI_MODEL = "google/gemini-2.5-flash";

function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Calls the deployed check-feature-access function; its quota model is authoritative. */
async function featureAccess(token: string, increment: boolean): Promise<QuotaState> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-feature-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ feature_key: QUOTA_FEATURE_KEY, increment }),
  });
  if (!response.ok) {
    // Fail closed: an unavailable entitlement service must not grant access.
    return { allowed: false, used: 0, limit: null, isPremium: false };
  }
  const data = await response.json().catch(() => ({}));
  return {
    allowed: data?.allowed !== false,
    used: typeof data?.used === "number" ? data.used : 0,
    limit: typeof data?.limit === "number" ? data.limit : null,
    isPremium: data?.is_premium === true,
  };
}

const deps: Deps = {
  async verifyUser(token) {
    if (!token) return null;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return { userId: data.user.id };
  },

  checkQuota: (token) => featureAccess(token, false),
  consumeQuota: (token) => featureAccess(token, true),

  async reserve(userId: string, requestId: string, task: AssistantTask) {
    const client = serviceClient();
    const { error } = await client
      .from("assistant_requests")
      .insert({ user_id: userId, request_id: requestId, task, status: "reserved" });
    if (!error) return { state: "reserved" as const };
    // 23505 = unique violation on (user_id, request_id): this exact user has
    // already sent this request. Another user's request id is a different row.
    if (error.code !== "23505") return { state: "unavailable" as const };

    const { data } = await client
      .from("assistant_requests")
      .select("status, proposal")
      .eq("user_id", userId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (data?.status === "completed" && data.proposal) {
      return { state: "completed" as const, proposal: data.proposal as Proposal };
    }
    if (data?.status === "failed") {
      // A previously released reservation may be retried.
      const { error: retryError } = await client
        .from("assistant_requests")
        .update({ status: "reserved" })
        .eq("user_id", userId)
        .eq("request_id", requestId)
        .eq("status", "failed");
      return retryError ? { state: "unavailable" as const } : { state: "reserved" as const };
    }
    return { state: "in_flight" as const };
  },

  async complete(userId, requestId, proposal) {
    await serviceClient()
      .from("assistant_requests")
      .update({ status: "completed", proposal })
      .eq("user_id", userId)
      .eq("request_id", requestId);
  },

  async release(userId, requestId) {
    await serviceClient()
      .from("assistant_requests")
      .update({ status: "failed" })
      .eq("user_id", userId)
      .eq("request_id", requestId);
  },

  async generate(prompt) {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return { status: 500 };
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });
    if (!upstream.ok) return { status: upstream.status };
    const data = await upstream.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    return { status: 200, text: typeof text === "string" ? text : undefined };
  },

  log(entry: LogEntry) {
    // Metadata only. Never instruction text, context, CV, notes, transcripts,
    // proposal text, tokens, provider bodies or secrets.
    console.log(JSON.stringify({ fn: "career-guidance", ...entry }));
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ version: 2, error: "malformed_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isV2 = !!body && typeof body === "object" && (body as { version?: unknown }).version === 2;
  if (isV2) return await handleV2(body, token, deps, corsHeaders);

  return await handleLegacy(body, token);
});

// ---------------------------------------------------------------------------
// Legacy v1 branch (HISTORICAL COMPATIBILITY). Unchanged behaviour: generic
// SynAI streaming chat. v2 context never reaches this prompt.
// ---------------------------------------------------------------------------

interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

function legacySystemPrompt(): string {
  return `You are SynAI, the career intelligence assistant for Syncareer.

Tone: confident, professional, encouraging. Avoid casual greetings, exaggerated marketing language, emojis, and gamified phrasing. Be practical and specific, never generic.

Guidance principles:
- Give actionable, step-by-step advice.
- Use the RIASEC model when discussing interests/personality fit.
- When recommending careers, include: required skills, suggested degree path, entry-level roles, and skill gaps.
- For CV advice: ATS-friendly, bullet points, quantifiable achievements, 1-page default.
- For interview prep: structured, role-specific, with constructive examples.`;
}

async function handleLegacy(body: unknown, token: string): Promise<Response> {
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const user = await deps.verifyUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  const messages: ChatMessage[] = Array.isArray((body as { messages?: unknown })?.messages)
    ? (body as { messages: ChatMessage[] }).messages
    : [];
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: jsonHeaders });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 500, headers: jsonHeaders });

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      messages: [{ role: "system", content: legacySystemPrompt() }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
  });

  if (upstream.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: jsonHeaders });
  if (upstream.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: jsonHeaders });
  if (!upstream.ok || !upstream.body) {
    console.log(JSON.stringify({ fn: "career-guidance", branch: "legacy", status: upstream.status }));
    return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502, headers: jsonHeaders });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
