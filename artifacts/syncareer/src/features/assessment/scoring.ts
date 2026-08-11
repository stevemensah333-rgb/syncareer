import type { AssessmentQuestion } from '@/data/assessmentQuestions';
import { RIASEC_LABELS } from '@/data/assessmentQuestions';

export interface RiasecScoreResult {
  personality_score_json: Record<string, number>;
  skills_score_json: Record<string, number>;
  work_interest_score_json: Record<string, number>;
  primary_interest: string | null;
  secondary_interest: string | null;
  tertiary_interest: string | null;
}

export function validateAssessmentAnswers(answers: Record<number, number>, questions: AssessmentQuestion[]): boolean {
  return questions.length === 45 && questions.every((question) => Number.isInteger(answers[question.id]) && answers[question.id]! >= 1 && answers[question.id]! <= 5);
}

/**
 * Pure RIASEC scoring — canonical implementation shared by guest and
 * authenticated paths.  Takes an answers map and the question bank.
 */
export function calculateRiasec(
  answers: Record<number, number>,
  questions: AssessmentQuestion[],
): RiasecScoreResult {
  const personalityScores: Record<string, number> = {};
  const skillsScores: Record<string, number> = {};
  const riasecScores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const riasecCounts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  for (const q of questions) {
    const val = answers[q.id];
    if (q.category === 'personality') {
      if (val !== undefined) personalityScores[`q${q.id}`] = val;
    } else if (q.category === 'skills') {
      if (val !== undefined) skillsScores[`q${q.id}`] = val;
    } else if (q.category === 'work_interest' && q.subcategory) {
      riasecScores[q.subcategory] = (riasecScores[q.subcategory] ?? 0) + (val ?? 0);
      riasecCounts[q.subcategory] = (riasecCounts[q.subcategory] ?? 0) + 1;
    }
  }

  // Normalize RIASEC to 0–100
  const workInterestScores: Record<string, number> = {};
  for (const key of Object.keys(riasecScores)) {
    const maxPossible = (riasecCounts[key] ?? 0) * 5;
    workInterestScores[key] = maxPossible > 0
      ? Math.round(((riasecScores[key] ?? 0) / maxPossible) * 100)
      : 0;
  }

  const sorted = Object.entries(workInterestScores).sort(
    ([, a], [, b]) => b - a
  );
  const primary = sorted[0]?.[0] ?? null;
  const secondary = sorted[1]?.[0] ?? null;
  const tertiary = sorted[2]?.[0] ?? null;

  return {
    personality_score_json: personalityScores,
    skills_score_json: skillsScores,
    work_interest_score_json: workInterestScores,
    primary_interest: primary ? (RIASEC_LABELS[primary] ?? null) : null,
    secondary_interest: secondary ? (RIASEC_LABELS[secondary] ?? null) : null,
    tertiary_interest: tertiary ? (RIASEC_LABELS[tertiary] ?? null) : null,
  };
}
