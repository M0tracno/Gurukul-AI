import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { navigateToDashboard } from '../utils/navigationHelpers';
import LinkBehavior from '../components/common/LinkBehavior';
import { useFormInteractionFix } from '../utils/formInteractionFix';
import { appleColors, appleGradients, appleShadows, appleTransitions } from '../styles/appleTheme';
import { Alert, Box, Button, Checkbox, CircularProgress, Fade, FormControlLabel, IconButton, InputAdornment, Slide, TextField, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

// Import form interaction fix and Apple theme

function FacultyLogin() {
  // Apply form interaction fixes
  useFormInteractionFix();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // If already authenticated with faculty role, redirect to dashboard
  useEffect(() => {
    if (currentUser && userRole === 'faculty') {
      navigateToDashboard(navigate, 'faculty', { replace: true });
    }
  }, [navigate, currentUser, userRole]);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try to login
      await login(email, password, 'faculty');

      // If we get here, we're logged in successfully
      navigateToDashboard(navigate, 'faculty', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        background: appleGradients.faculty.main,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)
          `,
          animation: 'backgroundFloat 20s ease-in-out infinite'},
        '@keyframes backgroundFloat': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }}}}
    >
      <Fade in timeout={800}>
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '440px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: appleShadows.medium,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
              zIndex: -1}}}
        >
          <Slide direction="up" in timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  background: appleGradients.faculty.light,
                  mb: 3,
                  boxShadow: appleShadows.soft,
                  animation: 'float 3s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }}}}
              >
                <SchoolIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  mb: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'}}
              >
                Faculty Portal
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1.1rem'}}
              >
                Access your teaching dashboard and resources
              </Typography>
            </Box>
          </Slide>

          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  backdropFilter: 'blur(10px)',
                  '& .MuiAlert-message': {
                    color: 'rgba(255, 255, 255, 0.9)'}
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="Enter your email address"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </InputAdornment>
                ),
                style: {
                  pointerEvents: 'auto',
                  userSelect: 'auto',
                  touchAction: 'manipulation'}
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  transition: appleTransitions.smooth,
                  pointerEvents: 'auto',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: '1px'},
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'},
                  '&.Mui-focused fieldset': {
                    borderColor: appleColors.faculty.main,
                    borderWidth: '2px',
                    boxShadow: `0 0 0 4px ${appleColors.faculty.main}25`}},
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: appleColors.faculty.main}},
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)'}}}}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      aria-label="toggle password visibility"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        '&:hover': {
                          color: 'white',
                          background: 'rgba(255, 255, 255, 0.1)'}
                      }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: {
                  pointerEvents: 'auto',
                  userSelect: 'auto',
                  touchAction: 'manipulation'}
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  transition: appleTransitions.smooth,
                  pointerEvents: 'auto',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: '1px'},
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'},
                  '&.Mui-focused fieldset': {
                    borderColor: appleColors.faculty.main,
                    borderWidth: '2px',
                    boxShadow: `0 0 0 4px ${appleColors.faculty.main}25`}},
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: appleColors.faculty.main}},
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)'}}}}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      pointerEvents: 'auto',
                      touchAction: 'manipulation',
                      '&.Mui-checked': {
                        color: appleColors.faculty.main},
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.1)'}
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Remember me
                  </Typography>
                }
              />

              <Typography
                component={LinkBehavior}
                to="/forgot-password"
                variant="body2"
                sx={{
                  color: appleColors.faculty.light,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  transition: appleTransitions.smooth,
                  '&:hover': {
                    color: 'white',
                    textDecoration: 'underline'}
                }}
              >
                Forgot Password?
              </Typography>
            </Box>

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              sx={{
                background: appleGradients.faculty.main,
                color: 'white',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: appleShadows.medium,
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                transition: appleTransitions.smooth,
                '&:hover': {
                  background: appleGradients.faculty.light,
                  transform: 'translateY(-2px)',
                  boxShadow: appleShadows.large},
                '&:active': {
                  transform: 'translateY(0px)'},
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.5)'}}}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  Signing In...
                </>
              ) : (
                'Sign In to Faculty Portal'
              )}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
              Having trouble accessing your account? Contact the administrator
            </Typography>

            <Typography
              component={LinkBehavior}
              to="/"
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                transition: appleTransitions.smooth,
                '&:hover': {
                  color: 'white',
                  transform: 'translateX(-4px)'}
              }}
            >
              <ArrowBackIcon sx={{ mr: 1, fontSize: 18 }} />
              Back to Role Selection
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}

export default FacultyLogin;
