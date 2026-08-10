import { describe, it, expect } from 'vitest';
import { calculateScoresLocally } from './assessmentConstants';
import { RIASEC_LABELS } from '@/data/assessmentQuestions';

/**
 * Matrix 1.1 — Deterministic RIASEC scoring, normalization to 0–100,
 * and stable tie behavior. No LLM involved.
 *
 * RIASEC question id → subcategory mapping (from assessmentQuestions.ts):
 *   R = 31,32,33 (3 q)   I = 34,35,36 (3 q)   A = 37,38,39 (3 q)
 *   S = 40,41,42 (3 q)   E = 43,44   (2 q)    C = 45      (1 q)
 * Each normalized score = round( sum / (count * 5) * 100 ).
 */

/** Build a answers map from { subcategory: number } values (per-question value). */
function riasecAnswers(scores: Record<string, number>): Record<number, number> {
  const map: Record<number, string> = {
    31: 'R', 32: 'R', 33: 'R',
    34: 'I', 35: 'I', 36: 'I',
    37: 'A', 38: 'A', 39: 'A',
    40: 'S', 41: 'S', 42: 'S',
    43: 'E', 44: 'E',
    45: 'C',
  };
  const answers: Record<number, number> = {};
  for (const [qid, sub] of Object.entries(map)) {
    answers[Number(qid)] = scores[sub];
  }
  return answers;
}

describe('calculateScoresLocally (RIASEC)', () => {
  it('normalizes subcategory sums to a 0–100 work interest score', () => {
    // R: 3×5=15/15 → 100 ; I: 3×4=12/15 → 80 ; A: 3×3=9/15 → 60 ; S: 3×2=6/15 → 40 ; E: 2×1=2/10 → 20 ; C: 1×5=5/5 → 100
    const answers = riasecAnswers({ R: 5, I: 4, A: 3, S: 2, E: 1, C: 5 });
    const result = calculateScoresLocally(answers);

    expect(result.work_interest_score_json).toEqual({ R: 100, I: 80, A: 60, S: 40, E: 20, C: 100 });
    // Top 3: R(100), C(100), I(80) — ties resolved in stable RIASEC insertion order.
    expect(result.primary_interest).toBe(RIASEC_LABELS.R);
    expect(result.secondary_interest).toBe(RIASEC_LABELS.C);
    expect(result.tertiary_interest).toBe(RIASEC_LABELS.I);
  });

  it('resolves exact ties in stable RIASEC insertion order (R < I < A < S < E < C)', () => {
    // Every subcategory ties at 100 → order of appearance is R,I,A,S,E,C.
    const answers = riasecAnswers({ R: 5, I: 5, A: 5, S: 5, E: 5, C: 5 });
    const result = calculateScoresLocally(answers);

    expect(result.primary_interest).toBe(RIASEC_LABELS.R);
    expect(result.secondary_interest).toBe(RIASEC_LABELS.I);
    expect(result.tertiary_interest).toBe(RIASEC_LABELS.A);
    expect(result.work_interest_score_json.R).toBe(100);
  });

  it('rounds non-multiple scores deterministically', () => {
    // R: 4+5+4 = 13/15 = 86.67 → 87 (per-question values, not uniform).
    const answers = {
      ...riasecAnswers({ R: 4, I: 1, A: 1, S: 1, E: 1, C: 1 }),
      32: 5,
    };
    const result = calculateScoresLocally(answers);
    expect(result.work_interest_score_json.R).toBe(87);
  });

  it('produces all-zero work-interest scores for an empty answer set', () => {
    // No answers → every RIASEC score is 0; personality/skills stay empty.
    // (Interests fall back deterministically to the stable sort order; the
    // guest Assessment flow never reaches this because it requires all 45.)
    const result = calculateScoresLocally({});
    expect(result.work_interest_score_json).toEqual({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
    expect(result.personality_score_json).toEqual({});
    expect(result.skills_score_json).toEqual({});
  });

  it('captures personality and skills scores keyed by question id', () => {
    const answers = { 1: 4, 16: 5 };
    const result = calculateScoresLocally(answers);
    expect(result.personality_score_json).toEqual({ q1: 4 });
    expect(result.skills_score_json).toEqual({ q16: 5 });
  });

  it('is deterministic across repeated runs', () => {
    const answers = riasecAnswers({ R: 5, I: 4, A: 3, S: 2, E: 1, C: 5 });
    const fixedTime = '2026-08-10T12:00:00.000Z';
    const a = calculateScoresLocally(answers, fixedTime);
    const b = calculateScoresLocally(answers, fixedTime);
    expect(a).toEqual(b);
  });
});
