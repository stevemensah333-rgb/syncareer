import { describe, expect, it } from 'vitest';
import type { RequirementThread } from '@/features/evidence/dossierViewModel';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  ResumeEvidenceLinkRow,
} from '@/features/evidence/types';
import {
  describeApplicationFlow,
  describeRequirementFlow,
  flowStepForSection,
  flowStepForSelection,
  groupCvLinksByEvidence,
} from './requirementFlow';

const NOW = '2026-09-01T09:00:00.000Z';

function requirement(overrides: Partial<ApplicationRequirementRow> = {}): ApplicationRequirementRow {
  return {
    id: 'req-1',
    application_id: 'app-1',
    user_id: 'user-1',
    label: 'SQL reporting',
    detail: null,
    origin: 'posting_skill',
    sort_order: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceItemRow> = {}): EvidenceItemRow {
  return {
    id: 'ev-1',
    user_id: 'user-1',
    category: 'project',
    title: 'Reporting dashboard',
    summary: 'Weekly service data in SQL.',
    occurred_on: null,
    review_status: 'confirmed',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function link(overrides: Partial<ApplicationEvidenceLinkRow> = {}): ApplicationEvidenceLinkRow {
  return {
    id: 'link-1',
    requirement_id: 'req-1',
    evidence_id: 'ev-1',
    user_id: 'user-1',
    relevance_note: null,
    created_at: NOW,
    ...overrides,
  };
}

function cvLink(overrides: Partial<ResumeEvidenceLinkRow> = {}): ResumeEvidenceLinkRow {
  return {
    id: 'cv-link-1',
    resume_id: 'cv-1',
    evidence_id: 'ev-1',
    user_id: 'user-1',
    cv_section: 'experience',
    entry_locator: 'entry 2, first bullet',
    created_at: NOW,
    ...overrides,
  };
}

/**
 * Threads are built by the shared view model; these tests exercise the flow
 * derivation that turns one thread into requirement → evidence → material →
 * next action, so the assertions stay about what the dossier is allowed to say.
 */
function thread(
  evidenceEntries: Array<{
    item: EvidenceItemRow;
    link?: ApplicationEvidenceLinkRow;
    sources?: number;
    usedInCv?: boolean;
    usedInInterview?: boolean;
  }>,
): RequirementThread {
  return {
    requirement: requirement(),
    evidence: evidenceEntries.map((entry, index) => ({
      item: entry.item,
      link: entry.link ?? link({ id: `link-${index}`, evidence_id: entry.item.id }),
      sources: Array.from({ length: entry.sources ?? 0 }, (_, sourceIndex) => ({
        id: `source-${sourceIndex}`,
        evidence_id: entry.item.id,
        user_id: 'user-1',
        source_type: 'manual_note' as const,
        resume_id: null,
        interview_id: null,
        entry_locator: null,
        source_label: 'Society minutes',
        source_excerpt: 'Approved the work.',
        source_url: null,
        created_at: NOW,
        updated_at: NOW,
      })),
      supportStatus:
        entry.item.review_status === 'archived'
          ? ('archived' as const)
          : entry.item.review_status === 'draft'
            ? ('draft' as const)
            : (entry.sources ?? 0) > 0
              ? ('supported' as const)
              : ('needs_source' as const),
      usedInCv: entry.usedInCv ?? false,
      usedInInterview: entry.usedInInterview ?? false,
    })),
  };
}

const noMaterials = { cvLinksByEvidence: new Map<string, ResumeEvidenceLinkRow[]>(), applicationCvId: null, applicationCvTitle: null };

describe('describeRequirementFlow', () => {
  it('states a gap instead of inventing support when nothing is attached', () => {
    const flow = describeRequirementFlow(thread([]), noMaterials);
    expect(flow.status).toBe('no_evidence');
    expect(flow.gap).toBe('No evidence answers this requirement yet.');
    expect(flow.materials).toEqual([]);
    expect(flow.nextAction).toEqual({ kind: 'link_evidence', label: 'Link evidence' });
  });

  it('asks for a source when attached evidence cannot be checked yet', () => {
    const flow = describeRequirementFlow(thread([{ item: evidence() }]), noMaterials);
    expect(flow.status).toBe('needs_source');
    expect(flow.attachedCount).toBe(1);
    expect(flow.supportedCount).toBe(0);
    expect(flow.gap).toContain('none backed by a source');
    expect(flow.nextAction.kind).toBe('add_source');
  });

  it('points at the application CV when supported evidence is unused', () => {
    const flow = describeRequirementFlow(thread([{ item: evidence(), sources: 1 }]), noMaterials);
    expect(flow.status).toBe('ready_not_used');
    expect(flow.nextAction).toEqual({ kind: 'open_cv', label: 'Prepare the application CV' });

    const withCv = describeRequirementFlow(thread([{ item: evidence(), sources: 1 }]), {
      ...noMaterials,
      applicationCvId: 'cv-1',
      applicationCvTitle: 'Graduate Analyst CV',
    });
    expect(withCv.nextAction.label).toBe('Use it in the application CV');
  });

  it('names the CV section and locator only when the link row records them', () => {
    const flow = describeRequirementFlow(
      thread([{ item: evidence(), sources: 1, usedInCv: true }]),
      {
        cvLinksByEvidence: groupCvLinksByEvidence([cvLink()]),
        applicationCvId: 'cv-1',
        applicationCvTitle: 'Graduate Analyst CV',
      },
    );
    expect(flow.status).toBe('in_cv');
    expect(flow.materials).toEqual([
      { kind: 'cv', label: 'Graduate Analyst CV', detail: 'Experience · entry 2, first bullet' },
    ]);
    expect(flow.nextAction.kind).toBe('practice');
  });

  it('labels a CV it cannot name as the application CV without inventing one', () => {
    const flow = describeRequirementFlow(
      thread([{ item: evidence(), sources: 1, usedInCv: true }]),
      { cvLinksByEvidence: groupCvLinksByEvidence([cvLink({ resume_id: 'other-cv' })]), applicationCvId: null, applicationCvTitle: null },
    );
    expect(flow.materials[0]).toEqual({ kind: 'cv', label: 'CV', detail: 'Experience · entry 2, first bullet' });
  });

  it('reports nothing outstanding once CV and interview practice both use it', () => {
    const flow = describeRequirementFlow(
      thread([
        { item: evidence(), sources: 1, usedInCv: true, usedInInterview: true },
        { item: evidence({ id: 'ev-2', title: 'Survey cleaning' }), link: link({ evidence_id: 'ev-2' }), sources: 1, usedInCv: true },
      ]),
      {
        cvLinksByEvidence: groupCvLinksByEvidence([cvLink(), cvLink({ id: 'cv-link-2', evidence_id: 'ev-2', entry_locator: 'projects entry 1' })]),
        applicationCvId: 'cv-1',
        applicationCvTitle: 'Graduate Analyst CV',
      },
    );
    expect(flow.status).toBe('covered');
    expect(flow.gap).toBeNull();
    expect(flow.materials).toHaveLength(3);
    expect(flow.nextAction).toEqual({ kind: 'none', label: 'Nothing outstanding' });
  });
});

describe('describeApplicationFlow', () => {
  it('says a linked CV could not be read instead of claiming there is none', () => {
    const flow = describeApplicationFlow({
      requirementCount: 0,
      supportedRequirementCount: 0,
      gapRequirementCount: 0,
      evidenceReady: 0,
      evidenceTotal: 0,
      applicationCv: { state: 'unavailable' },
      nextActionLabel: 'Send follow-up',
      nextActionDue: '2026-09-01',
      dueState: 'none',
    });
    expect(flow.material).toEqual({ value: 'Linked CV could not be loaded', tone: 'neutral' });
  });

  it('marks the whole chain as unavailable rather than zero when the rows failed to load', () => {
    const flow = describeApplicationFlow({
      requirementCount: null,
      supportedRequirementCount: 0,
      gapRequirementCount: 0,
      evidenceReady: 0,
      evidenceTotal: 0,
      applicationCv: { state: 'none' },
      nextActionLabel: null,
      nextActionDue: null,
      dueState: 'none',
    });
    expect(flow.requirement.value).toBe('Requirements unavailable');
    expect(flow.evidence.value).toBe('Evidence unavailable');
    expect(flow.material.tone).toBe('warning');
    expect(flow.action.value).toBe('No next action set');
  });

  it('counts supported requirements and flags gaps', () => {
    const flow = describeApplicationFlow({
      requirementCount: 3,
      supportedRequirementCount: 1,
      gapRequirementCount: 2,
      evidenceReady: 2,
      evidenceTotal: 3,
      applicationCv: { state: 'linked', label: 'Graduate Analyst CV' },
      nextActionLabel: 'Send follow-up',
      nextActionDue: '2026-09-01',
      dueState: 'overdue',
    });
    expect(flow.requirement).toEqual({ value: '1 of 3 supported', tone: 'warning' });
    expect(flow.evidence).toEqual({ value: '2 of 3 ready', tone: 'success' });
    expect(flow.material).toEqual({ value: 'Graduate Analyst CV', tone: 'success' });
    expect(flow.action).toEqual({ value: 'Send follow-up · Overdue · 2026-09-01', tone: 'warning' });
  });

  it('keeps a linked CV visible even when no requirements are recorded', () => {
    const flow = describeApplicationFlow({
      requirementCount: 0,
      supportedRequirementCount: 0,
      gapRequirementCount: 0,
      evidenceReady: 0,
      evidenceTotal: 0,
      applicationCv: { state: 'linked', label: 'Untitled CV' },
      nextActionLabel: null,
      nextActionDue: null,
      dueState: 'none',
    });
    expect(flow.requirement.value).toBe('No requirements recorded');
    expect(flow.evidence.value).toBe('No evidence saved yet');
    expect(flow.material).toEqual({ value: 'Untitled CV', tone: 'success' });
  });
});

describe('flow emphasis mapping', () => {
  it('follows the inspector selection first', () => {
    expect(flowStepForSelection('requirement')).toBe('requirement');
    expect(flowStepForSelection('evidence')).toBe('evidence');
    expect(flowStepForSelection(null)).toBeNull();
  });

  it('falls back to the section being read', () => {
    expect(flowStepForSection('cv')).toBe('material');
    expect(flowStepForSection('mentor')).toBeNull();
  });
});
