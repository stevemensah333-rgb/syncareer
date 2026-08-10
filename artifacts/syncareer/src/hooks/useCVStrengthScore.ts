import { useMemo } from 'react';
import type { CVData } from '@/features/cv-builder/types';
import { computeFullScore, type ScoreBreakdown } from '@/features/cv-builder/scoring';
import type { StrengthLabel } from '@/features/cv-builder/constants';

export interface CVStrengthResult {
  totalScore: number;
  label: StrengthLabel;
  breakdown: ScoreBreakdown;
  strengths: string[];
  suggestions: string[];
}

export function useCVStrengthScore(cvData: CVData): CVStrengthResult {
  return useMemo(() => computeFullScore(cvData), [cvData]);
}
