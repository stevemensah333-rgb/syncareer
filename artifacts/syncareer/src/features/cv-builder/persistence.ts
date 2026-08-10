import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import type { CVData } from './types';

/**
 * Authoritative CV persistence path.
 *
 * The `resumes` table is created/managed in Lovable Cloud and is not defined by
 * any tracked migration, so the code MUST NOT assume a particular unique
 * constraint. In particular it must not rely on `UPSERT ... ON CONFLICT
 * (user_id, is_primary)` — that requires a `UNIQUE (user_id, is_primary)`
 * index which is not verifiable from repository schema evidence and fails with
 * PostgREST error 42P10 when absent.
 *
 * Instead we use a documented, constraint-free ownership rule:
 *   * a user owns at most one "primary" CV, identified by
 *     `user_id = auth.uid() AND is_primary = true`;
 *   * saving performs a read of that row, updates it in place by its stable
 *     `id`, or inserts a new row when none exists.
 *
 * RLS remains the security authority for ownership; this module also scopes
 * every read/write by `user_id` taken from the authenticated session as
 * defence in depth. No service-role key is used and RLS is not weakened.
 */

export type CvSaveErrorCategory = 'auth-expired' | 'permission' | 'network' | 'server';

export interface CvValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export type CvValidationResult =
  | { ok: true; errors: null }
  | { ok: false; errors: CvValidationErrors };

export type CvSaveResult =
  | { ok: true; resumeId: string | null }
  | {
      ok: false;
      category: 'validation';
      code: null;
      userMessage: string;
      fieldErrors: CvValidationErrors;
    }
  | { ok: false; category: CvSaveErrorCategory; code: string | null; userMessage: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client shape used by the CV persistence functions. */
export type CvPersistenceClient = Pick<SupabaseClient<Database>, 'from'>;

/**
 * Required fields for a save. Rejects before any network/database request so
 * the user gets a field-level message instead of a generic server error.
 */
export function validateCVData(cv: CVData): CvValidationResult {
  const errors: CvValidationErrors = {};
  if (!cv.personal.firstName.trim()) errors.firstName = 'First name is required.';
  if (!cv.personal.lastName.trim()) errors.lastName = 'Last name is required.';
  const email = cv.personal.email.trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, errors: null };
}

export function firstValidationError(errors: CvValidationErrors): string {
  return errors.firstName ?? errors.lastName ?? errors.email ?? 'Please review the highlighted fields.';
}

/** DB columns derived from the CV form state. */
export interface CvResumeColumns {
  title: string;
  template: string;
  personal_info: Json;
  education: Json;
  experience: Json;
  projects: Json;
  achievements: Json;
  skills: Json;
  references_section: string | null;
}

