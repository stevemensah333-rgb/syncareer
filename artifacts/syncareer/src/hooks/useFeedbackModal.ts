import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type FeatureName = 'assessment' | 'cv_builder' | 'interview_simulator' | 'cv_strength_score';

export function useFeedbackModal(featureName: FeatureName) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check if user has given feedback for this feature in the last 7 days
  useEffect(() => {
    const checkEligibility = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecked(true);
        return;
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('user_feedback')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('feature_name', featureName)
        .gte('created_at', oneWeekAgo.toISOString())
        .limit(1);

      if (!error && (!data || data.length === 0)) {
        setShouldShow(true);
      }
      setChecked(true);
    };

    checkEligibility();
  }, [featureName]);

  const triggerFeedback = useCallback(() => {
    if (shouldShow && checked) {
      // Small delay to not interrupt the flow aggressively
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, [shouldShow, checked]);

  const submitFeedback = async (responseType: 'positive' | 'negative', comment?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('user_feedback').insert({
      user_id: session.user.id,
      feature_name: featureName,
      response_type: responseType,
      comment: comment || null,
    });

    setIsOpen(false);
    setShouldShow(false);
  };

  const dismiss = () => {
    setIsOpen(false);
  };

  return { isOpen, triggerFeedback, submitFeedback, dismiss };
}
