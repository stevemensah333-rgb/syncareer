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
 * The feed can reach hundreds of rows, but the page renders only an initial
 * bounded window and offers an explicit load-more action. This test still uses
 * 400 synthetic rows and guards the cost of a broad search keystroke.
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

  it('bounds the initial 400-row feed render and keeps a broad search keystroke inexpensive', async () => {
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
      expect(screen.getAllByRole('button', { name: /Open details\.$/ }).length).toBe(20);
      expect(screen.getByRole('button', { name: /Load 20 more opportunities \(380 remaining\)/ })).toBeTruthy();
    });

    const initialDuration = commits.reduce((sum, commit) => sum + commit.actualDuration, 0);
    commits.length = 0;

    // Type a term that still matches most rows: this is the expensive typing
    // case, because the surviving rows must reconcile instead of unmounting.
    const searchInput = screen.getByLabelText('Search opportunities');
    fireEvent.change(searchInput, { target: { value: 'Graduate' } });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open details\.$/ }).length).toBe(20);
      expect(screen.getByRole('button', { name: /Load 20 more opportunities \(322 remaining\)/ })).toBeTruthy();
    });

    const keystrokeDuration = commits.reduce((sum, commit) => sum + commit.actualDuration, 0);
    // eslint-disable-next-line no-console
    console.log(`[markets-perf] initialWindow=${initialDuration.toFixed(1)}ms searchWindow=${keystrokeDuration.toFixed(1)}ms`);

    // Guard: one broad search keystroke must stay cheap relative to the
    // bounded initial window; all 342 surviving rows must not be mounted.
    expect(keystrokeDuration).toBeLessThan(initialDuration * 0.5);
    expect(keystrokeDuration).toBeLessThan(100);
  }, 30_000);
});
