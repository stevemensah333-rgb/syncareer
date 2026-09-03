import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  DashboardApplication,
  DashboardJob,
  DashboardSavedJob,
} from './continuation';

export type DashboardLoadError = 'assessment' | 'applications' | 'saved opportunities' | 'CV' | 'interview practice';

/** Recorded career direction from the most recent completed assessment. */
export interface DashboardDirection {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}

/** Recorded interview practice. Scores are intentionally excluded — the
 *  feedback is LLM output and is not treated as a metric. */
export interface DashboardInterview {
  total: number;
  lastRole: string | null;
  lastAt: string | null;
}

export interface DashboardDataBundle {
  assessmentDone: boolean;
  direction: DashboardDirection | null;
  applications: DashboardApplication[];
  savedJobs: DashboardSavedJob[];
  resume: unknown | null;
  interview: DashboardInterview;
  errors: DashboardLoadError[];
}

type DashboardClient = Pick<SupabaseClient<Database>, 'from'>;

type QueryResult = {
  data: unknown;
  error: unknown;
};

interface LiveApplicationRow {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  resume_url: string | null;
  job: unknown;
}

interface LiveSavedJobRow {
  job_id: string;
  created_at: string;
}

interface LiveInterviewRow {
  job_role: string | null;
  created_at: string | null;
}

export const DASHBOARD_APPLICATION_SELECT = `
  id, status, created_at, updated_at, resume_url,
  job:job_postings(id, title, company_name, location, employment_type, application_deadline)
`;

export const DASHBOARD_JOB_SELECT =
  'id, title, company_name, location, employment_type, application_deadline';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toDashboardJob(value: unknown): DashboardJob | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) return null;
  const id = stringValue(candidate.id);
  const title = stringValue(candidate.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    company_name: stringValue(candidate.company_name),
    location: stringValue(candidate.location),
    employment_type: stringValue(candidate.employment_type),
    application_deadline: stringValue(candidate.application_deadline),
  };
}

function toApplications(data: unknown): DashboardApplication[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((value) => {
    if (!isRecord(value)) return [];
    const row = value as unknown as LiveApplicationRow;
    if (
      typeof row.id !== 'string' ||
      typeof row.status !== 'string' ||
      typeof row.created_at !== 'string' ||
      typeof row.updated_at !== 'string'
    ) {
      return [];
    }
    return [{
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      next_action: null,
      next_action_due: null,
      resume_id: null,
      job_title_snapshot: null,
      company_name_snapshot: null,
      job: toDashboardJob(row.job),
    }];
  });
}

function toSavedRows(data: unknown): LiveSavedJobRow[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((value) => {
    if (!isRecord(value)) return [];
    const jobId = stringValue(value.job_id);
    const createdAt = stringValue(value.created_at);
    return jobId && createdAt ? [{ job_id: jobId, created_at: createdAt }] : [];
  });
}

function toJobMap(data: unknown): Map<string, DashboardJob> {
  const jobs = Array.isArray(data) ? data.map(toDashboardJob).filter((job): job is DashboardJob => Boolean(job)) : [];
  return new Map(jobs.map((job) => [job.id, job]));
}

function toDirection(data: unknown): DashboardDirection | null {
  if (!isRecord(data)) return null;
  const primary = stringValue(data.primary_interest);
  const secondary = stringValue(data.secondary_interest);
  const tertiary = stringValue(data.tertiary_interest);
  if (!primary && !secondary && !tertiary) return null;
  return { primary, secondary, tertiary };
}

function toInterview(data: unknown): DashboardInterview {
  if (!Array.isArray(data)) return { total: 0, lastRole: null, lastAt: null };
  const rows = data.flatMap((value): LiveInterviewRow[] => {
    if (!isRecord(value)) return [];
    return [{ job_role: stringValue(value.job_role), created_at: stringValue(value.created_at) }];
  });
  const latest = rows[0];
  return {
    total: rows.length,
    lastRole: latest?.job_role ?? null,
    lastAt: latest?.created_at ?? null,
  };
}

async function settle(request: PromiseLike<unknown>): Promise<QueryResult> {
  try {
    const result = await request;
    if (!isRecord(result) || !('data' in result) || !('error' in result)) {
      return { data: null, error: new Error('Unexpected database response') };
    }
    return { data: result.data, error: result.error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Loads Home from the columns and relationships that are verified on the live
 * Lovable database. In particular, saved_jobs has no live FK to job_postings,
 * so saved IDs and posting details are fetched separately instead of asking
 * PostgREST for an embedded relationship that does not exist.
 */
export async function loadDashboardData(
  client: DashboardClient,
  userId: string,
): Promise<DashboardDataBundle> {
  const [assessmentResult, applicationsResult, savedResult, resumeResult, interviewResult] = await Promise.all([
    settle(
      client
        .from('assessments')
        .select('completed_at, primary_interest, secondary_interest, tertiary_interest')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    settle(
      client
        .from('job_applications')
        .select(DASHBOARD_APPLICATION_SELECT)
        .eq('applicant_id', userId)
        .order('updated_at', { ascending: false })
        .limit(12),
    ),
    settle(
      client
        .from('saved_jobs')
        .select('job_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
    ),
    settle(
      client
        .from('resumes')
        .select('personal_info, education, experience, skills, projects, achievements, updated_at')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    settle(
      client
        .from('mock_interviews')
        .select('job_role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ),
  ]);

  const errors: DashboardLoadError[] = [];
  if (assessmentResult.error) errors.push('assessment');
  if (applicationsResult.error) errors.push('applications');
  if (savedResult.error) errors.push('saved opportunities');
  if (resumeResult.error) errors.push('CV');
  if (interviewResult.error) errors.push('interview practice');

  const savedRows = savedResult.error ? [] : toSavedRows(savedResult.data);
  let jobsById = new Map<string, DashboardJob>();

  if (savedRows.length > 0) {
    const postingResult = await settle(
      client
        .from('job_postings')
        .select(DASHBOARD_JOB_SELECT)
        .in('id', savedRows.map((row) => row.job_id)),
    );
    if (postingResult.error) {
      if (!errors.includes('saved opportunities')) errors.push('saved opportunities');
    } else {
      jobsById = toJobMap(postingResult.data);
    }
  }

  return {
    assessmentDone: !assessmentResult.error && Boolean(assessmentResult.data),
    direction: assessmentResult.error ? null : toDirection(assessmentResult.data),
    applications: applicationsResult.error ? [] : toApplications(applicationsResult.data),
    savedJobs: savedRows.map((row) => ({
      job_id: row.job_id,
      created_at: row.created_at,
      job: jobsById.get(row.job_id) ?? null,
    })),
    resume: resumeResult.error ? null : resumeResult.data,
    interview: interviewResult.error ? { total: 0, lastRole: null, lastAt: null } : toInterview(interviewResult.data),
    errors,
  };
}
