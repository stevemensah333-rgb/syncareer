import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { normalizeApplicationNotes } from './workflow';

/**
 * Write seam for the application tracker (`job_applications` table).
 *
 * Mirrors the persistence conventions used by the CV feature: identity
 * always comes from the authenticated session, ownership is enforced by RLS
 * with explicit `eq` scoping as defence in depth, errors are classified into
 * safe, user-presentable categories (never raw SQL/tokens), and no remote
 * schema assumptions are introduced.
 */

export type TrackerClient = Pick<SupabaseClient<Database>, 'from'>;

export type TrackerErrorCategory = 'auth-expired' | 'permission' | 'network' | 'server';

export type TrackerWriteSuccess = { ok: true };
export type TrackerWriteFailure = {
  ok: false;
  category: TrackerErrorCategory;
  code: string | null;
  userMessage: string;
};
export type TrackerWriteResult = TrackerWriteSuccess | TrackerWriteFailure;

export type TrackApplicationResult =
  | { ok: true; applicationId: string | null; alreadyTracked: boolean }
  | TrackerWriteFailure;

const AUTH_MSG = 'Your session has expired. Please sign in again.';
const PERMISSION_MSG = 'You do not have permission to change this application. Please refresh and try again.';
const NETWORK_MSG = 'Could not reach the server. Check your connection and try again.';
const SERVER_MSG = 'Something went wrong. Your data has not been lost — please try again.';

function errorCode(err: unknown): string | null {
  if (err && typeof err === 'object') {
    const code = (err as Record<string, unknown>).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const message = (err as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return String(err ?? 'unknown error');
}

function errorStatus(err: unknown): number | null {
  if (err && typeof err === 'object') {
    const status = (err as Record<string, unknown>).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/**
 * Classify an underlying error into a stable, diagnostic-safe category and a
 * safe user message. Only the PostgREST error code (not a secret) is kept
 * for diagnostics. Same rule set as the CV persistence classifier.
 */
export function classifyTrackerError(err: unknown): TrackerWriteFailure {
  const code = errorCode(err);
  const message = errorMessage(err).toLowerCase();
  const status = errorStatus(err);

  if (
    status === 401 ||
    code === 'PGRST301' ||
    code === 'JWTExpired' ||
    code === 'AuthSessionMissingError' ||
    code === 'NO_SESSION' ||
    message.includes('jwt expired') ||
    message.includes('invalid claim') ||
    message.includes('auth session missing')
  ) {
    return { ok: false, category: 'auth-expired', code, userMessage: AUTH_MSG };
  }

  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('insufficient_privilege') ||
    message.includes('permission was denied')
  ) {
    return { ok: false, category: 'permission', code, userMessage: PERMISSION_MSG };
  }

  if (
    code === null &&
    (message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('load failed') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('fetch failed'))
  ) {
    return { ok: false, category: 'network', code: null, userMessage: NETWORK_MSG };
  }

  return { ok: false, category: 'server', code, userMessage: SERVER_MSG };
}

/**
 * Start tracking an application for a job. This is the single path that
 * turns an opportunity into a tracked application, whether the user applied
 * on an external source site or through a native (non-external) posting.
 *
 * Duplicate-safe: checks for an existing row first, and also maps a unique
 * violation (23505) to `alreadyTracked` instead of an error.
 */
export async function startTrackingApplication(
  client: TrackerClient,
  userId: string,
  jobId: string,
): Promise<TrackApplicationResult> {
  try {
    const { data: existing, error: findError } = await client
      .from('job_applications')
      .select('id')
      .eq('applicant_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (findError) return classifyTrackerError(findError);
    if (existing?.id) return { ok: true, applicationId: existing.id, alreadyTracked: true };

    const { data, error } = await client
      .from('job_applications')
      .insert({ job_id: jobId, applicant_id: userId, status: 'pending' })
      .select('id')
      .single();

    if (error) {
      if (errorCode(error) === '23505') {
        return { ok: true, applicationId: null, alreadyTracked: true };
      }
      return classifyTrackerError(error);
    }
    return { ok: true, applicationId: data?.id ?? null, alreadyTracked: false };
  } catch (err) {
    return classifyTrackerError(err);
  }
}

/** Record a new user-reported status on a tracked application. */
export async function updateApplicationStatus(
  client: TrackerClient,
  applicationId: string,
  status: string,
): Promise<TrackerWriteResult> {
  try {
    const { error } = await client
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId);
    if (error) return classifyTrackerError(error);
    return { ok: true };
  } catch (err) {
    return classifyTrackerError(err);
  }
}

/** Save notes on a tracked application (blank saves as null). */
export async function saveApplicationNotes(
  client: TrackerClient,
  applicationId: string,
  notes: string,
): Promise<TrackerWriteResult> {
  try {
    const { error } = await client
      .from('job_applications')
      .update({ notes: normalizeApplicationNotes(notes) })
      .eq('id', applicationId);
    if (error) return classifyTrackerError(error);
    return { ok: true };
  } catch (err) {
    return classifyTrackerError(err);
  }
}

/** Remove a tracked application entirely (user-owned row, RLS-scoped). */
export async function removeApplicationRecord(
  client: TrackerClient,
  applicationId: string,
): Promise<TrackerWriteResult> {
  try {
    const { error } = await client
      .from('job_applications')
      .delete()
      .eq('id', applicationId);
    if (error) return classifyTrackerError(error);
    return { ok: true };
  } catch (err) {
    return classifyTrackerError(err);
  }
}
