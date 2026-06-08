import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

/**
 * Shared cinematic login layout for all portal login pages.
 *
 * Props:
 * - title: string — Portal title (e.g., "Faculty Portal")
 * - subtitle: string — Brief tagline
 * - icon: React element — MUI icon component
 * - color: string — Accent color (hex)
 * - children: ReactNode — Login form content
 * - backLink: string — Route to navigate back (defaults to '/')
 */
const LoginLayout = ({ title, subtitle, icon: Icon, color = '#a78bfa', children, backLink = '/' }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0a0a0f',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Animated gradient orb */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-15%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'orbFloat 14s ease-in-out infinite',
          '@keyframes orbFloat': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '50%': { transform: 'translate(40px, 30px) scale(1.1)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          filter: 'blur(60px)',
          animation: 'orbFloat2 18s ease-in-out infinite',
          '@keyframes orbFloat2': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(-30px, -20px) scale(1.05)' },
          },
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 4, md: 8 },
            width: '100%',
            maxWidth: '1000px',
          }}
        >
          {/* Left side: Branding */}
          <Box
            sx={{
              flex: 1,
              textAlign: { xs: 'center', md: 'left' },
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-30px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Icon */}
            {Icon && (
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  mb: 3,
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: -6,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                    filter: 'blur(10px)',
                  },
                }}
              >
                <Icon sx={{ fontSize: 32, color }} />
              </Box>
            )}

            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.95)',
                mb: 1.5,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                maxWidth: '360px',
                mx: { xs: 'auto', md: 0 },
              }}
            >
              {subtitle}
            </Typography>
          </Box>

          {/* Right side: Form card */}
          <Box
            sx={{
              flex: 1,
              maxWidth: '420px',
              width: '100%',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '0.15s',
            }}
          >
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '24px',
                padding: { xs: 3, md: 4 },
                backdropFilter: 'blur(20px)',
              }}
            >
              {children}
            </Box>

            {/* Back link */}
            <Box
              sx={{
                textAlign: 'center',
                mt: 3,
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '0.4s',
              }}
            >
              <IconButton
                onClick={() => navigate(backLink)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  px: 2,
                  py: 1,
                  gap: 1,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    background: 'rgba(255, 255, 255, 0.04)',
                  },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  Back to roles
                </Typography>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginLayout;
