import { describe, expect, it } from 'vitest';
import { parseCVAnalysisResult } from './useCVAnalysis';

const valid = {
  analysis: 'Synthetic fixture',
  extractedSkills: [{ name: 'Python', category: 'technical', proficiency: 'beginner' }],
  experienceSummary: null,
  scores: { overall: 50, formatting: 50, content: 50, relevance: 50, impact: 50 },
  suggestedRoles: [],
  missingSkills: [],
  extractedPersonal: null,
  extractedEducation: null,
  extractedExperience: [],
};

describe('CV upload analysis response validation', () => {
  it('accepts the documented structured response', () => {
    expect(parseCVAnalysisResult(valid)).toMatchObject({ analysis: 'Synthetic fixture' });
  });

  it('fails closed for malformed provider output and out-of-range scores', () => {
    expect(parseCVAnalysisResult('not json')).toBeNull();
    expect(parseCVAnalysisResult({ ...valid, scores: { ...valid.scores, overall: 140 } })).toBeNull();
    expect(parseCVAnalysisResult({ ...valid, extractedExperience: [{ company: 'X' }] })).toBeNull();
  });
});
