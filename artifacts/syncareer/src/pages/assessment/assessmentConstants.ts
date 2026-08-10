import { User, Zap, Compass } from 'lucide-react';
import { ASSESSMENT_QUESTIONS, RIASEC_LABELS } from '@/data/assessmentQuestions';
import type { AssessmentResult } from '@/hooks/useAssessment';

export const QUESTIONS_PER_PAGE = 5;
export const TOTAL_QUESTIONS = 45;

export const SECTION_COLORS: Record<string, string> = {
  Realistic: 'hsl(var(--primary))',
  Investigative: 'hsl(var(--accent))',
  Artistic: 'hsl(var(--secondary))',
  Social: 'hsl(168, 81%, 44%)',
  Enterprising: 'hsl(38, 92%, 50%)',
  Conventional: 'hsl(220, 14%, 46%)',
};

export const SECTION_INTROS = [
  {
    key: 'personality',
    title: 'Personality Traits',
    description: 'These 15 questions explore how you think, work, and relate to others. There are no right or wrong answers — respond based on how you genuinely behave.',
    icon: User,
    color: 'text-primary',
    bg: 'bg-primary/10',
    questionRange: '1–15',
  },
  {
    key: 'skills',
    title: 'Skills Preference',
    description: 'These 15 questions identify the types of tasks and activities you enjoy and feel confident doing. Rate each statement based on your actual experience.',
    icon: Zap,
    color: 'text-accent',
    bg: 'bg-accent/10',
    questionRange: '16–30',
  },
  {
    key: 'work_interest',
    title: 'Work Interest (RIASEC)',
    description: 'These 15 questions map your interests to the 6 RIASEC career categories — Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.',
    icon: Compass,
    color: 'text-secondary-foreground',
    bg: 'bg-secondary/30',
    questionRange: '31–45',
  },
];

export const SECTION_START_PAGES: Record<number, string> = {
  0: 'personality',
  3: 'skills',
  6: 'work_interest',
};

/** Calculate assessment scores locally (for guest users or reuse) */
export function calculateScoresLocally(
  answers: Record<number, number>,
  completedAt = new Date().toISOString()
): Omit<AssessmentResult, 'id' | 'created_at'> {
  const personalityScores: Record<string, number> = {};
  const skillsScores: Record<string, number> = {};
  const riasecScores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const riasecCounts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  ASSESSMENT_QUESTIONS.forEach(q => {
    const val = answers[q.id];
    if (q.category === 'personality') {
      if (val !== undefined) personalityScores[`q${q.id}`] = val;
    } else if (q.category === 'skills') {
      if (val !== undefined) skillsScores[`q${q.id}`] = val;
    } else if (q.category === 'work_interest' && q.subcategory) {
      riasecScores[q.subcategory] = (riasecScores[q.subcategory] ?? 0) + (val ?? 0);
      riasecCounts[q.subcategory] = (riasecCounts[q.subcategory] ?? 0) + 1;
    }
  });

  const workInterestScores: Record<string, number> = {};
  Object.keys(riasecScores).forEach(key => {
    const maxPossible = (riasecCounts[key] ?? 0) * 5;
    workInterestScores[key] = maxPossible > 0 ? Math.round(((riasecScores[key] ?? 0) / maxPossible) * 100) : 0;
  });

  const sorted = Object.entries(workInterestScores).sort(([, a], [, b]) => b - a);
  const primary = sorted[0]?.[0] ?? null;
  const secondary = sorted[1]?.[0] ?? null;
  const tertiary = sorted[2]?.[0] ?? null;

  return {
    completed_at: completedAt,
    personality_score_json: personalityScores,
    skills_score_json: skillsScores,
    work_interest_score_json: workInterestScores,
    primary_interest: primary ? (RIASEC_LABELS[primary] ?? null) : null,
    secondary_interest: secondary ? (RIASEC_LABELS[secondary] ?? null) : null,
    tertiary_interest: tertiary ? (RIASEC_LABELS[tertiary] ?? null) : null,
  };
}
