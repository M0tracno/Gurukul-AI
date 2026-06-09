import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { School, Person, FamilyRestroom, AdminPanelSettings } from '@mui/icons-material';

const roles = [
  {
    id: 'faculty',
    title: 'Faculty',
    description: 'Manage courses, assessments, and empower students with intelligent tools.',
    icon: Person,
    path: '/faculty-login',
    color: '#a78bfa',
  },
  {
    id: 'student',
    title: 'Student',
    description: 'Access your courses, track progress, and unlock personalized learning paths.',
    icon: School,
    path: '/student-login',
    color: '#60a5fa',
  },
  {
    id: 'parent',
    title: 'Parent',
    description: "Stay connected with your child's academic journey and real-time insights.",
    icon: FamilyRestroom,
    path: '/parent-login',
    color: '#34d399',
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'Oversee operations, manage users, and access comprehensive analytics.',
    icon: AdminPanelSettings,
    path: '/admin-login',
    color: '#f472b6',
  },
];

function EnhancedRoleSelection() {
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
        justifyContent: 'center',
        py: 6,
      }}
    >
      {/* Animated gradient orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float1 12s ease-in-out infinite',
          '@keyframes float1': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '50%': { transform: 'translate(60px, 40px) scale(1.1)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float2 15s ease-in-out infinite',
          '@keyframes float2': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '50%': { transform: 'translate(-50px, -30px) scale(1.05)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          right: '20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244, 114, 182, 0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'float3 10s ease-in-out infinite',
          '@keyframes float3': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(-30px, 20px)' },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 8,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.95)',
              mb: 2,
              fontSize: { xs: '2rem', md: '2.75rem' },
              letterSpacing: '-0.02em',
            }}
          >
            Choose Your Portal
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.15rem' },
            }}
          >
            Select your role to access the Gurukul AI platform
          </Typography>
        </Box>

        {/* Role Cards Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' },
            gap: { xs: 3, md: 4 },
            maxWidth: '900px',
            mx: 'auto',
          }}
        >
          {roles.map((role, index) => {
            const IconComponent = role.icon;
            return (
              <Box
                key={role.id}
                onClick={() => navigate(role.path)}
                sx={{
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '20px',
                  padding: { xs: 3, md: 4 },
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transitionDelay: `${0.1 + index * 0.1}s`,
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${role.color}40`,
                    boxShadow: `0 20px 60px ${role.color}15, 0 0 40px ${role.color}08`,
                  },
                }}
              >
                {/* Icon container with glow */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${role.color}15`,
                    border: `1px solid ${role.color}30`,
                    mb: 3,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${role.color}20 0%, transparent 70%)`,
                      filter: 'blur(8px)',
                    },
                  }}
                >
                  <IconComponent sx={{ fontSize: 28, color: role.color }} />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    mb: 1,
                    fontSize: '1.25rem',
                  }}
                >
                  {role.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: 1.6,
                    fontSize: '0.9rem',
                  }}
                >
                  {role.description}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            textAlign: 'center',
            mt: 8,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0.6s',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem' }}
          >
            © {new Date().getFullYear()} Gurukul AI · Transforming Education
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default EnhancedRoleSelection;
