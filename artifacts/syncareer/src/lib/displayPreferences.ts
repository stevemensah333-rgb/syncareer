export interface DisplayPreferences {
  dark: boolean;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readDisplayPreferences(): DisplayPreferences {
  const storedTheme = readStored('theme');
  const prefersDark = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    dark: storedTheme === 'dark' || (!storedTheme && prefersDark),
  };
}

export function applyDisplayPreferences(preferences: DisplayPreferences, persist = true) {
  document.documentElement.classList.toggle('dark', preferences.dark);
  if (!persist) return;
  try {
    window.localStorage.setItem('theme', preferences.dark ? 'dark' : 'light');
  } catch {
    // The classes still apply when storage is unavailable (for example, a
    // locked-down browser context); persistence is simply unavailable.
  }
}

export function initializeDisplayPreferences() {
  applyDisplayPreferences(readDisplayPreferences(), false);
}
