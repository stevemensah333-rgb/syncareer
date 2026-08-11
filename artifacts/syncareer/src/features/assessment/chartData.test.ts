import { describe, expect, it } from 'vitest';
import { personalityRadarData, skillsBarData } from './chartData';

describe('assessment chart data', () => {
  it('returns the axis/value fields consumed by the accessible assessment charts', () => {
    const skills = skillsBarData({ q16: 5, q17: 4, q24: 4 });
    const personality = personalityRadarData({ q1: 5, q7: 5, q14: 5 });

    expect(skills[0]).toMatchObject({ axis: 'Writing', value: 100 });
    expect(personality.find((item) => item.axis === 'Leadership')).toMatchObject({ value: 100 });
    expect(Object.keys(skills[0] ?? {})).toEqual(['axis', 'value']);
  });
});
