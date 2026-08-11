import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  DASHBOARD_APPLICATION_SELECT,
  loadDashboardData,
} from './data';

interface Result {
  data: unknown;
  error: unknown;
}

interface RecordedQuery {
  table: string;
  select?: string;
  filters: Array<{ method: string; args: unknown[] }>;
}

function createClient(results: Record<string, Result[]>) {
  const queries: RecordedQuery[] = [];
  const from = (table: string) => {
    const result = results[table]?.shift() ?? { data: [], error: null };
    const recorded: RecordedQuery = { table, filters: [] };
    queries.push(recorded);
    const builder: Record<string, unknown> = {};
    const chain = (method: string) => (...args: unknown[]) => {
      recorded.filters.push({ method, args });
      return builder;
    };
    builder.select = (value: string) => {
      recorded.select = value;
      return builder;
    };
    for (const method of ['eq', 'not', 'order', 'limit', 'in']) builder[method] = chain(method);
    builder.maybeSingle = () => Promise.resolve(result);
    builder.then = (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return builder;
  };

  return {
    client: { from } as unknown as Pick<SupabaseClient<Database>, 'from'>,
    queries,
  };
}

describe('loadDashboardData live-schema contract', () => {
  it('loads owned applications and saved postings without unverified columns or relationships', async () => {
    const { client, queries } = createClient({
      assessments: [{ data: { completed_at: '2026-08-01T10:00:00Z' }, error: null }],
      job_applications: [{
        data: [{
          id: 'application-1',
          status: 'interview',
          created_at: '2026-07-01T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
          resume_url: null,
          job: {
            id: 'job-1',
            title: 'Data Analyst',
            company_name: 'Acme',
            location: 'Accra',
            employment_type: 'full-time',
            application_deadline: '2026-08-30',
          },
        }],
        error: null,
      }],
      saved_jobs: [{ data: [{ job_id: 'job-2', created_at: '2026-08-09T10:00:00Z' }], error: null }],
      resumes: [{ data: { personal_info: { firstName: 'Ama' } }, error: null }],
      job_postings: [{
        data: [{
          id: 'job-2',
          title: 'Graduate Engineer',
          company_name: 'Build Co',
          location: 'Kumasi',
          employment_type: 'graduate programme',
          application_deadline: null,
        }],
        error: null,
      }],
    });

    const result = await loadDashboardData(client, 'user-1');

    expect(result.errors).toEqual([]);
    expect(result.assessmentDone).toBe(true);
    expect(result.applications[0]?.job?.title).toBe('Data Analyst');
    expect(result.savedJobs[0]?.job?.title).toBe('Graduate Engineer');
    expect(result.resume).toEqual({ personal_info: { firstName: 'Ama' } });

    expect(DASHBOARD_APPLICATION_SELECT).toContain('resume_url');
    for (const unavailableColumn of [
      'next_action',
      'next_action_due',
      'resume_id',
      'job_title_snapshot',
      'company_name_snapshot',
    ]) {
      expect(DASHBOARD_APPLICATION_SELECT).not.toContain(unavailableColumn);
    }

    const savedQuery = queries.find((query) => query.table === 'saved_jobs');
    expect(savedQuery?.select).toBe('job_id, created_at');
    expect(savedQuery?.select).not.toContain('job:job_postings');

    const postingQuery = queries.find((query) => query.table === 'job_postings');
    expect(postingQuery?.filters).toContainEqual({ method: 'in', args: ['id', ['job-2']] });
  });

  it('keeps available sections when one backend source fails', async () => {
    const { client } = createClient({
      assessments: [{ data: null, error: null }],
      job_applications: [{ data: null, error: { code: '42501' } }],
      saved_jobs: [{ data: [], error: null }],
      resumes: [{ data: { skills: ['Excel'] }, error: null }],
    });

    const result = await loadDashboardData(client, 'user-1');

    expect(result.errors).toEqual(['applications']);
    expect(result.applications).toEqual([]);
    expect(result.savedJobs).toEqual([]);
    expect(result.resume).toEqual({ skills: ['Excel'] });
  });

  it('uses one most-recent primary CV row so duplicate legacy rows do not break Home', async () => {
    const { client, queries } = createClient({
      assessments: [{ data: null, error: null }],
      job_applications: [{ data: [], error: null }],
      saved_jobs: [{ data: [], error: null }],
      resumes: [{ data: { updated_at: '2026-08-10T10:00:00Z' }, error: null }],
    });

    await loadDashboardData(client, 'user-1');

    const resumeQuery = queries.find((query) => query.table === 'resumes');
    expect(resumeQuery?.filters).toContainEqual({ method: 'order', args: ['updated_at', { ascending: false }] });
    expect(resumeQuery?.filters).toContainEqual({ method: 'limit', args: [1] });
  });
});
