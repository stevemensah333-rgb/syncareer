import { describe, expect, it } from 'vitest';
import {
  buildApplicationSummaries,
  filterOf,
  filterOptions,
  matchesFilter,
  matchesSearch,
  needsAttention,
  parseApplicationFilter,
  recentActivity,
  type EvidenceIndexData,
} from './applicationIndex';
import type { WorkspaceApplication, WorkspaceResume } from './workspace';

const NOW = new Date(2026, 8, 4, 12);

function application(overrides: Partial<WorkspaceApplication> = {}): WorkspaceApplication {
  return {
    id: 'app-1',
    job_id: 'job-1',
    status: 'interview',
    notes: null,
    resume_url: null,
    created_at: '2026-08-28T09:00:00.000Z',
    updated_at: '2026-09-02T09:00:00.000Z',
    job: {
      title: 'Backend Engineer',
      company_name: 'Acme Ghana',
      department: null,
      source: 'jobberman',
      source_url: null,
      location: 'Accra',
      application_deadline: null,
      employment_type: 'full-time',
      skills: ['SQL'],
      experience_level: 'entry',
      updated_at: null,
    },
    resume_id: 'cv-1',
    next_action: null,
    next_action_due: null,
    job_title_snapshot: 'Backend Engineer',
    company_name_snapshot: 'Acme Ghana',
    source_snapshot: null,
    source_url_snapshot: null,
    location_snapshot: 'Accra',
    deadline_snapshot: null,
    external_id_snapshot: null,
    ...overrides,
  } as WorkspaceApplication;
}

const resumes: WorkspaceResume[] = [
  { id: 'cv-1', user_id: 'u1', title: 'Backend CV v2', updated_at: null },
];

function evidenceData(supported: number, total: number, applicationId = 'app-1'): EvidenceIndexData {
  const requirements = Array.from({ length: total }, (_, index) => ({
    id: `req-${index}`,
    application_id: applicationId,
    user_id: 'u1',
    label: `Requirement ${index}`,
    detail: null,
    origin: 'posting_skill' as const,
    sort_order: index,
    created_at: '2026-08-28T09:00:00.000Z',
    updated_at: '2026-08-28T09:00:00.000Z',
  }));
  const items = Array.from({ length: supported }, (_, index) => ({
    id: `ev-${index}`,
    user_id: 'u1',
    category: 'work' as const,
    title: `Evidence ${index}`,
    summary: 'Summary',
    occurred_on: null,
    review_status: 'confirmed' as const,
    created_at: '2026-08-28T09:00:00.000Z',
    updated_at: '2026-08-28T09:00:00.000Z',
  }));
  return {
    requirements,
    items,
    sources: items.map((item, index) => ({
      id: `src-${index}`,
      evidence_id: item.id,
      user_id: 'u1',
      source_type: 'manual_note' as const,
      resume_id: null,
      interview_id: null,
      entry_locator: null,
      source_label: 'Note',
      source_excerpt: 'Excerpt',
      source_url: null,
      created_at: '2026-08-28T09:00:00.000Z',
      updated_at: '2026-08-28T09:00:00.000Z',
    })),
    links: items.map((item, index) => ({
      id: `link-${index}`,
      requirement_id: `req-${index}`,
      evidence_id: item.id,
      user_id: 'u1',
      relevance_note: null,
      created_at: '2026-08-28T09:00:00.000Z',
    })),
    resumeLinks: [],
  };
}

describe('application index view-model', () => {
  it('summarises an application from recorded facts only', () => {
    const [summary] = buildApplicationSummaries([application()], resumes, evidenceData(6, 8), NOW);

    expect(summary).toMatchObject({
      role: 'Backend Engineer',
      organisation: 'Acme Ghana',
      location: 'Accra',
      stage: 'interview',
      stageLabel: 'Interview',
      cvTitle: 'Backend CV v2',
      postingMissing: false,
    });
    expect(summary.evidence).toEqual({
      requirementCount: 8,
      supportedRequirementCount: 6,
      gapRequirementCount: 2,
    });
    expect(summary.lastActivityAt).toBe('2026-09-02T09:00:00.000Z');
  });

  it('omits facts that are not recorded rather than inventing them', () => {
    const [summary] = buildApplicationSummaries(
      [application({ resume_id: null, job: null, location_snapshot: null, company_name_snapshot: null, updated_at: '2026-08-28T09:00:00.000Z' })],
      resumes,
      null,
      NOW,
    );

    expect(summary.cvTitle).toBeNull();
    expect(summary.evidence).toBeNull();
    expect(summary.location).toBeNull();
    expect(summary.organisation).toBeNull();
    expect(summary.lastActivityAt).toBeNull();
    expect(summary.postingMissing).toBe(true);
  });

  it('prefers the student-recorded next action, and derives one otherwise', () => {
    const [recorded] = buildApplicationSummaries(
      [application({ next_action: 'Email the recruiter', next_action_due: '2026-09-01' })],
      resumes,
      evidenceData(6, 8),
      NOW,
    );
    expect(recorded.nextAction).toMatchObject({
      label: 'Email the recruiter',
      recorded: true,
      due: '2026-09-01',
      dueState: 'overdue',
    });

    const [derived] = buildApplicationSummaries([application()], resumes, evidenceData(6, 8), NOW);
    expect(derived.nextAction).toMatchObject({ label: 'Review missing evidence', recorded: false, due: null });
  });

  it('offers only the states the records are actually in', () => {
    const summaries = buildApplicationSummaries(
      [
        application({ id: 'a', status: 'pending' }),
        application({ id: 'b', status: 'interview' }),
      ],
      resumes,
      null,
      NOW,
    );

    expect(filterOptions(summaries)).toEqual([
      { value: 'all', label: 'All', count: 2 },
      { value: 'in-progress', label: 'In progress', count: 1 },
      { value: 'interview', label: 'Interview', count: 1 },
    ]);
  });

  it('classifies terminal outcomes as completed and filters/searches on real fields', () => {
    const summaries = buildApplicationSummaries(
      [
        application({ id: 'a', status: 'pending' }),
        application({ id: 'b', status: 'hired' }),
        application({ id: 'c', status: 'rejected' }),
      ],
      resumes,
      null,
      NOW,
    );

    expect(summaries.map(filterOf)).toEqual(['in-progress', 'completed', 'completed']);
    expect(summaries.filter((s) => matchesFilter(s, 'completed')).map((s) => s.id)).toEqual(['b', 'c']);
    expect(matchesSearch(summaries[0], 'acme')).toBe(true);
    expect(matchesSearch(summaries[0], 'designer')).toBe(false);
    expect(parseApplicationFilter('nonsense')).toBe('all');
    expect(parseApplicationFilter('completed')).toBe('completed');
  });

  it('lists attention items and activity only when records support them', () => {
    const summaries = buildApplicationSummaries(
      [
        application({ id: 'gap', status: 'pending' }),
        application({ id: 'done', status: 'hired', updated_at: '2026-08-28T09:00:00.000Z' }),
      ],
      resumes,
      evidenceData(6, 8, 'gap'),
      NOW,
    );

    expect(needsAttention(summaries).map((s) => s.id)).toEqual(['gap']);
    expect(recentActivity(summaries).map((s) => s.id)).toEqual(['gap']);
  });
});
