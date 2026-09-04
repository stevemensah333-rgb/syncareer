import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { installSupabaseMock } from '@/test/supabaseMock';
import { useMarketSignals } from './useMarketSignals';

beforeEach(() => {
  cleanup();
});

describe('useMarketSignals', () => {
  it('loads and maps every personalisation source', async () => {
    installSupabaseMock({
      tables: {
        user_skills: { data: [{ skill_name: 'Python', proficiency: 'intermediate' }], error: null },
        job_applications: { data: [{ status: 'interview' }, { status: 'rejected' }], error: null },
        saved_jobs: { data: [{ job_id: 'job-1' }], error: null },
        job_postings: { data: [{ title: 'Backend Engineer', skills: ['Python', 'Docker'] }], error: null },
      },
      maybeSingle: {
        assessments: {
          data: { primary_interest: 'Investigative', secondary_interest: null, tertiary_interest: 'Realistic' },
          error: null,
        },
      },
    });

    const { result } = renderHook(() => useMarketSignals(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.signals.recordedSkills).toEqual([
      { name: 'Python', proficiency: 'intermediate' },
    ]);
    expect(result.current.signals.interests).toEqual(['Investigative', 'Realistic']);
    expect(result.current.signals.activeApplications).toBe(1); // rejected is terminal
    expect(result.current.signals.applicationsByStatus).toEqual({ interview: 1, rejected: 1 });
    expect(result.current.signals.savedRoleTitles).toEqual(['Backend Engineer']);
    expect(result.current.signals.postings).toEqual([
      { title: 'Backend Engineer', skills: ['Python', 'Docker'] },
    ]);
    expect(result.current.partial).toBe(false);
  });

  it('flags a failing source as partial without losing the rest', async () => {
    installSupabaseMock({
      tables: {
        user_skills: { data: null, error: { message: 'permission denied' } },
        job_applications: { data: [{ status: 'pending' }], error: null },
        saved_jobs: { data: [], error: null },
        job_postings: { data: [], error: null },
      },
      maybeSingle: { assessments: { data: null, error: null } },
    });

    const { result } = renderHook(() => useMarketSignals(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.signals.recordedSkills).toEqual([]);
    expect(result.current.signals.activeApplications).toBe(1);
    expect(result.current.partial).toBe(true);
  });

  it('stays empty and not-loading when disabled', async () => {
    const { result } = renderHook(() => useMarketSignals(false));
    expect(result.current.loading).toBe(false);
    expect(result.current.signals.recordedSkills).toEqual([]);
    expect(result.current.signals.activeApplications).toBe(0);
  });
});
