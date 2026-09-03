// Alumni outcomes engine: combines Firecrawl web search (LinkedIn alumni pages,
// news, university career-services pages) with internal outcome_tracking signal,
// then asks Lovable AI to synthesize a hyper-local picture of where graduates
// of a specific (university, major) end up — keyed by region/city.
//
// Cached in alumni_outcomes_cache for 14 days.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGION_LABELS: Record<string, string> = {
  accra_ghana:   "Accra, Ghana",
  lagos_nigeria: "Lagos, Nigeria",
  nairobi_kenya: "Nairobi, Kenya",
  cape_town_sa:  "Cape Town, South Africa",
  remote_africa: "remote roles open to Africa-based applicants",
  remote_global: "fully remote roles globally",
  global:        "global market",
};

// Gateway-backed Firecrawl connection: FIRECRAWL_API_KEY is a Lovable
// connection key, so calls go through the connector gateway, not
// api.firecrawl.dev directly.
async function firecrawlSearch(query: string, limit = 5) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !lovableKey) return [];
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results = json.data?.web ?? json.data ?? [];
    return Array.isArray(results) ? results : [];
  } catch (e) {
    console.error("firecrawl search failed", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require authenticated (non-anon) caller
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role = ""; let sub = "";
  try { const p = JSON.parse(atob(token.split(".")[1] || "")); role = p?.role || ""; sub = p?.sub || ""; } catch {}
  if (role === "anon" || (!sub && role !== "service_role")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const university = typeof body.university === "string" ? body.university : "";
    const major = typeof body.major === "string" ? body.major : "";
    const region = typeof body.region === "string" ? body.region : "accra_ghana";
    if (!university || !major) {
      return new Response(JSON.stringify({ error: "university and major required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (university.length > 300 || major.length > 200) {
      return new Response(JSON.stringify({ error: "university (max 300) or major (max 200) too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(region in REGION_LABELS)) {
      return new Response(JSON.stringify({ error: "Invalid region" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const safeUniversity = university.replace(/[\r\n"`]/g, " ").trim();
    const safeMajor = major.replace(/[\r\n"`]/g, " ").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache lookup
    const { data: cached } = await supabase
      .from("alumni_outcomes_cache")
      .select("*")
      .ilike("university_name", university)
      .ilike("major", major)
      .ilike("region", region)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ ...cached, from_cache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const regionLabel = REGION_LABELS[region] ?? region;

    // --- Step 1: gather public web evidence via Firecrawl ---
    const queries = [
      `"${safeUniversity}" ${safeMajor} alumni LinkedIn ${regionLabel}`,
      `"${safeUniversity}" ${safeMajor} graduates working at site:linkedin.com`,
      `${safeUniversity} ${safeMajor} graduate first job ${regionLabel}`,
    ];
    const searches = await Promise.all(queries.map(q => firecrawlSearch(q, 5)));
    const webEvidence = searches.flat().slice(0, 12).map((r: any) => ({
      title: r.title ?? r.name ?? "",
      url: r.url ?? r.link ?? "",
      snippet: (r.description ?? r.snippet ?? "").slice(0, 300),
    })).filter(r => r.url);

    // --- Step 2: pull internal signal from our own users ---
    // We can see what real Syncareer users from this university+major have applied to.
    const { data: ownGrads } = await supabase
      .from("student_details")
      .select("user_id")
      .ilike("school", university)
      .ilike("major", major)
      .limit(50);

    const userIds = (ownGrads ?? []).map(g => g.user_id);
    let internalSignal = "";
    if (userIds.length > 0) {
      const { data: apps } = await supabase
        .from("job_applications")
        .select("status, job_postings(title, location)")
        .in("applicant_id", userIds)
        .limit(100);
      const titles = (apps ?? []).map((a: any) => a.job_postings?.title).filter(Boolean);
      if (titles.length > 0) {
        internalSignal = `Internal Syncareer signal: ${userIds.length} users from ${safeUniversity} studying ${safeMajor} have applied to roles like: ${titles.slice(0, 15).join(", ")}.`;
      }
    }

    // --- Step 3: synthesize with Lovable AI ---
    const prompt = `You are a career-outcomes researcher. Using the web evidence and internal signal below, produce a concrete picture of where ${safeMajor} graduates from ${safeUniversity} actually end up working in ${regionLabel}.

Be specific. Name real employers from the evidence. If evidence is thin, say so honestly in paths_summary and lower the confidence implicitly by being conservative.

WEB EVIDENCE (titles, URLs, snippets from public web search):
${webEvidence.map((e, i) => `[${i+1}] ${e.title} — ${e.url}\n    ${e.snippet}`).join("\n") || "(no web evidence found)"}

INTERNAL SIGNAL:
${internalSignal || "(no internal signal yet)"}

Return ONLY a JSON object with this exact shape:
{
  "top_employers": [{"name": string, "role_examples": string[], "evidence_url": string|null}], // 5-8 items
  "common_roles": [{"title": string, "frequency": "very common"|"common"|"emerging"}], // 5-7 items
  "salary_observations": "1-2 sentences with observed entry-level pay range in local currency if known, else 'limited public data'.",
  "paths_summary": "3-4 sentences: where do these graduates actually go? Industries, employer types, common first-job patterns. Be honest about evidence quality.",
  "sources": [{"label": string, "url": string}] // up to 6 of the most useful URLs from the evidence
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: txt.slice(0, 400) }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}"); }
    catch { parsed = {}; }

    const payload = {
      university_name: university,
      major,
      region,
      top_employers: parsed.top_employers ?? [],
      common_roles: parsed.common_roles ?? [],
      salary_observations: parsed.salary_observations ?? "",
      paths_summary: parsed.paths_summary ?? "",
      sources: parsed.sources ?? [],
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await supabase.from("alumni_outcomes_cache").upsert(payload, {
      onConflict: "university_name,major,region",
    });

    return new Response(JSON.stringify({ ...payload, from_cache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
