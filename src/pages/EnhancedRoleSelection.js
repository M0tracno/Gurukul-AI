import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack } from '@mui/material';
import {
  School,
  Person,
  FamilyRestroom,
  AdminPanelSettings,
  ArrowForward,
} from '@mui/icons-material';

import CinematicBackground from '../components/common/CinematicBackground';
import { accents, ink, surfaces, easing, fonts } from '../theme/cinematic';

const roles = [
  {
    id: 'faculty',
    title: 'Faculty',
    description: 'Plan courses, grade with AI assistance, and keep every class moving.',
    icon: School,
    path: '/faculty-login',
    accent: accents.amber,
  },
  {
    id: 'student',
    title: 'Student',
    description: 'Access coursework, submit on time, and follow your own progress.',
    icon: Person,
    path: '/student-login',
    accent: accents.blue,
  },
  {
    id: 'parent',
    title: 'Parent',
    description: "Stay close to your child's school day with real-time insight.",
    icon: FamilyRestroom,
    path: '/parent-login',
    accent: accents.teal,
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'Run the institution, manage users, and read the whole picture.',
    icon: AdminPanelSettings,
    path: '/admin-login',
    accent: accents.crimson,
  },
];

function EnhancedRoleSelection() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <CinematicBackground accent="blue">
      <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 8 }}>
        <Box sx={{ width: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              textAlign: 'center',
              mb: { xs: 6, md: 9 },
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(24px)',
              transition: `all 0.8s ${easing.premium}`,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center" sx={{ mb: 2.5 }}>
              <Box sx={{ width: 28, height: 1, background: accents.blue.main, opacity: 0.8 }} />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  color: accents.blue.main,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                Four doorways
              </Typography>
            </Stack>
            <Typography variant="h2" sx={{ color: ink.primary, mb: 1.5, fontSize: { xs: '2rem', md: '2.8rem' } }}>
              Choose your way in.
            </Typography>
            <Typography sx={{ color: ink.secondary, fontSize: { xs: '1rem', md: '1.1rem' }, maxWidth: 520, mx: 'auto' }}>
              Pick the portal that matches your role on the Gurukul AI platform.
            </Typography>
          </Box>

          {/* Role cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: { xs: 2.5, md: 3 },
              maxWidth: 900,
              mx: 'auto',
            }}
          >
            {roles.map((role, index) => {
              const Icon = role.icon;
              return (
                <Box
                  key={role.id}
                  onClick={() => navigate(role.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(role.path);
                  }}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    p: { xs: 3, md: 4 },
                    borderRadius: '18px',
                    background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 140%)`,
                    border: `1px solid ${surfaces.border}`,
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'none' : 'translateY(36px)',
                    transition: `opacity 0.7s ${easing.premium} ${0.1 + index * 0.08}s, transform 0.7s ${easing.premium} ${0.1 + index * 0.08}s, border-color 0.4s ${easing.premium}, box-shadow 0.4s ${easing.premium}`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: `rgba(${role.accent.rgb}, 0.5)`,
                      boxShadow: `0 30px 70px -36px rgba(${role.accent.rgb}, 0.55)`,
                      '& .role-go': { transform: 'translateX(4px)', opacity: 1 },
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${role.accent.main}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${role.accent.main}, transparent)`,
                      opacity: 0.7,
                    }}
                  />
                  <Stack direction="row" spacing={2.5} alignItems="flex-start">
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 56,
                        height: 56,
                        borderRadius: '14px',
                        display: 'grid',
                        placeItems: 'center',
                        background: role.accent.soft,
                        border: `1px solid rgba(${role.accent.rgb}, 0.25)`,
                        color: role.accent.light,
                      }}
                    >
                      <Icon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" sx={{ color: ink.primary, mb: 0.75 }}>
                        {role.title}
                      </Typography>
                      <Typography sx={{ color: ink.secondary, fontSize: '0.92rem', lineHeight: 1.6 }}>
                        {role.description}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        className="role-go"
                        sx={{ mt: 2, color: role.accent.light, opacity: 0.75, transition: `all 0.4s ${easing.premium}` }}
                      >
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Continue</Typography>
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Box>

          <Typography
            sx={{
              textAlign: 'center',
              mt: 8,
              color: ink.tertiary,
              fontSize: '0.8rem',
              opacity: visible ? 1 : 0,
              transition: `opacity 0.8s ${easing.premium} 0.5s`,
            }}
          >
            © {new Date().getFullYear()} Gurukul AI
          </Typography>
        </Box>
      </Container>
    </CinematicBackground>
  );
}

export default EnhancedRoleSelection;
