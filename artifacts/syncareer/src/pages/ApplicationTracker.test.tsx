import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { installSupabaseMock } from '@/test/supabaseMock';
import ApplicationTracker from './ApplicationTracker';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/landing/AnimatedSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const NOW = Date.now();

function makeAppRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    job_id: 'job-1',
    status: 'pending',
    notes: null,
    resume_url: null,
    created_at: new Date(NOW - 5 * 86400000).toISOString(),
    updated_at: new Date(NOW - 86400000).toISOString(),
    job: {
      title: 'Graduate Analyst',
      location: 'Accra',
      employment_type: 'full-time',
      salary_min: null,
      salary_max: null,
      company_name: 'Acme Ghana',
      department: null,
      source: 'jobberman',
      source_url: 'https://example.com/jobs/1',
      application_deadline: new Date(NOW + 10 * 86400000).toISOString(),
      skills: ['SQL'],
      experience_level: 'entry',
      updated_at: new Date(NOW - 86400000).toISOString(),
    },
    ...overrides,
  };
}

function renderPage(initialEntry = '/applications') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApplicationTracker />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Application Tracker page', () => {
  it('renders applications with status, and filters by journey stage', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: [
            makeAppRow({ id: 'app-1', status: 'pending' }),
            makeAppRow({ id: 'app-2', status: 'reviewing', job: { ...makeAppRow().job, title: 'Credit Officer' } }),
            makeAppRow({ id: 'app-3', status: 'hired', job: { ...makeAppRow().job, title: 'Field Coordinator' } }),
          ],
          error: null,
        },
        resumes: { data: { id: 'cv-1', title: 'Ama CV', updated_at: new Date(NOW).toISOString() }, error: null },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: { id: 'cv-1', title: 'Ama CV', updated_at: new Date(NOW).toISOString() }, error: null } },
    });
    renderPage();

    expect(await screen.findByText('Graduate Analyst')).toBeTruthy();
    expect(screen.getByText('Credit Officer')).toBeTruthy();
    expect(screen.getByText('Field Coordinator')).toBeTruthy();

    // Stage filter: "In review" keeps only reviewing/shortlisted rows
    fireEvent.click(screen.getByRole('button', { name: /In review/ }));
    expect(screen.queryByText('Graduate Analyst')).toBeNull();
    expect(screen.getByText('Credit Officer')).toBeTruthy();
    expect(screen.queryByText('Field Coordinator')).toBeNull();
  });

  it('opens the detail sheet with journey, next step, and notes for the selected row', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: [makeAppRow({ status: 'interview', notes: 'Prepare SQL stories' })],
          error: null,
        },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: { id: 'cv-1', title: 'Ama CV', updated_at: new Date(NOW).toISOString() }, error: null } },
    });
    renderPage();

    const row = await screen.findByRole('button', { name: /Graduate Analyst.*Open details/ });
    fireEvent.click(row);

    expect(await screen.findByText('Where you are')).toBeTruthy();
    expect(screen.getByText('Recommended next step')).toBeTruthy();
    expect(screen.getByText('Targeted CV')).toBeTruthy();
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe('Prepare SQL stories');
  });

  it('opens the record referenced by the ?application= deep link', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: [
            makeAppRow({ id: 'app-1' }),
            makeAppRow({ id: 'app-2', status: 'offered', job: { ...makeAppRow().job, title: 'Credit Officer' } }),
          ],
          error: null,
        },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: null, error: null } },
    });
    renderPage('/applications?application=app-2');

    // The sheet opens directly on the offered application.
    expect(await screen.findByText('Where you are')).toBeTruthy();
    expect(screen.getByText(/Offer received/)).toBeTruthy();
    expect(screen.getAllByText(/Credit Officer/).length).toBeGreaterThan(0);
  });

  it('flags rows whose posting is gone instead of hiding them', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow({ job: null })], error: null },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: null, error: null } },
    });
    renderPage();

    expect(await screen.findByText(/Posting unavailable/)).toBeTruthy();
    expect(screen.getByText('Tracked application')).toBeTruthy();
  });

  it('recovers from a data error via Try again', async () => {
    installSupabaseMock({
      tables: { job_applications: { data: null, error: { message: 'Failed to fetch' } } },
    });
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toContain('Applications could not be loaded');

    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow()], error: null },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: null, error: null } },
    });
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(await screen.findByText('Graduate Analyst')).toBeTruthy();
  });

  it('shows a permission-denied state without a retry control', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: null,
          error: { code: '42501', message: 'permission denied for table job_applications' },
        },
      },
    });
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('You do not have access to applications');
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('shows an empty state with an entry point into opportunities', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [], error: null },
        counsellor_bookings: { data: [], error: null },
      },
      maybeSingle: { resumes: { data: null, error: null } },
    });
    renderPage();

    expect(await screen.findByText('No applications yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Browse Opportunities/i })).toBeTruthy();
  });
});
