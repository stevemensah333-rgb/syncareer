// City-aware market intelligence powered by Lovable AI Gateway.
// Cached in market_intelligence_cache by (major, region) for 7 days.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGION_LABELS: Record<string, string> = {
  accra_ghana:   "Accra, Ghana (focus on local employers like MTN, Hubtel, Vodafone, Stanbic, Jumia, Bolt, Flutterwave Ghana, KPMG, Deloitte, Ecobank)",
  lagos_nigeria: "Lagos, Nigeria (focus on local employers like Flutterwave, Paystack, Andela, Interswitch, MTN Nigeria, Access Bank, GTBank, Konga)",
  nairobi_kenya: "Nairobi, Kenya (focus on local employers like Safaricom, Equity Bank, Cellulant, Twiga Foods, Andela Kenya, KCB)",
  cape_town_sa:  "Cape Town, South Africa (focus on local employers like Naspers, Takealot, Standard Bank, Discovery, Investec, Capitec)",
  remote_africa: "Remote roles open to Africa-based applicants (companies hiring across Africa with no relocation)",
  remote_global: "Fully remote roles open globally to applicants from any country",
  global:        "Global benchmark across major hiring markets (US, EU, UK, India, SEA)",
};

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
    const { major, region = "accra_ghana" } = await req.json();
    if (!major || typeof major !== "string") {
      return new Response(JSON.stringify({ error: "major is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache lookup
    const { data: cached } = await supabase
      .from("market_intelligence_cache")
      .select("*")
      .eq("major", major)
      .eq("region", region)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        major, region,
        hard_skills: cached.hard_skills, soft_skills: cached.soft_skills,
        salary_data: cached.salary_data, demand_forecast: cached.demand_forecast,
        career_outlook: cached.career_outlook, market_insights: cached.market_insights,
        region_summary: cached.region_summary, data_confidence: cached.data_confidence,
        generated_at: cached.generated_at, from_cache: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const regionLabel = REGION_LABELS[region] ?? region;
    const isRemote = region.startsWith("remote_");
    const currency = region === "accra_ghana" ? "GHS" : region === "lagos_nigeria" ? "NGN" : region === "nairobi_kenya" ? "KES" : region === "cape_town_sa" ? "ZAR" : "USD";

    const prompt = `You are a senior labour-market analyst. Produce a hyper-local, actionable career market report for ENTRY-LEVEL roles for someone studying "${major}" who wants to work in: ${regionLabel}.

Rules:
- Be concrete and local. Name actual employers, actual job titles, actual salary ranges in ${currency} (entry-level reality, not aspirational).
- ${isRemote ? "Focus on companies that genuinely hire remotely with no location restrictions." : "Focus on the named city's employers and economy. Do NOT give global averages."}
- Salary numbers MUST reflect actual entry-level pay in this market, not USD-converted Silicon-Valley figures.
- Job-posting volume should reflect this specific market's hiring activity.
- Skills must be ranked by demand IN THIS MARKET specifically.

Return ONLY a single JSON object (no markdown, no commentary) with this exact shape:
{
  "hard_skills": [{"skill": string, "demand_score": 0-100, "growth_percent": "+12%", "trend": "rising"|"stable"|"declining", "avg_entry_salary_${currency.toLowerCase()}": number, "job_posting_volume": "high"|"medium"|"low"}], // 8 items
  "soft_skills": [{"skill": string, "demand_score": 0-100, "context": string, "trend": "rising"|"stable"}], // 5 items
  "salary_data": [{"role": string, "entry_level_${currency.toLowerCase()}": number, "mid_level_${currency.toLowerCase()}": number, "senior_level_${currency.toLowerCase()}": number, "yoe_to_senior": number}], // 5 roles common in ${regionLabel}
  "demand_forecast": [{"month": "Jan", "demand_index": 0-100, "hiring_activity": 0-100}], // 12 months
  "career_outlook": [{"career": string, "growth_rate": string, "time_horizon": "2025-2030", "annual_openings": string, "confidence": "high"|"medium"|"low", "bls_projection": string}], // 5 roles
  "market_insights": [{"title": string, "description": string, "category": "Hot"|"Growing"|"Trend"|"Alert"|"Emerging", "impact": "high"|"medium"|"low"}], // 4 items, MUST be specific to ${regionLabel}
  "region_summary": "2-3 sentences specific to ${regionLabel} hiring reality for ${major} grads",
  "data_confidence": "high"|"medium"|"low"
}

IMPORTANT: rename salary fields to use lowercase currency suffix (e.g. avg_entry_salary_ghs, entry_level_ngn) so the client renders the right currency.`;

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
      console.error("AI gateway error:", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "AI generation failed", detail: txt.slice(0, 500) }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    let parsed: any;
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch (_e) {
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalise salary keys back to a generic shape for the client UI
    const cur = currency.toLowerCase();
    const hardSkills = (parsed.hard_skills ?? []).map((s: any) => ({
      ...s,
      avg_entry_salary_usd: s[`avg_entry_salary_${cur}`] ?? s.avg_entry_salary_usd ?? 0,
    }));
    const salaryData = (parsed.salary_data ?? []).map((r: any) => ({
      role: r.role,
      entry_level_usd:  r[`entry_level_${cur}`]  ?? r.entry_level_usd  ?? 0,
      mid_level_usd:    r[`mid_level_${cur}`]    ?? r.mid_level_usd    ?? 0,
      senior_level_usd: r[`senior_level_${cur}`] ?? r.senior_level_usd ?? 0,
      yoe_to_senior:    r.yoe_to_senior ?? 5,
    }));

    const payload = {
      hard_skills: hardSkills,
      soft_skills: parsed.soft_skills ?? [],
      salary_data: salaryData,
      demand_forecast: parsed.demand_forecast ?? [],
      career_outlook: parsed.career_outlook ?? [],
      market_insights: parsed.market_insights ?? [],
      region_summary: parsed.region_summary ?? "",
      data_confidence: parsed.data_confidence ?? "medium",
    };

    await supabase.from("market_intelligence_cache").upsert({
      major, region, ...payload, generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "major,region" });

    return new Response(JSON.stringify({
      major, region, ...payload,
      generated_at: new Date().toISOString(), from_cache: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
