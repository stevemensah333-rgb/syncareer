import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

/**
 * Renders the index with a location probe so tests can assert navigation to
 * the canonical dossier route without mocking the router.
 */
function renderPage(initialEntry = '/applications') {
  let pathname: string | null = null;
  function Probe() {
    const location = useLocation();
    pathname = location.pathname + location.search;
    return null;
  }
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApplicationTracker />
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
  return { getPath: () => pathname };
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
      },
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

  it('navigates a row to its canonical dossier route', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow({ status: 'interview', notes: 'Prepare SQL stories' })], error: null },
      },
    });
    const page = renderPage();

    const row = await screen.findByRole('button', { name: /Graduate Analyst.*Open dossier/ });
    fireEvent.click(row);

    expect(page.getPath()).toBe('/applications/app-1');
  });

  it('redirects the legacy ?application= deep link to the dossier, preserving filters', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: [
            makeAppRow({ id: 'app-1' }),
            makeAppRow({ id: 'app-2', status: 'offered', job: { ...makeAppRow().job, title: 'Credit Officer' } }),
          ],
          error: null,
        },
      },
    });
    const page = renderPage('/applications?application=app-2&stage=offer&q=credit');

    expect(await screen.findByText('Credit Officer')).toBeTruthy();
    expect(page.getPath()).toBe('/applications/app-2?q=credit&stage=offer');
  });

  it('flags rows whose posting is gone instead of hiding them', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow({ job: null })], error: null },
      },
    });
    renderPage();

    expect(await screen.findByText(/Posting unavailable/)).toBeTruthy();
    expect(screen.getAllByText('Tracked application').length).toBeGreaterThan(0);
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
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect((await screen.findAllByText('Graduate Analyst')).length).toBeGreaterThan(0);
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
      },
    });
    renderPage();

    expect(await screen.findByText('No applications yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Browse Opportunities/i })).toBeTruthy();
  });

  it('supports keyboard navigation between applications', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    installSupabaseMock({ tables: {
      job_applications: { data: [makeAppRow({ id: 'app-1' }), makeAppRow({ id: 'app-2', job: { ...makeAppRow().job, title: 'Second role' } })], error: null },
    }});
    renderPage();
    const first = await screen.findByRole('button', { name: /Graduate Analyst.*Open dossier/i });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement?.getAttribute('data-application-id')).toBe('app-2');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });
});
