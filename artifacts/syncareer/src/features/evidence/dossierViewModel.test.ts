import { describe, expect, it } from 'vitest';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  ResumeEvidenceLinkRow,
} from './types';
import { buildRequirementThreads, threadCoverage, unplacedEvidence } from './dossierViewModel';

const USER = 'aa0a9a1e-2222-4333-8444-555566667777';
const REQ_SQL_ID = 'rq000000-0000-4000-8000-00000000000a';
const REQ_COMMS_ID = 'rq000000-0000-4000-8000-00000000000b';
const EV_LEDGER_ID = '0f0a9a1e-0000-4000-8000-000000000001';
const EV_DASH_ID = '0f0a9a1e-0000-4000-8000-000000000002';

const requirement = (id: string, label: string, sortOrder: number): ApplicationRequirementRow => ({
  id,
  application_id: 'app00000-0000-4000-8000-000000000001',
  user_id: USER,
  label,
  detail: null,
  origin: 'posting_skill',
  sort_order: sortOrder,
  created_at: '2026-09-01T09:00:00.000Z',
  updated_at: '2026-09-01T09:00:00.000Z',
});

const evidenceItem = (
  id: string,
  reviewStatus: EvidenceItemRow['review_status'],
  created: string,
): EvidenceItemRow => ({
  id,
  user_id: USER,
  category: 'work',
  title: `Evidence ${id.slice(-4)}`,
  summary: 'Substantive summary of what the student did.',
  occurred_on: null,
  review_status: reviewStatus,
  created_at: created,
  updated_at: created,
});

const source = (evidenceId: string, type: EvidenceSourceRow['source_type']): EvidenceSourceRow => ({
  id: `sr000000-0000-4000-8000-0000000000${evidenceId.slice(-2)}`,
  evidence_id: evidenceId,
  user_id: USER,
  source_type: type,
  resume_id: type === 'resume_entry' ? 'rsum0000-0000-4000-8000-000000000001' : null,
  interview_id: type === 'interview_response' ? 'intv0000-0000-4000-8000-000000000001' : null,
  entry_locator: null,
  source_label: 'CV work experience',
  source_excerpt: 'Rebuilt the ledger…',
  source_url: null,
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
});

const link = (requirementId: string, evidenceId: string): ApplicationEvidenceLinkRow => ({
  id: `link0000-0000-4000-8000-0000000000${evidenceId.slice(-2)}`,
  requirement_id: requirementId,
  evidence_id: evidenceId,
  user_id: USER,
  relevance_note: null,
  created_at: '2026-09-01T11:00:00.000Z',
});

const resumeLink = (evidenceId: string): ResumeEvidenceLinkRow => ({
  id: `ruse0000-0000-4000-8000-0000000000${evidenceId.slice(-2)}`,
  resume_id: 'rsum0000-0000-4000-8000-000000000001',
  evidence_id: evidenceId,
  user_id: USER,
  cv_section: 'experience',
  entry_locator: 'experience.exp1.bullets.0',
  created_at: '2026-09-01T12:00:00.000Z',
});

describe('buildRequirementThreads', () => {
  const requirements = [requirement(REQ_SQL_ID, 'SQL', 0), requirement(REQ_COMMS_ID, 'Communication', 1)];
  const evidence = [
    evidenceItem(EV_LEDGER_ID, 'confirmed', '2026-09-01T08:00:00.000Z'),
    evidenceItem(EV_DASH_ID, 'draft', '2026-09-01T08:30:00.000Z'),
  ];
  const sources = [source(EV_LEDGER_ID, 'resume_entry'), source(EV_DASH_ID, 'interview_response')];
  const links = [link(REQ_SQL_ID, EV_LEDGER_ID), link(REQ_SQL_ID, EV_DASH_ID)];
  const resumeLinks = [resumeLink(EV_LEDGER_ID)];

  it('orders evidence under each requirement in stable order', () => {
    const threads = buildRequirementThreads(requirements, links, evidence, sources, resumeLinks);
    expect(threads).toHaveLength(2);
    expect(threads[0]!.requirement.label).toBe('SQL');
    expect(threads[0]!.evidence.map((entry) => entry.item.id)).toEqual([EV_LEDGER_ID, EV_DASH_ID]);
    expect(threads[1]!.evidence).toEqual([]);
  });

  it('derives support status and usage flags', () => {
    const threads = buildRequirementThreads(requirements, links, evidence, sources, resumeLinks);
    const [supported, draft] = threads[0]!.evidence;
    expect(supported!.supportStatus).toBe('supported');
    expect(supported!.usedInCv).toBe(true);
    expect(supported!.usedInInterview).toBe(false);
    expect(draft!.supportStatus).toBe('draft');
    expect(draft!.usedInCv).toBe(false);
    expect(draft!.usedInInterview).toBe(true);
  });

  it('drops links whose evidence row is missing instead of crashing', () => {
    const threads = buildRequirementThreads(requirements, [link(REQ_SQL_ID, 'missing000-0000-4000-8000-000000000009')], evidence, sources, []);
    expect(threads[0]!.evidence).toEqual([]);
  });
});

describe('threadCoverage', () => {
  it('counts supported requirements and gaps', () => {
    const threads = buildRequirementThreads(
      [requirement(REQ_SQL_ID, 'SQL', 0), requirement(REQ_COMMS_ID, 'Communication', 1)],
      [link(REQ_SQL_ID, EV_LEDGER_ID)],
      [evidenceItem(EV_LEDGER_ID, 'confirmed', '2026-09-01T08:00:00.000Z')],
      [source(EV_LEDGER_ID, 'resume_entry')],
      [],
    );
    const coverage = threadCoverage(threads);
    expect(coverage).toEqual({ requirementCount: 2, supportedRequirementCount: 1, gapRequirementCount: 1 });
  });
});

describe('unplacedEvidence', () => {
  it('lists evidence not linked to any requirement, with derived status', () => {
    const evidence = [
      evidenceItem(EV_LEDGER_ID, 'confirmed', '2026-09-01T08:00:00.000Z'),
      evidenceItem(EV_DASH_ID, 'draft', '2026-09-01T08:30:00.000Z'),
    ];
    const result = unplacedEvidence(
      evidence,
      [source(EV_DASH_ID, 'resume_entry')],
      [link(REQ_SQL_ID, EV_LEDGER_ID)],
    );
    expect(result.map((entry) => entry.item.id)).toEqual([EV_DASH_ID]);
    expect(result[0]!.supportStatus).toBe('draft');
  });
});
