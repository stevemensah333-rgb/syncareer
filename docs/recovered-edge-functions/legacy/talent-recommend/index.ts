import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify employer role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role !== "employer") {
      return new Response(JSON.stringify({ error: "Employer access only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    let body: { job_title?: string; skills?: string[]; limit?: number } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const limit = Math.min(body.limit || 10, 20);

    // Get employer's active job postings for context
    const { data: jobs } = await supabase
      .from("job_postings")
      .select("title, skills, location, employment_type")
      .eq("employer_id", userId)
      .eq("status", "active")
      .limit(5);

    // Use service role to read student data
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch talent pool data
    const [
      { data: profiles },
      { data: studentDetails },
      { data: userSkills },
      { data: portfolios },
    ] = await Promise.all([
      serviceSupabase.from("profiles").select("id, full_name, avatar_url, bio").eq("user_type", "student").limit(100),
      serviceSupabase.from("student_details").select("user_id, major, school, degree_type, expected_completion"),
      serviceSupabase.from("user_skills").select("user_id, skill_name, proficiency, category").limit(500),
      serviceSupabase.from("portfolio_projects").select("user_id, title, tags").limit(200),
    ]);

    // Build candidate profiles
    const candidateMap = new Map<string, any>();
    
    profiles?.forEach(p => {
      candidateMap.set(p.id, {
        id: p.id,
        name: p.full_name || "Anonymous",
        avatar_url: p.avatar_url,
        bio: p.bio,
        skills: [] as string[],
        major: null as string | null,
        school: null as string | null,
        degree: null as string | null,
        projects: 0,
        project_tags: [] as string[],
      });
    });

    studentDetails?.forEach(s => {
      const c = candidateMap.get(s.user_id);
      if (c) {
        c.major = s.major;
        c.school = s.school;
        c.degree = s.degree_type;
      }
    });

    userSkills?.forEach(s => {
      const c = candidateMap.get(s.user_id);
      if (c) c.skills.push(s.skill_name);
    });

    portfolios?.forEach(p => {
      const c = candidateMap.get(p.user_id);
      if (c) {
        c.projects++;
        if (p.tags) c.project_tags.push(...p.tags);
      }
    });

    const candidates = Array.from(candidateMap.values());

    // Build context for AI
    const jobContext = jobs?.length
      ? `Employer's active job postings:\n${jobs.map(j => `- ${j.title} (${j.employment_type}, ${j.location}) Skills: ${j.skills?.join(", ") || "not specified"}`).join("\n")}`
      : "No active job postings.";

    const searchContext = body.job_title
      ? `Employer is looking for: ${body.job_title}${body.skills?.length ? ` with skills: ${body.skills.join(", ")}` : ""}`
      : "";

    const candidateSummary = candidates.slice(0, 30).map(c =>
      `- ${c.name} | Major: ${c.major || "N/A"} | School: ${c.school || "N/A"} | Skills: ${c.skills.slice(0, 8).join(", ") || "N/A"} | Projects: ${c.projects}`
    ).join("\n");

    // Aggregate stats
    const totalCandidates = candidates.length;
    const skillCounts: Record<string, number> = {};
    candidates.forEach(c => c.skills.forEach((s: string) => { skillCounts[s] = (skillCounts[s] || 0) + 1; }));
    const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const majorCounts: Record<string, number> = {};
    candidates.forEach(c => { if (c.major) majorCounts[c.major] = (majorCounts[c.major] || 0) + 1; });
    const topMajors = Object.entries(majorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const systemPrompt = `You are Syncareer's AI talent advisor for employers. Analyze the talent pool and provide actionable hiring recommendations.

${jobContext}
${searchContext}

TALENT POOL (${totalCandidates} candidates):
${candidateSummary}

TOP SKILLS IN POOL: ${topSkills.map(([s, c]) => `${s}(${c})`).join(", ")}
TOP MAJORS: ${topMajors.map(([m, c]) => `${m}(${c})`).join(", ")}

Return a JSON object with this structure:
{
  "recommended_candidates": [
    { "name": "string", "match_reason": "string", "skills": ["string"], "major": "string", "fit_score": 0.0-1.0 }
  ],
  "market_insights": {
    "talent_availability": "string (brief assessment)",
    "skill_gaps": ["skills that are in demand but scarce"],
    "salary_suggestion": "string (brief market-rate guidance)",
    "hiring_tips": ["actionable tips"]
  },
  "summary": "string (2-3 sentence overview)"
}

Recommend up to ${limit} candidates. Base fit_score on skill match, relevant major, and portfolio activity. Be practical and specific.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: searchContext || "Recommend the best candidates from the talent pool based on my active job postings. Provide market insights." },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { summary: content, recommended_candidates: [], market_insights: null };
    }

    // Attach stats
    result.pool_stats = {
      total_candidates: totalCandidates,
      top_skills: topSkills.map(([skill, count]) => ({ skill, count })),
      top_majors: topMajors.map(([major, count]) => ({ major, count })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("talent-recommend error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
