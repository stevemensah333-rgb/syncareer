import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_SIGNALS,
  countActiveApplications,
  type MarketPosting,
  type MarketUserSignals,
  type RecordedSkill,
} from '@/features/market-intelligence/derive';

export interface MarketSignalsState {
  loading: boolean;
  signals: MarketUserSignals;
  /** True when at least one personalisation source failed to load. */
  partial: boolean;
}

/**
 * Loads the user-side signals that personalise Market Intelligence:
 *
 *   - recorded skills (`user_skills`, with stored proficiency)
 *   - assessment interests (`assessments`, RIASEC labels)
 *   - tracked applications (`job_applications` → status counts)
 *   - saved roles (`saved_jobs` → `job_postings` titles)
 *   - current open postings (`job_postings`, active + external)
 *
 * Each source is fetched independently so one failing source never blanks the
 * page; `partial` tells the UI to say so. Guests get an empty, not-loading
 * state and the page renders the unpersonalised market report.
 */
export function useMarketSignals(enabled: boolean): MarketSignalsState {
  const [loading, setLoading] = useState(enabled);
  const [signals, setSignals] = useState<MarketUserSignals>(EMPTY_SIGNALS);
  const [partial, setPartial] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setSignals(EMPTY_SIGNALS);
      setPartial(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const userId = session.user.id;

    const settled = await Promise.allSettled([
      supabase
        .from('user_skills')
        .select('skill_name, proficiency')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('assessments')
        .select('primary_interest, secondary_interest, tertiary_interest')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('job_applications').select('status').eq('applicant_id', userId),
      supabase.from('saved_jobs').select('job_id').eq('user_id', userId).limit(10),
      supabase
        .from('job_postings')
        .select('title, skills')
        .eq('status', 'active')
        .eq('is_external', true)
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

    let anyFailed = false;
    const value = <T,>(index: number, fallback: T): T => {
      const result = settled[index]!;
      if (result.status === 'rejected') {
        anyFailed = true;
        return fallback;
      }
      const response = result.value as { data?: unknown; error?: unknown } | null;
      if (response?.error) anyFailed = true;
      return (response?.data ?? fallback) as T;
    };

    const skillsData = value<Array<{ skill_name: string; proficiency: string | null }>>(0, []);
    const assessment = value<{
      primary_interest?: string | null;
      secondary_interest?: string | null;
      tertiary_interest?: string | null;
    } | null>(1, null);
    const applicationsData = value<Array<{ status: string | null }>>(2, []);
    const savedData = value<Array<{ job_id: string | null }>>(3, []);
    const postingsData = value<Array<{ title: string; skills: string[] | null }>>(4, []);

    const recordedSkills: RecordedSkill[] = skillsData.map((row) => ({
      name: row.skill_name,
      proficiency: row.proficiency ?? '',
    }));
    const interests = [
      assessment?.primary_interest,
      assessment?.secondary_interest,
      assessment?.tertiary_interest,
    ].filter((label): label is string => Boolean(label));
    const applicationsByStatus: Record<string, number> = {};
    for (const row of applicationsData) {
      const status = row.status ?? 'pending';
      applicationsByStatus[status] = (applicationsByStatus[status] ?? 0) + 1;
    }

    const postings: MarketPosting[] = postingsData.map((row) => ({
      title: row.title,
      skills: row.skills ?? [],
    }));

    // Saved roles are the product's persisted "role I'm aiming at" signal.
    const jobIds = savedData
      .map((row) => row.job_id)
      .filter((id): id is string => typeof id === 'string');
    let savedRoleTitles: string[] = [];
    if (jobIds.length > 0) {
      const titlesRes = await supabase.from('job_postings').select('title').in('id', jobIds);
      if (titlesRes.error) {
        anyFailed = true;
      } else {
        const titles = new Set<string>();
        for (const row of titlesRes.data ?? []) {
          const title = row.title?.trim();
          if (title) titles.add(title);
        }
        savedRoleTitles = [...titles];
      }
    }

    setSignals({
      recordedSkills,
      interests,
      activeApplications: countActiveApplications(applicationsByStatus),
      applicationsByStatus,
      savedRoleTitles,
      postings,
    });
    setPartial(anyFailed);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, signals, partial };
}
