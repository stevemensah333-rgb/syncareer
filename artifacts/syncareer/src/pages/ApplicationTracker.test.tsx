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
  it('renders applications with stage, and filters by application state', async () => {
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

    await screen.findAllByText('Graduate Analyst');
    const list = () => screen.getByRole('group', { name: 'Applications' });
    const roles = () =>
      Array.from(list().querySelectorAll('h3')).map((node) => node.textContent);
    expect(roles()).toEqual(['Graduate Analyst', 'Credit Officer', 'Field Coordinator']);

    // State filter: "Completed" keeps only terminal outcomes.
    fireEvent.click(screen.getByRole('button', { name: /Completed/ }));
    expect(roles()).toEqual(['Field Coordinator']);
  });

  it('navigates an application object to its canonical workspace route', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow({ status: 'interview', notes: 'Prepare SQL stories' })], error: null },
      },
    });
    const page = renderPage();

    const row = await screen.findByRole('button', { name: /Graduate Analyst.*Open application/ });
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
    const page = renderPage('/applications?application=app-2&state=completed&q=credit');

    expect((await screen.findAllByText('Credit Officer')).length).toBeGreaterThan(0);
    expect(page.getPath()).toBe('/applications/app-2?q=credit&state=completed');
  });

  it('flags applications whose posting is gone instead of hiding them', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: [makeAppRow({ job: null })], error: null },
      },
    });
    renderPage();

    expect(await screen.findByText(/Original posting unavailable/)).toBeTruthy();
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

  it('shows evidence coverage, linked CV and the next action on the application object', async () => {
    installSupabaseMock({
      tables: {
        job_applications: {
          data: [makeAppRow({ id: '66666666-6666-4666-8666-666666666666', status: 'interview', resume_id: 'cv-1', next_action: 'Review missing evidence' })],
          error: null,
        },
        resumes: { data: [{ id: 'cv-1', user_id: '77777777-7777-4777-8777-777777777777', title: 'Backend CV v2', updated_at: null }], error: null },
        application_requirements: {
          data: [
            { id: '11111111-1111-4111-8111-111111111111', application_id: '66666666-6666-4666-8666-666666666666', user_id: '77777777-7777-4777-8777-777777777777', label: 'SQL', detail: null, origin: 'posting_skill', sort_order: 0, created_at: '2026-08-28T09:00:00.000Z', updated_at: '2026-08-28T09:00:00.000Z' },
            { id: '22222222-2222-4222-8222-222222222222', application_id: '66666666-6666-4666-8666-666666666666', user_id: '77777777-7777-4777-8777-777777777777', label: 'APIs', detail: null, origin: 'posting_skill', sort_order: 1, created_at: '2026-08-28T09:00:00.000Z', updated_at: '2026-08-28T09:00:00.000Z' },
          ],
          error: null,
        },
        evidence_items: {
          data: [{ id: '33333333-3333-4333-8333-333333333333', user_id: '77777777-7777-4777-8777-777777777777', category: 'work', title: 'Reporting pipeline', summary: 'Built it', occurred_on: null, review_status: 'confirmed', created_at: '2026-08-28T09:00:00.000Z', updated_at: '2026-08-28T09:00:00.000Z' }],
          error: null,
        },
        evidence_sources: {
          data: [{ id: '44444444-4444-4444-8444-444444444444', evidence_id: '33333333-3333-4333-8333-333333333333', user_id: '77777777-7777-4777-8777-777777777777', source_type: 'manual_note', resume_id: null, interview_id: null, entry_locator: null, source_label: 'Note', source_excerpt: 'Excerpt', source_url: null, created_at: '2026-08-28T09:00:00.000Z', updated_at: '2026-08-28T09:00:00.000Z' }],
          error: null,
        },
        application_evidence_links: {
          data: [{ id: '55555555-5555-4555-8555-555555555555', requirement_id: '11111111-1111-4111-8111-111111111111', evidence_id: '33333333-3333-4333-8333-333333333333', user_id: '77777777-7777-4777-8777-777777777777', relevance_note: null, created_at: '2026-08-28T09:00:00.000Z' }],
          error: null,
        },
        resume_evidence_links: { data: [], error: null },
      },
    });
    renderPage();

    expect(await screen.findByText('1 / 2')).toBeTruthy();
    expect(screen.getByText('Backend CV v2')).toBeTruthy();
    expect(screen.getByText('Review missing evidence')).toBeTruthy();
  });

  it('supports keyboard navigation between applications', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    installSupabaseMock({ tables: {
      job_applications: { data: [makeAppRow({ id: 'app-1' }), makeAppRow({ id: 'app-2', job: { ...makeAppRow().job, title: 'Second role' } })], error: null },
    }});
    renderPage();
    const first = await screen.findByRole('button', { name: /Graduate Analyst.*Open application/i });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement?.getAttribute('data-application-id')).toBe('app-2');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });
});
