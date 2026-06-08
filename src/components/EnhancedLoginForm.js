import React, { useState, useEffect } from 'react';
import { useFormInteractionFix } from '../utils/formInteractionFix';
import { appleColors, appleGradients, appleShadows, appleTransitions } from '../styles/appleTheme';
import { Alert, Box, Checkbox, CircularProgress, Container, FormControlLabel, IconButton, Typography } from '@mui/material';

import { Fade, InputAdornment, Zoom } from '@mui/material';
import { styled } from '@mui/material/styles';
/**
 * Enhanced Modern Login Component
 *
 * A completely rewritten login component with:
 * - Fixed form interactions
 * - Apple-inspired animations
 * - Glass morphism design
 * - Smooth transitions
 * - Accessible form controls
 */

  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon} from '@mui/icons-material';
// Smooth animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideInFromLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Role configurations
const roleConfigs = {
  student: {
    title: 'Student Portal',
    subtitle: 'Access your courses and track your progress',
    icon:,
    gradient: appleGradients.success,
    color: appleColors.success,
    bgGradient: 'linear-gradient(135deg, #34C759 0%, #30D158 50%, #32D74B 100%)'},
  faculty: {
    title: 'Faculty Portal',
    subtitle: 'Manage courses and monitor student progress',
    icon:,
    gradient: appleGradients.primary,
    color: appleColors.primary,
    bgGradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 50%, #AF52DE 100%)'},
  parent: {
    title: 'Parent Portal',
    subtitle: 'Monitor your child\'s academic progress',
    icon: PeopleIcon,
    gradient: appleGradients.warning,
    color: appleColors.warning,
    bgGradient: 'linear-gradient(135deg, #FF9500 0%, #FF9F0A 50%, #FFCC02 100%)'},
  admin: {
    title: 'Admin Panel',
    subtitle: 'Comprehensive system administration',
    icon: AdminIcon,
    gradient: appleGradients.error,
    color: appleColors.error,
    bgGradient: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 50%, #FF6961 100%)'}};

// Styled components
const BackgroundContainer = styled(Box)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: config.bgGradient,
    position: 'relative',
    overflow: 'hidden',

    // Animated background patterns
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
      animation: `${float} 20s ease-in-out infinite`},

    // Floating geometric shapes
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      animation: `${float} 30s linear infinite`,
      opacity: 0.2}};
});

const LoginPaper = styled(Paper)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    padding: '48px 40px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: `${appleShadows['2xl']}, 0 0 0 1px rgba(255, 255, 255, 0.1)`,
    maxWidth: '480px',
    width: '100%',
    position: 'relative',
    transition: appleTransitions.normal,
    animation: `${scaleIn} 0.6s cubic-bezier(0.4, 0, 0.2, 1)`,

    // Top accent border
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '6px',
      background: config.gradient,
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px'},

    // Hover effects
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: `${appleShadows['2xl']}, 0 0 40px rgba(0, 0, 0, 0.1)`}};
});

const IconContainer = styled(Box)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
    animation: `${fadeInUp} 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both`,

    '& .icon': {
      fontSize: '64px',
      padding: '16px',
      borderRadius: '50%',
      background: config.gradient,
      color: 'white',
      boxShadow: appleShadows.lg,
      animation: `${float} 6s ease-in-out infinite`,
      transition: appleTransitions.normal,

      '&:hover': {
        transform: 'scale(1.1)',
        boxShadow: appleShadows.xl}}};
});

const TitleText = styled(Typography)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    marginBottom: '8px',
    background: config.gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
    fontSize: '2.2rem',
    textAlign: 'center',
    position: 'relative',
    animation: `${fadeInUp} 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both`,

    // Animated underline
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '-8px',
      left: '50%',
      width: '60px',
      height: '3px',
      background: config.gradient,
      borderRadius: '2px',
      transform: 'translateX(-50%)',
      animation: `${slideInFromLeft} 0.8s ease-out 0.5s both`}};
});

const SubtitleText = styled(Typography)({
  color: appleColors.gray[600],
  fontWeight: 400,
  opacity: 0.8,
  textAlign: 'center',
  marginBottom: '32px',
  fontSize: '1.1rem',
  animation: `${fadeInUp} 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both`});

