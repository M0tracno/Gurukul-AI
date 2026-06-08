import { createTheme } from '@mui/material/styles';

// Enhanced color palette
const lightColors = {
  primary: {
    main: '#3a86ff',
    light: '#6ba3ff',
    dark: '#2565cc',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#06ffa5',
    light: '#4fffc7',
    dark: '#00cc7f',
    contrastText: '#000000',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },
  background: {
    default: '#f8f9fa',
    paper: '#ffffff',
    elevated: '#ffffff',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  text: {
    primary: '#2c3e50',
    secondary: '#6c757d',
    disabled: '#bdbdbd',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

const darkColors = {
  primary: {
    main: '#5a9eff',
    light: '#8bb8ff',
    dark: '#2565cc',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#26ffb5',
    light: '#5fffc7',
    dark: '#00cc7f',
    contrastText: '#000000',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
    elevated: '#2d2d2d',
    gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    disabled: '#666666',
  },
  grey: {
    50: '#303030',
    100: '#424242',
    200: '#515151',
    300: '#616161',
    400: '#757575',
    500: '#9e9e9e',
    600: '#bdbdbd',
    700: '#e0e0e0',
    800: '#eeeeee',
    900: '#f5f5f5',
  },
};

// Enhanced typography with better font hierarchy
const typography = {
  fontFamily: [
    '"Inter"',
    '"Roboto"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
};

// Enhanced spacing system
const spacing = (factor) => `${0.5 * factor}rem`;

// Custom shadows for better depth perception - Material-UI requires 25 shadow levels (0-24)
const shadows = [
  'none',
  '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
  '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
  '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
  '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
  '0px 16px 32px rgba(0, 0, 0, 0.28), 0px 12px 12px rgba(0, 0, 0, 0.24)',
  '0px 18px 36px rgba(0, 0, 0, 0.30), 0px 14px 14px rgba(0, 0, 0, 0.26)',
  '0px 20px 40px rgba(0, 0, 0, 0.32), 0px 16px 16px rgba(0, 0, 0, 0.28)',
  '0px 22px 44px rgba(0, 0, 0, 0.34), 0px 18px 18px rgba(0, 0, 0, 0.30)',
  '0px 24px 48px rgba(0, 0, 0, 0.36), 0px 20px 20px rgba(0, 0, 0, 0.32)',
  '0px 26px 52px rgba(0, 0, 0, 0.38), 0px 22px 22px rgba(0, 0, 0, 0.34)',
  '0px 28px 56px rgba(0, 0, 0, 0.40), 0px 24px 24px rgba(0, 0, 0, 0.36)',
  '0px 30px 60px rgba(0, 0, 0, 0.42), 0px 26px 26px rgba(0, 0, 0, 0.38)',
  '0px 32px 64px rgba(0, 0, 0, 0.44), 0px 28px 28px rgba(0, 0, 0, 0.40)',
  '0px 34px 68px rgba(0, 0, 0, 0.46), 0px 30px 30px rgba(0, 0, 0, 0.42)',
  '0px 36px 72px rgba(0, 0, 0, 0.48), 0px 32px 32px rgba(0, 0, 0, 0.44)',
  '0px 38px 76px rgba(0, 0, 0, 0.50), 0px 34px 34px rgba(0, 0, 0, 0.46)',
  '0px 40px 80px rgba(0, 0, 0, 0.52), 0px 36px 36px rgba(0, 0, 0, 0.48)',
  '0px 42px 84px rgba(0, 0, 0, 0.54), 0px 38px 38px rgba(0, 0, 0, 0.50)',
  '0px 44px 88px rgba(0, 0, 0, 0.56), 0px 40px 40px rgba(0, 0, 0, 0.52)',
  '0px 46px 92px rgba(0, 0, 0, 0.58), 0px 42px 42px rgba(0, 0, 0, 0.54)',
  '0px 48px 96px rgba(0, 0, 0, 0.60), 0px 44px 44px rgba(0, 0, 0, 0.56)',
  '0px 50px 100px rgba(0, 0, 0, 0.62), 0px 46px 46px rgba(0, 0, 0, 0.58)',
  '0px 52px 104px rgba(0, 0, 0, 0.64), 0px 48px 48px rgba(0, 0, 0, 0.60)',
  '0px 54px 108px rgba(0, 0, 0, 0.66), 0px 50px 50px rgba(0, 0, 0, 0.62)',
];

// Enhanced shape configurations
const shape = {
  borderRadius: 12,
  borderRadiusSmall: 8,
  borderRadiusLarge: 20,
};

// Create theme function
export const createAdvancedTheme = (mode = 'light') => {
  const colors = mode === 'light' ? lightColors : darkColors;
  
  return createTheme({
    palette: {
      mode,
      ...colors,
    },
    typography,
    spacing,
    shadows,
    shape,
    
    // Custom component overrides
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            height: '100%',
            width: '100%',
          },
          body: {
            height: '100%',
            width: '100%',
            backgroundColor: colors.background.default,
          },
          '#root': {
            height: '100%',
            width: '100%',
          },
          // Custom scrollbar
          '::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '::-webkit-scrollbar-track': {
            background: colors.grey[100],
            borderRadius: '4px',
          },
          '::-webkit-scrollbar-thumb': {
            background: colors.grey[400],
            borderRadius: '4px',
            '&:hover': {
              background: colors.grey[500],
            },
          },
        },
      },
      
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
            textTransform: 'none',
            fontWeight: 500,
            padding: '10px 24px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: shadows[3],
            },
          },
          contained: {
            boxShadow: shadows[1],
            '&:hover': {
              boxShadow: shadows[3],
            },
          },
        },
      },
      
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
            boxShadow: shadows[1],
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: shadows[2],
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: shadows[1],
          },
          elevation2: {
            boxShadow: shadows[2],
          },
          elevation3: {
            boxShadow: shadows[3],
          },
        },
      },
      
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: shape.borderRadius,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary.main,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: '2px',
                },
              },
            },
          },
        },
      },
      
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadiusSmall,
            fontWeight: 500,
          },
        },
      },
      
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: shadows[1],
            backgroundImage: 'none',
          },
        },
      },
      
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            border: 'none',
          },
        },
      },
      
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadiusSmall,
            margin: '2px 8px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: colors.primary.main + '10',
              transform: 'translateX(4px)',
            },
            '&.Mui-selected': {
              backgroundColor: colors.primary.main + '20',
              '&:hover': {
                backgroundColor: colors.primary.main + '30',
              },
            },
          },
        },
      },
      
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 48,
          },
        },
      },
      
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
          },
        },
      },
    },
    
    // Custom breakpoints for better responsiveness
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
        xxl: 1920,
      },
    },
    
    // Custom z-index values
    zIndex: {
      drawer: 1200,
      appBar: 1300,
      modal: 1400,
      snackbar: 1500,
      tooltip: 1600,
    },
    
    // Custom transitions
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  });
};

// Export default theme
export default createAdvancedTheme();
