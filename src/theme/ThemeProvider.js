import { CssBaseline, ThemeProvider as MUIThemeProvider } from '@mui/material';
import React, { createContext, useContext } from 'react';

import LinkBehavior from '../components/common/LinkBehavior';
import createEnhancedTheme from './createEnhancedTheme';

// Theme Context — Always dark mode
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const isDarkMode = true;
  const theme = createEnhancedTheme(isDarkMode, LinkBehavior);

  const contextValue = {
    isDarkMode,
    toggleTheme: () => {},
    setThemeMode: () => {},
    theme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
