/**
 * Cinematic Design Language — shared tokens & helpers
 * ---------------------------------------------------
 * A dark, filmic system: a deep near-black base lit by a single signature
 * accent per area, soft directional glows, film grain and vignette for depth,
 * and slow, eased motion. Designed to read as intentional and human-made
 * rather than the usual neon-glass "AI" look.
 *
 * One accent is visible per screen. Each role/area owns a signature accent;
 * shared/public screens use the neutral default (electric blue).
 */

export type AccentKey = 'blue' | 'amber' | 'crimson' | 'teal';

export interface Accent {
  /** Core accent used for emphasis, focus rings, key strokes. */
  main: string;
  /** Lighter tint for hovers / highlights. */
  light: string;
  /** Deeper shade for pressed / contrast. */
  deep: string;
  /** Soft translucent wash for backgrounds. */
  soft: string;
  /** rgb triplet (no alpha) for composing rgba() at call sites. */
  rgb: string;
}

/** Deep, layered neutrals — never pure black, slightly cool with warmth. */
export const surfaces = {
  /** Page base — the darkest plane. */
  base: '#08090C',
  /** Default app background. */
  default: '#0A0C11',
  /** Elevated surface (cards, sheets). */
  paper: '#10131A',
  /** Second elevation (popovers, raised cards). */
  raised: '#171B24',
  /** Hairline borders that catch light. */
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
} as const;

/** Filmic text ramp — softened whites, never #fff for body. */
export const ink = {
  primary: '#F3F5FA',
  secondary: 'rgba(243, 245, 250, 0.64)',
  tertiary: 'rgba(243, 245, 250, 0.40)',
  disabled: 'rgba(243, 245, 250, 0.28)',
} as const;

export const accents: Record<AccentKey, Accent> = {
  // Neutral default + Student
  blue: {
    main: '#3B86F7',
    light: '#6AA8FF',
    deep: '#1E5FD0',
    soft: 'rgba(59, 134, 247, 0.12)',
    rgb: '59, 134, 247',
  },
  // Faculty
  amber: {
    main: '#E3A648',
    light: '#F4C272',
    deep: '#B97E26',
    soft: 'rgba(227, 166, 72, 0.12)',
    rgb: '227, 166, 72',
  },
  // Admin
  crimson: {
    main: '#E5484D',
    light: '#FF6E72',
    deep: '#B4282E',
    soft: 'rgba(229, 72, 77, 0.12)',
    rgb: '229, 72, 77',
  },
  // Parent
  teal: {
    main: '#23C2A6',
    light: '#5BE0C8',
    deep: '#0F9683',
    soft: 'rgba(35, 194, 166, 0.12)',
    rgb: '35, 194, 166',
  },
} as const;

/** Maps an app role (or shared screens) to its signature accent. */
export function getRoleAccent(role?: string): Accent {
  switch (role) {
    case 'admin':
      return accents.crimson;
    case 'faculty':
    case 'teacher':
      return accents.amber;
    case 'parent':
      return accents.teal;
    case 'student':
    default:
      return accents.blue;
  }
}

export function accentKeyForRole(role?: string): AccentKey {
  switch (role) {
    case 'admin':
      return 'crimson';
    case 'faculty':
    case 'teacher':
      return 'amber';
    case 'parent':
      return 'teal';
    default:
      return 'blue';
  }
}

/** Premium, slightly slow easing used across the system. */
export const easing = {
  premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const fonts = {
  display: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/**
 * Film-grain overlay as an inline SVG data URI (fractal noise).
 * Apply at low opacity over a backdrop for analog texture.
 */
export const grainDataUri =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

/** A soft radial accent glow (use as a background layer for "lighting"). */
export function accentGlow(accent: Accent, opacity = 0.18): string {
  return `radial-gradient(circle at center, rgba(${accent.rgb}, ${opacity}) 0%, rgba(${accent.rgb}, ${opacity * 0.4}) 35%, transparent 70%)`;
}

/** A cinematic vignette to focus the eye toward the center. */
export const vignette =
  'radial-gradient(120% 120% at 50% 30%, transparent 50%, rgba(0,0,0,0.45) 100%)';

/** Hairline-bordered elevated surface used for cards/panels. */
export function panel(accent?: Accent) {
  return {
    background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 100%)`,
    border: `1px solid ${surfaces.border}`,
    borderRadius: 16,
    boxShadow: accent
      ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -28px rgba(${accent.rgb}, 0.35)`
      : '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)',
  } as const;
}
