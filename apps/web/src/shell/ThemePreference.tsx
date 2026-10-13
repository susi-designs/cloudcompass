import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type CarbonTheme, type ThemePreference } from './themeContext';

const STORAGE_KEY = 'cloudcompass.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — fall back to system.
  }
  return 'system';
}

function writePreference(value: ThemePreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Non-fatal: the choice just won't persist.
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const theme: CarbonTheme =
    preference === 'dark' || (preference === 'system' && systemDark) ? 'g100' : 'g10';

  // Keep the page background and native controls in step with the Carbon theme.
  useEffect(() => {
    document.documentElement.dataset.carbonTheme = theme;
    document.documentElement.style.colorScheme = theme === 'g100' ? 'dark' : 'light';
  }, [theme]);

  const value = useMemo(
    () => ({
      preference,
      theme,
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next);
        writePreference(next);
      },
    }),
    [preference, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
