import { isActiveStatus } from '@/features/application-tracker/workflow';
import { nextActionDueState } from '@/features/application-tracker/workspace';

export interface DashboardJob {
  id: string;
  title: string;
  company_name?: string | null;
  location?: string | null;
  employment_type?: string | null;
  application_deadline?: string | null;
}

export interface DashboardApplication {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  next_action: string | null;
  next_action_due: string | null;
  resume_id: string | null;
  job_title_snapshot: string | null;
  company_name_snapshot: string | null;
  job: DashboardJob | null;
}

export interface DashboardSavedJob {
  job_id: string;
  created_at: string;
  job: DashboardJob | null;
}

export type DashboardPrimaryFocus =
  | { type: 'application'; data: DashboardApplication }
  | { type: 'saved'; data: DashboardSavedJob }
  | { type: 'start' };

function validTime(value: string | null | undefined): number {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

/**
 * Selection order is deliberately deterministic:
 * overdue next action, due-today/dated next action, then most recently updated
 * active application. Terminal applications never displace current work.
 */
export function selectPrimaryFocus(
  applications: DashboardApplication[],
  savedJobs: DashboardSavedJob[],
  now = new Date(),
): DashboardPrimaryFocus {
  const active = applications.filter((application) => isActiveStatus(application.status));
  const ranked = [...active].sort((left, right) => {
    const leftDue = nextActionDueState(left.next_action, left.next_action_due, now);
    const rightDue = nextActionDueState(right.next_action, right.next_action_due, now);
    const priority = { overdue: 0, today: 1, upcoming: 2, none: 3 } as const;
    if (priority[leftDue] !== priority[rightDue]) return priority[leftDue] - priority[rightDue];
    if (leftDue !== 'none' && rightDue !== 'none') {
      const dueDifference = validTime(left.next_action_due) - validTime(right.next_action_due);
      if (dueDifference !== 0) return dueDifference;
    }
    return validTime(right.updated_at) - validTime(left.updated_at);
  });
  if (ranked[0]) return { type: 'application', data: ranked[0] };

  const trackedJobIds = new Set(applications.map((application) => application.job?.id).filter(Boolean));
  const saved = [...savedJobs]
    .filter((item) => item.job && !trackedJobIds.has(item.job_id))
    .sort((left, right) => validTime(right.created_at) - validTime(left.created_at))[0];
  if (saved) return { type: 'saved', data: saved };
  return { type: 'start' };
}

export function applicationTitle(application: DashboardApplication): string {
  return application.job?.title?.trim() || application.job_title_snapshot?.trim() || 'Tracked application';
}

export function applicationCompany(application: DashboardApplication): string | null {
  return application.job?.company_name?.trim() || application.company_name_snapshot?.trim() || null;
}

export function dashboardDataState(errors: string[]): 'ready' | 'partial' | 'unavailable' {
  if (errors.length === 0) return 'ready';
  if (errors.includes('dashboard') || errors.includes('applications')) return 'unavailable';
  return 'partial';
}
