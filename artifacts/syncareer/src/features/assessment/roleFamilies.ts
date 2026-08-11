import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

export type RoleFamilyPreference = 'prioritised' | 'neutral' | 'deprioritised' | 'dismissed';

export function orderRoleFamilies(recommendations: CareerRecommendation[], preferences: Record<string, RoleFamilyPreference>): CareerRecommendation[] {
  const weight = { prioritised: 0, neutral: 1, deprioritised: 2, dismissed: 3 };
  return [...recommendations].filter((item) => preferences[item.career.id] !== 'dismissed').sort((a, b) => (weight[preferences[a.career.id] ?? 'neutral'] - weight[preferences[b.career.id] ?? 'neutral']));
}

export function opportunitySearchForRoleFamily(title: string): string {
  return `/opportunities?q=${encodeURIComponent(title)}`;
}

export function isRiasecLabel(value: string): boolean {
  return ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional'].includes(value);
}

export function safeExplicitTargetRole(value: string): string | null {
  const trimmed = value.trim();
  return trimmed && !isRiasecLabel(trimmed) ? trimmed : null;
}