/** Map CV form state to the `resumes` columns (JSON sections). */
export function cvDataToResumeColumns(cv: CVData): CvResumeColumns {
  const first = cv.personal.firstName.trim();
  const last = cv.personal.lastName.trim();
  const name = `${first} ${last}`.trim();
  return {
    title: name ? `${name} CV` : 'My CV',
    template: 'basic',
    personal_info: cv.personal,
    education: [cv.education],
    experience: cv.experience,
    projects: cv.projects,
    achievements: cv.achievements,
    skills: cv.skills,
    // Normalize empty optional field to null (invariant: no empty strings where
    // the DB expects null).
    references_section: cv.references.trim() ? cv.references : null,
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Map a `resumes` row back to CV form state (used on load/refresh). */
export function resumeRowToCVData(row: {
  personal_info?: Json | null;
  education?: Json | null;
  experience?: Json | null;
  projects?: Json | null;
  achievements?: Json | null;
  skills?: Json | null;
  references_section?: string | null;
}): CVData {
  const pi = asObject(row.personal_info);
  const edu = Array.isArray(row.education) ? asObject((row.education as unknown[])[0]) : asObject(row.education);
  return {
    personal: {
      firstName: asString(pi.firstName) || asString(pi.first_name),
      lastName: asString(pi.lastName) || asString(pi.last_name),
      phone: asString(pi.phone),
      nationality: asString(pi.nationality),
      email: asString(pi.email),
      schoolEmail: asString(pi.schoolEmail) || asString(pi.school_email),
      linkedIn: asString(pi.linkedIn) || asString(pi.linkedin),
    },
    education: {
      university: asString(edu.university),
      location: asString(edu.location),
      degree: asString(edu.degree),
      graduationDate: asString(edu.graduationDate) || asString(edu.graduation_date),
      gpa: asString(edu.gpa),
    },
    achievements: Array.isArray(row.achievements) ? (row.achievements as CVData['achievements']) : [],
    experience: Array.isArray(row.experience) ? (row.experience as CVData['experience']) : [],
    projects: Array.isArray(row.projects) ? (row.projects as CVData['projects']) : [],
    // `activities` has no column in the `resumes` table; it is intentionally not
    // persisted and resets to an empty list on reload.
    activities: [],
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
    references: asString(row.references_section) || 'Available upon request',
  };
}

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

const AUTH_MSG = 'Your session has expired. Please sign in again to save your CV.';
const PERMISSION_MSG = 'You do not have permission to save this CV. Please refresh and try again.';
const NETWORK_MSG = 'Could not reach the server. Check your connection and try again.';
const SERVER_MSG = 'Something went wrong while saving your CV. Your changes are safe. Please try again.';

/**
 * Map an underlying error to a safe user message and a stable, diagnostic-safe
 * category. Never surfaces raw SQL, tokens, keys, or sensitive payloads — only
 * the PostgREST error code (which is not a secret) is preserved for diagnostics.
 */
export function classifySaveError(err: unknown): {
  ok: false;
  category: CvSaveErrorCategory;
  code: string | null;
  userMessage: string;
} {
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
 * Load the user's primary CV. Returns null when the user has no saved CV yet.
 */
export async function loadPrimaryCV(
  client: CvPersistenceClient,
  userId: string,
): Promise<{ cv: CVData; resumeId: string } | null> {
  const { data, error } = await client
    .from('resumes')
    .select('id, personal_info, education, experience, projects, achievements, skills, references_section')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { cv: resumeRowToCVData(data), resumeId: data.id };
}

/**
 * Save the user's primary CV. Validates first, then reads the user's existing
 * primary row and either updates it in place (by its stable id, scoped to the
 * authenticated user) or inserts a new row. Never uses an upsert whose
 * conflict target depends on an unverified unique constraint.
 */
export async function savePrimaryCV(
  client: CvPersistenceClient,
  userId: string,
  cv: CVData,
): Promise<CvSaveResult> {
  const validation = validateCVData(cv);
  if (!validation.ok) {
    return {
      ok: false,
      category: 'validation',
      code: null,
      userMessage: firstValidationError(validation.errors),
      fieldErrors: validation.errors,
    };
  }

  const columns = cvDataToResumeColumns(cv);

  // Read the existing primary row (owned by this user) to obtain its stable id.
  const { data: existing, error: findError } = await client
    .from('resumes')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (findError) return classifySaveError(findError);

  if (existing?.id) {
    const { data, error } = await client
      .from('resumes')
      .update({ ...columns, is_primary: true })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id')
      .single();
    if (error) return classifySaveError(error);
    return { ok: true, resumeId: data?.id ?? existing.id };
  }

  const { data, error } = await client
    .from('resumes')
    .insert({ ...columns, user_id: userId, is_primary: true })
    .select('id')
    .single();
  if (error) return classifySaveError(error);
  return { ok: true, resumeId: data?.id ?? null };
}

/** Best-effort: mirror the CV skills into `user_skills` for SynAI. Never throws. */
export async function syncCVSkills(
  client: CvPersistenceClient,
  userId: string,
  skills: string[],
): Promise<void> {
  const meaningful = skills.map((s) => s.trim()).filter(Boolean);
  if (meaningful.length === 0) return;
  const rows = meaningful.map((skill) => ({
    user_id: userId,
    skill_name: skill,
    category: 'general',
    proficiency: 'intermediate',
    source: 'cv',
  }));
  await client.from('user_skills').upsert(rows, { onConflict: 'user_id,skill_name' });
}

export interface CvSaveToast {
  type: 'success' | 'error';
  message: string;
  action?: { label: string; onClick: () => void };
}

/**
 * Turn a save result into a safe, actionable toast spec. Success is emitted
 * only after the persistence call returned `ok: true`. Failures carry a
 * user-friendly message and a retry action only where retrying is safe.
 */
export function cvSaveToast(
  result: CvSaveResult,
  options?: { jobs?: number; onRetry?: () => void },
): CvSaveToast {
  if (result.ok) {
    const jobs = options?.jobs ?? 0;
    return {
      type: 'success',
      message:
        jobs > 0
          ? `CV saved! Your profile matches ${jobs} open position${jobs > 1 ? 's' : ''}.`
          : 'CV saved successfully!',
    };
  }

  if (result.category === 'network' || result.category === 'server') {
    return options?.onRetry
      ? { type: 'error', message: result.userMessage, action: { label: 'Retry', onClick: options.onRetry } }
      : { type: 'error', message: result.userMessage };
  }

  return { type: 'error', message: result.userMessage };
}
