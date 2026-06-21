import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography, Container, Stack } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

import CinematicBackground from '../components/common/CinematicBackground';
import { accents, ink, fonts } from '../theme/cinematic';

const NotFound = () => {
  return (
    <CinematicBackground accent="blue">
      <Container
        maxWidth="sm"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          py: 8,
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: { xs: '6rem', md: '9rem' },
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: ink.primary,
            // faint accent wash behind the numerals
            background: `linear-gradient(180deg, ${ink.primary}, ${accents.blue.deep})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 2,
          }}
        >
          404
        </Typography>

        <Typography variant="h4" sx={{ color: ink.primary, mb: 1.5 }}>
          This page took the day off.
        </Typography>
        <Typography sx={{ color: ink.secondary, fontSize: '1.05rem', maxWidth: 420, mb: 5 }}>
          The page you're after doesn't exist or has moved. Let's get you back on track.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 3.5, py: 1.4 }}
          >
            Back to home
          </Button>
          <Button component={RouterLink} to="/role-select" variant="outlined" size="large" sx={{ px: 3.5, py: 1.4 }}>
            Choose a portal
          </Button>
        </Stack>
      </Container>
    </CinematicBackground>
  );
};

export default NotFound;
