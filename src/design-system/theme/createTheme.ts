/**
 * createGurkulTheme — Wraps MUI's createTheme with Gurukul design tokens.
 *
 * Accepts a mode ('light' | 'dark') and produces a fully configured MUI theme
 * using our token system for colors, typography, spacing, elevation, and border radii.
 */

import { createTheme as muiCreateTheme, type ThemeOptions, type Theme } from '@mui/material/styles';
import { borderRadius } from '../tokens/borderRadius';
import { colors } from '../tokens/colors';
import { elevation } from '../tokens/elevation';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export interface CreateThemeOptions {
  mode: 'light' | 'dark';
  /** Additional MUI theme overrides to merge in */
  overrides?: ThemeOptions;
}

export function createGurkulTheme({ mode, overrides }: CreateThemeOptions): Theme {
  const isDark = mode === 'dark';

  const palette = isDark
    ? {
        mode: 'dark' as const,
        primary: { main: colors.primary[400], light: colors.primary[300], dark: colors.primary[600], contrastText: '#000000' },
        secondary: { main: colors.secondary[400], light: colors.secondary[300], dark: colors.secondary[600], contrastText: '#ffffff' },
        success: { main: colors.success[400], light: colors.success[300], dark: colors.success[600] },
        error: { main: colors.error[400], light: colors.error[300], dark: colors.error[600] },
        warning: { main: colors.warning[400], light: colors.warning[300], dark: colors.warning[600] },
        info: { main: colors.info[400], light: colors.info[300], dark: colors.info[600] },
        background: { default: colors.background.dark.default, paper: colors.background.dark.paper },
        text: { primary: colors.neutral[50], secondary: colors.neutral[300] },
        divider: colors.neutral[700],
      }
    : {
        mode: 'light' as const,
        primary: { main: colors.primary[600], light: colors.primary[400], dark: colors.primary[800], contrastText: '#ffffff' },
        secondary: { main: colors.secondary[600], light: colors.secondary[400], dark: colors.secondary[800], contrastText: '#ffffff' },
        success: { main: colors.success[600], light: colors.success[400], dark: colors.success[800] },
        error: { main: colors.error[600], light: colors.error[400], dark: colors.error[800] },
        warning: { main: colors.warning[600], light: colors.warning[400], dark: colors.warning[800] },
        info: { main: colors.info[600], light: colors.info[400], dark: colors.info[800] },
        background: { default: colors.background.light.default, paper: colors.background.light.paper },
        text: { primary: colors.neutral[900], secondary: colors.neutral[600] },
        divider: colors.neutral[200],
      };

  const baseTheme: ThemeOptions = {
    palette,
    typography: {
      fontFamily: typography.fontFamily.body,
      h1: { fontSize: typography.h1.fontSize, fontWeight: typography.h1.fontWeight, lineHeight: typography.h1.lineHeight },
      h2: { fontSize: typography.h2.fontSize, fontWeight: typography.h2.fontWeight, lineHeight: typography.h2.lineHeight },
      h3: { fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight, lineHeight: typography.h3.lineHeight },
      h4: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, lineHeight: typography.h4.lineHeight },
      h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.5 },
      h6: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
      body1: { fontSize: typography.body1.fontSize, fontWeight: typography.body1.fontWeight, lineHeight: typography.body1.lineHeight },
      body2: { fontSize: typography.body2.fontSize, fontWeight: typography.body2.fontWeight, lineHeight: typography.body2.lineHeight },
      caption: { fontSize: typography.caption.fontSize, fontWeight: typography.caption.fontWeight, lineHeight: typography.caption.lineHeight },
      overline: {
        fontSize: typography.overline.fontSize,
        fontWeight: typography.overline.fontWeight,
        lineHeight: typography.overline.lineHeight,
        letterSpacing: typography.overline.letterSpacing,
        textTransform: typography.overline.textTransform,
      },
    },
    spacing: spacing.unit,
    shape: {
      borderRadius: borderRadius.md,
    },
    shadows: [
      elevation.none,
      elevation.low,
      elevation.low,
      elevation.medium,
      elevation.medium,
      elevation.medium,
      elevation.high,
      elevation.high,
      elevation.high,
      elevation.high,
      elevation.high,
      elevation.high,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
      elevation.overlay,
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: borderRadius.sm,
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.lg,
            boxShadow: elevation.low,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius.xl,
          },
        },
      },
    },
  };

  return muiCreateTheme(baseTheme, overrides ?? {});
}
