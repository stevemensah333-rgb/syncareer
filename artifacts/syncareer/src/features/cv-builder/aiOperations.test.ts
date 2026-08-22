import { beforeEach, describe, expect, it, vi } from 'vitest';
import { candidateEvidenceSchema, type JobRequirement, type OpportunityContext, type RequirementEvidenceMatch } from './guidance';
import { isSuggestionSafeToAccept, proposeCvBulletImprovement } from './aiOperations';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/features/contextual-assistant/contract', async (load) => {
  const actual = await load<typeof import('@/features/contextual-assistant/contract')>();
  return { ...actual, requestContextualAssistance: request };
});

const opportunity: OpportunityContext = {
  opportunityId: 'job-1', title: 'Data Intern', organisation: 'Example Ltd', description: 'Python required',
  responsibilities: [], requiredQualifications: [], preferredQualifications: [], requiredSkills: ['Python'], preferredSkills: [],
  requirements: [],
};
const requirement: JobRequirement = {
  requirementId: 'requirement-python', kind: 'required_skill', text: 'Python', sourceText: 'Python', sourceField: 'skills',
};
const evidence = candidateEvidenceSchema.parse({
  evidenceId: 'evidence-project-1', category: 'project', title: 'Data project', description: 'Built a Python data cleaner', skills: ['Python'], metrics: [], source: 'project',
});
const match: RequirementEvidenceMatch = {
  requirementId: requirement.requirementId, status: 'supported', evidenceIds: [evidence.evidenceId], explanation: 'Project context supports Python.', missingEvidence: [],
};

describe('typed CV AI operation', () => {
  beforeEach(() => {
    request.mockReset();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  });

  it('constructs minimum job, requirement, and selected-evidence context', async () => {
    request.mockResolvedValue({
      kind: 'rewrite', text: 'Built a Python data cleaner',
      sourceContextIds: ['requirement-requirement-python', 'evidence-evidence-project-1'],
    });
    const result = await proposeCvBulletImprovement({
      fieldPath: 'projects.p1.bullets.0', originalText: 'Built a data cleaner', instruction: 'Make it specific',
      opportunity: { ...opportunity, requirements: [requirement] }, requirements: [requirement], evidence: [evidence], matches: [match],
    });
    const sent = request.mock.calls[0]![2] as Array<{ id: string; content: string }>;
    expect(sent.map((item) => item.id)).toEqual(['target-opportunity', 'requirement-requirement-python', 'evidence-evidence-project-1']);
    expect(JSON.stringify(sent)).not.toContain('hidden profile');
    expect(result).toMatchObject({ evidenceIds: [evidence.evidenceId], requirementIds: [requirement.requirementId], unsupportedClaims: [] });
    expect(isSuggestionSafeToAccept(result)).toBe(true);
  });

  it('fails closed when the model does not cite evidence or a requirement', async () => {
    request.mockResolvedValue({ kind: 'rewrite', text: 'Built a data cleaner', sourceContextIds: ['target-opportunity'] });
    await expect(proposeCvBulletImprovement({
      fieldPath: 'projects.p1.bullets.0', originalText: 'Built a data cleaner', instruction: 'Rewrite',
      opportunity: { ...opportunity, requirements: [requirement] }, requirements: [requirement], evidence: [evidence], matches: [match],
    })).rejects.toMatchObject({ code: 'malformed' });
  });

  it('blocks an invented provider metric', async () => {
    request.mockResolvedValue({
      kind: 'rewrite', text: 'Built a Python data cleaner that improved accuracy by 40%',
      sourceContextIds: ['requirement-requirement-python', 'evidence-evidence-project-1'],
    });
    const result = await proposeCvBulletImprovement({
      fieldPath: 'projects.p1.bullets.0', originalText: 'Built a data cleaner', instruction: 'Rewrite',
      opportunity: { ...opportunity, requirements: [requirement] }, requirements: [requirement], evidence: [evidence], matches: [match],
    });
    expect(result.unsupportedClaims.join(' ')).toContain('40%');
    expect(isSuggestionSafeToAccept(result)).toBe(false);
  });
});
