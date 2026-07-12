import { describe, it, expect } from 'vitest';
import {
  hasAccess,
  isPremiumFeature,
  FREE_LIMITS,
  type FeatureKey,
} from './featureAccess';

const ALL_FEATURE_KEYS: FeatureKey[] = [
  'ai_coach_session',
  'mock_interview',
  'cv_export',
  'career_assessment',
  'job_application',
  'analytics_realtime',
  'ai_personalized_recommendation',
];

const PREMIUM_ONLY_KEYS: FeatureKey[] = [
  'analytics_realtime',
  'ai_personalized_recommendation',
];

const QUANTIFIED_KEYS: FeatureKey[] = [
  'ai_coach_session',
  'mock_interview',
  'cv_export',
  'career_assessment',
  'job_application',
];

describe('isPremiumFeature', () => {
  it.each(PREMIUM_ONLY_KEYS)('returns true for premium-only feature %s', (key) => {
    expect(isPremiumFeature(key)).toBe(true);
  });

  it.each(QUANTIFIED_KEYS)('returns false for quantified feature %s', (key) => {
    expect(isPremiumFeature(key)).toBe(false);
  });
});

describe('hasAccess', () => {
  it.each(ALL_FEATURE_KEYS)('grants premium users access to %s', (key) => {
    expect(hasAccess(key, true)).toBe(true);
  });

  it.each(PREMIUM_ONLY_KEYS)('blocks free users from premium-only %s', (key) => {
    expect(hasAccess(key, false)).toBe(false);
  });

  it.each(QUANTIFIED_KEYS)('grants free users base access to quantified %s', (key) => {
    expect(hasAccess(key, false)).toBe(true);
  });
});

describe('FREE_LIMITS', () => {
  const expected: Record<FeatureKey, { limit: number; period: 'monthly' | 'total' | 'active' }> = {
    
    ai_coach_session:               { limit: 5,  period: 'monthly' },
    mock_interview:                 { limit: 3,  period: 'monthly' },
    cv_export:                      { limit: 2,  period: 'monthly' },
    career_assessment:              { limit: 2,  period: 'total'   },
    job_application:                { limit: 10, period: 'active'  },
    analytics_realtime:             { limit: 0,  period: 'total'   },
    ai_personalized_recommendation: { limit: 0,  period: 'total'   },
  };

  it('defines an entry for every feature key', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FREE_LIMITS[key]).toBeDefined();
    }
  });

  it.each(ALL_FEATURE_KEYS)('matches expected limit/period for %s', (key) => {
    expect(FREE_LIMITS[key].limit).toBe(expected[key].limit);
    expect(FREE_LIMITS[key].period).toBe(expected[key].period);
  });

  it.each(PREMIUM_ONLY_KEYS)('keeps free limit at 0 for premium-only %s', (key) => {
    expect(FREE_LIMITS[key].limit).toBe(0);
  });

  it('has a non-empty label for every feature key', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FREE_LIMITS[key].label).toBeTruthy();
    }
  });
});