const StyledTextField = styled(TextField)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    marginBottom: '24px',

    '& .MuiOutlinedInput-root': {
      borderRadius: '16px',
      transition: appleTransitions.normal,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',

      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: appleShadows.md,
        backgroundColor: 'rgba(255, 255, 255, 0.95)'},

      '&.Mui-focused': {
        transform: 'translateY(-4px)',
        boxShadow: appleShadows.lg,
        backgroundColor: 'rgba(255, 255, 255, 1)',

        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: config.color,
          borderWidth: '2px',
          boxShadow: `0 0 0 3px ${config.color}20`}},

      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(0, 0, 0, 0.1)',
        transition: appleTransitions.normal}},

    '& .MuiInputLabel-root': {
      fontWeight: 500,
      color: appleColors.gray[600],

      '&.Mui-focused': {
        color: config.color}},

    '& .MuiInputAdornment-root .MuiSvgIcon-root': {
      color: config.color,
      opacity: 0.7}};
});

const SubmitButton = styled(Button)(({ role }) => {
  const config = roleConfigs[role] || roleConfigs.student;

  return {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '1.1rem',
    fontWeight: 600,
    textTransform: 'none',
    background: config.gradient,
    color: 'white',
    border: 'none',
    boxShadow: appleShadows.lg,
    transition: appleTransitions.normal,
    position: 'relative',
    overflow: 'hidden',

    // Shimmer effect
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
      transition: appleTransitions.normal},

    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: appleShadows.xl,
      filter: 'brightness(1.1)',

      '&::before': {
        left: '100%',
        transition: appleTransitions.slow}},

    '&:active': {
      transform: 'translateY(-1px)',
      transition: appleTransitions.fast},

    '&:disabled': {
      background: appleColors.gray[300],
      transform: 'none',
      boxShadow: 'none'}};
});

const FormContainer = styled('form')({
  animation: `${fadeInUp} 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both`,
  position: 'relative',
  zIndex: 2,

  // Ensure all form elements are clickable
  '& *': {
    pointerEvents: 'auto !important',
    userSelect: 'auto !important',
    WebkitUserSelect: 'auto !important',
    touchAction: 'manipulation !important'}});

// Main login component
const EnhancedLoginForm = ({
  role = 'student',
  onSubmit,
  loading = false,
  error = '',
  title,
  subtitle
}) => {
  // Fix form interactions
  useFormInteractionFix();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
    showPassword: false});

  const config = roleConfigs[role];
  const IconComponent = config.icon;

  // Force fix form elements after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      // Ensure all inputs are interactive
      const inputs = document.querySelectorAll('input, button, textarea');
      inputs.forEach(input => {
        input.style.pointerEvents = 'auto';
        input.style.userSelect = 'auto';
        input.style.webkitUserSelect = 'auto';
        input.style.touchAction = 'manipulation';
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const togglePasswordVisibility = () => {
    setFormData(prev => ({
      ...prev,
      showPassword: !prev.showPassword
    }));
  };

  return (
    <BackgroundContainer role={role}>
      <Container maxWidth="sm">
        <Fade in={true} timeout={600}>
          <LoginPaper role={role} elevation={0}>
            <IconContainer role={role}>
              <IconComponent className="icon" />
            </IconContainer>

            <TitleText variant="h4" role={role}>
              {title || config.title}
            </TitleText>

            <SubtitleText variant="body1">
              {subtitle || config.subtitle}
            </SubtitleText>

            {error && (
              <Zoom in={true}>
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    border: '1px solid rgba(255, 59, 48, 0.2)'}}
                >
                  {error}
                </Alert>
              </Zoom>
            )}

            <FormContainer onSubmit={handleSubmit}>
              <StyledTextField
                role={role}
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                autoFocus
                placeholder={`Enter your ${role} email`}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  )}}
              />

              <StyledTextField
                role={role}
                fullWidth
                label="Password"
                type={formData.showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                required
                placeholder="Enter your password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={togglePasswordVisibility}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {formData.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )}}
              />

              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.remember}
                      onChange={handleChange('remember')}
                      sx={{
                        color: config.color,
                        '&.Mui-checked': {
                          color: config.color}}}
                    />
                  }
                  label="Remember me"
                  sx={{ color: appleColors.gray[600] }}
                />

                <Typography
                  variant="body2"
                  component="button"
                  type="button"
                  sx={{
                    background: 'none',
                    border: 'none',
                    color: config.color,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'}}}
                >
                  Forgot Password?
                </Typography>
              </Box>

              <SubmitButton
                role={role}
                type="submit"
                fullWidth
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {loading ? 'Signing In...' : `Sign In to ${config.title}`}
              </SubmitButton>
            </FormContainer>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" sx={{ color: appleColors.gray[500] }}>
                Having trouble? Contact your system administrator
              </Typography>
            </Box>
          </LoginPaper>
        </Fade>
      </Container>
    </BackgroundContainer>
  );
};

export default EnhancedLoginForm;
