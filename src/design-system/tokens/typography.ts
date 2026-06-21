/**
 * Typography Design Tokens — Gurukul AI
 *
 * 7-step type scale from caption to display.
 * Uses rem units for accessibility (respects user font-size settings).
 */

export const typography = {
  /** Display heading — hero sections, splash text */
  display: { fontSize: '3rem', fontWeight: 800, lineHeight: 1.1 },

  /** H1 — primary page heading */
  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },

  /** H2 — section heading */
  h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 },

  /** H3 — subsection heading */
  h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },

  /** H4 — card heading, inline heading */
  h4: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.4 },

  /** Body 1 — default body text */
  body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },

  /** Body 2 — secondary body text, descriptions */
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },

  /** Caption — labels, metadata, fine print */
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },

  /** Overline — uppercase labels, categories */
  overline: {
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },

  /** Font families */
  fontFamily: {
    heading: '"Inter", "Segoe UI", Roboto, sans-serif',
    body: '"Inter", "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  },
} as const;

export type TypographyTokens = typeof typography;
