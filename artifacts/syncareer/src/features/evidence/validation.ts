import { z } from 'zod';
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

/**
 * Runtime validation for every row that crosses the evidence API boundary.
 * The database is the source of truth for the shapes, but reads are still
 * validated so drift, partial data, or a stale generated type cannot put a
 * malformed row into the dossier UI.
 */

export const EVIDENCE_CATEGORIES = [
  'work',
  'project',
  'education',
  'achievement',
  'leadership',
  'volunteering',
  'other',
] as const;

export const EVIDENCE_REVIEW_STATUSES = ['draft', 'confirmed', 'archived'] as const;

export const EVIDENCE_SOURCE_TYPES = [
  'resume_entry',
  'interview_response',
  'url',
  'manual_note',
] as const;

export const RESUME_EVIDENCE_SECTIONS = [
  'experience',
  'projects',
  'activities',
  'education',
  'achievements',
  'skills',
] as const;

const uuid = z.string().uuid();
const isoTimestamp = z.string().min(1);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

export const evidenceItemSchema = z.object({
  id: uuid,
  user_id: uuid,
  category: z.enum(EVIDENCE_CATEGORIES),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1200),
  occurred_on: isoDate.nullable(),
  review_status: z.enum(EVIDENCE_REVIEW_STATUSES),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
}) satisfies z.ZodType<EvidenceItemRow>;

export const evidenceSourceSchema = z.object({
  id: uuid,
  evidence_id: uuid,
  user_id: uuid,
  source_type: z.enum(EVIDENCE_SOURCE_TYPES),
  resume_id: uuid.nullable(),
  interview_id: uuid.nullable(),
  entry_locator: z.string().max(320).nullable(),
  source_label: z.string().min(1).max(160),
  source_excerpt: z.string().min(1).max(800),
  source_url: z.string().max(2048).nullable(),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
}) satisfies z.ZodType<EvidenceSourceRow>;

export const applicationRequirementSchema = z.object({
  id: uuid,
  application_id: uuid,
  user_id: uuid,
  label: z.string().min(1).max(160),
  detail: z.string().max(1000).nullable(),
  origin: z.enum(['posting_skill', 'manual']),
  sort_order: z.number().int(),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
}) satisfies z.ZodType<ApplicationRequirementRow>;

export const applicationEvidenceLinkSchema = z.object({
  id: uuid,
  requirement_id: uuid,
  evidence_id: uuid,
  user_id: uuid,
  relevance_note: z.string().max(500).nullable(),
  created_at: isoTimestamp,
}) satisfies z.ZodType<ApplicationEvidenceLinkRow>;

export const resumeEvidenceLinkSchema = z.object({
  id: uuid,
  resume_id: uuid,
  evidence_id: uuid,
  user_id: uuid,
  cv_section: z.enum(RESUME_EVIDENCE_SECTIONS),
  entry_locator: z.string().min(1).max(320),
  created_at: isoTimestamp,
}) satisfies z.ZodType<ResumeEvidenceLinkRow>;

export const applicationCvSummarySchema = z.object({
  id: uuid,
  title: z.string().max(200).nullable(),
  is_primary: z.boolean().nullable(),
  document_scope: z.enum(['base', 'application']),
  source_resume_id: uuid.nullable(),
}) satisfies z.ZodType<ApplicationCvSummary>;

// ── Client-side input validation ─────────────────────────────────────────
// Mirrors the server checks so obviously invalid submissions never reach the
// network. The server remains authoritative.

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const createEvidenceInputSchema = z.object({
  category: z.enum(EVIDENCE_CATEGORIES),
  title: shortText(120),
  summary: shortText(1200),
  occurredOn: isoDate.nullish(),
}) satisfies z.ZodType<CreateEvidenceInput, z.ZodTypeDef, unknown>;

export const updateEvidenceInputSchema = z.object({
  evidenceId: uuid,
  category: z.enum(EVIDENCE_CATEGORIES).optional(),
  title: shortText(120).optional(),
  summary: shortText(1200).optional(),
  occurredOn: isoDate.nullish(),
}) satisfies z.ZodType<UpdateEvidenceInput, z.ZodTypeDef, unknown>;

export const addEvidenceSourceInputSchema = z
  .object({
    evidenceId: uuid,
    sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
    sourceLabel: shortText(160),
    sourceExcerpt: shortText(800),
    entryLocator: z.string().trim().max(320).nullish(),
    sourceUrl: z
      .string()
      .trim()
      .url()
      .regex(/^https?:\/\//i)
      .max(2048)
      .nullish(),
    resumeId: uuid.nullish(),
    interviewId: uuid.nullish(),
  })
  .superRefine((value, ctx) => {
    const expects = (field: 'resumeId' | 'interviewId' | 'sourceUrl', required: boolean) => {
      const present = Boolean(value[field]);
      if (required && !present) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'This field is required for the selected source type' });
      }
      if (!required && present) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'This field does not apply to the selected source type' });
      }
    };
    switch (value.sourceType) {
      case 'resume_entry':
        expects('resumeId', true);
        expects('interviewId', false);
        expects('sourceUrl', false);
        break;
      case 'interview_response':
        expects('resumeId', false);
        expects('interviewId', true);
        expects('sourceUrl', false);
        break;
      case 'url':
        expects('resumeId', false);
        expects('interviewId', false);
        expects('sourceUrl', true);
        break;
      case 'manual_note':
        expects('resumeId', false);
        expects('interviewId', false);
        expects('sourceUrl', false);
        break;
    }
  }) satisfies z.ZodType<AddEvidenceSourceInput, z.ZodTypeDef, unknown>;

export const linkEvidenceInputSchema = z.object({
  requirementId: uuid,
  evidenceId: uuid,
  relevanceNote: z.string().trim().max(500).nullish(),
}) satisfies z.ZodType<LinkEvidenceInput, z.ZodTypeDef, unknown>;

export const linkEvidenceUsageInputSchema = z.object({
  resumeId: uuid,
  evidenceId: uuid,
  cvSection: z.enum(RESUME_EVIDENCE_SECTIONS),
  entryLocator: z.string().trim().min(1).max(320),
}) satisfies z.ZodType<LinkEvidenceUsageInput, z.ZodTypeDef, unknown>;
