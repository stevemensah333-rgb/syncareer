import { describe, expect, it } from 'vitest';
import { parseCVAIProposal } from './aiProposal';

describe('CV AI proposal parsing', () => {
  it('accepts a field-specific before/after proposal with rationale', () => {
    expect(parseCVAIProposal({ fieldPath: 'experience.exp-1.bullets.b-1', before: 'Helped with reports', after: 'Prepared weekly reports for the operations team', rationale: 'Uses a clear action and scope.' }))
      .toMatchObject({ fieldPath: 'experience.exp-1.bullets.b-1', before: 'Helped with reports' });
  });

  it('rejects generic strings, unchanged text, missing rationale and skills claims', () => {
    expect(parseCVAIProposal('Use stronger verbs')).toBeNull();
    expect(parseCVAIProposal({ fieldPath: 'personal.summary', before: 'Same', after: 'Same', rationale: 'None' })).toBeNull();
    expect(parseCVAIProposal({ fieldPath: 'skills.0', before: '', after: 'Python', rationale: 'Job asks for it' })).toBeNull();
  });
});
