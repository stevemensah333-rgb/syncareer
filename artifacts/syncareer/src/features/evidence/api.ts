import type { PostgrestError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  applicationCvSummarySchema,
  applicationEvidenceLinkSchema,
  applicationRequirementSchema,
  createEvidenceInputSchema,
  addEvidenceSourceInputSchema,
  evidenceItemSchema,
  evidenceSourceSchema,
  linkEvidenceInputSchema,
  linkEvidenceUsageInputSchema,
  resumeEvidenceLinkSchema,
  updateEvidenceInputSchema,
} from './validation';
import type {
  AddEvidenceSourceInput,
  ApplicationCvSummary,
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  CreateEvidenceInput,
  EvidenceItemRow,
  EvidenceSourceRow,
  LinkEvidenceInput,
  LinkEvidenceUsageInput,
  ResumeEvidenceLinkRow,
  UpdateEvidenceInput,
} from './types';
import { z } from 'zod';

/**
 * Evidence API — the single seam between the dossier feature and PostgREST.
 *
 * The evidence relations ship in `supabase/migrations/2026…evidence_dossier.sql`.
 * Lovable applies that migration and regenerates
 * `src/integrations/supabase/types.ts` through its supported Git
 * synchronisation; until that regeneration reaches a checkout, the generated
 * `Database` type does not describe the evidence tables or functions. The two
 * structural adapters below are the only code aware of that gap. Every result
 * — and every caller input — is validated at runtime by `validation.ts`, so a
 * stale wire shape fails loudly here instead of reaching the dossier UI.
 * When the regenerated types land, these adapters can be narrowed to the
 * generated ones without changing any call site.
 */

interface EvidenceWireError {
  message: string;
  code?: string | null;
  details?: unknown;
  hint?: unknown;
}

interface EvidenceWireQuery extends PromiseLike<{ data: unknown; error: EvidenceWireError | null }> {
  eq(column: string, value: unknown): EvidenceWireQuery;
  order(column: string, options?: { ascending?: boolean }): EvidenceWireQuery;
}

interface EvidenceWireClient {
  rpc(fn: string, args?: Record<string, unknown>): EvidenceWireQuery;
  from(table: string): {
    select(columns: string): EvidenceWireQuery;
  };
}

export type EvidenceClient = SupabaseClient<Database>;

function toWireClient(client: EvidenceClient): EvidenceWireClient {
  return client as unknown as EvidenceWireClient;
}

// ── Error classification ─────────────────────────────────────────────────
// Same taxonomy as the tracker and CV persistence seams; messages are safe
// for direct display and never include SQL, provider, or token details.

export type EvidenceErrorCategory = 'auth-expired' | 'permission' | 'network' | 'server';

export type EvidenceSuccess<T> = { ok: true; data: T };
export type EvidenceFailure = {
  ok: false;
  category: EvidenceErrorCategory;
  code: string | null;
  userMessage: string;
};
export type EvidenceResult<T> = EvidenceSuccess<T> | EvidenceFailure;

const AUTH_MSG = 'Your session has expired. Please sign in again.';
const PERMISSION_MSG = 'You do not have permission for this evidence action. Refresh and try again.';
const NETWORK_MSG = 'Could not reach the server. Check your connection and try again.';
const SERVER_MSG = 'Something went wrong. Your data has not been lost — please try again.';

export function classifyEvidenceError(err: unknown): EvidenceFailure {
  const code = err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : null;
  const rawMessage = err instanceof Error
    ? err.message
    : err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err ?? 'unknown error');
  const message = rawMessage.toLowerCase();
  const status = err && typeof err === 'object' && typeof (err as { status?: unknown }).status === 'number'
    ? (err as { status: number }).status
    : null;

  if (status === 401 || code === 'PGRST301' || message.includes('jwt expired') || message.includes('auth session missing')) {
    return { ok: false, category: 'auth-expired', code, userMessage: AUTH_MSG };
  }
  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('not available') ||
    message.includes('not found') ||
    message.includes('forbidden')
  ) {
    return { ok: false, category: 'permission', code, userMessage: PERMISSION_MSG };
  }
  if (message.includes('fetch failed') || message.includes('network') || message.includes('failed to fetch')) {
    return { ok: false, category: 'network', code, userMessage: NETWORK_MSG };
  }
  return { ok: false, category: 'server', code, userMessage: SERVER_MSG };
}

