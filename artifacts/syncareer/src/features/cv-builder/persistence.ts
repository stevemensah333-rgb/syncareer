import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import type { CVData } from './types';
import { computeCVCompletion, isMeaningfulText } from './scoring';

/**
 * Authoritative CV persistence path.
 *
 * Repository evidence verifies the generated `resumes` columns used here, but
 * no tracked migration verifies a unique constraint for `(user_id,
 * is_primary)`. Saving therefore never uses an unverified ON CONFLICT target.
 * It loads the latest owned primary row, updates that stable id, or inserts the
 * first row. RLS remains the authorization authority; every query is also
 * scoped to the authenticated `user_id` as defence in depth.
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

export type CvPersistenceFailure = {
  ok: false;
  category: CvSaveErrorCategory;
  code: string | null;
  userMessage: string;
};

export type CvSaveResult =
  | { ok: true; resumeId: string }
  | {
      ok: false;
      category: 'validation';
      code: null;
      userMessage: string;
      fieldErrors: CvValidationErrors;
    }
  | CvPersistenceFailure;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDITOR_METADATA_KEY = '_syncareer';
const EDITOR_SCHEMA_VERSION = 1;

export type CvPersistenceClient = Pick<SupabaseClient<Database>, 'from'>;

export function validateCVData(cv: CVData): CvValidationResult {
  const errors: CvValidationErrors = {};
  if (!isMeaningfulText(cv.personal.firstName)) errors.firstName = 'First name is required.';
  if (!isMeaningfulText(cv.personal.lastName)) errors.lastName = 'Last name is required.';
  const email = cv.personal.email.trim();
  if (!isMeaningfulText(email)) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, errors: null };
}

export function firstValidationError(errors: CvValidationErrors): string {
  return errors.firstName ?? errors.lastName ?? errors.email ?? 'Please review the highlighted fields.';
}

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

/**
 * Maps editor state to verified `resumes` columns. The generated schema has no
 * `activities` column, so Activities are kept in a versioned, namespaced value
 * inside the existing `personal_info` JSON document. Legacy readers ignore the
 * unknown key; this editor restores it. No schema or RLS change is required.
 */
export function cvDataToResumeColumns(cv: CVData): CvResumeColumns {
  const first = cv.personal.firstName.trim();
  const last = cv.personal.lastName.trim();
  const name = `${first} ${last}`.trim();
  return {
    title: name ? `${name} CV` : 'My CV',
    template: 'basic',
    personal_info: {
      firstName: cv.personal.firstName,
      lastName: cv.personal.lastName,
      phone: cv.personal.phone,
      nationality: cv.personal.nationality,
      email: cv.personal.email,
      schoolEmail: cv.personal.schoolEmail,
      linkedIn: cv.personal.linkedIn,
      [EDITOR_METADATA_KEY]: {
        version: EDITOR_SCHEMA_VERSION,
        activities: cv.activities.map((activity) => ({
          id: activity.id,
          organization: activity.organization,
          activity: activity.activity,
          date: activity.date,
          role: activity.role,
          bullets: [...activity.bullets],
        })),
      },
    },
    education: [{
      university: cv.education.university,
      location: cv.education.location,
      degree: cv.education.degree,
      graduationDate: cv.education.graduationDate,
      gpa: cv.education.gpa,
    }],
    experience: cv.experience.map((entry) => ({
      id: entry.id,
      company: entry.company,
      location: entry.location,
      date: entry.date,
      role: entry.role,
      bullets: [...entry.bullets],
    })),
    projects: cv.projects.map((entry) => ({
      id: entry.id,
      organization: entry.organization,
      date: entry.date,
      projectName: entry.projectName,
      role: entry.role,
      bullets: [...entry.bullets],
    })),
    achievements: cv.achievements.map((entry) => ({
      id: entry.id,
      title: entry.title,
      organization: entry.organization,
      date: entry.date,
    })),
    skills: [...cv.skills],
    references_section: cv.references.trim() ? cv.references : null,
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseAchievements(value: unknown): CVData['achievements'] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const entry = asObject(raw);
    return {
      id: asString(entry.id) || `stored-achievement-${index}`,
      title: asString(entry.title),
      organization: asString(entry.organization),
      date: asString(entry.date),
    };
  });
}

function parseExperience(value: unknown): CVData['experience'] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const entry = asObject(raw);
    return {
      id: asString(entry.id) || `stored-experience-${index}`,
      company: asString(entry.company),
      location: asString(entry.location),
      date: asString(entry.date),
      role: asString(entry.role),
      bullets: asStringArray(entry.bullets),
    };
  });
}

function parseProjects(value: unknown): CVData['projects'] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const entry = asObject(raw);
    return {
      id: asString(entry.id) || `stored-project-${index}`,
      organization: asString(entry.organization),
      date: asString(entry.date),
      projectName: asString(entry.projectName) || asString(entry.project_name),
      role: asString(entry.role),
      bullets: asStringArray(entry.bullets),
    };
  });
}

