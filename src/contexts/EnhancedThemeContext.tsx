import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';
import { createFuturisticTheme } from '../theme/futuristicTheme';
import { createCSSVariables } from '../styles/designTokens';

interface EnhancedThemeContextType {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  setMode: (mode: 'light' | 'dark') => void;
  theme: ReturnType<typeof createFuturisticTheme>;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

export const useEnhancedTheme = () => {
  const context = useContext(EnhancedThemeContext);
  if (!context) {
    throw new Error('useEnhancedTheme must be used within an EnhancedThemeProvider');
  }
  return context;
};

interface EnhancedThemeProviderProps {
  children: ReactNode;
}

export const EnhancedThemeProvider: React.FC<EnhancedThemeProviderProps> = ({ children }) => {
  // Initialize theme mode from localStorage or system preference
  const [mode, setModeState] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';

    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }

    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Create theme based on current mode
  const theme = createFuturisticTheme(mode);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme-mode')) {
        setModeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save theme preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', mode);
    }
  }, [mode]);

  // Apply CSS variables to document root
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const cssVariables = createCSSVariables(mode);

    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [mode]);

  const toggleMode = () => {
    setModeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setMode = (newMode: 'light' | 'dark') => {
    setModeState(newMode);
  };

  const contextValue: EnhancedThemeContextType = {
    mode,
    toggleMode,
    setMode,
    theme,
  };

  return (
    <EnhancedThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </EnhancedThemeContext.Provider>
  );
};

export default EnhancedThemeProvider;
