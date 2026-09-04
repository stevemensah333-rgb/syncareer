import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EvidenceItemRow } from '@/features/evidence/types';
import { listEvidenceItems } from '@/features/evidence/api';
import type { RecordedSkill } from '@/features/assessment/careerProfile';

/**
 * Loads the persisted pieces of a Career Profile that live outside the
 * assessment result itself:
 *
 *   - relevant skills  → `user_skills` (student-recorded)
 *   - evidence         → `evidence_items` (the evidence dossier)
 *   - target roles     → roles behind the student's saved opportunities
 *     (`saved_jobs` → `job_postings`); saved jobs are the product's only
 *     persisted "role I'm aiming at" signal.
 *
 * These are all genuine backend relations. There is deliberately no goals
 * fetch: the backend has no goals store, and career-direction preferences
 * ("this interests me" / "not for me") are not persisted either — see
 * docs/CAREER_PROFILE_BACKEND_GAPS.md.
 *
 * Guests have no persisted profile; the hook simply stays in an empty,
 * not-loading state so the UI can show its sign-up prompt.
 */

export interface MarketPosting {
  title: string;
  skills: string[] | null;
}

export interface CareerProfileData {
  loading: boolean;
  /** Skills the student has recorded, newest first. */
  recordedSkills: RecordedSkill[];
  /** Evidence dossier items, newest first. */
  evidence: EvidenceItemRow[];
  /** Titles of roles behind the student's saved opportunities. */
  targetRoles: string[];
  /** Currently active external postings, used for market signals. */
  postings: MarketPosting[];
}

interface EvidenceListResult {
  ok: boolean;
  data?: EvidenceItemRow[];
}

export function useCareerProfileData(enabled: boolean): CareerProfileData {
  const [loading, setLoading] = useState(enabled);
  const [recordedSkills, setRecordedSkills] = useState<RecordedSkill[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItemRow[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [postings, setPostings] = useState<MarketPosting[]>([]);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setRecordedSkills([]);
      setEvidence([]);
      setTargetRoles([]);
      setPostings([]);
      return;
    }

    // Current postings back the "market signal" lines for every viewer.
    const { data: postingsData } = await supabase
      .from('job_postings')
      .select('title, skills')
      .eq('status', 'active')
      .eq('is_external', true)
      .order('created_at', { ascending: false })
      .limit(80);
    setPostings(
      (postingsData ?? []).map((row) => ({
        title: row.title,
        skills: row.skills ?? [],
      })),
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    const [skillsRes, evidenceRes, savedRes] = await Promise.all([
      supabase
        .from('user_skills')
        .select('skill_name, proficiency')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(30),
      listEvidenceItems(supabase) as Promise<EvidenceListResult>,
      supabase.from('saved_jobs').select('job_id').eq('user_id', userId).limit(10),
    ]);

    setRecordedSkills(
      (skillsRes.data ?? []).map((row) => ({
        name: row.skill_name,
        proficiency: row.proficiency,
      })),
    );

    setEvidence(evidenceRes.ok ? (evidenceRes.data ?? []) : []);

    // Saved opportunities are the product's persisted "role I'm aiming at"
    // signal. Fetch the posting titles for the saved job ids in a second
    // query (the same pattern Markets.tsx uses).
    const jobIds = (savedRes.data ?? [])
      .map((row) => row.job_id)
      .filter((id): id is string => typeof id === 'string');
    if (jobIds.length > 0) {
      const postingsRes = await supabase
        .from('job_postings')
        .select('title')
        .in('id', jobIds);
      const titles = new Set<string>();
      for (const row of postingsRes.data ?? []) {
        const title = row.title?.trim();
        if (title) titles.add(title);
      }
      setTargetRoles([...titles]);
    } else {
      setTargetRoles([]);
    }

    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, recordedSkills, evidence, targetRoles, postings };
}
