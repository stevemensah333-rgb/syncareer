import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ASSESSMENT_QUESTIONS } from '@/data/assessmentQuestions';
import { calculateRiasec } from '@/features/assessment/scoring';
import { toast } from 'sonner';

export interface AssessmentResult {
  id: string;
  completed_at: string;
  personality_score_json: Record<string, number>;
  skills_score_json: Record<string, number>;
  work_interest_score_json: Record<string, number>;
  primary_interest: string | null;
  secondary_interest: string | null;
  tertiary_interest: string | null;
  created_at: string;
}

export function useAssessment() {
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [allResults, setAllResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', session.user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(d => ({
        id: d.id,
        completed_at: d.completed_at!,
        personality_score_json: d.personality_score_json as Record<string, number>,
        skills_score_json: d.skills_score_json as Record<string, number>,
        work_interest_score_json: d.work_interest_score_json as Record<string, number>,
        primary_interest: d.primary_interest,
        secondary_interest: d.secondary_interest,
        tertiary_interest: d.tertiary_interest,
        created_at: d.created_at,
      }));

      setAllResults(mapped);
      setLatestResult(mapped[0] || null);
    } catch (err) {
      console.error('Error fetching assessment results:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const canRetake = useCallback(() => {
    if (!latestResult) return true;
    const lastTaken = new Date(latestResult.completed_at);
    const daysSince = (Date.now() - lastTaken.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 30;
  }, [latestResult]);

  const submitAssessment = useCallback(async (answers: Record<number, number>) => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Validate all 45 answered
      if (Object.keys(answers).length !== 45) {
        throw new Error('Please answer all 45 questions');
      }

      // Calculate scores using the canonical RIASEC scorer
      const scores = calculateRiasec(answers, ASSESSMENT_QUESTIONS);

      // Insert assessment
      const { data: assessment, error: insertErr } = await supabase
        .from('assessments')
        .insert({
          user_id: session.user.id,
          completed_at: new Date().toISOString(),
          personality_score_json: scores.personality_score_json,
          skills_score_json: scores.skills_score_json,
          work_interest_score_json: scores.work_interest_score_json,
          primary_interest: scores.primary_interest,
          secondary_interest: scores.secondary_interest,
          tertiary_interest: scores.tertiary_interest,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Insert individual responses
      const responses = Object.entries(answers).map(([qId, val]) => ({
        assessment_id: assessment.id,
        question_id: parseInt(qId),
        selected_value: val,
      }));

      const { error: respErr } = await supabase
        .from('assessment_responses')
        .insert(responses);

      if (respErr) throw respErr;

      toast.success('Assessment completed successfully!');
      await fetchResults();

      // ── Trigger intelligence recompute so SynAI sees fresh RIASEC data ──
      supabase.functions.invoke('compute-user-intelligence').catch(e =>
        console.warn('[useAssessment] Intelligence recompute failed:', e)
      );

      return true;
    } catch (err: any) {
      console.error('Error submitting assessment:', err);
      toast.error(err.message || 'Failed to submit assessment. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchResults]);

  return { latestResult, allResults, loading, submitting, canRetake, submitAssessment, refetch: fetchResults };
}
