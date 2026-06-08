/**
 * Elevation Design Tokens — Gurukul AI
 *
 * 5 elevation levels from flat to overlay.
 * Uses multi-layer box-shadows for realistic depth.
 */

export const elevation = {
  /** No shadow — flush with surface */
  none: 'none',

  /** Subtle lift — cards at rest, dividers */
  low: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',

  /** Standard elevation — active cards, dropdowns */
  medium: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',

  /** Prominent lift — floating action buttons, popovers */
  high: '0 10px 20px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',

  /** Maximum elevation — modals, overlays, dialogs */
  overlay: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)',
} as const;

export type ElevationTokens = typeof elevation;
