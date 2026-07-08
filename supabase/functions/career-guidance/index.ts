// SynAI career guidance streaming edge function
// Streams OpenAI-compatible SSE from Lovable AI Gateway to the client.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserContext {
  fullName?: string | null;
  location?: string | null;
  degree?: string | null;
  major?: string | null;
  school?: string | null;
  graduationYear?: number | null;
  primaryInterest?: string | null;
  secondaryInterest?: string | null;
  tertiaryInterest?: string | null;
  readinessScore?: number | null;
  skills?: Array<{ name: string; proficiency: string; category: string }>;
  workExperience?: Array<{ title: string; company: string; description?: string }>;
  projects?: Array<{ title: string; description: string }>;
}

function buildSystemPrompt(ctx?: UserContext): string {
  const base = `You are SynAI, the career intelligence assistant for Syncareer — an AI-powered platform helping students and recent graduates discover, prepare for, and transition into competitive careers.

Tone: confident, professional, encouraging. Avoid casual greetings, exaggerated marketing language, emojis, and gamified phrasing. Be practical and specific, never generic.

Guidance principles:
- Give actionable, step-by-step advice tailored to the user's profile.
- Use the RIASEC model when discussing interests/personality fit.
- When recommending careers, include: required skills, suggested degree path, entry-level roles, and skill gaps.
- For CV advice: ATS-friendly, bullet points, quantifiable achievements, 1-page default.
- For interview prep: structured, role-specific, with constructive examples.
- Keep responses focused and scannable. Use short paragraphs and lists when helpful.`;

  if (!ctx) return base;

  const lines: string[] = ["\n\nUser profile:"];
  if (ctx.fullName) lines.push(`- Name: ${ctx.fullName}`);
  if (ctx.location) lines.push(`- Location: ${ctx.location}`);
  if (ctx.degree || ctx.major) lines.push(`- Education: ${[ctx.degree, ctx.major].filter(Boolean).join(" in ")}${ctx.school ? ` at ${ctx.school}` : ""}`);
  if (ctx.graduationYear) lines.push(`- Graduation year: ${ctx.graduationYear}`);
  if (ctx.primaryInterest) lines.push(`- Primary interest: ${ctx.primaryInterest}${ctx.secondaryInterest ? `, secondary: ${ctx.secondaryInterest}` : ""}${ctx.tertiaryInterest ? `, tertiary: ${ctx.tertiaryInterest}` : ""}`);
  if (typeof ctx.readinessScore === "number") lines.push(`- Career readiness score: ${ctx.readinessScore}/100`);
  if (ctx.skills?.length) {
    const top = ctx.skills.slice(0, 12).map(s => `${s.name} (${s.proficiency})`).join(", ");
    lines.push(`- Skills: ${top}`);
  }
  if (ctx.workExperience?.length) {
    lines.push(`- Experience: ${ctx.workExperience.slice(0, 5).map(e => `${e.title} at ${e.company}`).join("; ")}`);
  }
  if (ctx.projects?.length) {
    lines.push(`- Projects: ${ctx.projects.slice(0, 5).map(p => p.title).join("; ")}`);
  }

  return base + lines.join("\n") + "\n\nUse this profile to personalize every answer.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated (non-anon) caller
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role = "";
  let sub = "";
  try {
    const p = JSON.parse(atob(token.split(".")[1] || ""));
    role = p?.role || "";
    sub = p?.sub || "";
  } catch { /* ignore */ }
  if (role === "anon" || (!sub && role !== "service_role")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const userContext: UserContext | undefined = body?.userContext;

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(userContext);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Upstream error", upstream.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error", status: upstream.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("career-guidance error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
