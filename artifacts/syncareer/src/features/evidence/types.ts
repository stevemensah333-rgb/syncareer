// Evidence domain types for the dossier system.
//
// These describe the rows created by supabase/migrations/2026…evidence_dossier.sql.
// They are owned by this feature module on purpose: the generated Supabase
// types are regenerated through Lovable after the migration is applied, and
// this module must keep a stable, reviewable contract regardless of when that
// regeneration lands. `src/features/evidence/validation.ts` verifies every row
// read from the wire against these shapes at runtime.

export type EvidenceCategory =
  | 'work'
  | 'project'
  | 'education'
  | 'achievement'
  | 'leadership'
  | 'volunteering'
  | 'other';

export type EvidenceReviewStatus = 'draft' | 'confirmed' | 'archived';

/**
 * Derived, never independently editable. "Supported" means the student
 * attached a source; it never means anyone verified the evidence.
 */
export type EvidenceSupportStatus = 'draft' | 'needs_source' | 'supported' | 'archived';

export type EvidenceSourceType =
  | 'resume_entry'
  | 'interview_response'
  | 'url'
  | 'manual_note';

export type ApplicationRequirementOrigin = 'posting_skill' | 'manual';

export type ResumeDocumentScope = 'base' | 'application';

export interface EvidenceItemRow {
  id: string;
  user_id: string;
  category: EvidenceCategory;
  title: string;
  summary: string;
  occurred_on: string | null;
  review_status: EvidenceReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface EvidenceSourceRow {
  id: string;
  evidence_id: string;
  user_id: string;
  source_type: EvidenceSourceType;
  resume_id: string | null;
  interview_id: string | null;
  entry_locator: string | null;
  source_label: string;
  source_excerpt: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRequirementRow {
  id: string;
  application_id: string;
  user_id: string;
  label: string;
  detail: string | null;
  origin: ApplicationRequirementOrigin;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvidenceLinkRow {
  id: string;
  requirement_id: string;
  evidence_id: string;
  user_id: string;
  relevance_note: string | null;
  created_at: string;
}

export interface ResumeEvidenceLinkRow {
  id: string;
  resume_id: string;
  evidence_id: string;
  user_id: string;
  cv_section: 'experience' | 'projects' | 'activities' | 'education' | 'achievements' | 'skills';
  entry_locator: string;
  created_at: string;
}

/** Subset of the cloned `resumes` row returned by create_application_cv. */
export interface ApplicationCvSummary {
  id: string;
  title: string | null;
  is_primary: boolean | null;
  document_scope: ResumeDocumentScope;
  source_resume_id: string | null;
}

/** Input for creating an evidence item. Owner identity never comes from the caller. */
export interface CreateEvidenceInput {
  category: EvidenceCategory;
  title: string;
  summary: string;
  occurredOn?: string | null;
}

export interface UpdateEvidenceInput {
  evidenceId: string;
  category?: EvidenceCategory;
  title?: string;
  summary?: string;
  /** Passing null is a no-op (occurred_on cannot be cleared remotely). */
  occurredOn?: string | null;
}

export interface AddEvidenceSourceInput {
  evidenceId: string;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  sourceExcerpt: string;
  entryLocator?: string | null;
  sourceUrl?: string | null;
  resumeId?: string | null;
  interviewId?: string | null;
}

export interface LinkEvidenceInput {
  requirementId: string;
  evidenceId: string;
  relevanceNote?: string | null;
}

export interface LinkEvidenceUsageInput {
  resumeId: string;
  evidenceId: string;
  cvSection: ResumeEvidenceLinkRow['cv_section'];
  entryLocator: string;
}