function parseActivities(value: unknown): CVData['activities'] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const entry = asObject(raw);
    return {
      id: asString(entry.id) || `stored-activity-${index}`,
      organization: asString(entry.organization),
      activity: asString(entry.activity),
      date: asString(entry.date),
      role: asString(entry.role),
      bullets: asStringArray(entry.bullets),
    };
  });
}

/** Runtime-safe mapping of untrusted stored JSON back into editor state. */
export function resumeRowToCVData(row: {
  personal_info?: Json | null;
  education?: Json | null;
  experience?: Json | null;
  projects?: Json | null;
  achievements?: Json | null;
  skills?: Json | null;
  references_section?: string | null;
}): CVData {
  const personal = asObject(row.personal_info);
  const metadata = asObject(personal[EDITOR_METADATA_KEY]);
  const educationValue = Array.isArray(row.education) ? row.education[0] : row.education;
  const education = asObject(educationValue);
  const legacyFullName = asString(personal.fullName) || asString(personal.full_name);
  const [legacyFirstName = '', ...legacyLastNameParts] = legacyFullName.trim().split(/\s+/);

  return {
    personal: {
      firstName: asString(personal.firstName) || asString(personal.first_name) || legacyFirstName,
      lastName: asString(personal.lastName) || asString(personal.last_name) || legacyLastNameParts.join(' '),
      phone: asString(personal.phone),
      nationality: asString(personal.nationality),
      email: asString(personal.email),
      schoolEmail: asString(personal.schoolEmail) || asString(personal.school_email),
      linkedIn: asString(personal.linkedIn) || asString(personal.linkedin),
    },
    education: {
      university: asString(education.university),
      location: asString(education.location),
      degree: asString(education.degree),
      graduationDate: asString(education.graduationDate) || asString(education.graduation_date),
      gpa: asString(education.gpa),
    },
    achievements: parseAchievements(row.achievements),
    experience: parseExperience(row.experience),
    projects: parseProjects(row.projects),
    activities: parseActivities(metadata.activities),
    skills: asStringArray(row.skills),
    references: asString(row.references_section),
  };
}

/** Shared completion calculation for database consumers such as Home. */
export function resumeRowCompletion(row: Parameters<typeof resumeRowToCVData>[0]): number {
  return computeCVCompletion(resumeRowToCVData(row)).percentage;
}

function errorCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? 'unknown error');
}

function errorStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

const AUTH_MSG = 'Your session has expired. Please sign in again to save your CV.';
const PERMISSION_MSG = 'You do not have permission to save this CV. Please refresh and try again.';
const NETWORK_MSG = 'Could not reach the server. Check your connection and try again.';
const SERVER_MSG = 'Something went wrong while saving your CV. Your changes are still here. Please try again.';

export function classifySaveError(error: unknown): CvPersistenceFailure {
  const code = errorCode(error);
  const message = errorMessage(error).toLowerCase();
  const status = errorStatus(error);

  if (
    status === 401
    || code === 'PGRST301'
    || code === 'JWTExpired'
    || code === 'AuthSessionMissingError'
    || code === 'NO_SESSION'
    || message.includes('jwt expired')
    || message.includes('invalid claim')
    || message.includes('auth session missing')
  ) {
    return { ok: false, category: 'auth-expired', code, userMessage: AUTH_MSG };
  }

  if (
    status === 403
    || code === '42501'
    || message.includes('row-level security')
    || message.includes('permission denied')
    || message.includes('insufficient_privilege')
    || message.includes('permission was denied')
  ) {
    return { ok: false, category: 'permission', code, userMessage: PERMISSION_MSG };
  }

  if (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('load failed')
    || message.includes('econnreset')
    || message.includes('econnrefused')
    || message.includes('fetch failed')
  ) {
    return { ok: false, category: 'network', code, userMessage: NETWORK_MSG };
  }

  return { ok: false, category: 'server', code, userMessage: SERVER_MSG };
}

export function classifyLoadError(error: unknown): CvPersistenceFailure {
  const failure = classifySaveError(error);
  const userMessage = failure.category === 'auth-expired'
    ? 'Your session has expired. Please sign in again to load your CV.'
    : failure.category === 'permission'
      ? 'You do not have permission to load this CV.'
      : failure.category === 'network'
        ? 'Could not load your saved CV. Check your connection and try again.'
        : 'Your saved CV could not be loaded. Please try again before editing.';
  return { ...failure, userMessage };
}

/** Logs only operation/category/code in development; never ids or CV content. */
export function logCvPersistenceFailure(
  operation: 'load' | 'save' | 'skills-sync' | 'intelligence-refresh',
  failure: Pick<CvPersistenceFailure, 'category' | 'code'>,
): void {
  if (!import.meta.env.DEV) return;
  console.error('[CV persistence]', {
    operation,
    table: operation === 'intelligence-refresh' ? undefined : 'resumes',
    category: failure.category,
    code: failure.code,
  });
}

export async function loadPrimaryCV(
  client: CvPersistenceClient,
  userId: string,
): Promise<{ cv: CVData; resumeId: string } | null> {
  if (!userId.trim()) throw { code: 'NO_SESSION', message: 'No authenticated user context' };

  const { data, error } = await client
    .from('resumes')
    .select('id, personal_info, education, experience, projects, achievements, skills, references_section')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { cv: resumeRowToCVData(data), resumeId: data.id };
}

