import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

/**
 * Render-cost regression guard for the opportunity list.
 *
 * The page renders every matching row, each wrapped in a hover preview. With
 * an unbounded feed this list can reach hundreds of rows, so typing in the
 * search box must not re-render rows whose inputs did not change. This test
 * renders 400 synthetic rows and measures (React Profiler) the commit cost of
 * a single keystroke against the initial render cost of the same list.
 */

function makeJobs(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `job-${index + 1}`,
    title: index % 7 === 0 ? `Unique Analytics Role ${index + 1}` : `Graduate Engineer ${index + 1}`,
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: 'A reasonably long description '.repeat(8),
    requirements: null,
    skills: ['TypeScript'],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    employer_id: null,
    source: 'jobberman',
    source_url: `https://example.com/jobs/${index + 1}`,
    is_external: true,
    application_deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    company_name: 'Acme Ghana',
    company_domain: null,
    experience_level: 'entry',
    external_id: null,
    status: 'active',
    updated_at: new Date().toISOString(),
  }));
}

describe('Opportunities list render cost', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('a search keystroke is much cheaper than the initial 400-row render', async () => {
    const jobs = makeJobs(400);
    installSupabaseMock({
      tables: {
        job_postings: { data: jobs, error: null },
        job_applications: { data: [], error: null },
        saved_jobs: { data: [], error: null },
      },
    });

    const commits: Array<{ phase: string; actualDuration: number }> = [];
    const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
      commits.push({ phase, actualDuration });
    };

    render(
      <MemoryRouter initialEntries={['/opportunities']}>
        <Profiler id="markets" onRender={onRender}>
          <Markets />
        </Profiler>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open details\.$/ }).length).toBe(400);
    });

    const initialDuration = commits.reduce((sum, commit) => sum + commit.actualDuration, 0);
    commits.length = 0;

    // Type a term that still matches most rows: this is the expensive typing
    // case, because the surviving rows must reconcile instead of unmounting.
    const searchInput = screen.getByLabelText('Search opportunities');
    fireEvent.change(searchInput, { target: { value: 'Graduate' } });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open details\.$/ }).length).toBe(342);
    });

    const keystrokeDuration = commits.reduce((sum, commit) => sum + commit.actualDuration, 0);
    // eslint-disable-next-line no-console
    console.log(`[markets-perf] initial400=${initialDuration.toFixed(1)}ms keystroke342=${keystrokeDuration.toFixed(1)}ms`);

    // Guard: one keystroke over surviving rows must cost a small fraction of
    // rendering the whole list once. Pre-fix every surviving row re-rendered
    // (parity with the initial render); with memoized rows only the rows
    // whose inputs changed re-render.
    expect(keystrokeDuration).toBeLessThan(initialDuration * 0.5);
    expect(keystrokeDuration).toBeLessThan(100);
  }, 30_000);
});