function postgrestError(error: EvidenceWireError): PostgrestError {
  return {
    message: error.message,
    code: error.code ?? null,
    details: error.details === undefined || error.details === null ? null : String(error.details),
    hint: error.hint === undefined || error.hint === null ? null : String(error.hint),
  } as PostgrestError;
}

function validate<T>(schema: { safeParse: (value: unknown) => z.SafeParseReturnType<unknown, T> }, value: unknown): EvidenceResult<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    // A shape the server sent but we cannot safely render.
    return classifyEvidenceError(new Error(`Evidence response failed validation: ${parsed.error.issues[0]?.message ?? 'unknown'}`));
  }
  return { ok: true, data: parsed.data };
}

async function callRpc<T>(
  client: EvidenceClient,
  fn: string,
  args: Record<string, unknown>,
  schema: { safeParse: (value: unknown) => z.SafeParseReturnType<unknown, T> },
): Promise<EvidenceResult<T>> {
  const wire = toWireClient(client);
  try {
    const { data, error } = await wire.rpc(fn, args);
    if (error) return classifyEvidenceError(postgrestError(error));
    return validate(schema, data);
  } catch (err) {
    return classifyEvidenceError(err);
  }
}

async function fetchRows<T>(
  client: EvidenceClient,
  table: string,
  schema: { safeParse: (value: unknown) => z.SafeParseReturnType<unknown, T> },
  order?: { column: string; ascending?: boolean },
): Promise<EvidenceResult<T[]>> {
  const wire = toWireClient(client);
  try {
    let query = wire.from(table).select('*');
    if (order) query = query.order(order.column, { ascending: order.ascending ?? false });
    const { data, error } = await query;
    if (error) return classifyEvidenceError(postgrestError(error));
    if (!Array.isArray(data)) {
      return classifyEvidenceError(new Error('Evidence list response was not an array'));
    }
    const rows: T[] = [];
    for (const row of data) {
      const parsed = schema.safeParse(row);
      if (parsed.success) rows.push(parsed.data);
    }
    return { ok: true, data: rows };
  } catch (err) {
    return classifyEvidenceError(err);
  }
}

// ── Reads ────────────────────────────────────────────────────────────────
// RLS scopes every read to the caller; no user filter is sent from the
// client because the client never decides identity.

export async function listEvidenceItems(client: EvidenceClient): Promise<EvidenceResult<EvidenceItemRow[]>> {
  return fetchRows(client, 'evidence_items', evidenceItemSchema, { column: 'created_at', ascending: false });
}

export async function listEvidenceSources(client: EvidenceClient): Promise<EvidenceResult<EvidenceSourceRow[]>> {
  return fetchRows(client, 'evidence_sources', evidenceSourceSchema, { column: 'created_at', ascending: true });
}

export async function listApplicationRequirements(
  client: EvidenceClient,
  applicationId: string,
): Promise<EvidenceResult<ApplicationRequirementRow[]>> {
  const wire = toWireClient(client);
  try {
    const { data, error } = await wire
      .from('application_requirements')
      .select('*')
      .eq('application_id', applicationId)
      .order('sort_order', { ascending: true });
    if (error) return classifyEvidenceError(postgrestError(error));
    if (!Array.isArray(data)) {
      return classifyEvidenceError(new Error('Requirement list response was not an array'));
    }
    const rows: ApplicationRequirementRow[] = [];
    for (const row of data) {
      const parsed = applicationRequirementSchema.safeParse(row);
      if (parsed.success) rows.push(parsed.data);
    }
    return { ok: true, data: rows };
  } catch (err) {
    return classifyEvidenceError(err);
  }
}

