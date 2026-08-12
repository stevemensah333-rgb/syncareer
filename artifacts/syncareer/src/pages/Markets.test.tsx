import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const location = useLocation();
  return <div aria-label="Current URL">{location.pathname}{location.search}</div>;
}

function renderPage(initialEntry = '/opportunities') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Markets />
      <LocationProbe />
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
    expect(screen.getAllByText('Junior Developer').length).toBeGreaterThan(0);
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

    const row = await screen.findByRole('button', { name: /Graduate Analyst.*Open details/i });
    fireEvent.click(row);

    expect(await screen.findByText('Source details')).toBeTruthy();
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

    const row = await screen.findByRole('button', { name: /Graduate Analyst.*Open details/i });
    fireEvent.click(row);
    const trackButton = await screen.findByRole('button', { name: /I applied — start tracking/i });
    fireEvent.click(trackButton);

    expect(await screen.findByText(/Tracked · Applied/)).toBeTruthy();
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: j1.id, applicant_id: 'user-1', status: 'pending' }),
    );
  });

  it('keeps the external handoff separate from the explicit I applied action', async () => {
    const job = makeJob({ title: 'External Fellowship', source: 'linkedin' });
    const insertSpy = vi.fn();
    installSupabaseMock({
      tables: { job_postings: { data: [job], error: null } },
      maybeSingle: { job_applications: { data: null, error: null } },
      single: { job_applications: { data: { id: 'app-new' }, error: null } },
      insertSpies: { job_applications: insertSpy },
    });
    renderPage();

    const sourceLink = await screen.findByRole('link', { name: /Apply on Linkedin/i });
    expect(sourceLink.getAttribute('href')).toBe(job.source_url);
    expect(insertSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /I applied/i }));
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
  });

  it('filters by search and excludes missing deadlines from deadline windows', async () => {
    const analyst = makeJob({ title: 'Graduate Analyst', application_deadline: null });
    const engineer = makeJob({ title: 'Junior Engineer' });
    installSupabaseMock({ tables: { job_postings: { data: [analyst, engineer], error: null } } });
    renderPage();
    await screen.findAllByText('Graduate Analyst');

    fireEvent.change(screen.getByRole('textbox', { name: /Search opportunities/i }), { target: { value: 'Engineer' } });
    expect(screen.queryByText('Graduate Analyst')).toBeNull();
    expect(screen.getAllByText('Junior Engineer').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('textbox', { name: /Search opportunities/i }), { target: { value: '' } });
    fireEvent.pointerDown(screen.getByRole('combobox', { name: /Filter by deadline/i }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByText('Closing in 30 days'));
    expect(screen.queryByText('Graduate Analyst')).toBeNull();
  });

  it('preserves filters and selected opportunity in the URL', async () => {
    const first = makeJob({ title: 'First role' });
    const second = makeJob({ title: 'Second role' });
    installSupabaseMock({ tables: { job_postings: { data: [first, second], error: null } } });
    renderPage('/opportunities?q=Second&job=' + second.id);

    await screen.findAllByText('Second role');
    const url = screen.getByLabelText('Current URL').textContent ?? '';
    expect(url).toContain(`job=${second.id}`);
    expect(url).toContain('q=Second');
  });

  it('rolls back an optimistic save and coalesces duplicate clicks', async () => {
    const job = makeJob({ title: 'Rollback role' });
    let resolveWrite!: (value: { data: unknown; error: unknown }) => void;
    const pendingWrite = new Promise<{ data: unknown; error: unknown }>((resolve) => { resolveWrite = resolve; });
    const insertSpy = vi.fn();
    installSupabaseMock({
      tables: { job_postings: { data: [job], error: null } },
      tableSequences: {
        saved_jobs: [{ data: [], error: null }, pendingWrite],
      },
      insertSpies: { saved_jobs: insertSpy },
    });
    renderPage();
    const save = await screen.findByRole('button', { name: `Save ${job.title}` });
    fireEvent.click(save);
    const unsave = await screen.findByRole('button', { name: `Unsave ${job.title}` });
    fireEvent.click(unsave);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(unsave.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      resolveWrite({ data: null, error: { message: 'Failed to fetch' } });
      await pendingWrite;
    });
    await waitFor(() => expect(screen.getByRole('button', { name: `Save ${job.title}` }).getAttribute('aria-pressed')).toBe('false'));
  });

  it('supports arrow-key list navigation', async () => {
    const first = makeJob({ title: 'First role' });
    const second = makeJob({ title: 'Second role' });
    installSupabaseMock({ tables: { job_postings: { data: [first, second], error: null } } });
    renderPage();
    const firstRow = await screen.findByRole('button', { name: /First role.*Open details/i });
    fireEvent.keyDown(firstRow, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-opportunity-id')).toBe(second.id));
  });

  it('uses a mobile list-to-detail flow with a clear back action', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const job = makeJob({ title: 'Mobile role' });
    installSupabaseMock({ tables: { job_postings: { data: [job], error: null } } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Mobile role.*Open details/i }));
    const back = await screen.findByRole('button', { name: /Back to opportunities/i });
    fireEvent.click(back);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Back to opportunities/i })).toBeNull());
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });

  it('renders missing source facts without manufacturing data', async () => {
    const job = makeJob({
      title: 'Partial listing', company_name: null, department: null, application_deadline: null,
      source: null, source_url: null, experience_level: null, skills: null, updated_at: null,
    });
    installSupabaseMock({ tables: { job_postings: { data: [job], error: null } } });
    renderPage();
    await screen.findAllByText('Partial listing');
    expect(screen.getAllByText('Organisation not specified').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Deadline not provided|No deadline listed/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ingestion freshness unknown').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Competitive|match/i)).toBeNull();
  });

  it('keeps the feed usable when saved state fails to load', async () => {
    const job = makeJob({ title: 'Visible partial-state role' });
    installSupabaseMock({
      tables: {
        job_postings: { data: [job], error: null },
        saved_jobs: { data: null, error: { message: 'Failed to fetch' } },
      },
    });
    renderPage();
    expect((await screen.findAllByText('Visible partial-state role')).length).toBeGreaterThan(0);
    expect(screen.getByText(/saved or applied state could not be refreshed/i)).toBeTruthy();
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

  it('orders using available profile signals and incrementally reveals a longer feed', async () => {
    const jobs = Array.from({ length: 21 }, (_, index) => makeJob({
      title: index === 20 ? 'Senior Marketing Director' : `Graduate Engineer ${index + 1}`,
      experience_level: index === 20 ? 'senior' : 'entry',
      source_url: `https://example.com/paged/${index + 1}`,
    }));
    installSupabaseMock({
      tables: {
        job_postings: { data: jobs, error: null },
        user_skills: { data: [{ skill_name: 'TypeScript' }], error: null },
      },
    });
    renderPage();

    await screen.findAllByText('Graduate Engineer 1');
    expect(screen.getByText(/Ordered using Computer Science and 1 skill/i)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Open details\.$/ })).toHaveLength(20);
    expect(screen.queryByRole('button', { name: /Senior Marketing Director.*Open details/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Load 1 more opportunities \(1 remaining\)/i }));
    expect(await screen.findByRole('button', { name: /Senior Marketing Director.*Open details/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Open details\.$/ })).toHaveLength(21);
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
