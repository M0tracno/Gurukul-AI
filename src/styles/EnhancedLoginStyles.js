import { useTheme } from '@mui/material/styles';

/**
 * Enhanced Login Page Styles - Modern UI Implementation
 * 
 * This provides comprehensive, modern styling for all login pages
 * with beautiful gradients, animations, and responsive design.
 */

// Role-specific color schemes
export const roleThemes = {
  const theme = useTheme();
  const originalTheme = useTheme();
  admin: {
    primary: '#e74c3c',
    secondary: '#c0392b',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    lightGradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
    bgGradient: 'linear-gradient(135deg, #fc8181 0%, #e53e3e 50%, #c53030 100%)',
    shadowColor: 'rgba(239, 68, 68, 0.3)',
    hoverShadow: 'rgba(239, 68, 68, 0.5)',
  },
  parent: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    lightGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    bgGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
    shadowColor: 'rgba(139, 92, 246, 0.3)',
    hoverShadow: 'rgba(139, 92, 246, 0.5)',
  },
  student: {
    primary: '#10b981',
    secondary: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    lightGradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    bgGradient: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    hoverShadow: 'rgba(16, 185, 129, 0.5)',
  },
  faculty: {
    primary: '#3b82f6',
    secondary: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    lightGradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    bgGradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    hoverShadow: 'rgba(59, 130, 246, 0.5)',
  },
};

// Enhanced Background Container
export const EnhancedBackground = styled(Box)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    background: roleTheme.bgGradient,
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
      animation: 'backgroundFloat 20s ease-in-out infinite',
    },
    
    // Floating geometric shapes
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      animation: 'patternFloat 30s linear infinite',
      opacity: 0.3,
    },
    
    // Keyframe animations
    '@keyframes backgroundFloat': {
      '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
      '33%': { transform: 'translate(30px, -30px) scale(1.1)' },
      '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
    },
    
    '@keyframes patternFloat': {
      '0%': { transform: 'translateX(0) translateY(0)' },
      '100%': { transform: 'translateX(-60px) translateY(-60px)' },
    },
  };
});

// Enhanced Login Paper Container
export const EnhancedLoginPaper = styled(Paper)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    padding: theme.spacing(5),
    borderRadius: theme.spacing(3),
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: `0 25px 50px ${roleTheme.shadowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`,
    maxWidth: 480,
    width: '100%',
    position: 'relative',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Top accent border
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 6,
      background: roleTheme.gradient,
      borderTopLeftRadius: theme.spacing(3),
      borderTopRightRadius: theme.spacing(3),
    },
    
    // Hover effects
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: `0 35px 70px ${roleTheme.hoverShadow}, 0 0 0 1px rgba(255, 255, 255, 0.2)`,
    },
  };
});

// Enhanced Title with Gradient Text
export const EnhancedTitle = styled(Typography)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    marginBottom: theme.spacing(1),
    background: roleTheme.gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
    fontSize: '2.2rem',
    textAlign: 'center',
    position: 'relative',
    
    // Animated underline
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: -8,
      left: '50%',
      width: 60,
      height: 3,
      background: roleTheme.gradient,
      borderRadius: 2,
      transform: 'translateX(-50%)',
      animation: 'titleUnderline 0.8s ease-out forwards',
    },
    
    '@keyframes titleUnderline': {
      '0%': { width: 0, opacity: 0 },
      '100%': { width: 60, opacity: 1 },
    },
  };
});

// Enhanced Subtitle
export const EnhancedSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 400,
  opacity: 0.8,
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  fontSize: '1.1rem',
}));

// Enhanced Text Field
export const EnhancedTextField = styled(TextField)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    marginBottom: theme.spacing(3),
    
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.spacing(1.5),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 20px ${roleTheme.shadowColor}`,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      },
      
      '&.Mui-focused': {
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 25px ${roleTheme.shadowColor}`,
        backgroundColor: 'rgba(255, 255, 255, 1)',
      },
    },
    
    '& .MuiInputLabel-root': {
      fontWeight: 500,
      fontSize: '1rem',
    },
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(0, 0, 0, 0.2)',
      borderWidth: 1.5,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: roleTheme.primary,
      borderWidth: 2,
    },
    
    '& .MuiInputAdornment-root': {
      color: roleTheme.primary,
    },
  };
});

// Enhanced Submit Button
export const EnhancedSubmitButton = styled(Button)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    background: roleTheme.gradient,
    borderRadius: theme.spacing(2),
    padding: theme.spacing(1.5, 4),
    fontSize: '1.1rem',
    fontWeight: 600,
    textTransform: 'none',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(3),
    boxShadow: `0 8px 25px ${roleTheme.shadowColor}`,
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    color: 'white',
    width: '100%',
    
    // Shine effect
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
      transition: 'all 0.6s ease',
    },
    
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: `0 12px 35px ${roleTheme.hoverShadow}`,
      background: roleTheme.lightGradient,
      
      '&::before': {
        left: '100%',
      }
    },
    
    '&:active': {
      transform: 'translateY(-1px)',
    },
    
    '&:disabled': {
      background: 'rgba(0, 0, 0, 0.12)',
      transform: 'none',
      boxShadow: 'none',
      color: 'rgba(0, 0, 0, 0.26)',
    },
  };
});

// Enhanced Form Container
export const EnhancedFormContainer = styled('form')(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(2),
}));

// Enhanced Link Styling
export const EnhancedLink = styled(Typography)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    textAlign: 'center',
    marginTop: theme.spacing(2),
    
    '& a': {
      color: roleTheme.primary,
      textDecoration: 'none',
      fontWeight: 500,
      position: 'relative',
      transition: 'all 0.3s ease',
      
      '&:hover': {
        color: roleTheme.secondary,
      },
      
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -2,
        left: 0,
        width: 0,
        height: 2,
        background: roleTheme.gradient,
        transition: 'width 0.3s ease',
      },
      
      '&:hover::after': {
        width: '100%',
      },
    },
  };
});

// Enhanced Header Icon Container
export const EnhancedIconContainer = styled(Box)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: roleTheme.gradient,
    margin: '0 auto 20px',
    boxShadow: `0 8px 25px ${roleTheme.shadowColor}`,
    transition: 'all 0.3s ease',
    
    '& .MuiSvgIcon-root': {
      fontSize: '2.5rem',
      color: 'white',
    },
    
    '&:hover': {
      transform: 'scale(1.1) rotate(5deg)',
      boxShadow: `0 12px 35px ${roleTheme.hoverShadow}`,
    },
  };
});

// Enhanced Divider
export const EnhancedDivider = styled(Box)(({ theme, role = 'student' }) => {
  const roleTheme = roleThemes[role];
  
  return {
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(3, 0),
    
    '&::before, &::after': {
      content: '""',
      flex: 1,
      height: 1,
      background: `linear-gradient(90deg, transparent, ${roleTheme.primary}, transparent)`,
    },
    
    '& span': {
      padding: theme.spacing(0, 2),
      fontSize: '0.85rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      background: 'rgba(255, 255, 255, 0.8)',
      borderRadius: theme.spacing(1),
    },
  };
});

export default {
  EnhancedBackground,
  EnhancedLogin,
  EnhancedTitle,
  EnhancedSubtitle,
  EnhancedTextField,
  EnhancedSubmitButton,
  EnhancedFormContainer,
  EnhancedLink,
  EnhancedIconContainer,
  EnhancedDivider,
  roleThemes,
};
