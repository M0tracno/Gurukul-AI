import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Container,
  Link,
  Fade,
  useTheme
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LoginRounded as LoginIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import makeStyles from '../../utils/makeStylesCompat';

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #f5576c 60%, #4facfe 80%, #00f2fe 100%)',
    backgroundSize: '400% 400%',
    animation: '$gradientShift 20s ease infinite',
    padding: theme.spacing(3),
    position: 'relative',
    overflow: 'hidden',
  },
  '@keyframes gradientShift': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    zIndex: 1,
  },
  container: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '450px',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    padding: theme.spacing(4),
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    },
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  title: {
    fontWeight: 800,
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      transition: 'all 0.3s ease',
      '& fieldset': {
        border: 'none',
      },
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
      },
      '&.Mui-focused': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: 500,
      '&.Mui-focused': {
        color: 'rgba(255, 255, 255, 0.95)',
      },
    },
    '& .MuiOutlinedInput-input': {
      color: 'rgba(255, 255, 255, 0.95)',
      fontWeight: 500,
      '&::placeholder': {
        color: 'rgba(255, 255, 255, 0.6)',
      },
    },
  },
  loginButton: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1.1rem',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.95)',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2))',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.5)',
      transform: 'none',
    },
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing(3),
    left: theme.spacing(3),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.9)',
    zIndex: 3,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      transform: 'translateY(-2px)',
    },
  },
  footer: {
    textAlign: 'center',
    marginTop: theme.spacing(3),
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.8)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.3s ease',
    '&:hover': {
      color: 'rgba(255, 255, 255, 0.95)',
    },
  },
}));

const ModernLoginForm = ({ 
  title, 
  subtitle, 
  roleColor = '#667eea',
  onSubmit, 
  loading = false,
  error = null
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.backgroundOverlay} />
      
      {/* Back button */}
      <IconButton 
        className={classes.backButton}
        onClick={() => navigate('/')}
        size="large"
      >
        <BackIcon />
      </IconButton>

      <Container className={classes.container}>
        <Fade in={isVisible} timeout={800}>
          <Card className={classes.card} elevation={0}>
            <CardContent>
              <Box className={classes.header}>
                <Typography variant="h4" className={classes.title}>
                  {title}
                </Typography>
                <Typography variant="body1" className={classes.subtitle}>
                  {subtitle}
                </Typography>
              </Box>

              {error && (
                <Fade in timeout={500}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              <Box component="form" className={classes.form} onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  variant="outlined"
                  value={formData.email}
                  onChange={handleChange('email')}
                  className={classes.textField}
                  required
                  autoComplete="email"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className={classes.textField}
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={togglePasswordVisibility}
                          edge="end"
                          sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  className={classes.loginButton}
                  disabled={loading || !formData.email || !formData.password}
                  startIcon={<LoginIcon />}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>

              <Box className={classes.footer}>
                <Link
                  href="#"
                  className={classes.footerLink}
                  onClick={(e) => {
                    e.preventDefault();
                    // Handle forgot password
                  }}
                >
                  Forgot your password?
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default ModernLoginForm;