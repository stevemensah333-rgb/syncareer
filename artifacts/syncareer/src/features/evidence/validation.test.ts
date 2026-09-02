import { describe, expect, it } from 'vitest';
import {
  addEvidenceSourceInputSchema,
  applicationEvidenceLinkSchema,
  applicationRequirementSchema,
  createEvidenceInputSchema,
  evidenceItemSchema,
  evidenceSourceSchema,
  resumeEvidenceLinkSchema,
} from './validation';

const validItem = {
  id: '0f0a9a1e-1111-4222-8333-444455556666',
  user_id: 'aa0a9a1e-2222-4333-8444-555566667777',
  category: 'work',
  title: 'Ledger rebuild for the debate society',
  summary: 'Rebuilt the membership ledger and reconciled three terms of dues.',
  occurred_on: '2025-11-01',
  review_status: 'draft',
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
};

describe('evidenceItemSchema', () => {
  it('accepts a well-formed row', () => {
    expect(evidenceItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects an unknown category', () => {
    expect(evidenceItemSchema.safeParse({ ...validItem, category: 'invented' }).success).toBe(false);
  });

  it('rejects an unknown review status', () => {
    expect(evidenceItemSchema.safeParse({ ...validItem, review_status: 'verified' }).success).toBe(false);
  });

  it('rejects a malformed occurred_on date', () => {
    expect(evidenceItemSchema.safeParse({ ...validItem, occurred_on: 'November 2025' }).success).toBe(false);
  });
});

describe('evidenceSourceSchema', () => {
  const validSource = {
    id: '0f0a9a1e-9999-4222-8333-444455556666',
    evidence_id: validItem.id,
    user_id: validItem.user_id,
    source_type: 'resume_entry',
    resume_id: 'bb0a9a1e-3333-4444-8555-666677778888',
    interview_id: null,
    entry_locator: 'experience.exp1.bullets.0',
    source_label: 'CV work experience',
    source_excerpt: 'Rebuilt the membership ledger…',
    source_url: null,
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
  };

  it('accepts a well-formed row', () => {
    expect(evidenceSourceSchema.safeParse(validSource).success).toBe(true);
  });

  it('rejects an unknown source type', () => {
    expect(evidenceSourceSchema.safeParse({ ...validSource, source_type: 'employer_letter' }).success).toBe(false);
  });
});

describe('applicationRequirementSchema', () => {
  it('accepts a well-formed row', () => {
    expect(
      applicationRequirementSchema.safeParse({
        id: '0f0a9a1e-aaaa-4222-8333-444455556666',
        application_id: 'cc0a9a1e-4444-4555-8666-777788889999',
        user_id: validItem.user_id,
        label: 'SQL',
        detail: null,
        origin: 'posting_skill',
        sort_order: 0,
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown origin', () => {
    expect(
      applicationRequirementSchema.safeParse({
        id: '0f0a9a1e-aaaa-4222-8333-444455556666',
        application_id: 'cc0a9a1e-4444-4555-8666-777788889999',
        user_id: validItem.user_id,
        label: 'SQL',
        detail: null,
        origin: 'description_scan',
        sort_order: 0,
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('applicationEvidenceLinkSchema', () => {
  it('accepts a well-formed row', () => {
    expect(
      applicationEvidenceLinkSchema.safeParse({
        id: '0f0a9a1e-bbbb-4222-8333-444455556666',
        requirement_id: '0f0a9a1e-aaaa-4222-8333-444455556666',
        evidence_id: validItem.id,
        user_id: validItem.user_id,
        relevance_note: 'The dues ledger is the only place I used SQL seriously.',
        created_at: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});

describe('resumeEvidenceLinkSchema', () => {
  it('accepts a well-formed row', () => {
    expect(
      resumeEvidenceLinkSchema.safeParse({
        id: '0f0a9a1e-cccc-4222-8333-444455556666',
        resume_id: 'bb0a9a1e-3333-4444-8555-666677778888',
        evidence_id: validItem.id,
        user_id: validItem.user_id,
        cv_section: 'experience',
        entry_locator: 'experience.exp1.bullets.0',
        created_at: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown CV section', () => {
    expect(
      resumeEvidenceLinkSchema.safeParse({
        id: '0f0a9a1e-cccc-4222-8333-444455556666',
        resume_id: 'bb0a9a1e-3333-4444-8555-666677778888',
        evidence_id: validItem.id,
        user_id: validItem.user_id,
        cv_section: 'hobbies',
        entry_locator: 'hobbies.0',
        created_at: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('createEvidenceInputSchema', () => {
  it('accepts valid input and trims text', () => {
    const parsed = createEvidenceInputSchema.safeParse({
      category: 'project',
      title: '  Campus market data scrape  ',
      summary: ' Collected pricing data across three campus markets. ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe('Campus market data scrape');
    }
  });

  it('rejects whitespace-only titles', () => {
    expect(
      createEvidenceInputSchema.safeParse({ category: 'work', title: '   ', summary: 'Substantive summary.' }).success,
    ).toBe(false);
  });
});

describe('addEvidenceSourceInputSchema', () => {
  const base = {
    evidenceId: validItem.id,
    sourceLabel: 'CV work experience',
    sourceExcerpt: 'Rebuilt the membership ledger.',
  };

  it('requires resumeId for resume_entry', () => {
    expect(addEvidenceSourceInputSchema.safeParse({ ...base, sourceType: 'resume_entry' }).success).toBe(false);
    expect(
      addEvidenceSourceInputSchema.safeParse({
        ...base,
        sourceType: 'resume_entry',
        resumeId: 'bb0a9a1e-3333-4444-8555-666677778888',
      }).success,
    ).toBe(true);
  });

  it('rejects a URL attached to resume_entry', () => {
    expect(
      addEvidenceSourceInputSchema.safeParse({
        ...base,
        sourceType: 'resume_entry',
        resumeId: 'bb0a9a1e-3333-4444-8555-666677778888',
        sourceUrl: 'https://example.com/ledger',
      }).success,
    ).toBe(false);
  });

  it('requires a well-formed URL for url type', () => {
    expect(addEvidenceSourceInputSchema.safeParse({ ...base, sourceType: 'url' }).success).toBe(false);
    expect(
      addEvidenceSourceInputSchema.safeParse({ ...base, sourceType: 'url', sourceUrl: 'ftp://example.com' }).success,
    ).toBe(false);
    expect(
      addEvidenceSourceInputSchema.safeParse({ ...base, sourceType: 'url', sourceUrl: 'https://society.org/ledger' })
        .success,
    ).toBe(true);
  });

  it('rejects cross-type ids on manual_note', () => {
    expect(
      addEvidenceSourceInputSchema.safeParse({
        ...base,
        sourceType: 'manual_note',
        interviewId: 'dd0a9a1e-5555-4666-8777-888899990000',
      }).success,
    ).toBe(false);
  });
});
