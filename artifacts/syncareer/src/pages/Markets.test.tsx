import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { installSupabaseMock } from '@/test/supabaseMock';
import Markets from './Markets';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    studentDetails: { major: 'Computer Science' },
    loading: false,
    profile: { user_type: 'student' },
    refreshProfile: async () => {},
  }),
}));

let counter = 0;
function makeJob(overrides: Record<string, unknown> = {}) {
  counter += 1;
  const id = `job-${counter}`;
  return {
    id,
    title: `Graduate Engineer ${counter}`,
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: 'Build useful things.',
    requirements: null,
    skills: ['TypeScript'],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    employer_id: null,
    source: 'jobberman',
    source_url: `https://example.com/jobs/${id}`,
    is_external: true,
    application_deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    company_name: 'Acme Ghana',
    company_domain: null,
    experience_level: 'entry',
    external_id: null,
    status: 'active',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/opportunities']}>
      <Markets />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Opportunities page', () => {
  it('renders jobs with tracked and saved state after a loading skeleton', async () => {
    const j1 = makeJob({ title: 'Graduate Analyst' });
    const j2 = makeJob({ title: 'Junior Developer' });
    installSupabaseMock({
      tables: {
        job_postings: { data: [j1, j2], error: null },
        job_applications: { data: [{ id: 'app-1', job_id: j1.id, status: 'interview' }], error: null },
        saved_jobs: { data: [{ job_id: j2.id }], error: null },
        user_skills: { data: [], error: null },
      },
    });
    renderPage();

    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();

    expect((await screen.findAllByText('Graduate Analyst')).length).toBeGreaterThan(0);
    expect(screen.getByText('Junior Developer')).toBeTruthy();
    // tracked + saved state exposed on the rows
    expect(screen.getByText(/Tracked · Interview/)).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('opens the detail view with honest provenance on row click', async () => {
    const j1 = makeJob({ title: 'Graduate Analyst' });
    installSupabaseMock({
      tables: { job_postings: { data: [j1], error: null } },
    });
    renderPage();

    const row = await screen.findByRole('button', { name: /Graduate Analyst/ });
    fireEvent.click(row);

    expect(await screen.findByText('Source & verification')).toBeTruthy();
    expect(screen.getByText(/not independently verified/i)).toBeTruthy();
    expect(screen.getByText(/Apply on Jobberman/i)).toBeTruthy();
  });

  it('turns an external opportunity into a tracked application (critical transition)', async () => {
    const j1 = makeJob({ title: 'Graduate Analyst' });
    const insertSpy = vi.fn();
    installSupabaseMock({
      tables: {
        job_postings: { data: [j1], error: null },
        job_applications: { data: [], error: null },
      },
      maybeSingle: { job_applications: { data: null, error: null } },
      single: { job_applications: { data: { id: 'app-new' }, error: null } },
      insertSpies: { job_applications: insertSpy },
    });
    renderPage();

    const row = await screen.findByRole('button', { name: /Graduate Analyst/ });
    fireEvent.click(row);
    const trackButton = await screen.findByRole('button', { name: /I applied — start tracking/i });
    fireEvent.click(trackButton);

    expect(await screen.findByText(/Tracked · Applied/)).toBeTruthy();
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: j1.id, applicant_id: 'user-1', status: 'pending' }),
    );
  });

  it('shows a retryable error state and recovers on Try again', async () => {
    const j1 = makeJob({ title: 'Recovered Role' });
    installSupabaseMock({
      tables: { job_postings: { data: null, error: { message: 'Failed to fetch' } } },
    });
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toContain('Opportunities could not be loaded');

    installSupabaseMock({ tables: { job_postings: { data: [j1], error: null } } });
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect((await screen.findAllByText('Recovered Role')).length).toBeGreaterThan(0);
  });

  it('distinguishes permission-denied from generic errors (no retry offered)', async () => {
    installSupabaseMock({
      tables: {
        job_postings: {
          data: null,
          error: { code: '42501', message: 'permission denied for table job_postings' },
        },
      },
    });
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('You do not have access to opportunities');
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('has explicit empty states for the list and the saved tab', async () => {
    installSupabaseMock({ tables: { job_postings: { data: [], error: null } } });
    renderPage();

    expect(await screen.findByText('No open opportunities right now')).toBeTruthy();
    const savedTab = screen.getByRole('tab', { name: /Saved/ });
    fireEvent.mouseDown(savedTab);
    fireEvent.click(savedTab);
    expect(await screen.findByText('No saved opportunities yet')).toBeTruthy();
  });
});
