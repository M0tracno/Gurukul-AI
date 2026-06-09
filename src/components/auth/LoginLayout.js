import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import CinematicBackground from '../common/CinematicBackground';
import { accents, ink, surfaces, easing, fonts } from '../../theme/cinematic';

/**
 * Shared cinematic login layout for all portal login pages.
 *
 * Props:
 * - title: string — Portal title (e.g., "Faculty Portal")
 * - subtitle: string — Brief tagline
 * - icon: React component — MUI icon
 * - accent: 'blue' | 'amber' | 'teal' | 'crimson' — role signature accent
 * - eyebrow: string — small kicker above the title (defaults to title words)
 * - children: ReactNode — login form content
 * - backLink: string — route for the back link (defaults to '/role-select')
 * - backLabel: string — back link label (defaults to 'Back to roles')
 */
const LoginLayout = ({
  title,
  subtitle,
  icon: Icon,
  accent = 'blue',
  eyebrow,
  children,
  backLink = '/role-select',
  backLabel = 'Back to roles',
}) => {
  const navigate = useNavigate();
  const a = accents[accent] || accents.blue;

  return (
    <CinematicBackground accent={accent}>
      <Container
        maxWidth="lg"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 5, md: 10 },
            width: '100%',
            maxWidth: 980,
          }}
        >
          {/* Left — branding */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              sx={{ mb: 2.5 }}
            >
              <Box sx={{ width: 28, height: 1, background: a.main, opacity: 0.8 }} />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  color: a.main,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                {eyebrow || 'Gurukul AI'}
              </Typography>
            </Stack>

            {Icon && (
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: a.soft,
                  border: `1px solid rgba(${a.rgb}, 0.25)`,
                  color: a.light,
                  mb: 3,
                }}
              >
                <Icon sx={{ fontSize: 28 }} />
              </Box>
            )}

            <Typography
              variant="h2"
              sx={{
                color: ink.primary,
                mb: 1.5,
                fontSize: { xs: '2rem', md: '2.6rem' },
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                color: ink.secondary,
                fontSize: '1.05rem',
                lineHeight: 1.65,
                maxWidth: 380,
                mx: { xs: 'auto', md: 0 },
              }}
            >
              {subtitle}
            </Typography>
          </Box>

          {/* Right — form panel */}
          <Box sx={{ flex: 1, maxWidth: 430, width: '100%' }}>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 140%)`,
                border: `1px solid ${surfaces.border}`,
                borderRadius: '22px',
                p: { xs: 3, md: 4 },
                boxShadow: '0 30px 80px -40px rgba(0,0,0,0.9)',
              }}
            >
              {/* top accent hairline */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${a.main}, transparent)`,
                  opacity: 0.7,
                }}
              />
              {children}
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Box
                component="button"
                type="button"
                onClick={() => navigate(backLink)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  border: 'none',
                  background: 'transparent',
                  color: ink.tertiary,
                  cursor: 'pointer',
                  px: 1.5,
                  py: 1,
                  borderRadius: '10px',
                  transition: `all 0.3s ${easing.premium}`,
                  '&:hover': { color: ink.primary, background: 'rgba(255,255,255,0.04)' },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                <Typography sx={{ fontSize: '0.85rem' }}>{backLabel}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      <Typography
        sx={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.16)',
          fontWeight: 600,
          letterSpacing: '0.2em',
        }}
      >
        GURUKUL AI
      </Typography>
    </CinematicBackground>
  );
};

export default LoginLayout;
