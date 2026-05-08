import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function tryParseJSON(raw: string): unknown {
  // First attempt: direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences and retry
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const region: string = body.region ?? "global";

    // Fetch user's major from student_details
    const { data: studentData } = await supabase
      .from("student_details")
      .select("major")
      .eq("user_id", user.id)
      .maybeSingle();

    const major: string = body.major ?? studentData?.major ?? "General Studies";

    // Check cache (valid for 7 days)
    const { data: cached } = await supabase
      .from("market_intelligence_cache")
      .select("*")
      .ilike("major", major)
      .ilike("region", region)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ ...cached, from_cache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No valid cache — generate via AI
    const systemPrompt = `You are a senior labour market intelligence analyst with access to real-time job market data, BLS projections, and industry hiring trends. Your analysis must be grounded, realistic, and specific to the academic major provided. Never give generic or placeholder data.`;

    const userPrompt = `Generate a comprehensive labour market intelligence report for a student studying "${major}" seeking opportunities in ${region === "global" ? "the global job market" : region}.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "hard_skills": [
    {
      "skill": "string",
      "demand_score": number (0-100, based on real posting frequency),
      "growth_percent": "string (e.g. +34%)",
      "trend": "rising" | "stable" | "declining",
      "avg_entry_salary_usd": number (annual, realistic USD),
      "job_posting_volume": "string (e.g. 45,000+ monthly postings)"
    }
  ],
  "soft_skills": [
    {
      "skill": "string",
      "demand_score": number (0-100),
      "context": "string (1 sentence: why this is critical for this major's roles)",
      "trend": "rising" | "stable"
    }
  ],
  "salary_data": [
    {
      "role": "string (top entry-level role for this major)",
      "entry_level_usd": number,
      "mid_level_usd": number,
      "senior_level_usd": number,
      "yoe_to_senior": number (years)
    }
  ],
  "demand_forecast": [
    {
      "month": "string (Jan through Dec)",
      "demand_index": number (0-100, realistic seasonal trend),
      "hiring_activity": number (0-100)
    }
  ],
  "career_outlook": [
    {
      "career": "string",
      "growth_rate": "string (e.g. +22% over 5 years)",
      "time_horizon": "string (e.g. 2025–2030)",
      "annual_openings": "string (e.g. 50,000+)",
      "confidence": "high" | "medium" | "low",
      "bls_projection": "string (concise BLS-style projection statement)"
    }
  ],
  "market_insights": [
    {
      "title": "string",
      "description": "string (2 sentences, specific and actionable)",
      "category": "Hot" | "Growing" | "Trend" | "Alert" | "Emerging",
      "impact": "high" | "medium" | "low"
    }
  ],
  "region_summary": "string (2-3 sentences about this major's market landscape in the specified region)",
  "data_confidence": "string (brief statement on data sources/methodology)"
}

Requirements:
- hard_skills: exactly 8 skills most in-demand for this major's career paths
- soft_skills: exactly 5 soft skills critical to this major's roles (NOT generic — e.g. a finance major needs analytical rigour, not just "communication")
- salary_data: exactly 5 top roles for this major, realistic USD salaries
- demand_forecast: exactly 12 months (Jan–Dec), show seasonal hiring patterns
- career_outlook: exactly 4 careers aligned with this major
- market_insights: exactly 5 insights (mix of opportunities and risks)
- All data must be realistic and specific to "${major}" — a business student must NOT see AI engineering skills, a nursing student must NOT see programming languages`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text();
      console.error("AI error:", errBody);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intelligence = tryParseJSON(rawContent);
    if (!intelligence || typeof intelligence !== "object") {
      console.error("Malformed AI JSON:", rawContent.substring(0, 500));
      return new Response(JSON.stringify({ error: "AI returned malformed data. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = intelligence as Record<string, unknown>;

    // Upsert into cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: saved, error: saveError } = await supabase
      .from("market_intelligence_cache")
      .upsert(
        {
          major: major.toLowerCase(),
          region: region.toLowerCase(),
          hard_skills: parsed.hard_skills ?? [],
          soft_skills: parsed.soft_skills ?? [],
          salary_data: parsed.salary_data ?? [],
          demand_forecast: parsed.demand_forecast ?? [],
          career_outlook: parsed.career_outlook ?? [],
          market_insights: parsed.market_insights ?? [],
          region_summary: parsed.region_summary ?? "",
          data_confidence: parsed.data_confidence ?? "",
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "major,region" }
      )
      .select()
      .single();

    if (saveError) {
      console.warn("Cache save failed (non-fatal):", saveError.message);
      return new Response(JSON.stringify({ ...parsed, major, region, from_cache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ...saved, from_cache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("market-intelligence error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