/** Every requirement the caller owns, across applications (RLS scopes the read). */
export async function listOwnedApplicationRequirements(
  client: EvidenceClient,
): Promise<EvidenceResult<ApplicationRequirementRow[]>> {
  return fetchRows(client, 'application_requirements', applicationRequirementSchema, { column: 'sort_order', ascending: true });
}

export async function listApplicationEvidenceLinks(client: EvidenceClient): Promise<EvidenceResult<ApplicationEvidenceLinkRow[]>> {
  return fetchRows(client, 'application_evidence_links', applicationEvidenceLinkSchema, { column: 'created_at', ascending: true });
}

export async function listResumeEvidenceLinks(client: EvidenceClient): Promise<EvidenceResult<ResumeEvidenceLinkRow[]>> {
  return fetchRows(client, 'resume_evidence_links', resumeEvidenceLinkSchema, { column: 'created_at', ascending: true });
}

const requirementsImportSchema = z.object({
  imported: z.number().int().nonnegative(),
  requirements: z.array(applicationRequirementSchema),
});

export async function initializeApplicationRequirements(
  client: EvidenceClient,
  applicationId: string,
): Promise<EvidenceResult<{ imported: number; requirements: ApplicationRequirementRow[] }>> {
  return callRpc(client, 'initialize_application_requirements', { p_application_id: applicationId }, requirementsImportSchema);
}

// ── Writes ───────────────────────────────────────────────────────────────

export async function createEvidenceItem(
  client: EvidenceClient,
  input: CreateEvidenceInput,
): Promise<EvidenceResult<EvidenceItemRow>> {
  const parsedInput = createEvidenceInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the evidence details and try again.' };
  }
  return callRpc(client, 'create_evidence_item', {
    p_category: parsedInput.data.category,
    p_title: parsedInput.data.title,
    p_summary: parsedInput.data.summary,
    p_occurred_on: parsedInput.data.occurredOn ?? null,
  }, evidenceItemSchema);
}

export async function updateEvidenceItem(
  client: EvidenceClient,
  input: UpdateEvidenceInput,
): Promise<EvidenceResult<EvidenceItemRow>> {
  const parsedInput = updateEvidenceInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the evidence details and try again.' };
  }
  return callRpc(client, 'update_evidence_item', {
    p_evidence_id: parsedInput.data.evidenceId,
    p_category: parsedInput.data.category ?? null,
    p_title: parsedInput.data.title ?? null,
    p_summary: parsedInput.data.summary ?? null,
    p_occurred_on: parsedInput.data.occurredOn ?? null,
  }, evidenceItemSchema);
}

export async function confirmEvidenceItem(client: EvidenceClient, evidenceId: string): Promise<EvidenceResult<EvidenceItemRow>> {
  return callRpc(client, 'confirm_evidence_item', { p_evidence_id: evidenceId }, evidenceItemSchema);
}

export async function archiveEvidenceItem(client: EvidenceClient, evidenceId: string): Promise<EvidenceResult<EvidenceItemRow>> {
  return callRpc(client, 'archive_evidence_item', { p_evidence_id: evidenceId }, evidenceItemSchema);
}

export async function addEvidenceSource(
  client: EvidenceClient,
  input: AddEvidenceSourceInput,
): Promise<EvidenceResult<EvidenceSourceRow>> {
  const parsedInput = addEvidenceSourceInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the source details and try again.' };
  }
  return callRpc(client, 'add_evidence_source', {
    p_evidence_id: parsedInput.data.evidenceId,
    p_source_type: parsedInput.data.sourceType,
    p_source_label: parsedInput.data.sourceLabel,
    p_source_excerpt: parsedInput.data.sourceExcerpt,
    p_entry_locator: parsedInput.data.entryLocator ?? null,
    p_source_url: parsedInput.data.sourceUrl ?? null,
    p_resume_id: parsedInput.data.resumeId ?? null,
    p_interview_id: parsedInput.data.interviewId ?? null,
  }, evidenceSourceSchema);
}

