/**
 * Color Design Tokens — Gurukul AI
 *
 * Palette blending traditional school aesthetic with modern technology cues:
 * - Primary: Saffron/warm tones (traditional school warmth, Indian educational heritage)
 * - Secondary: Teal/blue (modern tech cue, trust, innovation)
 * - Accent tones for semantic feedback
 * - Neutral grays with a warm undertone
 */

export const colors = {
  /** Saffron/warm tones — traditional school warmth, Indian educational heritage */
  primary: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',
    600: '#f57c00',
    700: '#e65100',
    800: '#bf360c',
    900: '#8d1e00',
  },

  /** Teal/blue — modern technology cue, trust, innovation */
  secondary: {
    50: '#e0f2f1',
    100: '#b2dfdb',
    200: '#80cbc4',
    300: '#4db6ac',
    400: '#26a69a',
    500: '#009688',
    600: '#00897b',
    700: '#00796b',
    800: '#00695c',
    900: '#004d40',
  },

  /** Semantic status colors */
  success: {
    50: '#e6f9f0',
    100: '#b3efd4',
    200: '#80e5b8',
    300: '#4ddb9c',
    400: '#26d487',
    500: '#00cc72',
    600: '#00b365',
    700: '#009956',
    800: '#008047',
    900: '#005c33',
  },

  error: {
    50: '#fdecea',
    100: '#f9c6c0',
    200: '#f49d93',
    300: '#ef7366',
    400: '#eb5545',
    500: '#e63725',
    600: '#cc2e1f',
    700: '#ad2519',
    800: '#8e1c13',
    900: '#66130d',
  },

  warning: {
    50: '#fff4e5',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',
    600: '#e68a00',
    700: '#c67600',
    800: '#a66200',
    900: '#7a4800',
  },

  info: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',
    600: '#1c7fd4',
    700: '#1769b3',
    800: '#125391',
    900: '#0d3d6e',
  },

  /** Neutral grays with slight warm undertone */
  neutral: {
    0: '#ffffff',
    50: '#fafaf8',
    100: '#f5f4f2',
    200: '#eae8e4',
    300: '#d6d3ce',
    400: '#b5b1aa',
    500: '#8f8a82',
    600: '#6b665f',
    700: '#4d4943',
    800: '#33302b',
    900: '#1e1c18',
    950: '#0f0e0c',
  },

  /** Background and surface colors for both themes */
  background: {
    light: {
      default: '#fafaf8',
      paper: '#ffffff',
      elevated: '#ffffff',
    },
    dark: {
      default: '#121212',
      paper: '#1e1c18',
      elevated: '#2a2723',
    },
  },
} as const;

export type ColorTokens = typeof colors;
