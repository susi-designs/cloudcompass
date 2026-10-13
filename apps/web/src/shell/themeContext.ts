import { createContext, useContext } from 'react';

/** User-facing choice. `system` follows `prefers-color-scheme` (DESIGN.md §3.1). */
export type ThemePreference = 'light' | 'dark' | 'system';
/** Carbon theme actually applied: g10 (light) or g100 (dark). */
export type CarbonTheme = 'g10' | 'g100';

export interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  theme: CarbonTheme;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>');
  return ctx;
}
