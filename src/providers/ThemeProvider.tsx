/**
 * AppThemeProvider — Theme management with localStorage persistence.
 *
 * Wraps the application with MUI's ThemeProvider, toggling between
 * lightTheme and darkTheme from the design-system. Defaults to light
 * for new sessions. Persists preference so it's restored on reload.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { darkTheme, lightTheme } from '../design-system';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** Current active theme mode */
  mode: ThemeMode;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Explicitly set a mode */
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'gurukul-theme-mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Reads the persisted theme mode from localStorage.
 * Falls back to 'light' when nothing is stored or localStorage is unavailable.
 */
function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return 'dark';
  } catch {
    // localStorage unavailable (e.g., SSR, private browsing edge-cases)
  }
  return 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Silently ignore — theme still applies for the session
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  const value = useMemo(() => ({ mode, toggleTheme, setMode }), [mode, toggleTheme, setMode]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme mode and toggle/set functions.
 * Must be used inside an AppThemeProvider.
 */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within an AppThemeProvider');
  }
  return ctx;
}
