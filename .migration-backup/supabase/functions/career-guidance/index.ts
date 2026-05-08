import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // ── Server-side feature gate: ai_coach_session ──
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let isPremium = false;
    if (subscription?.tier === 'premium' && subscription?.status === 'active') {
      isPremium = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    }

    if (!isPremium) {
      // Check monthly usage
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: usageRow } = await supabase
        .from('usage_logs')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_key', 'ai_coach_session')
        .eq('month', month)
        .maybeSingle();

      const used = usageRow?.usage_count ?? 0;
      if (used >= 5) {
        return new Response(
          JSON.stringify({
            error: 'limit_reached',
            message: 'You have used all 5 AI Coach sessions for this month. Upgrade to Premium for unlimited sessions.',
            used,
            limit: 5,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const queryType = body.query_type || 'general'; // general | explore | specific
    const userQuery = body.query || '';

    // ── Fetch user context in parallel ──
    const [
      intelligenceResult,
      assessmentResult,
      studentResult,
      careersResult,
      skillsResult,
    ] = await Promise.all([
      supabase.from('user_intelligence_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('assessments').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('student_details').select('major, degree_type, school').eq('user_id', userId).maybeSingle(),
      supabase.from('careers').select('id, title, description, industry, riasec_profile, required_skills, suggested_majors, salary_range'),
      supabase.from('user_skills').select('skill_name, proficiency').eq('user_id', userId),
    ]);

    const intelligence = intelligenceResult.data;
    const assessment = assessmentResult.data;
    const student = studentResult.data;
    const careers = careersResult.data || [];
    const userSkills = skillsResult.data || [];

    // Determine safe/growth ratio based on maturity
    const maturity = intelligence?.maturity_level || 'beginner';
    const safeRatio = maturity === 'advanced' ? 0.6 : maturity === 'developing' ? 0.7 : 0.8;
    const growthRatio = 1 - safeRatio;

    // Build grounding context for AI
    const skillsList = userSkills.map(s => `${s.skill_name} (${s.proficiency})`).join(', ') || 'None recorded';
    const clusterInfo = intelligence?.career_clusters
      ? (intelligence.career_clusters as Array<{ code: string; label: string; score: number }>)
          .map((c) => `${c.label}: ${c.score}%`).join(', ')
      : 'No assessment data';
    const interestInfo = assessment
      ? `Primary: ${assessment.primary_interest || 'N/A'}, Secondary: ${assessment.secondary_interest || 'N/A'}, Tertiary: ${assessment.tertiary_interest || 'N/A'}`
      : 'No assessment completed';

    const careerSummary = careers.slice(0, 20).map(c =>
      `- ${c.title} (${c.industry}): ${c.required_skills?.slice(0, 5).join(', ')}`
    ).join('\n');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are SynAssist, Syncareer's career intelligence engine. You act as a professional career mentor for students and recent graduates.

RULES:
- Be professional, structured, and encouraging. Never casual or gamified.
- Provide actionable, specific guidance — not generic advice.
- Always consider the student's current skill level and growth potential.
- Apply the ${Math.round(safeRatio * 100)}/${Math.round(growthRatio * 100)} safe/growth split for recommendations.
- "Safe" = high-confidence matches to current profile. "Growth" = strategic stretch opportunities.
- Every recommendation must include a confidence score (0–1), reasoning, and a suggested next skill.
- Flag uncertainties honestly.

SCOPE ENFORCEMENT — CRITICAL:
You are exclusively a career guidance engine. You only output structured career recommendations based on the user's profile.
If the user query is unrelated to career development, job readiness, or professional growth, return a guidance output with a summary that says:
"I'm only able to provide career-related guidance. That topic is outside my scope. Please ask me about career paths, skill development, or job opportunities."
Still return valid JSON in the tool call format — use an empty opportunities array and the above summary.

USER INTELLIGENCE PROFILE:
- Maturity Level: ${maturity}
- Skill Mastery: ${skillsList}
- RIASEC Clusters: ${clusterInfo}
- Interest Areas: ${interestInfo}
- Learning Momentum: ${intelligence?.learning_momentum ?? 'Unknown'}
- Exploration Score: ${intelligence?.exploration_score ?? 'Unknown'}
- Success Rate: ${intelligence?.success_rate ?? 'No data'}
- Major: ${student?.major || 'Unknown'} | Degree: ${student?.degree_type || 'Unknown'} | School: ${student?.school || 'Unknown'}

AVAILABLE CAREERS IN DATABASE:
${careerSummary}

Query type: ${queryType}`;

    const userMessage = userQuery || 'Provide my personalized career guidance with ranked recommendations based on my profile.';

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
        tools: [{
          type: "function",
          function: {
            name: "career_guidance_output",
            description: "Return structured career guidance with ranked opportunities, confidence scores, and growth suggestions.",
            parameters: {
              type: "object",
              properties: {
                opportunities: {
                  type: "array",
                  description: "Ranked list of career opportunities (safe + growth mixed)",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Career or opportunity title" },
                      confidence: { type: "number", description: "Match confidence 0–1" },
                      category: { type: "string", enum: ["safe", "growth"], description: "Whether this is a safe match or a growth stretch" },
                      reasoning: { type: "string", description: "Why this is recommended for this specific user" },
                      next_skill: { type: "string", description: "The single most impactful skill to develop for this path" },
                      risk_note: { type: "string", description: "Any uncertainty or risk to be aware of" },
                      industry: { type: "string", description: "Industry category" },
                    },
                    required: ["title", "confidence", "category", "reasoning", "next_skill", "risk_note", "industry"],
                    additionalProperties: false,
                  },
                },
                summary: {
                  type: "string",
                  description: "A 2–3 sentence mentor-style summary of the user's career position and top recommendation",
                },
                overall_next_skill: {
                  type: "string",
                  description: "The single most important skill the user should develop next across all recommendations",
                },
                career_readiness_assessment: {
                  type: "string",
                  description: "Brief assessment of the user's overall career readiness (1–2 sentences)",
                },
              },
              required: ["opportunities", "summary", "overall_next_skill", "career_readiness_assessment"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "career_guidance_output" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let structured = {
      opportunities: [],
      summary: 'Unable to generate guidance at this time.',
      overall_next_skill: '',
      career_readiness_assessment: '',
    };

    if (toolCall?.function?.arguments) {
      try {
        structured = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    // ── Log recommendations as outcomes for the feedback loop ──
    if (structured.opportunities && structured.opportunities.length > 0) {
      const outcomeRows = structured.opportunities.map((opp: any) => ({
        user_id: userId,
        recommendation_type: 'career',
        recommended_item_title: opp.title,
        confidence_score: opp.confidence,
        recommendation_category: opp.category,
        user_action: 'none',
        outcome: 'pending',
      }));

      const { error: outcomeErr } = await supabase.from('recommendation_outcomes').insert(outcomeRows);
      if (outcomeErr) console.error('Failed to log recommendation outcomes:', outcomeErr);
    }

    // ── Increment usage count (server-side, service role) ──
    if (!isPremium) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: existingLog } = await serviceSupabase
        .from('usage_logs')
        .select('id, usage_count')
        .eq('user_id', userId)
        .eq('feature_key', 'ai_coach_session')
        .eq('month', month)
        .maybeSingle();

      if (existingLog) {
        await serviceSupabase
          .from('usage_logs')
          .update({ usage_count: existingLog.usage_count + 1, updated_at: new Date().toISOString() })
          .eq('id', existingLog.id);
      } else {
        await serviceSupabase
          .from('usage_logs')
          .insert({ user_id: userId, feature_key: 'ai_coach_session', month, usage_count: 1 });
      }
    }

    // ── Save session ──
    const { error: sessionErr } = await supabase.from('career_guidance_sessions').insert({
      user_id: userId,
      session_type: queryType,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: JSON.stringify(structured) },
      ],
      structured_output: structured,
      top_recommendation: structured.opportunities?.[0]?.title || null,
      confidence_score: structured.opportunities?.[0]?.confidence || null,
      suggested_next_skill: structured.overall_next_skill || null,
      risk_notes: structured.opportunities?.[0]?.risk_note || null,
    });
    if (sessionErr) console.error('Failed to save guidance session:', sessionErr);

    return new Response(
      JSON.stringify(structured),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("career-guidance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
