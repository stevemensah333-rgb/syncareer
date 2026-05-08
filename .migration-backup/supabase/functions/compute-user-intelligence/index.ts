import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Confidence weights for different signal sources
const SOURCE_WEIGHTS = {
  interview: 0.85,
  assessment: 0.80,
  portfolio: 0.70,
  cv: 0.60,
};

interface SkillMastery {
  skill_name: string;
  score: number;       // 0–1
  sources: string[];
  proficiency: string;
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // ── Fetch all signals in parallel ──
    const [
      skillsResult,
      assessmentResult,
      interviewsResult,
      portfolioResult,
      streakResult,
      activitiesResult,
      outcomesResult,
    ] = await Promise.all([
      supabase.from('user_skills').select('skill_name, category, proficiency, source').eq('user_id', userId),
      supabase.from('assessments').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('mock_interviews').select('overall_score, difficulty, status, completed_at').eq('user_id', userId).eq('status', 'completed'),
      supabase.from('portfolio_projects').select('id, tags, is_verified').eq('user_id', userId),
      supabase.from('learning_streaks').select('current_streak, longest_streak, total_learning_days').eq('user_id', userId).maybeSingle(),
      supabase.from('learning_activities').select('activity_type, duration_minutes, activity_date').eq('user_id', userId).order('activity_date', { ascending: false }).limit(30),
      supabase.from('recommendation_outcomes').select('user_action, outcome').eq('user_id', userId),
    ]);

    // ── 1. Skill Mastery Computation ──
    const skills = skillsResult.data || [];
    const skillMap: Record<string, SkillMastery> = {};

    for (const s of skills) {
      const proficiencyScores: Record<string, number> = {
        beginner: 0.25,
        intermediate: 0.50,
        advanced: 0.75,
        expert: 0.95,
      };

      const baseScore = proficiencyScores[s.proficiency] || 0.25;
      const sourceWeight = SOURCE_WEIGHTS[s.source as keyof typeof SOURCE_WEIGHTS] || 0.5;
      const weighted = baseScore * sourceWeight;

      if (!skillMap[s.skill_name]) {
        skillMap[s.skill_name] = {
          skill_name: s.skill_name,
          score: weighted,
          sources: [s.source],
          proficiency: s.proficiency,
        };
      } else {
        // Multiple sources for same skill → boost confidence
        skillMap[s.skill_name].score = Math.min(
          1,
          skillMap[s.skill_name].score + weighted * 0.3
        );
        if (!skillMap[s.skill_name].sources.includes(s.source)) {
          skillMap[s.skill_name].sources.push(s.source);
        }
      }
    }

    // Boost from interviews
    const interviews = interviewsResult.data || [];
    if (interviews.length > 0) {
      const avgScore = interviews.reduce((sum, i) => sum + (i.overall_score || 0), 0) / interviews.length;
      const interviewBoost = (avgScore / 100) * SOURCE_WEIGHTS.interview * 0.15;
      for (const key of Object.keys(skillMap)) {
        skillMap[key].score = Math.min(1, skillMap[key].score + interviewBoost);
      }
    }

    // Boost from verified portfolio projects
    const portfolio = portfolioResult.data || [];
    const verifiedCount = portfolio.filter(p => p.is_verified).length;
    if (verifiedCount > 0) {
      const portfolioBoost = Math.min(verifiedCount * 0.03, 0.1) * SOURCE_WEIGHTS.portfolio;
      for (const key of Object.keys(skillMap)) {
        skillMap[key].score = Math.min(1, skillMap[key].score + portfolioBoost);
      }
    }

    // ── 2. Career Clusters (from assessment RIASEC) ──
    const assessment = assessmentResult.data;
    const careerClusters: Array<{ code: string; label: string; score: number }> = [];

    if (assessment?.work_interest_score_json) {
      const scores = assessment.work_interest_score_json as Record<string, number>;
      const riasecLabels: Record<string, string> = {
        R: 'Realistic', I: 'Investigative', A: 'Artistic',
        S: 'Social', E: 'Enterprising', C: 'Conventional',
      };

      const sorted = Object.entries(scores)
        .map(([code, score]) => ({ code, label: riasecLabels[code] || code, score: score as number }))
        .sort((a, b) => b.score - a.score);

      careerClusters.push(...sorted.slice(0, 3));
    }

    // ── 3. Learning Momentum ──
    const streak = streakResult.data;
    const activities = activitiesResult.data || [];

    let momentum = 0;
    if (streak) {
      // Streak contribution (0–0.4)
      momentum += Math.min(streak.current_streak / 14, 1) * 0.4;
    }

    // Recent activity frequency (0–0.35) — activities in last 30 days
    const recentCount = activities.length;
    momentum += Math.min(recentCount / 20, 1) * 0.35;

    // Total learning days contribution (0–0.25)
    if (streak?.total_learning_days) {
      momentum += Math.min(streak.total_learning_days / 60, 1) * 0.25;
    }

    momentum = Math.round(momentum * 100) / 100;

    // ── 4. Exploration Score ──
    // Based on diversity of skills explored, portfolio variety, career clusters breadth
    const uniqueCategories = new Set(skills.map(s => s.category));
    const portfolioTags = new Set(portfolio.flatMap(p => p.tags || []));

    const categoryDiversity = Math.min(uniqueCategories.size / 5, 1) * 0.5;
    const tagDiversity = Math.min(portfolioTags.size / 8, 1) * 0.3;
    const clusterBreadth = Math.min(careerClusters.length / 3, 1) * 0.2;

    const explorationScore = Math.round((categoryDiversity + tagDiversity + clusterBreadth) * 100) / 100;

    // ── 5. Maturity Level ──
    const totalSkills = Object.keys(skillMap).length;
    const avgMastery = totalSkills > 0
      ? Object.values(skillMap).reduce((s, sk) => s + sk.score, 0) / totalSkills
      : 0;
    const interviewCount = interviews.length;

    let maturityLevel = 'beginner';
    if (avgMastery >= 0.6 && totalSkills >= 8 && interviewCount >= 3 && momentum >= 0.5) {
      maturityLevel = 'advanced';
    } else if (avgMastery >= 0.35 && totalSkills >= 4 && (interviewCount >= 1 || momentum >= 0.25)) {
      maturityLevel = 'developing';
    }

    // ── 6. Success Rate ──
    const outcomes = outcomesResult.data || [];
    const actedOutcomes = outcomes.filter(o => o.user_action !== 'none');
    const successOutcomes = actedOutcomes.filter(o => o.outcome === 'success');
    const successRate = actedOutcomes.length > 0
      ? Math.round((successOutcomes.length / actedOutcomes.length) * 100) / 100
      : 0;

    // ── Upsert intelligence profile ──
    const profileData = {
      user_id: userId,
      skill_mastery_json: skillMap,
      career_clusters: careerClusters,
      learning_momentum: momentum,
      exploration_score: explorationScore,
      maturity_level: maturityLevel,
      success_rate: successRate,
      feature_weights: SOURCE_WEIGHTS,
      last_computed_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('user_intelligence_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_intelligence_profiles')
        .update(profileData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update intelligence profile: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_intelligence_profiles')
        .insert(profileData);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to create intelligence profile: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          skill_count: totalSkills,
          avg_mastery: Math.round(avgMastery * 100) / 100,
          career_clusters: careerClusters,
          learning_momentum: momentum,
          exploration_score: explorationScore,
          maturity_level: maturityLevel,
          success_rate: successRate,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('compute-user-intelligence error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
