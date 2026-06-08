/**
 * Spacing Design Tokens — Gurukul AI
 *
 * Based on a 4px base grid for consistent spatial rhythm.
 * All values are numeric (in pixels) for programmatic use with MUI's `spacing()` utility.
 */

export const spacing = {
  /** 4px base unit */
  unit: 4,

  /** 4px — micro spacing (icons inline, tight groups) */
  xs: 4,

  /** 8px — compact spacing (related elements) */
  sm: 8,

  /** 16px — standard internal padding */
  md: 16,

  /** 24px — section padding, card gutter */
  lg: 24,

  /** 32px — large section gaps */
  xl: 32,

  /** 48px — page-level separation */
  xxl: 48,

  /** 64px — hero/header spacing */
  xxxl: 64,
} as const;

export type SpacingTokens = typeof spacing;
