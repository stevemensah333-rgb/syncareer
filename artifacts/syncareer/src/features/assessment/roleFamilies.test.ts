import { describe, expect, it } from 'vitest';
import { opportunitySearchForRoleFamily, orderRoleFamilies, safeExplicitTargetRole } from './roleFamilies';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

const recommendation = (id: string, title: string): CareerRecommendation => ({ career: { id, title, description: '', riasec_profile: {}, suggested_majors: [], required_skills: [], salary_range: null, industry: '' }, matchScore: 80, explanation: '' });

describe('assessment role-family corrections', () => {
  it('deprioritises and dismisses without mutating the source recommendations', () => {
    const source = [recommendation('a', 'Data roles'), recommendation('b', 'Research roles'), recommendation('c', 'Operations roles')];
    const result = orderRoleFamilies(source, { a: 'deprioritised', b: 'dismissed', c: 'prioritised' });
    expect(result.map((item) => item.career.id)).toEqual(['c', 'a']);
    expect(source.map((item) => item.career.id)).toEqual(['a', 'b', 'c']);
  });
  it('turns an explicit role family into an opportunity search', () => {
    expect(opportunitySearchForRoleFamily('Graduate Data Analyst')).toBe('/opportunities?q=Graduate%20Data%20Analyst');
  });
  it('never converts a RIASEC theme into a job-title or industry target', () => {
    expect(safeExplicitTargetRole('Artistic')).toBeNull();
    expect(safeExplicitTargetRole('Investigative')).toBeNull();
    expect(safeExplicitTargetRole('Graduate Data Analyst')).toBe('Graduate Data Analyst');
  });
});
