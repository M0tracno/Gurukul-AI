/**
 * CinematicBackground
 * -------------------
 * A reusable atmospheric backdrop for pages and dashboards. Layers a deep
 * near-black base with soft directional accent glows ("lighting"), a faint
 * film-grain texture, and a vignette to focus the eye. This is what gives the
 * UI its filmic depth instead of flat panels on a flat background.
 *
 * Usage:
 *   <CinematicBackground accent="amber">
 *     ...page content...
 *   </CinematicBackground>
 */

import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import {
  accents,
  accentGlow,
  grainDataUri,
  surfaces,
  vignette,
  type AccentKey,
} from '../../theme/cinematic';

interface CinematicBackgroundProps {
  children: ReactNode;
  /** Signature accent that lights the scene. Defaults to neutral blue. */
  accent?: AccentKey;
  /** Render a subtle moving glow. Respects prefers-reduced-motion. */
  animated?: boolean;
  /** Minimum height; defaults to full viewport. */
  minHeight?: string | number;
}

export function CinematicBackground({
  children,
  accent = 'blue',
  animated = true,
  minHeight = '100vh',
}: CinematicBackgroundProps) {
  const a = accents[accent];

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight,
        width: '100%',
        overflow: 'hidden',
        backgroundColor: surfaces.base,
        isolation: 'isolate',
      }}
    >
      {/* Key light — top, the dominant accent glow */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: accentGlow(a, 0.16),
          backgroundSize: '140% 90%',
          backgroundPosition: '50% -10%',
          backgroundRepeat: 'no-repeat',
          ...(animated && {
            animation: 'cinemaKey 16s ease-in-out infinite',
            '@keyframes cinemaKey': {
              '0%, 100%': { backgroundPosition: '50% -10%', opacity: 0.9 },
              '50%': { backgroundPosition: '54% -4%', opacity: 1 },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      />

      {/* Fill light — opposite corner, cool neutral for dimensional depth */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(60% 50% at 85% 100%, rgba(120,140,180,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Vignette — pulls focus to the center */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: vignette }}
      />

      {/* Film grain — analog texture, very low opacity */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: grainDataUri,
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Content sits above the lighting layers */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}

export default CinematicBackground;
