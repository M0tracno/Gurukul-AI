/**
 * CinematicStatCard
 * -----------------
 * A restrained, accent-aware metric card for dashboards. Replaces the neon
 * "FrostedCard" look with a hairline-bordered panel, a single accent for the
 * icon, and a large Bricolage figure. Shared by all four role dashboards.
 */

import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { type Accent, easing, fonts, ink, surfaces } from '../../theme/cinematic';

interface CinematicStatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent: Accent;
  /** Optional delay (s) for a staggered reveal. */
  delay?: number;
}

export function CinematicStatCard({
  label,
  value,
  hint,
  icon,
  accent,
  delay = 0,
}: CinematicStatCardProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        p: 3,
        borderRadius: '16px',
        background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 150%)`,
        border: `1px solid ${surfaces.border}`,
        transition: `transform 0.5s ${easing.premium}, border-color 0.5s ${easing.premium}, box-shadow 0.5s ${easing.premium}`,
        animation: `statRise 0.7s ${easing.premium} ${delay}s both`,
        '@keyframes statRise': {
          from: { opacity: 0, transform: 'translateY(18px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: `rgba(${accent.rgb}, 0.4)`,
          boxShadow: `0 30px 60px -36px rgba(${accent.rgb}, 0.5)`,
        },
      }}
    >
      {/* faint corner glow in the accent */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${accent.rgb}, 0.16) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="overline" sx={{ color: ink.tertiary }}>
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '11px',
                display: 'grid',
                placeItems: 'center',
                color: accent.light,
                background: accent.soft,
                border: `1px solid rgba(${accent.rgb}, 0.22)`,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '2.4rem',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: ink.primary,
            mb: 0.5,
          }}
        >
          {value}
        </Typography>
        {hint && (
          <Typography variant="body2" sx={{ color: ink.tertiary }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default CinematicStatCard;
