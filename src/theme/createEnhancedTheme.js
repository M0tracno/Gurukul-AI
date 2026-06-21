import { createTheme } from '@mui/material/styles';
import { accents, easing, fonts, ink, surfaces } from './cinematic';

// =============================================================================
// Enhanced Cinematic Theme — dark, filmic, single-accent (electric blue base)
// =============================================================================
// Deep near-black surfaces lit by one signature accent, a distinctive display
// typeface (Bricolage Grotesque), hairline-bordered panels, and slow premium
// motion. Role areas re-tint the accent via the `accent` prop on screens.

const BLUE = accents.blue;

// Light palette retained for completeness; the app runs in dark mode.
const lightPalette = {
  primary: { main: '#2E6BE6', light: '#5C8FF0', dark: '#1B4FB8', contrastText: '#ffffff' },
  secondary: { main: '#5B6472', light: '#828b99', dark: '#3a414c', contrastText: '#ffffff' },
  success: { main: '#15937a', light: '#34d399', dark: '#0c6354', contrastText: '#ffffff' },
  warning: { main: '#c4842a', light: '#e3a648', dark: '#8c5d17', contrastText: '#000000' },
  error: { main: '#cf3338', light: '#e5484d', dark: '#9e2226', contrastText: '#ffffff' },
  info: { main: '#2E6BE6', light: '#5C8FF0', dark: '#1B4FB8', contrastText: '#ffffff' },
  background: {
    default: '#f6f7f9',
    paper: '#ffffff',
    gradient: 'linear-gradient(135deg, #2E6BE6 0%, #1B4FB8 100%)',
    glassEffect: 'rgba(255, 255, 255, 0.9)',
  },
  text: { primary: '#1a1d23', secondary: '#4a5058', disabled: '#9aa0a8' },
};

const darkPalette = {
  primary: {
    main: BLUE.main,
    light: BLUE.light,
    dark: BLUE.deep,
    contrastText: '#ffffff',
  },
  // Secondary is deliberately quiet — a cool steel — so one accent leads.
  secondary: {
    main: '#8A93A6',
    light: '#AEB6C6',
    dark: '#5A6273',
    contrastText: '#0A0C11',
  },
  success: { main: '#34d399', light: '#6ee7b7', dark: '#059669', contrastText: '#04130d' },
  warning: { main: '#e3a648', light: '#f4c272', dark: '#b97e26', contrastText: '#120c02' },
  error: { main: '#e5484d', light: '#ff6e72', dark: '#b4282e', contrastText: '#ffffff' },
  info: { main: BLUE.main, light: BLUE.light, dark: BLUE.deep, contrastText: '#ffffff' },
  background: {
    default: surfaces.default,
    paper: surfaces.paper,
    gradient: `linear-gradient(160deg, ${surfaces.base} 0%, ${surfaces.default} 55%, #0B0E16 100%)`,
    glassEffect: 'rgba(16, 19, 26, 0.72)',
  },
  divider: surfaces.border,
  text: {
    primary: ink.primary,
    secondary: ink.secondary,
    disabled: ink.disabled,
  },
};