export async function removeEvidenceSource(client: EvidenceClient, sourceId: string): Promise<EvidenceResult<EvidenceSourceRow>> {
  return callRpc(client, 'remove_evidence_source', { p_source_id: sourceId }, evidenceSourceSchema);
}

export async function linkEvidenceToRequirement(
  client: EvidenceClient,
  input: LinkEvidenceInput,
): Promise<EvidenceResult<ApplicationEvidenceLinkRow>> {
  const parsedInput = linkEvidenceInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the link details and try again.' };
  }
  return callRpc(client, 'link_evidence_to_requirement', {
    p_requirement_id: parsedInput.data.requirementId,
    p_evidence_id: parsedInput.data.evidenceId,
    p_relevance_note: parsedInput.data.relevanceNote ?? null,
  }, applicationEvidenceLinkSchema);
}

export async function unlinkEvidenceFromRequirement(
  client: EvidenceClient,
  requirementId: string,
  evidenceId: string,
): Promise<EvidenceResult<ApplicationEvidenceLinkRow>> {
  return callRpc(client, 'unlink_evidence_from_requirement', {
    p_requirement_id: requirementId,
    p_evidence_id: evidenceId,
  }, applicationEvidenceLinkSchema);
}

export async function linkEvidenceToResumeEntry(
  client: EvidenceClient,
  input: LinkEvidenceUsageInput,
): Promise<EvidenceResult<ResumeEvidenceLinkRow>> {
  const parsedInput = linkEvidenceUsageInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the CV usage details and try again.' };
  }
  return callRpc(client, 'link_evidence_to_resume_entry', {
    p_resume_id: parsedInput.data.resumeId,
    p_evidence_id: parsedInput.data.evidenceId,
    p_cv_section: parsedInput.data.cvSection,
    p_entry_locator: parsedInput.data.entryLocator,
  }, resumeEvidenceLinkSchema);
}

export async function unlinkEvidenceFromResumeEntry(
  client: EvidenceClient,
  input: LinkEvidenceUsageInput,
): Promise<EvidenceResult<ResumeEvidenceLinkRow>> {
  const parsedInput = linkEvidenceUsageInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Check the CV usage details and try again.' };
  }
  return callRpc(client, 'unlink_evidence_from_resume_entry', {
    p_resume_id: parsedInput.data.resumeId,
    p_evidence_id: parsedInput.data.evidenceId,
    p_cv_section: parsedInput.data.cvSection,
    p_entry_locator: parsedInput.data.entryLocator,
  }, resumeEvidenceLinkSchema);
}

export async function addManualApplicationRequirement(
  client: EvidenceClient,
  applicationId: string,
  label: string,
  detail?: string | null,
): Promise<EvidenceResult<ApplicationRequirementRow>> {
  const trimmedLabel = label.trim();
  const trimmedDetail = detail?.trim() || null;
  if (trimmedLabel.length < 1 || trimmedLabel.length > 160) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Requirement name must be between 1 and 160 characters.' };
  }
  if (trimmedDetail && trimmedDetail.length > 1000) {
    return { ok: false, category: 'server', code: 'INVALID_INPUT', userMessage: 'Requirement detail must be at most 1000 characters.' };
  }
  return callRpc(client, 'add_manual_application_requirement', {
    p_application_id: applicationId,
    p_label: trimmedLabel,
    p_detail: trimmedDetail,
  }, applicationRequirementSchema);
}

export async function removeApplicationRequirement(
  client: EvidenceClient,
  requirementId: string,
): Promise<EvidenceResult<ApplicationRequirementRow>> {
  return callRpc(client, 'remove_application_requirement', { p_requirement_id: requirementId }, applicationRequirementSchema);
}

export async function createApplicationCv(
  client: EvidenceClient,
  applicationId: string,
  sourceResumeId: string,
): Promise<EvidenceResult<ApplicationCvSummary>> {
  return callRpc(client, 'create_application_cv', {
    p_application_id: applicationId,
    p_source_resume_id: sourceResumeId,
  }, applicationCvSummarySchema);
}
