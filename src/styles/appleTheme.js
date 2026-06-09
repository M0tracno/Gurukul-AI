import { createTheme } from '@mui/material/styles';

/**
 * Apple-Inspired Modern UI Theme
 *
 * This provides a beautiful, modern UI theme inspired by Apple's design language
 * with fluid animations, glass morphism, and elegant interactions.
 */

// Apple-inspired color palette
export const appleColors = {
  // Primary brand colors
  primary: '#007AFF', // iOS Blue
  secondary: '#5856D6', // iOS Purple
  success: '#34C759', // iOS Green
  warning: '#FF9500', // iOS Orange
  error: '#FF3B30', // iOS Red
  info: '#5AC8FA', // iOS Light Blue

  // Role-specific colors
  student: {
    main: '#34C759', // Green
    light: '#30D158',
    dark: '#248A3D',
  },
  faculty: {
    main: '#007AFF', // Blue
    light: '#5AC8FA',
    dark: '#0051D5',
  },
  parent: {
    main: '#8b5cf6', // Purple
    light: '#a78bfa',
    dark: '#7c3aed',
  },
  admin: {
    main: '#FF3B30', // Red
    light: '#FF453A',
    dark: '#D70015',
  },

  // Text colors
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F2F2F7',
    100: '#E5E5EA',
    200: '#D1D1D6',
    300: '#C7C7CC',
    400: '#AEAEB2',
    500: '#8E8E93',
    600: '#636366',
    700: '#48484A',
    800: '#3A3A3C',
    900: '#1C1C1E',
  },

  // Special effects
  glassFrost: 'rgba(255, 255, 255, 0.8)',
  glassBackground: 'rgba(255, 255, 255, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.25)',
  shadowHeavy: 'rgba(0, 0, 0, 0.5)',
};

// Apple-style gradients
export const appleGradients = {
  primary: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
  success: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
  warning: 'linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%)',
  error: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 100%)',
  sunset: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 50%, #5856D6 100%)',
  ocean: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 50%, #5856D6 100%)',
  forest: 'linear-gradient(135deg, #34C759 0%, #30D158 50%, #32D74B 100%)',
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
  accent: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  secondary: 'linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)',

  // Role-specific gradients
  student: {
    main: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
    light: 'linear-gradient(135deg, #30D158 0%, #32D74B 100%)',
    dark: 'linear-gradient(135deg, #248A3D 0%, #1A5F29 100%)',
  },
  faculty: {
    main: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
    light: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)',
    dark: 'linear-gradient(135deg, #0051D5 0%, #003D9F 100%)',
  },
  parent: {
    main: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    light: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    dark: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  },
  admin: {
    main: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 100%)',
    light: 'linear-gradient(135deg, #FF453A 0%, #FF6961 100%)',
    dark: 'linear-gradient(135deg, #D70015 0%, #B71C1C 100%)',
  },
};

// Enhanced shadows for depth
export const appleShadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
  glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
  glow: '0 0 20px rgba(0, 122, 255, 0.5)',

  // Additional shadows used in login forms
  small: '0 2px 4px rgba(0, 0, 0, 0.1)',
  medium: '0 4px 12px rgba(0, 0, 0, 0.15)',
  large: '0 8px 30px rgba(0, 0, 0, 0.2)',
};

// Smooth, Apple-style transitions
export const appleTransitions = {
  fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  normal: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Additional transitions used in components
  smooth: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeOut: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
};

// Create the enhanced theme
export const createAppleTheme = () =>
  createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: appleColors.primary,
        light: '#5AC8FA',
        dark: '#0051D5',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: appleColors.secondary,
        light: '#9F9FFF',
        dark: '#3B3B98',
        contrastText: '#FFFFFF',
      },
      success: {
        main: appleColors.success,
        light: '#30D158',
        dark: '#248A3D',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: appleColors.warning,
        light: '#FF9F0A',
        dark: '#D70015',
        contrastText: '#FFFFFF',
      },
      error: {
        main: appleColors.error,
        light: '#FF453A',
        dark: '#D70015',
        contrastText: '#FFFFFF',
      },
      background: {
        default: appleColors.gray[50],
        paper: appleColors.white,
      },
      text: {
        primary: appleColors.gray[900],
        secondary: appleColors.gray[600],
      },
    },
    typography: {
      fontFamily: '"SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      button: {
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 500,
            textTransform: 'none',
            transition: appleTransitions.normal,
            boxShadow: appleShadows.sm,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: appleShadows.lg,
            },
            '&:active': {
              transform: 'translateY(0)',
              transition: appleTransitions.fast,
            },
          },
          contained: {
            background: appleGradients.primary,
            border: 'none',
            '&:hover': {
              background: appleGradients.primary,
              filter: 'brightness(1.1)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              transition: appleTransitions.normal,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: appleShadows.md,
              },
              '&.Mui-focused': {
                transform: 'translateY(-2px)',
                boxShadow: appleShadows.lg,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: appleColors.primary,
                  borderWidth: 2,
                },
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: appleColors.glassFrost,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: appleShadows.glass,
            transition: appleTransitions.normal,
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: appleShadows['2xl'],
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: appleColors.glassFrost,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: appleShadows.glass,
            transition: appleTransitions.normal,
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-8px) scale(1.02)',
              boxShadow: appleShadows['2xl'],
            },
          },
        },
      },
    },
  });

// Animation keyframes for Apple-style effects
export const appleAnimations = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -468px 0;
    }
    100% {
      background-position: 468px 0;
    }
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  @keyframes glassReflection {
    0% {
      transform: translateX(-100%) skewX(-15deg);
    }
    100% {
      transform: translateX(200%) skewX(-15deg);
    }
  }
`;

// Utility classes for common Apple-style effects
export const appleUtilities = {
  glassMorphism: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: appleShadows.glass,
  },
  floatingElement: {
    animation: 'float 6s ease-in-out infinite',
  },
  pulseElement: {
    animation: 'pulse 2s ease-in-out infinite',
  },
  shimmerEffect: {
    background: `linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s infinite',
  },
  gradientText: {
    background: appleGradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
};
