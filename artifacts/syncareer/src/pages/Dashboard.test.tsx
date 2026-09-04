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

describe('Career command center (Dashboard Home)', () => {
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
    expect(supabase.from).toHaveBeenCalledWith('mock_interviews');
  });

  it('answers "what should I do next?" in the hero with a single primary action', async () => {
    installResults({
      assessments: { data: { completed_at: '2026-08-01T10:00:00Z', primary_interest: 'Investigative' }, error: null },
      job_applications: {
        data: [{
          id: 'application-1',
          status: 'interview',
          created_at: '2026-07-01T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
          resume_url: null,
          job: { id: 'job-1', title: 'Data Analyst', company_name: 'Acme', location: 'Accra', employment_type: 'full-time', application_deadline: null },
        }],
        error: null,
      },
      saved_jobs: { data: [], error: null },
      resumes: { data: { personal_info: { firstName: 'Ama' }, skills: ['Excel'] }, error: null },
      mock_interviews: { data: [], error: null },
      job_postings: { data: [], error: null },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // Primary question is immediately readable.
    expect(await screen.findByText('What should I do next?')).toBeTruthy();
    expect(screen.getByText('Why it matters')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Practise interview/ })).toBeTruthy();

    // Command center sections in mobile priority order.
    expect(screen.getByRole('heading', { level: 2, name: /^Continue$/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /^Opportunities$/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /Career signal/ })).toBeTruthy();

    // No KPI-style readiness score invented on the home.
    expect(screen.queryByText(/readiness/i)).toBeNull();
    expect(screen.queryByText(/Career Operating Signals/i)).toBeNull();
  });

  it('surfaces real career direction in the hero when available', async () => {
    installResults({
      assessments: { data: { completed_at: '2026-08-01T10:00:00Z', primary_interest: 'Investigative' }, error: null },
      job_applications: { data: [], error: null },
      saved_jobs: { data: [], error: null },
      resumes: { data: null, error: null },
      mock_interviews: { data: [], error: null },
      job_postings: { data: [], error: null },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Computer Science · University of Ghana')).toBeTruthy();
    expect(screen.getByText('What should I do next?')).toBeTruthy();
  });
});
