import { createTheme } from '@mui/material/styles';

// Create a theme that uses our custom LinkBehavior component
const createCustomTheme = LinkBehavior => {
  return createTheme({
    palette: {
      primary: {
        main: '#667eea', // Beautiful gradient blue
        light: '#9ca3f7',
        dark: '#3b4ddd',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f093fb', // Pink gradient
        light: '#f5b7ff',
        dark: '#d26ef8',
        contrastText: '#ffffff',
      },
      background: {
        default: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        paper: '#ffffff',
        dark: '#121212',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        glassEffect: 'rgba(255, 255, 255, 0.9)',
        modernGradient: 'linear-gradient(135deg, #667eea 0%, #f093fb 50%, #f5576c 100%)',
      },
      success: {
        main: '#06d6a0', // Teal
        light: '#6aecce',
        dark: '#049e76',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ef476f', // Pink-red
        light: '#ff7a9c',
        dark: '#b80046',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#ffd166', // Yellow
        light: '#ffe499',
        dark: '#cc9c33',
        contrastText: '#2b2d42',
      },
      info: {
        main: '#118ab2', // Blue-teal
        light: '#56b9e0',
        dark: '#006082',
        contrastText: '#ffffff',
      },
      text: {
        primary: '#2d3436',
        secondary: '#636e72',
        hint: '#aaa',
      },
    },
    typography: {
      fontFamily: [
        'Poppins',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 500,
        fontSize: '1rem',
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none', // 0
      '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)', // 1
      '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)', // 2
      '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)', // 3
      '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)', // 4
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)', // 5
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)', // 6
      '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)', // 7
      '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)', // 8
      '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)', // 9
      '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)', // 10
      '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)', // 11
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)', // 12
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)', // 13
      '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)', // 14
      '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)', // 15
      '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)', // 16
      '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)', // 17
      '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)', // 18
      '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)', // 19
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)', // 20
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)', // 21
      '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)', // 22
      '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)', // 23
      '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)', // 24
    ],
    components: {
      // Use our custom LinkBehavior for all MuiLink components
      MuiLink: {
        defaultProps: {
          component: LinkBehavior,
        },
      },
      // Fix the findDOMNode warning in ButtonBase components
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false, // Keep ripple effect
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: false,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: '1rem',
            fontWeight: 600,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textTransform: 'none',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
          },
          contained: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-2px)',
            },
          },
          outlined: {
            borderWidth: '2px',
            borderColor: '#667eea',
            background: 'rgba(102, 126, 234, 0.05)',
            '&:hover': {
              borderWidth: '2px',
              background: 'rgba(102, 126, 234, 0.1)',
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 1,
        },
        styleOverrides: {
          root: {
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          rounded: {
            borderRadius: 20,
          },
          elevation1: {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          },
          elevation2: {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
          },
          elevation3: {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.14)',
          },
          elevation4: {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.16)',
          },
          elevation6: {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.18)',
          },
          elevation8: {
            boxShadow: '0 12px 45px rgba(0, 0, 0, 0.2)',
          },
          elevation12: {
            boxShadow: '0 14px 50px rgba(0, 0, 0, 0.22)',
          },
          elevation16: {
            boxShadow: '0 16px 55px rgba(0, 0, 0, 0.25)',
          },
          elevation24: {
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiInputBase: {
        defaultProps: {
          spellCheck: false,
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          margin: 'normal',
          fullWidth: true,
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '&:hover fieldset': {
                borderColor: '#3a86ff',
              },
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          body: {
            margin: 0,
            padding: 0,
            minHeight: '100vh',
            backgroundColor: '#f8f9fa',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          a: {
            textDecoration: 'none',
            color: '#3a86ff',
          },
        },
      },
    },
  });
};

export default createCustomTheme;
