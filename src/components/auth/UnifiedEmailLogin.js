import React, { useState, useEffect } from 'react';
import { Person as PersonIcon, SchoolIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { navigateToDashboard } from '../../utils/navigationHelpers';
import LinkBehavior from '../common/LinkBehavior';

import { Alert, Box, Button, Checkbox, CircularProgress, Container, Divider, FormControlLabel, IconButton, InputAdornment, Link, Paper, Tab, Tabs, TextField, Typography } from '@mui/material';
  School as SchoolIcon} from '@mui/icons-material';
const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'},
  paper: {
    padding: theme.spacing(4),
    borderRadius: 10,
    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.1)',
    maxWidth: 500,
    width: '100%'},
  title: {
    marginBottom: theme.spacing(3),
    color: theme.palette.primary.main,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1)},
  form: {
    width: '100%',
    marginTop: theme.spacing(1)},
  submit: {
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.5),
    borderRadius: 8,
    textTransform: 'none',
    fontSize: '1.1rem',
    fontWeight: 600},
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 8}},
  tabsContainer: {
    marginBottom: theme.spacing(3),
    backgroundColor: theme.palette.grey[100],
    borderRadius: 8},
  tab: {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.9rem'},
  divider: {
    margin: theme.spacing(2, 0)},
  links: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2)},
  link: {
    fontSize: '0.875rem',
    textDecoration: 'none',
    color: theme.palette.primary.main,
    '&:hover': {
      textDecoration: 'underline'}},
  authMethodButton: {
    marginTop: theme.spacing(1),
    textTransform: 'none',
    borderRadius: 8},
  emailVerificationBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.warning.light,
    borderRadius: 8}}));

function UnifiedEmailLogin({ defaultUserType = 'student' }) {
  const classes = useStyles();
  const [userType, setUserType] = useState(defaultUserType);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  const {
    currentUser,
    userRole,
    login,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();

  // User type configurations
  const userTypeConfig = {
    student: {
      icon: <Person as PersonIcon />,
      title: 'Student Login',
      color: '#2196F3',
      placeholder: 'Enter your student email'
    },
    faculty: {
      icon: <SchoolIcon />,
      title: 'Faculty Login',
      color: '#4CAF50',
      placeholder: 'Enter your faculty email'
    },
    admin: {
      icon: <AdminIcon />,
      title: 'Admin Login',
      color: '#FF9800',
      placeholder: 'Enter your admin email'
    },
    parent: {
      icon: <ParentIcon />,
      title: 'Parent Login',
      color: '#9C27B0',
      placeholder: 'Enter your email or phone number'
    }
  };

  const currentConfig = userTypeConfig[userType];

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser && userRole === userType) {
      navigateToDashboard(navigate, userType, { replace: true });
    }
  }, [currentUser, userRole, userType, navigate]);

  const handleUserTypeChange = (event, newValue) => {
    setUserType(newValue);
    setError('');
    setEmailNotVerified(false);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailNotVerified(false);

    try {
      // Use standard JWT login
      const result = await login(email, password, userType);

      if (result) {
        navigateToDashboard(navigate, userType);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setError('');
      alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // Email verification is now handled by the backend
    alert('Please contact support if you need to verify your email.');
  };

  const handlePhoneLogin = () => {
  const theme = useTheme();
    // Redirect to existing phone login for parents
    if (userType === 'parent') {
      navigate('/login/parent-phone');
    }
  };

  return (
    <Container component="main" maxWidth="sm" className={classes.root}>
      <Paper className={classes.paper}>
        <Box className={classes.title}>
          {currentConfig.icon}
          <Typography component="h1" variant="h4">
            {currentConfig.title}
          </Typography>
        </Box>

        {/* User Type Tabs */}
        <Box className={classes.tabsContainer}>
          <Tabs
            value={userType}
            onChange={handleUserTypeChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Student" value="student" className={classes.tab} />
            <Tab label="Faculty" value="faculty" className={classes.tab} />
            <Tab label="Parent" value="parent" className={classes.tab} />
            <Tab label="Admin" value="admin" className={classes.tab} />
          </Tabs>
        </Box>

        {/* Email Not Verified Alert */}
        {emailNotVerified && (
          <Box className={classes.emailVerification}>
            <Alert severity="warning" style={{ marginBottom: 16 }}>
              Your email is not verified. Please check your inbox and verify your email before logging in.
            </Alert>
            <Button
              onClick={handleResendVerification}
              disabled={loading}
              variant="outlined"
              size="small"
              fullWidth
            >
              Resend Verification Email
            </Button>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {error}
          </Alert>
        )}

        {/* Email Login Form */}
        <form className={classes.form} onSubmit={handleEmailLogin}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={classes.textField}
            placeholder={currentConfig.placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              )}}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={classes.textField}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )}}
          />

          <FormControlLabel
            control={
              <Checkbox
                value={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label="Remember me"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            disabled={loading}
            style={{ backgroundColor: currentConfig.color }}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </form>

        {/* Alternative Login Methods for Parents */}
        {userType === 'parent' && (
          <>
            <Divider className={classes.divider}>
              <Typography variant="body2" color="textSecondary">
                OR
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              className={classes.authMethodButton}
              onClick={handlePhoneLogin}
            >
              Login with Phone Number (OTP)
            </Button>
          </>
        )}

        {/* Links */}
        <Box className={classes.links}>
          <Link
            href="#"
            onClick={handleForgotPassword}
            className={classes.link}
            component={LinkBehavior}
          >
            Forgot password?
          </Link>
          <Link
            href="/register"
            className={classes.link}
            component={LinkBehavior}
          >
            Need an account? Sign up
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

export default UnifiedEmailLogin;
