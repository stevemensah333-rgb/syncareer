import { resumeRowCompletion } from '@/features/cv-builder/persistence';
import type { Json } from '@/integrations/supabase/types';

// Pure helpers for the Home journey — no React, no Supabase IO.
//
// The application-status vocabulary (labels, ordering, next-step copy) is
// canonical in `features/application-tracker/workflow.ts`; it is re-exported
// here so existing Home imports and tests keep a single stable surface.

export {
  ACTIVE_STATUSES,
  ORDERED_STATUSES,
  STATUS_LABELS,
  isActiveStatus,
  nextStepForApplicationStatus,
  statusLabel,
} from '@/features/application-tracker/workflow';

export type { ApplicationStatus, NextStepForStatus } from '@/features/application-tracker/workflow';

export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function formatShortDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDeadlineLabel(days: number | null): { label: string; tone: 'urgent' | 'soon' | 'ok' } | null {
  if (days === null) return null;
  if (days < 0) return null;
  if (days === 0) return { label: 'Closes today', tone: 'urgent' };
  if (days === 1) return { label: 'Closes tomorrow', tone: 'urgent' };
  if (days <= 3) return { label: `Closes in ${days} days`, tone: 'urgent' };
  if (days <= 7) return { label: `Closes in ${days} days`, tone: 'soon' };
  return { label: `Closes ${formatShortDate(new Date(Date.now() + days * 86400000).toISOString())}`, tone: 'ok' };
}

export function getActionDueLabel(days: number | null): { label: string; tone: 'urgent' | 'soon' | 'ok' } | null {
  if (days === null) return null;
  if (days < -1) return { label: `${Math.abs(days)} days overdue`, tone: 'urgent' };
  if (days === -1) return { label: '1 day overdue', tone: 'urgent' };
  if (days === 0) return { label: 'Due today', tone: 'urgent' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon' };
  if (days <= 7) return { label: `Due in ${days} days`, tone: 'soon' };
  return { label: `Due ${formatShortDate(new Date(Date.now() + days * 86400000).toISOString())}`, tone: 'ok' };
}

interface ResumeSections {
  personal_info?: Json | null;
  education?: Json | null;
  experience?: Json | null;
  projects?: Json | null;
  achievements?: Json | null;
  skills?: Json | null;
  references_section?: string | null;
}

/** The same meaningful-content completion shown by the CV Builder. */
export function scoreResume(resume: unknown): number {
  if (!resume || typeof resume !== 'object' || Array.isArray(resume)) return 0;
  return resumeRowCompletion(resume as ResumeSections);
}

export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatShortDate(dateString);
}
