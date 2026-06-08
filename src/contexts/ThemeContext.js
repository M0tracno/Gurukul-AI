import React, { createContext, useContext, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';

import { ThemeProvider } from '@mui/material/styles';
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Enhanced theme configurations
const getTheme = (mode, primaryColor = 'red') => {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor === 'red' ? '#e74c3c' : 
              primaryColor === 'blue' ? '#3498db' :
              primaryColor === 'green' ? '#27ae60' :
              primaryColor === 'purple' ? '#9b59b6' : '#e74c3c',
        light: primaryColor === 'red' ? '#ff6b6b' : 
               primaryColor === 'blue' ? '#74b9ff' :
               primaryColor === 'green' ? '#55efc4' :
               primaryColor === 'purple' ? '#a29bfe' : '#ff6b6b',
        dark: primaryColor === 'red' ? '#c0392b' : 
              primaryColor === 'blue' ? '#2980b9' :
              primaryColor === 'green' ? '#229954' :
              primaryColor === 'purple' ? '#8e44ad' : '#c0392b',
      },
      secondary: {
        main: isDark ? '#bb86fc' : '#03dac6',
        light: isDark ? '#d1c4e9' : '#4db6ac',
        dark: isDark ? '#7b1fa2' : '#00695c',
      },
      background: {
        default: isDark ? '#121212' : '#f8f9fa',
        paper: isDark ? '#1e1e1e' : '#ffffff',
        surface: isDark ? '#2d2d2d' : '#f5f5f5',
      },
      text: {
        primary: isDark ? '#ffffff' : '#2c3e50',
        secondary: isDark ? '#b0b0b0' : '#7f8c8d',
      },
      success: {
        main: '#27ae60',
        light: '#2ecc71',
        dark: '#229954',
      },
      warning: {
        main: '#f39c12',
        light: '#f1c40f',
        dark: '#e67e22',
      },
      error: {
        main: '#e74c3c',
        light: '#ff6b6b',
        dark: '#c0392b',
      },
      info: {
        main: '#3498db',
        light: '#74b9ff',
        dark: '#2980b9',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.3,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
        lineHeight: 1.4,
      },
      h6: {
        fontWeight: 500,
        fontSize: '1.125rem',
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: isDark ? [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.4)',
      '0px 4px 8px rgba(0, 0, 0, 0.4)',
      '0px 8px 16px rgba(0, 0, 0, 0.4)',
      '0px 12px 24px rgba(0, 0, 0, 0.4)',
      '0px 16px 32px rgba(0, 0, 0, 0.4)',
      '0px 20px 40px rgba(0, 0, 0, 0.4)',
      '0px 24px 48px rgba(0, 0, 0, 0.4)',
      // ... continue with more dark shadows
    ] : [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.1)',
      '0px 4px 8px rgba(0, 0, 0, 0.1)',
      '0px 8px 16px rgba(0, 0, 0, 0.1)',
      '0px 12px 24px rgba(0, 0, 0, 0.15)',
      '0px 16px 32px rgba(0, 0, 0, 0.15)',
      '0px 20px 40px rgba(0, 0, 0, 0.2)',
      '0px 24px 48px rgba(0, 0, 0, 0.2)',
      // ... continue with light shadows
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark 
                ? '0px 12px 24px rgba(0, 0, 0, 0.4)' 
                : '0px 12px 24px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            color: isDark ? '#ffffff' : '#2c3e50',
            boxShadow: isDark 
              ? '0px 4px 12px rgba(0, 0, 0, 0.3)' 
              : '0px 2px 8px rgba(0, 0, 0, 0.1)',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderRight: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          },
        },
      },
    },
  });
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });
  
  const [primaryColor, setPrimaryColor] = useState(() => {
    const savedColor = localStorage.getItem('primaryColor');
    return savedColor || 'red';
  });

  const theme = getTheme(mode, primaryColor);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const changePrimaryColor = (color) => {
    setPrimaryColor(color);
    localStorage.setItem('primaryColor', color);
  };

  const value = {
    mode,
    primaryColor,
    toggleMode,
    changePrimaryColor,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default CustomThemeProvider;
