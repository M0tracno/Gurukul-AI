import React from 'react';
import { useTheme } from '@mui/material/styles';
import { 
import makeStyles from '../../utils/makeStylesCompat';
import LinkBehavior from '../common/LinkBehavior';

import { Box, Button, Checkbox, CircularProgress, Container, FormControlLabel, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
/**
 * Enhanced Login Form Components
 * 
 * This file provides reusable enhanced UI components for login forms
 * following the design principles outlined in ENHANCED_UI_GUIDE.md
 */

  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon} from '@mui/icons-material';

// Utility function to get role-specific styles (colors, gradients, etc.)
const getRoleStyles = (role) => {
  const theme = useTheme();
  const originalTheme = useTheme();
  const styles = {
    student: {
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      hoverGradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
      hoverBoxShadow: '0 12px 32px rgba(16, 185, 129, 0.4)',
    },
    faculty: {
      gradient: 'linear-gradient(135deg, #3a86ff 0%, #0072ff 100%)',
      hoverGradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      bgGradient: 'linear-gradient(135deg, #3a86ff 0%, #0072ff 100%)',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
      hoverBoxShadow: '0 12px 32px rgba(59, 130, 246, 0.4)',
    },
    parent: {
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      hoverGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
      bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
      hoverBoxShadow: '0 12px 32px rgba(139, 92, 246, 0.4)',
    },
    admin: {
      gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      hoverGradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
      bgGradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
      hoverBoxShadow: '0 12px 32px rgba(239, 68, 68, 0.4)',
    }
  };

  return styles[role] || styles.student;
};

export const useLoginFormStyles = (role) => {
  const roleStyles = getRoleStyles(role);
  
  return makeStyles((theme) => ({
    root: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing(2),
      background: roleStyles.bgGradient,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        animation: '$float 40s ease-in-out infinite alternate',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundSize: '100% 100%',
        backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        animation: '$pulse 15s ease-in-out infinite alternate',
      }
    },
    '@keyframes float': {
      '0%': { transform: 'translateY(0px) rotate(0deg)' },
      '50%': { transform: 'translateY(-20px) rotate(10deg)' },
      '100%': { transform: 'translateY(0px) rotate(0deg)' },
    },
    '@keyframes pulse': {
      '0%': { opacity: 0.7 },
      '50%': { opacity: 0.9 },
      '100%': { opacity: 0.7 },
    },
    paper: {
      padding: theme.spacing(5),
      borderRadius: theme.spacing(3),
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
      maxWidth: 480,
      width: '100%',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: roleStyles.gradient,
        borderTopLeftRadius: theme.spacing(3),
        borderTopRightRadius: theme.spacing(3),
      },
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2)',
      },
    },
    header: {
      textAlign: 'center',
      marginBottom: theme.spacing(4),
      position: 'relative',
    },
    title: {
      marginBottom: theme.spacing(1),
      background: roleStyles.gradient,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: 700,
      fontSize: '2.2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(1),
      position: 'relative',
    },
    subtitle: {
      color: theme.palette.text.secondary,
      fontWeight: 400,
      opacity: 0.9,
      maxWidth: '80%',
      margin: '0 auto',
    },
    form: {
      marginTop: theme.spacing(3),
    },
    textField: {
      marginBottom: theme.spacing(3),
      '& .MuiOutlinedInput-root': {
        borderRadius: theme.spacing(1.5),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&::before': {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        },
        '&.Mui-focused': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        },
      },
      '& .MuiInputLabel-root': {
        fontWeight: 500,
      },
      '& .MuiOutlinedInput-notchedOutline': {
        transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    },
    submitButton: {
      background: roleStyles.gradient,
      borderRadius: theme.spacing(2),
      padding: theme.spacing(1.5, 3),
      fontSize: '1.1rem',
      fontWeight: 600,
      textTransform: 'none',
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(3),
      boxShadow: roleStyles.boxShadow,
      border: 'none',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: -100,
        width: 100,
        height: '100%',
        background: 'rgba(255, 255, 255, 0.2)',
        transform: 'skewX(-15deg)',
        transition: 'all 0.6s ease',
      },
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: roleStyles.hoverBoxShadow,
        background: roleStyles.hoverGradient,
        '&::before': {
          left: '100%',
          transition: 'all 0.8s ease',
        }
      },
      '&:disabled': {
        background: 'rgba(0, 0, 0, 0.12)',
        transform: 'none',
        boxShadow: 'none',
      },
    },
    links: {
      textAlign: 'center',
      marginTop: theme.spacing(3),
      '& a': {
        color: theme.palette.primary.main,
        textDecoration: 'none',
        fontWeight: 500,
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': {
          color: theme.palette.primary.dark,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -2,
          left: 0,
          width: '100%',
          height: 1,
          background: 'currentColor',
          transform: 'scaleX(0)',
          transformOrigin: 'right',
          transition: 'transform 0.3s ease',
        },
        '&:hover::after': {
          transform: 'scaleX(1)',
          transformOrigin: 'left',
        }
      },
    },
    divider: {
      margin: theme.spacing(3, 0),
      position: 'relative',
      textAlign: 'center',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
        background: theme.palette.divider,
      },
      '& span': {
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: theme.spacing(0, 2),
        color: theme.palette.text.secondary,
        fontSize: '0.875rem',
      },
    },
    alert: {
      marginBottom: theme.spacing(3),
      borderRadius: theme.spacing(1),
      animation: '$fadeIn 0.3s ease-out',
    },
    '@keyframes fadeIn': {
      '0%': { opacity: 0, transform: 'translateY(-10px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
    },
    rememberMe: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2),
      '& .MuiFormControlLabel-label': {
        fontSize: '0.9rem',
      },
    },
    backLink: {
      textAlign: 'center',
      marginTop: theme.spacing(3),
    },
    helperText: {
      textAlign: 'center',
      marginTop: theme.spacing(2),
      color: theme.palette.text.secondary,
      fontSize: '0.9rem',
    },
    icon: {
      marginRight: theme.spacing(1),
      color: 'currentColor',
      animation: '$rotate 10s linear infinite',
      transformOrigin: 'center',
      opacity: 0.8,
    },
    '@keyframes rotate': {
      '0%': { transform: 'rotateY(0deg)' },
      '100%': { transform: 'rotateY(360deg)' },
    },
    loadingIndicator: {
      color: 'white',
    },
    buttonProgress: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -12,
      marginLeft: -12,
    },
  }));
};

