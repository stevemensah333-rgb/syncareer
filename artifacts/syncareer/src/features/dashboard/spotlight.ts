import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  rankAndDeduplicateOpportunities,
  type OpportunityProfileSignals,
} from '@/features/opportunities/ranking';
import type { OpportunityJob } from '@/features/opportunities/opportunity';

export interface OpportunitySpotlight {
  jobs: OpportunityJob[];
  /** True when the postings source could not be loaded. */
  error: boolean;
}

type SpotlightClient = Pick<SupabaseClient<Database>, 'from'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Loads a small, ranked set of external opportunities for the Discover home,
 * excluding roles the student has already saved or applied to. Ordering reuses
 * the same explainable ranking the Opportunities page applies, so the home and
 * the full list agree on what "fits" — nothing here is fabricated or scored
 * beyond the persisted listing fields.
 */
export async function loadOpportunitySpotlight(
  client: SpotlightClient,
  profile: OpportunityProfileSignals,
  excludeJobIds: Set<string>,
  limit = 3,
): Promise<OpportunitySpotlight> {
  const result = await client
    .from('job_postings')
    .select('*')
    .eq('status', 'active')
    .eq('is_external', true)
    .order('created_at', { ascending: false })
    .limit(60);

  if (!isRecord(result) || result.error || !Array.isArray(result.data)) {
    return { jobs: [], error: true };
  }

  const jobs = result.data as OpportunityJob[];
  const ranked = rankAndDeduplicateOpportunities(jobs, profile)
    .map((entry) => entry.job)
    .filter((job) => !excludeJobIds.has(job.id))
    .slice(0, limit);

  return { jobs: ranked, error: false };
}
