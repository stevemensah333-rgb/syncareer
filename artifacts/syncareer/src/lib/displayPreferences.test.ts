import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyDisplayPreferences, initializeDisplayPreferences, readDisplayPreferences } from './displayPreferences';

describe('display preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('compact-view');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  it('restores dark and compact preferences before the workspace renders', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('compactView', 'true');
    initializeDisplayPreferences();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('compact-view')).toBe(true);
  });

  it('uses the system theme only when no explicit theme is stored', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    expect(readDisplayPreferences()).toEqual({ dark: true, compact: false });
  });

  it('applies and persists settings changes together', () => {
    applyDisplayPreferences({ dark: false, compact: true });
    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('compactView')).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.body.classList.contains('compact-view')).toBe(true);
  });
});
