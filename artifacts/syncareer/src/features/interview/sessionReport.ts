import type { InterviewMessage } from '@/types/interview';

export interface AnswerEvidence {
  question: string;
  answer: string | null;
}

export type EvidenceLevel = 'not available' | 'limited' | 'present';

export interface DeterministicAnswerChecks {
  relevance: EvidenceLevel;
  specificity: EvidenceLevel;
  evidence: EvidenceLevel;
  clarity: EvidenceLevel;
}

export function pairQuestionAnswers(messages: InterviewMessage[]): AnswerEvidence[] {
  const pairs: AnswerEvidence[] = [];
  for (const message of messages) {
    if (message.role === 'assistant' && !/interview complete|comprehensive feedback report/i.test(message.content)) {
      pairs.push({ question: message.content, answer: null });
    }
    else if (pairs.length) pairs[pairs.length - 1]!.answer = message.content || null;
  }
  return pairs;
}

/** Qualitative text checks only; they are not hiring predictions or semantic grading. */
export function deterministicAnswerChecks(pair: AnswerEvidence): DeterministicAnswerChecks {
  if (!pair.answer?.trim()) return { relevance: 'not available', specificity: 'not available', evidence: 'not available', clarity: 'not available' };
  const answer = pair.answer.trim();
  const words = answer.split(/\s+/).filter(Boolean);
  const questionTerms = new Set(pair.question.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const overlap = words.some((word) => questionTerms.has(word.toLowerCase().replace(/[^a-z]/g, '')));
  const hasSpecificity = /\b(for example|specifically|when|while|during|project|team|client)\b/i.test(answer);
  const hasEvidence = /\b\d+(?:[.,]\d+)?%?\b|\b(result|outcome|improved|reduced|increased|delivered|built|created|led)\b/i.test(answer);
  return {
    relevance: overlap ? 'present' : 'limited',
    specificity: hasSpecificity ? 'present' : 'limited',
    evidence: hasEvidence ? 'present' : 'limited',
    clarity: words.length >= 12 && words.length <= 220 ? 'present' : 'limited',
  };
}

export function retryOutline(): string[] {
  return [
    'Situation: name the real setting without adding details that did not happen.',
    'Task: state your responsibility or decision.',
    'Action: explain the steps you personally took.',
    'Result and learning: give only outcomes you can support, then name what you learned.',
  ];
}
