import { createTheme, Theme } from '@mui/material/styles';
import { colors, glassmorphism, shadows, spacing, typography } from '../styles/designTokens';

declare module '@mui/material/styles' {
  interface Palette {
    neon: {
      cyan: string;
      blue: string;
      orange: string;
      purple: string;
      pink: string;
    };
    glass: {
      light: string;
      medium: string;
      dark: string;
      backdrop: string;
    };
  }

  interface PaletteOptions {
    neon?: {
      cyan?: string;
      blue?: string;
      orange?: string;
      purple?: string;
      pink?: string;
    };
    glass?: {
      light?: string;
      medium?: string;
      dark?: string;
      backdrop?: string;
    };
  }

  interface Theme {
    glassmorphism: typeof glassmorphism;
    designTokens: {
      spacing: typeof spacing;
      colors: typeof colors;
    };
  }

  interface ThemeOptions {
    glassmorphism?: typeof glassmorphism;
    designTokens?: {
      spacing?: typeof spacing;
      colors?: typeof colors;
    };
  }
}

export const createFuturisticTheme = (mode: 'light' | 'dark' = 'dark'): Theme => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.neon.cyan,
        light: colors.neon.blue,
        dark: '#00cc6a',
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.neon.orange,
        light: '#ff8533',
        dark: '#cc5500',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? colors.neutral[950] : colors.neutral[50],
        paper: isDark ? colors.neutral[900] : colors.neutral[100],
      },
      text: {
        primary: isDark ? colors.neutral[100] : colors.neutral[900],
        secondary: isDark ? colors.neutral[400] : colors.neutral[600],
      },
      neon: {
        cyan: colors.neon.cyan,
        blue: colors.neon.blue,
        orange: colors.neon.orange,
        purple: colors.neon.purple,
        pink: colors.neon.pink,
      },
      glass: {
        light: colors.glass.light,
        medium: colors.glass.medium,
        dark: colors.glass.dark,
        backdrop: colors.glass.backdrop,
      },
      success: {
        main: colors.semantic.success,
      },
      warning: {
        main: colors.semantic.warning,
      },
      error: {
        main: colors.semantic.error,
      },
      info: {
        main: colors.semantic.info,
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: typography.fontSize['5xl'],
        fontWeight: typography.fontWeight.bold,
        lineHeight: typography.lineHeight.tight,
        letterSpacing: typography.letterSpacing.tight,
      },
      h2: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        lineHeight: typography.lineHeight.tight,
      },
      h3: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.snug,
      },
      h4: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.snug,
      },
      h5: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.medium,
        lineHeight: typography.lineHeight.normal,
      },
      h6: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.medium,
        lineHeight: typography.lineHeight.normal,
      },
      body1: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.lineHeight.relaxed,
      },
      body2: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.lineHeight.normal,
      },
      caption: {
        fontSize: typography.fontSize.xs,
        lineHeight: typography.lineHeight.normal,
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      shadows.sm,
      shadows.base,
      shadows.md,
      shadows.lg,
      shadows.xl,
      shadows['2xl'],
      shadows.neon.cyan,
      shadows.neon.blue,
      shadows.neon.orange,
      shadows.neon.purple,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
      shadows.lg,
      shadows.xl,
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
          },
          html: {
            MozOsxFontSmoothing: 'grayscale',
            WebkitFontSmoothing: 'antialiased',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%',
            width: '100%',
          },
          body: {
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            minHeight: '100%',
            width: '100%',
          },
          '#root': {
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
          },
          '::-webkit-scrollbar': {
            width: '8px',
          },
          '::-webkit-scrollbar-track': {
            background: colors.neutral[800],
            borderRadius: '4px',
          },
          '::-webkit-scrollbar-thumb': {
            background: colors.neon.cyan,
            borderRadius: '4px',
            '&:hover': {
              background: colors.neon.blue,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '12px',
            fontWeight: typography.fontWeight.medium,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: shadows.lg,
            },
          },
          contained: {
            background: `linear-gradient(135deg, ${colors.neon.cyan} 0%, ${colors.neon.blue} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.neon.blue} 0%, ${colors.neon.purple} 100%)`,
              boxShadow: shadows.neon.cyan,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(16px)',
            background: glassmorphism.medium.background,
            border: glassmorphism.medium.border,
            borderRadius: '16px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: shadows.xl,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(10px)',
            background: glassmorphism.light.background,
            border: glassmorphism.light.border,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(20px)',
            background: glassmorphism.dark.background,
            borderBottom: `1px solid ${colors.glass.light}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backdropFilter: 'blur(20px)',
            background: glassmorphism.dark.background,
            borderRight: `1px solid ${colors.glass.light}`,
          },
        },
      },
    },
    glassmorphism,
    designTokens: {
      spacing,
      colors,
    },
  });
};

export default createFuturisticTheme;