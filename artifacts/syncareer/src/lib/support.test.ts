import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSupportEnabled, supportUrl } from './support';

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * The optional-support seam must be inert by default: no configured URL, no
 * entry point. Support is a separate, optional one-time flow and must never
 * be able to grant feature access (it carries no feature semantics at all).
 */
describe('optional support seam', () => {
  it('is disabled when VITE_SUPPORT_URL is unset', () => {
    vi.stubEnv('VITE_SUPPORT_URL', '');
    expect(supportUrl()).toBe('');
    expect(isSupportEnabled()).toBe(false);
  });

  it('is enabled only when a real destination URL is configured', () => {
    vi.stubEnv('VITE_SUPPORT_URL', 'https://support.example.com/one-time');
    expect(supportUrl()).toBe('https://support.example.com/one-time');
    expect(isSupportEnabled()).toBe(true);
  });
});
