import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from './Dashboard';

vi.mock('@/components/layout/StudentLayout', () => ({
  StudentLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: { full_name: 'Ama Mensah' },
    studentDetails: { major: 'Computer Science', school: 'University of Ghana' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useSupabaseUserId', () => ({
  useSupabaseUserId: () => 'user-1',
}));

interface Result {
  data: unknown;
  error: unknown;
}

function installResults(results: Record<string, Result>) {
  const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
  from.mockImplementation((table: string) => {
    const result = results[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ['select', 'eq', 'not', 'order', 'limit', 'in']) builder[method] = chain;
    builder.maybeSingle = () => Promise.resolve(result);
    builder.then = (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return builder;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard Home integration', () => {
  it('renders owned backend application and CV data without a load error', async () => {
    installResults({
      assessments: { data: { completed_at: '2026-08-01T10:00:00Z' }, error: null },
      job_applications: {
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
      },
      saved_jobs: { data: [], error: null },
      resumes: {
        data: {
          personal_info: { firstName: 'Ama', lastName: 'Mensah', email: 'ama@example.com' },
          education: [],
          experience: [],
          skills: ['Excel'],
          projects: [],
          achievements: [],
          updated_at: '2026-08-10T10:00:00Z',
        },
        error: null,
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Data Analyst')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('job_applications');
    expect(supabase.from).toHaveBeenCalledWith('resumes');
  });
});
