/**
 * Design System — Barrel Export
 *
 * Single entry point for the Gurukul AI design system.
 * Import tokens, themes, and utilities from here.
 */

// Tokens
export { borderRadius, colors, elevation, spacing, typography } from './tokens';
export type {
  BorderRadiusTokens,
  ColorTokens,
  ElevationTokens,
  SpacingTokens,
  TypographyTokens,
} from './tokens';

// Themes
export { createGurkulTheme, darkTheme, lightTheme } from './theme';
export type { CreateThemeOptions } from './theme';
