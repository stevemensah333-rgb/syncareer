import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { loadOpportunitySpotlight } from './spotlight';

interface Result {
  data: unknown;
  error: unknown;
}

function createClient(result: Result) {
  const from = () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ['select', 'eq', 'order']) builder[method] = chain;
    builder.limit = () => Promise.resolve(result);
    return builder;
  };
  return { from } as unknown as Pick<SupabaseClient<Database>, 'from'>;
}

function posting(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    company_name: 'Example Co',
    location: 'Accra',
    employment_type: 'full-time',
    is_external: true,
    status: 'active',
    description: '',
    source: 'demo',
    source_url: `https://example.com/${id}`,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    experience_level: 'entry',
    skills: [],
    ...extra,
  };
}

describe('loadOpportunitySpotlight', () => {
  it('excludes already tracked or saved roles and caps the result', async () => {
    const client = createClient({
      data: [
        posting('job-1', 'Data Analyst'),
        posting('job-2', 'Graduate Engineer'),
        posting('job-3', 'Junior Developer'),
        posting('job-4', 'Research Assistant'),
      ],
      error: null,
    });

    const spotlight = await loadOpportunitySpotlight(
      client,
      { major: null, interests: [], earlyCareer: true },
      new Set(['job-1']),
      2,
    );

    expect(spotlight.error).toBe(false);
    expect(spotlight.jobs).toHaveLength(2);
    expect(spotlight.jobs.map((job) => job.id)).not.toContain('job-1');
  });

  it('reports an error state when the postings source fails', async () => {
    const client = createClient({ data: null, error: { code: '500' } });
    const spotlight = await loadOpportunitySpotlight(client, { major: null }, new Set());
    expect(spotlight.error).toBe(true);
    expect(spotlight.jobs).toEqual([]);
  });
});
