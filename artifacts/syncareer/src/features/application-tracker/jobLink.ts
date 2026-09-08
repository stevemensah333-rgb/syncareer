import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { classifyTrackerError, type TrackerWriteFailure } from './tracking';

/**
 * Opening an application from a job link the student pasted.
 *
 * The posting is read by the `ingest-job-link` edge function and stored on the
 * student's own application row, never in the shared `job_postings` table: one
 * student's pasted listing is not an opportunity for everyone else, and that
 * table is readable by every signed-in user.
 */

export interface ScrapedPosting {
  title: string | null;
  organisation: string | null;
  location: string | null;
  employmentType: string | null;
  deadline: string | null;
  description: string | null;
  requirements: string | null;
  skills: string[];
  sourceUrl: string;
  sourceHost: string;
}

export type JobLinkClient = Pick<SupabaseClient<Database>, 'from' | 'functions'>;

export type ReadJobLinkResult =
  | { ok: true; posting: ScrapedPosting }
  | { ok: false; userMessage: string };

const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Same rule the function enforces, applied early so obvious mistakes never leave the browser. */
export function validateJobLink(raw: string): { ok: true; url: string } | { ok: false; userMessage: string } {
  const value = raw.trim();
  if (!value) return { ok: false, userMessage: 'Paste the link to the job posting.' };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, userMessage: 'That does not look like a web address. It should start with https://' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, userMessage: 'Only links starting with http:// or https:// can be read.' };
  }
  if (!url.hostname.includes('.') || PRIVATE_HOST.test(url.hostname)) {
    return { ok: false, userMessage: 'That link does not point at a public job posting.' };
  }
  return { ok: true, url: url.toString() };
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}

/** Reads a posting from its public page. Writes nothing. */
export async function readJobLink(client: JobLinkClient, link: string): Promise<ReadJobLinkResult> {
  const validated = validateJobLink(link);
  if (!validated.ok) return validated;

  const { data, error } = await client.functions.invoke('ingest-job-link', { body: { url: validated.url } });

  if (error) {
    // The failure text the function returned is the useful one; the invoke
    // error itself only says "non-2xx".
    const context = (error as { context?: { text?: () => Promise<string> } }).context;
    if (context?.text) {
      const body = await context.text().catch(() => '');
      const parsed = body ? readError(JSON.parse(body || 'null')) : null;
      if (parsed) return { ok: false, userMessage: parsed };
    }
    return { ok: false, userMessage: 'That page could not be read right now. Try again, or paste the job description instead.' };
  }

  const message = readError(data);
  if (message) return { ok: false, userMessage: message };

  const posting = (data as { posting?: ScrapedPosting } | null)?.posting;
  if (!posting) {
    return { ok: false, userMessage: 'No job posting was found on that page. Paste the job description instead.' };
  }
  return { ok: true, posting };
}

export interface ManualPostingInput {
  title: string;
  organisation: string;
  description: string;
  sourceUrl?: string | null;
}

export type CreateApplicationResult =
  | { ok: true; applicationId: string }
  | TrackerWriteFailure;

/**
 * Opens an application workspace for a posting that has no `job_postings` row.
 * `job_id` stays null and the posting facts live in the owner-scoped snapshot
 * columns, exactly as they do for applications tracked from external sources.
 */
export async function createApplicationFromPosting(
  client: Pick<SupabaseClient<Database>, 'from'>,
  userId: string,
  posting: ScrapedPosting | ManualPostingInput,
): Promise<CreateApplicationResult> {
  const scraped = 'sourceHost' in posting ? posting : null;
  const sourceUrl = scraped ? scraped.sourceUrl : posting.sourceUrl?.trim() || null;

  try {
    const { data, error } = await client
      .from('job_applications')
      .insert({
        applicant_id: userId,
        job_id: null,
        status: 'pending',
        job_title_snapshot: (posting.title ?? '').trim() || 'Untitled role',
        company_name_snapshot: (posting.organisation ?? '').trim() || null,
        location_snapshot: scraped?.location ?? null,
        deadline_snapshot: scraped?.deadline ?? null,
        source_snapshot: scraped?.sourceHost ?? 'Added by you',
        source_url_snapshot: sourceUrl,
        job_description_snapshot: (posting.description ?? '').trim() || null,
        requirements_snapshot: scraped?.requirements ?? null,
      })
      .select('id')
      .single();

    if (error) return classifyTrackerError(error);
    return { ok: true, applicationId: data.id };
  } catch (err) {
    return classifyTrackerError(err);
  }
}
