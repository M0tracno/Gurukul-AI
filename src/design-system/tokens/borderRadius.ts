/**
 * Border Radius Design Tokens — Gurukul AI
 *
 * Consistent rounding scale for UI elements.
 * Values in pixels for direct use in MUI overrides and styled components.
 */

export const borderRadius = {
  /** No rounding */
  none: 0,

  /** 2px — subtle rounding for inputs, tiny elements */
  xs: 2,

  /** 4px — default for buttons, chips */
  sm: 4,

  /** 8px — standard for cards, dialogs */
  md: 8,

  /** 12px — prominent rounding for panels */
  lg: 12,

  /** 16px — large containers, modals */
  xl: 16,

  /** 24px — pill shapes, badges */
  xxl: 24,

  /** Full circle — avatars, round buttons */
  full: 9999,
} as const;

export type BorderRadiusTokens = typeof borderRadius;
