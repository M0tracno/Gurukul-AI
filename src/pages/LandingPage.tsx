/**
 * Cinematic Landing Page — Gurukul AI
 *
 * Dark, filmic, single-accent design. A lit "set" (CinematicBackground)
 * carries depth via directional glow, grain, and vignette; the Bricolage
 * Grotesque display face and editorial layout do the rest. One accent leads
 * each section (neutral blue), with per-role accent tints only on the
 * doorway cards.
 */

import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Container, Grid, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import InsightsIcon from '@mui/icons-material/Insights';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import CinematicBackground from '../components/common/CinematicBackground';
import { accents, ink, surfaces, easing } from '../theme/cinematic';

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const features = [
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 26 }} />,
    title: 'AI grading that explains itself',
    description:
      'Score assignments against your own rubric and return contextual feedback in seconds — you stay the editor, the model does the first pass.',
  },
  {
    icon: <ChatBubbleOutlineIcon sx={{ fontSize: 26 }} />,
    title: 'Conversations, not inboxes',
    description:
      'Threaded messaging between teachers, students, and parents with delivery you can trust — files, typing presence, and offline catch-up included.',
  },
  {
    icon: <InsightsIcon sx={{ fontSize: 26 }} />,
    title: 'Signals before they become problems',
    description:
      'Attendance, grades, and engagement read as a single trend line, so a slipping student is a quiet nudge — not a term-end surprise.',
  },
];

const roles = [
  {
    icon: <SchoolIcon sx={{ fontSize: 30 }} />,
    title: 'Teacher',
    description: 'Plan, grade, and keep every class moving.',
    path: '/faculty-login',
    accent: accents.amber,
  },
  {
    icon: <PersonIcon sx={{ fontSize: 30 }} />,
    title: 'Student',
    description: 'Coursework, submissions, and your progress.',
    path: '/student-login',
    accent: accents.blue,
  },
  {
    icon: <FamilyRestroomIcon sx={{ fontSize: 30 }} />,
    title: 'Parent',
    description: "Stay close to your child's school day.",
    path: '/parent-login',
    accent: accents.teal,
  },
  {
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 30 }} />,
    title: 'Admin',
    description: 'Run the institution from one console.',
    path: '/admin-login',
    accent: accents.crimson,
  },
];

