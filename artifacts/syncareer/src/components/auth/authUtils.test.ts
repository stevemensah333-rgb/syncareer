import { describe, expect, it } from 'vitest';
import { authPath, getAuthErrorMessage, getAuthReturnTo, getSafeReturnTo } from './authUtils';

describe('auth redirect and error helpers', () => {
  it('keeps safe internal routes including search and hash', () => {
    expect(getSafeReturnTo('/applications?status=draft#latest')).toBe('/applications?status=draft#latest');
  });

  it.each(['https://attacker.example/path', '//attacker.example/path', '/sign-in', '/reset-password'])('rejects unsafe or recursive destination %s', (value) => {
    expect(getSafeReturnTo(value)).toBe('/');
  });

  it('reads a safe public CTA destination and preserves it through onboarding', () => {
    expect(getAuthReturnTo(null, '?returnTo=%2Fopportunities')).toBe('/opportunities');
    expect(authPath('/onboarding', '/opportunities')).toBe('/onboarding?returnTo=%2Fopportunities');
  });

  it('prefers a protected-route destination over a query parameter', () => {
    expect(getAuthReturnTo(
      { from: { pathname: '/applications', search: '?stage=interview' } },
      '?returnTo=%2Fopportunities',
    )).toBe('/applications?stage=interview');
  });

  it('maps provider details to plain, non-raw guidance', () => {
    const raw = 'Database error 23505: identity already registered';
    const copy = getAuthErrorMessage(new Error(raw), 'sign-up');
    expect(copy).not.toContain('23505');
    expect(copy).not.toContain('identity already registered');
  });
});
