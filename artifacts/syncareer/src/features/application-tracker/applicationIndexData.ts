import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  listApplicationEvidenceLinks,
  listEvidenceItems,
  listEvidenceSources,
  listOwnedApplicationRequirements,
  listResumeEvidenceLinks,
} from '@/features/evidence/api';
import { classifyTrackerError, type TrackerWriteFailure } from './tracking';
import type { WorkspaceApplication, WorkspaceResume } from './workspace';
import type { EvidenceIndexData } from './applicationIndex';

/**
 * Data layer for the Applications index. The application rows are
 * authoritative: if they fail, the page has nothing to show. CV titles and
 * evidence coverage are enrichment — when they fail the objects still render
 * without those facts rather than the page failing.
 */

export type ApplicationIndexClient = SupabaseClient<Database>;

const APPLICATION_SELECT =
  `*, job:job_postings(title, location, employment_type, company_name, department, source, source_url, application_deadline, skills, experience_level, updated_at)`;

export interface ApplicationIndexData {
  applications: WorkspaceApplication[];
  resumes: WorkspaceResume[];
  /** Null when the evidence relations could not be read. */
  evidence: EvidenceIndexData | null;
}

export type ApplicationIndexResult =
  | { ok: true; data: ApplicationIndexData }
  | { ok: false; error: TrackerWriteFailure };

async function loadResumes(client: ApplicationIndexClient, userId: string): Promise<WorkspaceResume[]> {
  const { data, error } = await client
    .from('resumes')
    .select('id, user_id, title, updated_at')
    .eq('user_id', userId);
  if (error || !Array.isArray(data)) return [];
  return data as unknown as WorkspaceResume[];
}

async function loadEvidence(client: ApplicationIndexClient): Promise<EvidenceIndexData | null> {
  const [requirements, links, items, sources, resumeLinks] = await Promise.all([
    listOwnedApplicationRequirements(client),
    listApplicationEvidenceLinks(client),
    listEvidenceItems(client),
    listEvidenceSources(client),
    listResumeEvidenceLinks(client),
  ]);
  if (!requirements.ok || !links.ok || !items.ok || !sources.ok || !resumeLinks.ok) return null;
  return {
    requirements: requirements.data,
    links: links.data,
    items: items.data,
    sources: sources.data,
    resumeLinks: resumeLinks.data,
  };
}

export async function loadApplicationIndex(
  client: ApplicationIndexClient,
  userId: string,
): Promise<ApplicationIndexResult> {
  try {
    const { data, error } = await client
      .from('job_applications')
      .select(APPLICATION_SELECT)
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: classifyTrackerError(error) };

    const [resumes, evidence] = await Promise.all([loadResumes(client, userId), loadEvidence(client)]);
    return {
      ok: true,
      data: {
        applications: (data ?? []) as unknown as WorkspaceApplication[],
        resumes,
        evidence,
      },
    };
  } catch (err) {
    return { ok: false, error: classifyTrackerError(err) };
  }
}
