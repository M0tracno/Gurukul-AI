/**
 * Cinematic Landing Page for Gurukul AI
 *
 * Dark, minimal, premium design inspired by cinematic sports websites
 * adapted for the education domain. Features glassmorphism cards,
 * animated gradient orbs, and scroll-driven reveals.
 */

import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Container, Grid, Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import InsightsIcon from '@mui/icons-material/Insights';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const GLASS_STYLE = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
};

const features = [
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 32, color: '#a78bfa' }} />,
    title: 'AI Grading',
    description:
      'Intelligent assessment powered by generative AI. Grade assignments faster with contextual feedback and rubric alignment.',
  },
  {
    icon: <ChatBubbleOutlineIcon sx={{ fontSize: 32, color: '#60a5fa' }} />,
    title: 'Real-Time Chat',
    description:
      'Instant messaging between teachers, students, and parents. Threaded conversations with file sharing and notifications.',
  },
  {
    icon: <InsightsIcon sx={{ fontSize: 32, color: '#34d399' }} />,
    title: 'Analytics Dashboard',
    description:
      'Comprehensive academic insights with visual charts, trend analysis, and predictive performance indicators.',
  },
];

const roles = [
  {
    icon: <SchoolIcon sx={{ fontSize: 40 }} />,
    title: 'Teacher',
    description: 'Manage classes, grade assignments, and track student progress.',
    path: '/faculty-login',
    color: '#a78bfa',
  },
  {
    icon: <PersonIcon sx={{ fontSize: 40 }} />,
    title: 'Student',
    description: 'Access courses, submit work, and view your academic journey.',
    path: '/student-login',
    color: '#60a5fa',
  },
  {
    icon: <FamilyRestroomIcon sx={{ fontSize: 40 }} />,
    title: 'Parent',
    description: "Stay connected with your child's academic performance.",
    path: '/parent-login',
    color: '#34d399',
  },
  {
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 40 }} />,
    title: 'Admin',
    description: 'Oversee institutional operations and manage users.',
    path: '/admin-login',
    color: '#f472b6',
  },
];

// ---------------------------------------------------------------------------
// useScrollReveal — Intersection Observer hook for scroll-driven animations
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
// Section Components
// ---------------------------------------------------------------------------

function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a1a 100%)',
      }}
    >
      {/* Animated gradient orb */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '300px', md: '600px' },
          height: { xs: '300px', md: '600px' },
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'orbFloat 8s ease-in-out infinite',
          '@keyframes orbFloat': {
            '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
            '50%': { transform: 'translate(-50%, -50%) scale(1.1)' },
          },
        }}
      />

      {/* Secondary orb */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: { xs: '150px', md: '300px' },
          height: { xs: '150px', md: '300px' },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 60%)',
          filter: 'blur(40px)',
          animation: 'orbFloat2 10s ease-in-out infinite',
          '@keyframes orbFloat2': {
            '0%, 100%': { transform: 'scale(1) translateY(0)' },
            '50%': { transform: 'scale(1.15) translateY(-20px)' },
          },
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Typography
          variant="h1"
          sx={{
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
            lineHeight: 1.1,
            color: '#fff',
            mb: 3,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          Empowering The
          <br />
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Future Of Education
          </Box>
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontFamily: FONT_FAMILY,
            fontWeight: 400,
            fontSize: { xs: '1rem', md: '1.2rem' },
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '600px',
            mx: 'auto',
            mb: 5,
            lineHeight: 1.7,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}
        >
          Advanced tools for teachers, students, and parents. AI-powered grading, real-time
          messaging, and comprehensive academic management.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
          }}
        >
          <Button
            component={RouterLink}
            to="/role-select"
            variant="contained"
            size="large"
            sx={{
              fontFamily: FONT_FAMILY,
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: '12px',
              background: '#fff',
              color: '#0a0a0f',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.9)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(255, 255, 255, 0.15)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            sx={{
              fontFamily: FONT_FAMILY,
              fontWeight: 500,
              px: 4,
              py: 1.5,
              borderRadius: '12px',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.8)',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.05)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Learn More
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box
      id="features-section"
      ref={ref}
      sx={{
        py: { xs: 10, md: 14 },
        background: '#0a0a0f',
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          sx={{
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.8rem' },
            color: '#fff',
            textAlign: 'center',
            mb: 2,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          Powerful Features
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT_FAMILY,
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            mb: 8,
            fontSize: '1.1rem',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
          }}
        >
          Everything you need to run a modern classroom
        </Typography>

        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={feature.title}>
              <Box
                sx={{
                  ...GLASS_STYLE,
                  p: 4,
                  height: '100%',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + index * 0.1}s`,
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    color: '#fff',
                    mb: 1.5,
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_FAMILY,
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.95rem',
                    lineHeight: 1.7,
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function RolesSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box
      ref={ref}
      sx={{
        py: { xs: 10, md: 14 },
        background: 'linear-gradient(180deg, #0a0a0f 0%, #0d1117 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          sx={{
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.8rem' },
            color: '#fff',
            textAlign: 'center',
            mb: 2,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          Choose Your Role
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT_FAMILY,
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            mb: 8,
            fontSize: '1.1rem',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
          }}
        >
          Select your role to get started
        </Typography>

        <Grid container spacing={3} justifyContent="center">
          {roles.map((role, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={role.title}>
              <Box
                component={RouterLink}
                to={role.path}
                sx={{
                  ...GLASS_STYLE,
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  textDecoration: 'none',
                  height: '100%',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + index * 0.1}s`,
                  cursor: 'pointer',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: `1px solid ${role.color}40`,
                    transform: 'translateY(-6px) scale(1.02)',
                    boxShadow: `0 20px 40px ${role.color}15`,
                  },
                }}
              >
                <Box
                  sx={{
                    color: role.color,
                    mb: 2,
                    p: 1.5,
                    borderRadius: '12px',
                    background: `${role.color}10`,
                  }}
                >
                  {role.icon}
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    color: '#fff',
                    mb: 1,
                  }}
                >
                  {role.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_FAMILY,
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  {role.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function FooterSection() {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <Box
      ref={ref}
      sx={{
        py: { xs: 8, md: 10 },
        background: '#0a0a0f',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            ...GLASS_STYLE,
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: { xs: '1.5rem', md: '2rem' },
              color: '#fff',
              mb: 2,
            }}
          >
            Ready to transform your classroom?
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_FAMILY,
              color: 'rgba(255, 255, 255, 0.5)',
              mb: 4,
              fontSize: '1rem',
            }}
          >
            Join thousands of educators already using Gurukul AI.
          </Typography>
          <Button
            component={RouterLink}
            to="/role-select"
            variant="contained"
            size="large"
            sx={{
              fontFamily: FONT_FAMILY,
              fontWeight: 600,
              px: 5,
              py: 1.5,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
              color: '#fff',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Get Started Now
          </Button>
        </Box>

        {/* Footer links */}
        <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 6, mb: 3 }}>
          {['About', 'Privacy', 'Terms'].map(link => (
            <Typography
              key={link}
              component="span"
              sx={{
                fontFamily: FONT_FAMILY,
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                '&:hover': { color: 'rgba(255, 255, 255, 0.7)' },
                transition: 'color 0.2s ease',
              }}
            >
              {link}
            </Typography>
          ))}
        </Stack>

        <Typography
          sx={{
            fontFamily: FONT_FAMILY,
            color: 'rgba(255, 255, 255, 0.25)',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          © 2026 Gurukul AI. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main LandingPage Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0a0a0f',
        overflow: 'hidden',
      }}
    >
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <FooterSection />
    </Box>
  );
}
