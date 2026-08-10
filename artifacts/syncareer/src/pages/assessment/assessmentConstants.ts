import { User, Zap, Compass } from 'lucide-react';
import { ASSESSMENT_QUESTIONS } from '@/data/assessmentQuestions';
import type { AssessmentResult } from '@/hooks/useAssessment';
import { calculateRiasec } from '@/features/assessment/scoring';

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

/** Calculate assessment scores locally (for guest users or reuse).
 *  Delegates to the canonical `calculateRiasec` in features/assessment. */
export function calculateScoresLocally(
  answers: Record<number, number>,
  completedAt = new Date().toISOString(),
): Omit<AssessmentResult, 'id' | 'created_at'> {
  const scores = calculateRiasec(answers, ASSESSMENT_QUESTIONS);
  return { ...scores, completed_at: completedAt };
}
