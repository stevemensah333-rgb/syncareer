import type { TrackedApplication, TrackedJobSummary } from '@/components/applications/ApplicationDetailSheet';

export interface ApplicationWorkspaceFields {
  resume_id: string | null;
  next_action: string | null;
  next_action_due: string | null;
  job_title_snapshot: string | null;
  company_name_snapshot: string | null;
  source_snapshot: string | null;
  source_url_snapshot: string | null;
  location_snapshot: string | null;
  deadline_snapshot: string | null;
  external_id_snapshot: string | null;
}

export type WorkspaceApplication = TrackedApplication & ApplicationWorkspaceFields;

export interface WorkspaceResume {
  id: string;
  user_id: string;
  title: string | null;
  updated_at: string | null;
}

export interface WorkspaceInterview {
  id: string;
  user_id: string;
  application_id: string | null;
  job_role: string | null;
  created_at: string;
  completed_at?: string | null;
}

export function applicationFacts(application: WorkspaceApplication): TrackedJobSummary {
  if (application.job) return application.job;
  return {
    title: application.job_title_snapshot ?? 'Tracked application',
    company_name: application.company_name_snapshot,
    department: null,
    source: application.source_snapshot,
    source_url: application.source_url_snapshot,
    location: application.location_snapshot,
    application_deadline: application.deadline_snapshot,
    employment_type: null,
    skills: null,
    experience_level: null,
    updated_at: null,
  };
}

export type DueState = 'none' | 'overdue' | 'today' | 'upcoming';

export function nextActionDueState(nextAction: string | null, due: string | null, now = new Date()): DueState {
  if (!nextAction?.trim() || !due) return 'none';
  const dueDay = new Date(`${due}T00:00:00`);
  if (Number.isNaN(dueDay.getTime())) return 'none';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dueDay.getTime() < today.getTime()) return 'overdue';
  if (dueDay.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

/** Client filtering improves UX; composite FKs and RLS remain authoritative. */
export function ownedWorkspaceLinks<T extends { user_id: string }>(rows: T[], userId: string): T[] {
  return rows.filter((row) => row.user_id === userId);
}