async function updateOwnedResume(
  client: CvPersistenceClient,
  userId: string,
  resumeId: string,
  columns: CvResumeColumns,
): Promise<CvSaveResult | null> {
  const { data, error } = await client
    .from('resumes')
    .update({ ...columns, is_primary: true })
    .eq('id', resumeId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) return classifySaveError(error);
  return data?.id ? { ok: true, resumeId: data.id } : null;
}

/**
 * Creates or updates the authenticated user's primary CV. A known loaded id is
 * preferred. If it became stale, the function re-checks the latest owned
 * primary row before inserting. A success result always includes a row id
 * returned after persistence; an empty response is never reported as success.
 */
async function persistPrimaryCV(
  client: CvPersistenceClient,
  userId: string,
  cv: CVData,
  options?: { resumeId?: string | null },
): Promise<CvSaveResult> {
  if (!userId.trim()) return classifySaveError({ code: 'NO_SESSION', message: 'No authenticated user context' });

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

  if (options?.resumeId) {
    const knownUpdate = await updateOwnedResume(client, userId, options.resumeId, columns);
    if (knownUpdate) return knownUpdate;
  }

  const { data: existing, error: findError } = await client
    .from('resumes')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) return classifySaveError(findError);

  if (existing?.id) {
    const updateResult = await updateOwnedResume(client, userId, existing.id, columns);
    return updateResult ?? classifySaveError({ code: 'CV_UPDATE_NOT_CONFIRMED', message: 'No row returned after update' });
  }

  const { data, error } = await client
    .from('resumes')
    .insert({ ...columns, user_id: userId, is_primary: true })
    .select('id')
    .single();
  if (error) return classifySaveError(error);
  if (!data?.id) {
    return classifySaveError({ code: 'CV_INSERT_NOT_CONFIRMED', message: 'No row returned after insert' });
  }
  return { ok: true, resumeId: data.id };
}

export async function savePrimaryCV(
  client: CvPersistenceClient,
  userId: string,
  cv: CVData,
  options?: { resumeId?: string | null },
): Promise<CvSaveResult> {
  try {
    return await persistPrimaryCV(client, userId, cv, options);
  } catch (error) {
    return classifySaveError(error);
  }
}

/**
 * Loads one specific owned resume row (base or application-scoped) by id.
 * Returns null when the row does not exist or is not the caller's.
 */
export async function loadCvRow(
  client: CvPersistenceClient,
  userId: string,
  resumeId: string,
): Promise<{ cv: CVData } | null> {
  if (!userId.trim()) throw { code: 'NO_SESSION', message: 'No authenticated user context' };

  const { data, error } = await client
    .from('resumes')
    .select('id, personal_info, education, experience, projects, achievements, skills, references_section')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { cv: resumeRowToCVData(data) };
}

/**
 * Updates one specific owned resume row in place, preserving its primary
 * flag. Used by the application-scoped editor: the row already exists (it was
 * created explicitly through `create_application_cv`), so this never inserts
 * and never falls back to the primary CV. An empty update response is an
 * error, not a silent success.
 */
export async function saveCvRow(
  client: CvPersistenceClient,
  userId: string,
  resumeId: string,
  cv: CVData,
): Promise<CvSaveResult> {
  try {
    if (!userId.trim()) return classifySaveError({ code: 'NO_SESSION', message: 'No authenticated user context' });

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
    const { data, error } = await client
      .from('resumes')
      .update({ ...columns })
      .eq('id', resumeId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error) return classifySaveError(error);
    if (!data?.id) {
      return classifySaveError({ code: 'CV_UPDATE_NOT_CONFIRMED', message: 'No row returned after update' });
    }
    return { ok: true, resumeId: data.id };
  } catch (error) {
    return classifySaveError(error);
  }
}

/** Best-effort mirror for SynAI. The primary CV save does not depend on it. */
export async function syncCVSkills(
  client: CvPersistenceClient,
  userId: string,
  skills: string[],
): Promise<void> {
  const seen = new Set<string>();
  const meaningful = skills
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLocaleLowerCase();
      if (!isMeaningfulText(skill) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (meaningful.length === 0) return;

  const { error } = await client.from('user_skills').upsert(
    meaningful.map((skill) => ({
      user_id: userId,
      skill_name: skill,
      category: 'general',
      proficiency: 'intermediate',
      source: 'cv',
    })),
    { onConflict: 'user_id,skill_name' },
  );
  if (error) throw error;
}

export interface CvSaveToast {
  type: 'success' | 'error';
  message: string;
  action?: { label: string; onClick: () => void };
}

export function cvSaveToast(
  result: CvSaveResult,
  options?: { onRetry?: () => void },
): CvSaveToast {
  if (result.ok) return { type: 'success', message: 'CV saved successfully.' };
  if ((result.category === 'network' || result.category === 'server') && options?.onRetry) {
    return {
      type: 'error',
      message: result.userMessage,
      action: { label: 'Retry', onClick: options.onRetry },
    };
  }
  return { type: 'error', message: result.userMessage };
}
