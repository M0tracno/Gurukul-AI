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
import {
  Visibility,
  VisibilityOff,
  FamilyRestroom as FamilyIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { navigateToDashboard } from '../utils/navigationHelpers';
import LoginLayout from '../components/auth/LoginLayout';

function ParentLogin() {
  const navigate = useNavigate();
  const { login, currentUser, userRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && userRole === 'parent') {
      navigateToDashboard(navigate, 'parent', { replace: true });
    }
  }, [navigate, currentUser, userRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, 'parent');
      navigateToDashboard(navigate, 'parent', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = '#34d399';

  return (
    <LoginLayout
      title="Parent Portal"
      subtitle="Stay connected with your child's academic progress and receive real-time insights."
      icon={FamilyIcon}
      color={accentColor}
      backLink="/"
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)', mb: 0.5 }}
      >
        Sign In
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 3 }}>
        Enter your credentials to continue
      </Typography>

      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              '& .MuiAlert-icon': { color: '#f87171' },
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
              '&:hover fieldset': { borderColor: `${accentColor}60` },
              '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '1.5px' },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.4)',
              '&.Mui-focused': { color: accentColor },
            },
            '& .MuiOutlinedInput-input': { color: 'rgba(255, 255, 255, 0.9)' },
          }}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
                  aria-label="toggle password visibility"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
              '&:hover fieldset': { borderColor: `${accentColor}60` },
              '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '1.5px' },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.4)',
              '&.Mui-focused': { color: accentColor },
            },
            '& .MuiOutlinedInput-input': { color: 'rgba(255, 255, 255, 0.9)' },
          }}
        />

        <Button
          type="submit"
          fullWidth
          disabled={loading || !email || !password}
          sx={{
            mt: 1,
            py: 1.5,
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '1rem',
            textTransform: 'none',
            background: `linear-gradient(135deg, ${accentColor} 0%, #059669 100%)`,
            color: '#ffffff',
            boxShadow: `0 4px 20px ${accentColor}30`,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 8px 30px ${accentColor}40`,
              background: `linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)`,
            },
            '&:disabled': {
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.3)',
              boxShadow: 'none',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} sx={{ color: 'white' }} />
              Signing in...
            </Box>
          ) : (
            'Sign In'
          )}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 2.5 }}>
        <Typography
          component="a"
          href="/forgot-password"
          onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.4)',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s',
            '&:hover': { color: accentColor },
          }}
        >
          Forgot your password?
        </Typography>
      </Box>
    </LoginLayout>
  );
}

export default ParentLogin;
