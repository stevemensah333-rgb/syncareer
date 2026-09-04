import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyDisplayPreferences, initializeDisplayPreferences, readDisplayPreferences } from './displayPreferences';

describe('display preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  it('restores the stored theme before the workspace renders', () => {
    localStorage.setItem('theme', 'dark');
    initializeDisplayPreferences();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('uses the system theme only when no explicit theme is stored', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    expect(readDisplayPreferences()).toEqual({ dark: true });
  });

  it('applies and persists a theme change', () => {
    applyDisplayPreferences({ dark: true });
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applyDisplayPreferences({ dark: false });
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('does not persist during the initial paint', () => {
    initializeDisplayPreferences();
    expect(localStorage.getItem('theme')).toBeNull();
  });
});
