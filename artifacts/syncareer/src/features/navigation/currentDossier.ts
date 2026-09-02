import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { statusLabel } from '@/features/application-tracker/workflow';
import {
  applicationCompany,
  applicationTitle,
  selectPrimaryFocus,
  type DashboardApplication,
} from '@/features/dashboard/continuation';

export interface CurrentDossier {
  id: string;
  title: string;
  company: string | null;
  statusLabel: string;
}

type NavigationClient = Pick<SupabaseClient<Database>, 'from'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Reuses Home's deterministic primary-focus policy with only columns verified
 * in the live Lovable schema. When the application-workspace migration is
 * deployed, this can adopt its due-date fields without making today's
 * navigation depend on proposal-only columns.
 */
export function selectCurrentDossier(rows: unknown): CurrentDossier | null {
  if (!Array.isArray(rows)) return null;

  const applications = rows.flatMap<DashboardApplication>((row) => {
    if (!isRecord(row) || typeof row.id !== 'string' || typeof row.status !== 'string') return [];
    const updatedAt = text(row.updated_at);
    if (!updatedAt) return [];
    const relation = Array.isArray(row.job) ? row.job[0] : row.job;
    const job = isRecord(relation) && text(relation.title)
      ? {
          id: text(relation.id) ?? `posting-${row.id}`,
          title: text(relation.title) as string,
          company_name: text(relation.company_name),
        }
      : null;
    return [{
      id: row.id,
      status: row.status,
      created_at: text(row.created_at) ?? updatedAt,
      updated_at: updatedAt,
      next_action: null,
      next_action_due: null,
      resume_id: null,
      job_title_snapshot: null,
      company_name_snapshot: null,
      job,
    }];
  });

  const focus = selectPrimaryFocus(applications, []);
  if (focus.type !== 'application') return null;
  const application = focus.data;

  return {
    id: application.id,
    title: applicationTitle(application),
    company: applicationCompany(application),
    statusLabel: statusLabel(application.status),
  };
}

export async function loadCurrentDossier(client: NavigationClient, userId: string): Promise<CurrentDossier | null> {
  const { data, error } = await client
    .from('job_applications')
    .select('id, status, created_at, updated_at, job:job_postings(id, title, company_name)')
    .eq('applicant_id', userId)
    .order('updated_at', { ascending: false })
    .limit(12);

  if (error) throw error;
  return selectCurrentDossier(data);
}
