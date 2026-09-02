import type { EvidenceReviewStatus, EvidenceSupportStatus } from './types';

/**
 * Evidence support status is derived, never stored and never independently
 * editable:
 *   draft        — saved but not yet confirmed by the student.
 *   needs_source — confirmed but attached to no source.
 *   supported    — confirmed with at least one source.
 *   archived     — retained for history; no longer offered for new links.
 *
 * "Supported" describes what the student supplied. It never implies that an
 * employer, university, mentor, or Syncareer verified the claim.
 */
export function deriveSupportStatus(
  reviewStatus: EvidenceReviewStatus,
  sourceCount: number,
): EvidenceSupportStatus {
  switch (reviewStatus) {
    case 'archived':
      return 'archived';
    case 'draft':
      return 'draft';
    case 'confirmed':
      return sourceCount > 0 ? 'supported' : 'needs_source';
  }
}

export type SupportStatusTone = 'neutral' | 'attention' | 'positive';

export interface SupportStatusPresentation {
  label: string;
  tone: SupportStatusTone;
  /** Short explanation used in titles and screen-reader text. */
  description: string;
}

export function supportStatusPresentation(status: EvidenceSupportStatus): SupportStatusPresentation {
  switch (status) {
    case 'draft':
      return {
        label: 'Draft',
        tone: 'neutral',
        description: 'Saved, but not confirmed by you yet.',
      };
    case 'needs_source':
      return {
        label: 'Needs source',
        tone: 'attention',
        description: 'Confirmed, but no source is attached yet.',
      };
    case 'supported':
      return {
        label: 'Supported',
        tone: 'positive',
        description: 'Confirmed and backed by a source you attached.',
      };
    case 'archived':
      return {
        label: 'Archived',
        tone: 'neutral',
        description: 'Kept for history. It can no longer be linked to new requirements.',
      };
  }
}
