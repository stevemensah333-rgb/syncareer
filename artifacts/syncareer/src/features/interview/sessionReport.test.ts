import { describe, expect, it } from 'vitest';
import { deterministicAnswerChecks, pairQuestionAnswers, retryOutline } from './sessionReport';

const message = (role: 'user' | 'assistant', content: string) => ({ id: crypto.randomUUID(), role, content, timestamp: new Date() });

describe('session report evidence', () => {
  it('pairs actual questions and answers and preserves missing transcript evidence', () => {
    const pairs = pairQuestionAnswers([message('assistant', 'Tell me about a project'), message('user', 'I led a team project.'), message('assistant', 'What changed?')]);
    expect(pairs).toEqual([{ question: 'Tell me about a project', answer: 'I led a team project.' }, { question: 'What changed?', answer: null }]);
    expect(deterministicAnswerChecks(pairs[1]!)).toMatchObject({ relevance: 'not available', evidence: 'not available' });
  });

  it('uses qualitative transparent checks rather than fabricated precision', () => {
    const checks = deterministicAnswerChecks({ question: 'Describe a project result', answer: 'During a team project, I built the reporting flow and reduced weekly processing time by 20 percent.' });
    expect(checks).toEqual({ relevance: 'present', specificity: 'present', evidence: 'present', clarity: 'present' });
    expect(retryOutline()).toHaveLength(4);
  });
});
