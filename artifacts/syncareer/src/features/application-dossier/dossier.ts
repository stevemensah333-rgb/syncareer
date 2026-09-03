import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  listApplicationEvidenceLinks,
  listApplicationRequirements,
  listEvidenceItems,
  listEvidenceSources,
  listResumeEvidenceLinks,
  type EvidenceResult,
} from '@/features/evidence/api';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  ResumeEvidenceLinkRow,
} from '@/features/evidence/types';
import type { WorkspaceApplication, WorkspaceInterview, WorkspaceResume } from '@/features/application-tracker/workspace';
import { classifyTrackerError, type TrackerWriteFailure } from '@/features/application-tracker/tracking';

/**
 * Data layer for the canonical Application Dossier page. The application row
 * is the only load whose failure removes the page; every other source degrades
 * to a per-section warning so partial outages never erase available records.
 */

export type DossierClient = SupabaseClient<Database>;

export type DossierLoadError = TrackerWriteFailure;

export interface DossierMentorRequest {
  id: string;
  status: string;
  request_type: string;
  goal: string;
  created_at: string | null;
  mentor_name: string | null;
  mentor_company: string | null;
}

export interface DossierEvidenceData {
  items: EvidenceItemRow[];
  sources: EvidenceSourceRow[];
  requirements: ApplicationRequirementRow[];
  links: ApplicationEvidenceLinkRow[];
  resumeLinks: ResumeEvidenceLinkRow[];
}

export interface DossierBundle {
  application: WorkspaceApplication;
  resumes: WorkspaceResume[];
  interviews: WorkspaceInterview[];
  mentorRequests: DossierMentorRequest[];
  evidence: DossierEvidenceData | null;
  evidenceError: DossierLoadError | null;
  resumesError: DossierLoadError | null;
  interviewsError: DossierLoadError | null;
  mentorRequestsError: DossierLoadError | null;
}

const APPLICATION_SELECT = `*, job:job_postings(title, location, employment_type, company_name, department, description, source, source_url, application_deadline, skills, experience_level, updated_at)`;

/** Loads one owned application. Returns null when the row does not exist or is not the caller's. */
export async function loadDossierApplication(
  client: DossierClient,
  applicationId: string,
  userId: string,
): Promise<{ application: WorkspaceApplication | null; error: DossierLoadError | null }> {
  try {
    const { data, error } = await client
      .from('job_applications')
      .select(APPLICATION_SELECT)
      .eq('id', applicationId)
      .eq('applicant_id', userId)
      .maybeSingle();
    if (error) return { application: null, error: classifyTrackerError(error) };
    return { application: (data as unknown as WorkspaceApplication) ?? null, error: null };
  } catch (err) {
    return { application: null, error: classifyTrackerError(err) };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Validates rows of the mentorship request feed (a Json RPC response) and
 * keeps only requests tied to the given application. Row shape is never
 * trusted; unexpected rows are skipped, not fatal.
 */
function mentorRequestsForApplication(rows: unknown, applicationId: string): DossierMentorRequest[] {
  if (!Array.isArray(rows)) return [];
  const requests: DossierMentorRequest[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== 'string') continue;
    if (row.job_application_id !== applicationId) continue;
    requests.push({
      id: row.id,
      status: text(row.status) ?? 'pending',
      request_type: text(row.request_type) ?? 'unspecified',
      goal: text(row.goal) ?? '',
      created_at: text(row.created_at),
      mentor_name: text(row.mentor_name),
      mentor_company: text(row.mentor_company),
    });
  }
  return requests;
}

async function loadMentorRequests(
  client: DossierClient,
  applicationId: string,
): Promise<{ requests: DossierMentorRequest[]; error: DossierLoadError | null }> {
  try {
    const { data, error } = await client.rpc('get_my_mentorship_requests');
    if (error) return { requests: [], error: classifyTrackerError(error) };
    return { requests: mentorRequestsForApplication(data, applicationId), error: null };
  } catch (err) {
    return { requests: [], error: classifyTrackerError(err) };
  }
}

interface OwnerRowsResult<T> {
  rows: T[];
  error: DossierLoadError | null;
}

async function loadOwnerRows<T>(
  query: PromiseLike<{ data: unknown; error: unknown }>,
  userId: string,
  pick: (row: unknown) => T | null,
): Promise<OwnerRowsResult<T>> {
  try {
    const { data, error } = await query;
    if (error) return { rows: [], error: classifyTrackerError(error) };
    const rows: T[] = [];
    for (const row of Array.isArray(data) ? data : []) {
      const picked = pick(row);
      if (picked !== null) rows.push(picked);
    }
    // Defence in depth: RLS enforces ownership server-side; this keeps a
    // mis-scoped response out of the UI if the generated contract changes.
    const owned = rows.filter((row) => (row as { user_id?: unknown }).user_id === userId);
    return { rows: owned, error: null };
  } catch (err) {
    return { rows: [], error: classifyTrackerError(err) };
  }
}

export interface DossierLoadState {
  bundle: DossierBundle | null;
  applicationError: DossierLoadError | null;
  notFound: boolean;
}

function firstEvidenceFailure(
  ...results: Array<EvidenceResult<unknown>>
): DossierLoadError | null {
  for (const result of results) {
    if (!result.ok) {
      return { ok: false, category: result.category, code: result.code, userMessage: result.userMessage };
    }
  }
  return null;
}

/**
 * Loads everything the dossier page renders. The application row is
 * authoritative; every other source resolves independently.
 */
export async function loadDossierBundle(
  client: DossierClient,
  applicationId: string,
  userId: string,
): Promise<DossierLoadState> {
  const { application, error } = await loadDossierApplication(client, applicationId, userId);
  if (error) return { bundle: null, applicationError: error, notFound: false };
  if (!application) return { bundle: null, applicationError: null, notFound: true };

  const [resumesResult, interviewsResult, mentorResult, evidenceItems, evidenceSources, requirements, links, resumeLinks] =
    await Promise.all([
      loadOwnerRows<WorkspaceResume>(
        client
          .from('resumes')
          .select('id, user_id, title, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        userId,
        (row) => (isRecord(row) && typeof row.id === 'string' ? (row as unknown as WorkspaceResume) : null),
      ),
      loadOwnerRows<WorkspaceInterview>(
        client
          .from('mock_interviews')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        userId,
        (row) => (isRecord(row) && typeof row.id === 'string' ? (row as unknown as WorkspaceInterview) : null),
      ),
      loadMentorRequests(client, applicationId),
      listEvidenceItems(client),
      listEvidenceSources(client),
      listApplicationRequirements(client, applicationId),
      listApplicationEvidenceLinks(client),
      listResumeEvidenceLinks(client),
    ]);

  const evidenceError = firstEvidenceFailure(evidenceItems, evidenceSources, requirements, links, resumeLinks);
  const evidence: DossierEvidenceData | null = evidenceError
    ? null
    : {
        items: evidenceItems.ok ? evidenceItems.data : [],
        sources: evidenceSources.ok ? evidenceSources.data : [],
        requirements: requirements.ok ? requirements.data : [],
        links: links.ok ? links.data : [],
        resumeLinks: resumeLinks.ok ? resumeLinks.data : [],
      };

  return {
    bundle: {
      application,
      resumes: resumesResult.rows,
      interviews: interviewsResult.rows,
      mentorRequests: mentorResult.requests,
      evidence,
      evidenceError,
      resumesError: resumesResult.error,
      interviewsError: interviewsResult.error,
      mentorRequestsError: mentorResult.error,
    },
    applicationError: null,
    notFound: false,
  };
}