// Typography — Bricolage Grotesque display for headings, Inter for UI/body.
const typography = {
  fontFamily: fonts.body,
  h1: {
    fontFamily: fonts.display,
    fontSize: '3rem',
    fontWeight: 700,
    lineHeight: 1.04,
    letterSpacing: '-0.035em',
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.08,
    letterSpacing: '-0.03em',
  },
  h3: {
    fontFamily: fonts.display,
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  h4: {
    fontFamily: fonts.display,
    fontSize: '1.4rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.015em',
  },
  h5: { fontFamily: fonts.body, fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontFamily: fonts.body, fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.6 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: '1rem', lineHeight: 1.65 },
  body2: { fontSize: '0.9rem', lineHeight: 1.6 },
  button: { fontFamily: fonts.body, fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
  overline: {
    fontFamily: fonts.body,
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
};

// Enhanced component customizations
const getComponentOverrides = isDark => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: isDark ? surfaces.base : '#f6f7f9',
        color: isDark ? ink.primary : '#1a1d23',
        scrollbarWidth: 'thin',
        scrollbarColor: isDark ? `${BLUE.deep} ${surfaces.base}` : '#cbd5e0 #f7fafc',
        '&::-webkit-scrollbar': { width: '10px', height: '10px' },
        '&::-webkit-scrollbar-track': { backgroundColor: isDark ? surfaces.base : '#f7fafc' },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#cbd5e0',
          borderRadius: '6px',
          border: isDark ? `2px solid ${surfaces.base}` : 'none',
          '&:hover': { backgroundColor: isDark ? `rgba(${BLUE.rgb}, 0.6)` : '#a0aec0' },
        },
      },
      '::selection': isDark
        ? { backgroundColor: `rgba(${BLUE.rgb}, 0.32)`, color: ink.primary }
        : {},
      '*': {
        '&:focus-visible': {
          outline: `2px solid ${isDark ? BLUE.main : '#2E6BE6'}`,
          outlineOffset: '2px',
          borderRadius: '4px',
        },
      },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: '10px',
        padding: '9px 22px',
        fontSize: '0.9rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        transition: `all 0.45s ${easing.premium}`,
      },
      contained: {
        background: isDark ? BLUE.main : '#2E6BE6',
        color: '#fff',
        '&:hover': {
          background: isDark ? BLUE.light : '#1B4FB8',
          boxShadow: isDark ? `0 10px 30px -10px rgba(${BLUE.rgb}, 0.7)` : '0 8px 24px rgba(46,107,230,0.3)',
          transform: 'translateY(-1px)',
        },
        '&:active': { transform: 'translateY(0)' },
      },
      outlined: {
        borderColor: isDark ? surfaces.borderStrong : 'rgba(0,0,0,0.15)',
        color: isDark ? ink.primary : '#1a1d23',
        '&:hover': {
          borderColor: isDark ? `rgba(${BLUE.rgb}, 0.7)` : '#2E6BE6',
          background: isDark ? `rgba(${BLUE.rgb}, 0.08)` : 'rgba(46,107,230,0.05)',
        },
      },
      text: {
        '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '16px',
        background: isDark
          ? `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 140%)`
          : '#ffffff',
        border: isDark ? `1px solid ${surfaces.border}` : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 26px 60px -34px rgba(0,0,0,0.9)'
          : '0 4px 24px rgba(0,0,0,0.06)',
        backgroundImage: 'none',
        transition: `transform 0.5s ${easing.premium}, border-color 0.5s ${easing.premium}, box-shadow 0.5s ${easing.premium}`,
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: isDark ? surfaces.borderStrong : 'rgba(0,0,0,0.1)',
          boxShadow: isDark
            ? '0 1px 0 rgba(255,255,255,0.06) inset, 0 36px 80px -40px rgba(0,0,0,0.95)'
            : '0 10px 36px rgba(0,0,0,0.1)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: isDark ? surfaces.paper : '#ffffff',
        border: isDark ? `1px solid ${surfaces.border}` : '1px solid rgba(0,0,0,0.05)',
      },
      elevation0: { border: 'none' },
      elevation1: {
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 40px -28px rgba(0,0,0,0.85)'
          : '0 2px 8px rgba(0,0,0,0.05)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundImage: 'none',
        background: isDark ? 'rgba(10, 12, 17, 0.86)' : '#ffffff',
        backdropFilter: isDark ? 'blur(18px) saturate(140%)' : undefined,
        borderRight: isDark ? `1px solid ${surfaces.border}` : undefined,
      },
    },
  },
  MuiAppBar: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backdropFilter: 'blur(18px) saturate(140%)',
        backgroundColor: isDark ? 'rgba(8, 9, 12, 0.72)' : 'rgba(255, 255, 255, 0.85)',
        boxShadow: 'none',
        borderBottom: isDark ? `1px solid ${surfaces.border}` : '1px solid rgba(0,0,0,0.06)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : undefined,
          transition: `all 0.3s ${easing.premium}`,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? surfaces.border : 'rgba(0,0,0,0.18)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? `rgba(${BLUE.rgb}, 0.5)` : '#2E6BE6',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '1.5px',
            borderColor: isDark ? BLUE.main : '#2E6BE6',
          },
        },
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: isDark
        ? {
            backgroundImage: 'none',
            background: 'rgba(16, 19, 26, 0.5)',
            borderRadius: '14px',
            border: `1px solid ${surfaces.border}`,
          }
        : {},
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: isDark
        ? {
            '& .MuiTableCell-head': {
              backgroundColor: 'rgba(255,255,255,0.02)',
              color: ink.secondary,
              fontWeight: 600,
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${surfaces.border}`,
            },
          }
        : {},
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: isDark
        ? {
            transition: `background-color 0.25s ${easing.inOut}`,
            '&:hover': { backgroundColor: `rgba(${BLUE.rgb}, 0.05)` },
            '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.05)' },
          }
        : {},
    },
  },
  MuiChip: {
    styleOverrides: {
      root: isDark
        ? {
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${surfaces.border}`,
            color: ink.secondary,
            fontWeight: 500,
          }
        : {},
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: isDark
        ? {
            backgroundImage: 'none',
            background: surfaces.raised,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${surfaces.borderStrong}`,
            borderRadius: '18px',
            boxShadow: '0 40px 120px -40px rgba(0,0,0,0.95)',
          }
        : {},
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: isDark
        ? {
            background: surfaces.raised,
            border: `1px solid ${surfaces.border}`,
            color: ink.primary,
            fontSize: '0.78rem',
            borderRadius: '8px',
            backdropFilter: 'blur(12px)',
          }
        : {},
    },
  },
});

const breakpoints = {
  values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536 },
};

const spacing = 8;
const shape = { borderRadius: 12 };

// Softer, lower-spread cinematic shadows (depth via diffusion, not heavy black).
const shadows = isDark => {
  const s = i =>
    isDark
      ? `0 ${4 * i}px ${10 * i}px -${6 * i}px rgba(0,0,0,0.7)`
      : `0 ${2 * i}px ${8 * i}px rgba(0,0,0,${Math.min(0.04 + i * 0.012, 0.3)})`;
  return ['none', ...Array.from({ length: 24 }, (_, idx) => s(idx + 1))];
};

const createEnhancedTheme = (isDark = false, LinkBehavior) => {
  const palette = isDark ? darkPalette : lightPalette;
  const accent = accents.blue;

  return createTheme({
    palette: { mode: isDark ? 'dark' : 'light', ...palette },
    typography,
    breakpoints,
    spacing,
    shape,
    shadows: shadows(isDark),
    components: {
      ...getComponentOverrides(isDark),
      MuiLink: { defaultProps: { component: LinkBehavior } },
      MuiButtonBase: { defaultProps: { LinkComponent: LinkBehavior } },
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 320,
        complex: 420,
        enteringScreen: 260,
        leavingScreen: 220,
      },
      easing: {
        easeInOut: easing.inOut,
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
        premium: easing.premium,
      },
    },
    // Custom theme properties (preserved shape; values updated to cinematic)
    custom: {
      accent,
      gradients: {
        primary: `linear-gradient(135deg, ${accent.main} 0%, ${accent.deep} 100%)`,
        secondary: 'linear-gradient(135deg, #8A93A6 0%, #5A6273 100%)',
        background: palette.background.gradient,
        accent: `linear-gradient(135deg, ${accent.light} 0%, ${accent.main} 100%)`,
      },
      animations: {
        fadeIn: {
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: `fadeIn 0.7s ${easing.premium}`,
        },
        slideIn: {
          '@keyframes slideIn': {
            from: { transform: 'translateX(-100%)' },
            to: { transform: 'translateX(0)' },
          },
          animation: `slideIn 0.5s ${easing.premium}`,
        },
      },
      glassmorphism: {
        background: isDark ? 'rgba(16, 19, 26, 0.72)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px) saturate(140%)',
        border: isDark ? `1px solid ${surfaces.border}` : '1px solid rgba(0, 0, 0, 0.05)',
      },
    },
  });
};

export default createEnhancedTheme;
