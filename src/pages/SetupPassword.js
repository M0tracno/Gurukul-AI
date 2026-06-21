import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Button } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

import CinematicBackground from '../components/common/CinematicBackground';
import { accents, ink, surfaces } from '../theme/cinematic';

function SetupPassword() {
  const a = accents.blue;
  return (
    <CinematicBackground accent="blue">
      <Container
        maxWidth="sm"
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 440,
            p: { xs: 4, md: 5 },
            textAlign: 'center',
            borderRadius: '22px',
            background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 140%)`,
            border: `1px solid ${surfaces.border}`,
            boxShadow: '0 30px 80px -40px rgba(0,0,0,0.9)',
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 3,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              background: a.soft,
              border: `1px solid rgba(${a.rgb}, 0.25)`,
              color: a.light,
            }}
          >
            <LockOutlined sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ color: ink.primary, mb: 1.5 }}>
            Set up your password
          </Typography>
          <Typography sx={{ color: ink.secondary, mb: 4 }}>
            Open the secure link from your invitation email to create your password and activate
            your account.
          </Typography>
          <Button component={RouterLink} to="/role-select" variant="contained" size="large" sx={{ px: 3.5, py: 1.4 }}>
            Back to sign in
          </Button>
        </Box>
      </Container>
    </CinematicBackground>
  );
}

export default SetupPassword;