// ---------------------------------------------------------------------------
// useScrollReveal — Intersection Observer for scroll-driven reveals
// ---------------------------------------------------------------------------

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Eyebrow({ children, color = accents.blue.main }: { children: string; color?: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="inherit">
      <Box sx={{ width: 28, height: 1, background: color, opacity: 0.8 }} />
      <Typography
        variant="overline"
        sx={{ color, fontSize: '0.72rem', letterSpacing: '0.22em' }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const rise = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.9s ${easing.premium} ${delay}s, transform 0.9s ${easing.premium} ${delay}s`,
  });

  return (
    <CinematicBackground accent="blue">
      <Container
        maxWidth="md"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 10,
        }}
      >
        <Box sx={{ ...rise(0), display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Eyebrow>Intelligent Education Platform</Eyebrow>
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.8rem', sm: '3.8rem', md: '4.75rem' },
            color: ink.primary,
            maxWidth: 900,
            mb: 3,
            ...rise(0.08),
          }}
        >
          The operating system for{' '}
          <Box component="span" sx={{ color: accents.blue.light }}>
            modern teaching
          </Box>
          .
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1.05rem', md: '1.2rem' },
            color: ink.secondary,
            maxWidth: 620,
            mb: 5,
            lineHeight: 1.7,
            ...rise(0.16),
          }}
        >
          AI grading, real-time messaging, and analytics in one calm, fast workspace —
          for teachers, students, parents, and administrators.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ ...rise(0.24) }}>
          <Button
            component={RouterLink}
            to="/role-select"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 3.5, py: 1.5, fontSize: '1rem' }}
          >
            Enter the platform
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() =>
              document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
            }
            sx={{ px: 3.5, py: 1.5, fontSize: '1rem' }}
          >
            See what's inside
          </Button>
        </Stack>

        <Box
          sx={{
            ...rise(0.5),
            mt: { xs: 7, md: 10 },
            color: ink.tertiary,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="overline" sx={{ fontSize: '0.65rem', letterSpacing: '0.2em' }}>
            Scroll
          </Typography>
          <KeyboardArrowDownIcon
            sx={{
              animation: 'floatY 2.4s ease-in-out infinite',
              '@keyframes floatY': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(6px)' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        </Box>
      </Container>
    </CinematicBackground>
  );
}

function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box
      id="features-section"
      ref={ref}
      sx={{ py: { xs: 10, md: 16 }, background: surfaces.base }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: { xs: 6, md: 9 }, maxWidth: 680 }}>
          <Box sx={{ mb: 2.5 }}>
            <Eyebrow>Capabilities</Eyebrow>
          </Box>
          <Typography
            variant="h2"
            sx={{
              color: ink.primary,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'none' : 'translateY(24px)',
              transition: `all 0.8s ${easing.premium}`,
            }}
          >
            Everything the school day needs — and nothing it doesn't.
          </Typography>
        </Box>

        <Stack divider={<Box sx={{ height: 1, background: surfaces.border }} />} spacing={0}>
          {features.map((feature, index) => (
            <Grid
              container
              key={feature.title}
              spacing={{ xs: 2, md: 6 }}
              sx={{
                py: { xs: 4, md: 5 },
                alignItems: 'flex-start',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'none' : 'translateY(32px)',
                transition: `all 0.8s ${easing.premium} ${0.1 + index * 0.12}s`,
              }}
            >
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Typography
                    sx={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: accents.blue.main,
                      minWidth: 44,
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Box
                    sx={{
                      color: accents.blue.light,
                      display: 'grid',
                      placeItems: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      border: `1px solid ${surfaces.border}`,
                      background: accents.blue.soft,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h4" sx={{ color: ink.primary }}>
                    {feature.title}
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography
                  sx={{ color: ink.secondary, fontSize: '1.05rem', lineHeight: 1.75, pt: { md: 0.5 } }}
                >
                  {feature.description}
                </Typography>
              </Grid>
            </Grid>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

function RolesSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box
      ref={ref}
      sx={{ py: { xs: 10, md: 16 }, background: `linear-gradient(180deg, ${surfaces.base} 0%, ${surfaces.default} 100%)` }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: { xs: 6, md: 9 }, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Eyebrow>Four doorways</Eyebrow>
          </Box>
          <Typography variant="h2" sx={{ color: ink.primary }}>
            Choose your way in.
          </Typography>
        </Box>

        <Grid container spacing={2.5} justifyContent="center">
          {roles.map((role, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={role.title}>
              <Box
                component={RouterLink}
                to={role.path}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  p: 3.5,
                  textDecoration: 'none',
                  borderRadius: '16px',
                  background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 140%)`,
                  border: `1px solid ${surfaces.border}`,
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'none' : 'translateY(36px)',
                  transition: `opacity 0.7s ${easing.premium} ${0.15 + index * 0.1}s, transform 0.7s ${easing.premium} ${0.15 + index * 0.1}s, border-color 0.4s ${easing.premium}, box-shadow 0.4s ${easing.premium}`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: `rgba(${role.accent.rgb}, 0.5)`,
                    boxShadow: `0 30px 60px -34px rgba(${role.accent.rgb}, 0.5)`,
                    '& .role-arrow': { transform: 'translateX(4px)', opacity: 1 },
                  },
                }}
              >
                {/* top accent line */}
                <Box
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
                <Box
                  sx={{
                    color: role.accent.light,
                    width: 52,
                    height: 52,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '14px',
                    background: role.accent.soft,
                    border: `1px solid rgba(${role.accent.rgb}, 0.25)`,
                    mb: 2.5,
                  }}
                >
                  {role.icon}
                </Box>
                <Typography variant="h5" sx={{ color: ink.primary, mb: 0.75 }}>
                  {role.title}
                </Typography>
                <Typography sx={{ color: ink.secondary, fontSize: '0.92rem', lineHeight: 1.6, flexGrow: 1 }}>
                  {role.description}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  className="role-arrow"
                  sx={{
                    mt: 2.5,
                    color: role.accent.light,
                    opacity: 0.75,
                    transition: `all 0.4s ${easing.premium}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Sign in</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function ClosingSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box ref={ref} sx={{ background: surfaces.default, borderTop: `1px solid ${surfaces.border}` }}>
      <Container maxWidth="md" sx={{ py: { xs: 10, md: 14 } }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            border: `1px solid ${surfaces.border}`,
            background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 120%)`,
            p: { xs: 5, md: 8 },
            textAlign: 'center',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'none' : 'translateY(28px)',
            transition: `all 0.8s ${easing.premium}`,
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(70% 120% at 50% 0%, ${accents.blue.soft} 0%, transparent 60%)`,
            }}
          />
          <Box sx={{ position: 'relative' }}>
            <Typography variant="h2" sx={{ color: ink.primary, mb: 2, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
              Ready to bring the term into focus?
            </Typography>
            <Typography sx={{ color: ink.secondary, mb: 4, fontSize: '1.05rem', maxWidth: 520, mx: 'auto' }}>
              Pick your role and pick up where the school day left off.
            </Typography>
            <Button
              component={RouterLink}
              to="/role-select"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
            >
              Get started
            </Button>
          </Box>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 3 }}
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 6 }}
        >
          <Typography sx={{ color: ink.tertiary, fontSize: '0.8rem' }}>
            © 2026 Gurukul AI
          </Typography>
          <Stack direction="row" spacing={3}>
            {['About', 'Privacy', 'Terms'].map(link => (
              <Typography
                key={link}
                component="span"
                sx={{
                  color: ink.tertiary,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': { color: ink.secondary },
                }}
              >
                {link}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <Box sx={{ background: surfaces.base, overflow: 'hidden' }}>
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <ClosingSection />
    </Box>
  );
}