export const EnhancedTextField = ({ 
  label,
  type = 'text',
  value,
  onChange,
  className,
  InputProps,
  ...props 
}) => {
  return (
    <TextField
      label={label}
      variant="outlined"
      type={type}
      fullWidth
      value={value}
      onChange={onChange}
      className={className}
      InputProps={InputProps}
      {...props}
    />
  );
};

export const PasswordField = ({ 
  value, 
  onChange, 
  label = "Password", 
  className,
  ...props 
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <TextField
      label={label}
      variant="outlined"
      type={showPassword ? 'text' : 'password'}
      fullWidth
      value={value}
      onChange={onChange}
      className={className}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleTogglePasswordVisibility}
              edge="end"
            >
              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
};

export const EnhancedRememberMeCheckbox = ({ checked, onChange, className }) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={onChange}
          color="primary"
        />
      }
      label="Remember me"
      className={className}
    />
  );
};

export const SubmitButton = ({ loading, text = 'Login', className }) => {
  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      fullWidth
      className={className}
      disabled={loading}
    >
      {loading ? (
        <CircularProgress size={24} className="loadingIndicator" />
      ) : (
        text
      )}
    </Button>
  );
};

export const LoginFormContainer = ({ children, className }) => {
  return (
    <Box component="form" className={className}>
      {children}
    </Box>
  );
};

export const ForgotPasswordLink = ({ to = "/forgot-password" }) => {
  return (
    <Box textAlign="center">
      <Typography variant="body2">
        <LinkBehavior to={to} color="primary">
          Forgot Password?
        </LinkBehavior>
      </Typography>
    </Box>
  );
};

export const BackToRoleSelectionLink = () => {
  return (
    <Box textAlign="center" mt={3}>
      <Typography variant="body2">
        <LinkBehavior to="/" color="primary">
          Back to Role Selection
        </LinkBehavior>
      </Typography>
    </Box>
  );
};

export const EnhancedLoginLayout = ({ children, className }) => {
  return (
    <Container maxWidth="sm" className={className}>
      {children}
    </Container>
  );
};
