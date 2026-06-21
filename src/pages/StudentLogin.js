import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Fade,
} from '@mui/material';
import { Visibility, VisibilityOff, Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { navigateToDashboard } from '../utils/navigationHelpers';
import LoginLayout from '../components/auth/LoginLayout';
import { authFieldSx, authButtonSx, authErrorAlertSx, authLinkSx } from '../components/auth/authStyles';
import { ink } from '../theme/cinematic';

const ACCENT = 'blue';

function StudentLogin() {
  const navigate = useNavigate();
  const { login, currentUser, userRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && userRole === 'student') {
      navigateToDashboard(navigate, 'student', { replace: true });
    }
  }, [navigate, currentUser, userRole]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password, 'student');
      navigateToDashboard(navigate, 'student', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout
      title="Student Portal"
      eyebrow="Student"
      subtitle="Welcome back. Pick up your coursework, submissions, and progress where you left off."
      icon={PersonIcon}
      accent={ACCENT}
    >
      <Typography variant="h5" sx={{ color: ink.primary, mb: 0.5 }}>
        Sign in
      </Typography>
      <Typography variant="body2" sx={{ color: ink.tertiary, mb: 3 }}>
        Enter your credentials to continue
      </Typography>

      {error && (
        <Fade in>
          <Alert severity="error" sx={authErrorAlertSx}>
            {error}
          </Alert>
        </Fade>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <TextField
          fullWidth
          label="Email address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          variant="outlined"
          sx={authFieldSx(ACCENT)}
        />
        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          variant="outlined"
          sx={authFieldSx(ACCENT)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ color: ink.tertiary }}
                  aria-label="toggle password visibility"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" fullWidth disabled={loading || !email || !password} sx={authButtonSx(ACCENT)}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} sx={{ color: 'white' }} />
              Signing in…
            </Box>
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 2.5 }}>
        <Typography
          component="a"
          href="/forgot-password"
          onClick={e => {
            e.preventDefault();
            navigate('/forgot-password');
          }}
          variant="body2"
          sx={authLinkSx(ACCENT)}
        >
          Forgot your password?
        </Typography>
      </Box>
    </LoginLayout>
  );
}

export default StudentLogin;
