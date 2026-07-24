// Syncareer MCP server — Streamable HTTP transport.
// Implements a minimal JSON-RPC surface (initialize, tools/list, tools/call)
// so any MCP client (Claude, ChatGPT, Cursor, custom) can call Syncareer tools
// as the authenticated user. All tool queries run under the caller's JWT so RLS
// applies.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "syncareer-mcp", title: "Syncareer MCP", version: "0.1.0" };
const INSTRUCTIONS =
  "Syncareer career intelligence tools. Read the signed-in student's profile, CV, skills, saved jobs, applications, and readiness score, and search external job postings. All writes are intentionally omitted.";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: any;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function ok(id: JsonRpcRequest["id"], result: any) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function err(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
function textContent(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
}
function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

// ---------- tool catalog ----------

const tools = [
  {
    name: "get_my_profile",
    title: "Get my profile",
    description: "Return the signed-in user's Syncareer profile (name, user type, onboarding state, bio).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_my_readiness",
    title: "Get my career readiness",
    description: "Return the signed-in user's latest computed career readiness score and interests.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_my_cv",
    title: "Get my primary CV",
    description: "Return the signed-in user's primary resume (personal info, education, experience, skills, projects).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "list_my_skills",
    title: "List my skills",
    description: "List all skills recorded on the signed-in user's profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "list_my_saved_jobs",
    title: "List my saved jobs",
    description: "List jobs the signed-in user has bookmarked, newest first.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "list_my_applications",
    title: "List my applications",
    description: "List the signed-in user's job applications with status, newest first.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_jobs",
    title: "Search jobs",
    description: "Search active job postings by keyword and/or location. Returns id, title, company, location, source.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword to match in title/description." },
        location: { type: "string", description: "Location substring filter." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "get_job",
    title: "Get job details",
    description: "Fetch a full job posting by its id.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string", description: "UUID of the job posting." } },
      required: ["job_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
];

// ---------- tool execution ----------

async function callTool(name: string, args: any, authHeader: string, userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  switch (name) {
    case "get_my_profile": {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) return toolError(error.message);
      return textContent(data ?? { profile: null });
    }
    case "get_my_readiness": {
      const [{ data: intel }, { data: assess }] = await Promise.all([
        supabase.from("user_intelligence_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("assessments").select("primary_interest, secondary_interest, tertiary_interest, completed_at")
          .eq("user_id", userId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return textContent({ intelligence: intel, latest_assessment: assess });
    }
    case "get_my_cv": {
      const { data, error } = await supabase
        .from("resumes").select("*").eq("user_id", userId).eq("is_primary", true).maybeSingle();
      if (error) return toolError(error.message);
      return textContent(data ?? { cv: null });
    }
    case "list_my_skills": {
      const { data, error } = await supabase
        .from("user_skills").select("skill_name, category, proficiency, source").eq("user_id", userId);
      if (error) return toolError(error.message);
      return textContent(data ?? []);
    }
    case "list_my_saved_jobs": {
      const limit = Math.min(50, Math.max(1, Number(args?.limit ?? 20)));
      const { data, error } = await supabase
        .from("saved_jobs").select("job_id, created_at, job_postings(id, title, company_name, location, source, source_url)")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) return toolError(error.message);
      return textContent(data ?? []);
    }
    case "list_my_applications": {
      const limit = Math.min(50, Math.max(1, Number(args?.limit ?? 20)));
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, status, created_at, updated_at, job_postings(id, title, company_name, location)")
        .eq("applicant_id", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) return toolError(error.message);
      return textContent(data ?? []);
    }
    case "search_jobs": {
      const limit = Math.min(50, Math.max(1, Number(args?.limit ?? 20)));
      let q = supabase.from("job_postings")
        .select("id, title, company_name, location, employment_type, experience_level, source, source_url, created_at")
        .eq("status", "active").order("created_at", { ascending: false }).limit(limit);
      if (args?.query && typeof args.query === "string") {
        const term = args.query.replace(/[%,]/g, " ").trim();
        if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,company_name.ilike.%${term}%`);
      }
      if (args?.location && typeof args.location === "string") {
        q = q.ilike("location", `%${args.location}%`);
      }
      const { data, error } = await q;
      if (error) return toolError(error.message);
      return textContent(data ?? []);
    }
    case "get_job": {
      const jobId = String(args?.job_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(jobId)) return toolError("job_id must be a UUID");
      const { data, error } = await supabase.from("job_postings").select("*").eq("id", jobId).maybeSingle();
      if (error) return toolError(error.message);
      return textContent(data ?? { job: null });
    }
    default:
      return toolError(`Unknown tool: ${name}`);
  }
}

// ---------- JSON-RPC dispatch ----------

function decodeJwt(token: string): { sub?: string; role?: string } | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const json = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return null; }
}

async function handleRpc(req: JsonRpcRequest, authHeader: string, userId: string) {
  switch (req.method) {
    case "initialize":
      return ok(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification, no response
    case "ping":
      return ok(req.id, {});
    case "tools/list":
      return ok(req.id, { tools });
    case "tools/call": {
      const name = req.params?.name;
      const args = req.params?.arguments ?? {};
      if (!name || typeof name !== "string") return err(req.id, -32602, "Missing tool name");
      const result = await callTool(name, args, authHeader, userId);
      return ok(req.id, result);
    }
    default:
      return err(req.id, -32601, `Method not found: ${req.method}`);
  }
}

// ---------- HTTP entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // MCP discovery / health
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      server: SERVER_INFO, protocolVersion: PROTOCOL_VERSION,
      transport: "streamable-http", tools: tools.map(t => t.name),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const claims = decodeJwt(token);
  const userId = claims?.sub || "";
  const role = claims?.role || "";

  if (!userId || role === "anon") {
    return new Response(JSON.stringify(err(null, -32001, "Unauthorized: send a valid Supabase user JWT in Authorization: Bearer <token>")), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify(err(null, -32700, "Parse error")), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Support batched or single JSON-RPC requests
  const requests = Array.isArray(body) ? body as JsonRpcRequest[] : [body as JsonRpcRequest];
  const responses = [];
  for (const rpc of requests) {
    if (!rpc || typeof rpc !== "object" || (rpc as any).jsonrpc !== "2.0") {
      responses.push(err((rpc as any)?.id ?? null, -32600, "Invalid Request"));
      continue;
    }
    try {
      const res = await handleRpc(rpc, authHeader, userId);
      if (res) responses.push(res);
    } catch (e) {
      console.error("mcp handler error", e);
      responses.push(err(rpc.id ?? null, -32603, "Internal error"));
    }
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }
  const payload = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(payload), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
