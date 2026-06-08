import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PeopleIcon, PersonAdd as AddIcon, SchoolIcon, Shield as SecurityIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import LinkBehavior from '../components/common/LinkBehavior';

import { Alert, Box, Button, CircularProgress, Container, FormControl, Grid, IconButton, InputAdornment, InputLabel, LinkItem, Paper, Select, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
  SupervisorAccount as SupervisorIcon

const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  PARENT: 'parent'
};

const ROLE_CONFIGS = {
  [ROLES.STUDENT]: {
    title: 'Student Registration',
    icon:,
    color: '#2196F3',
    description: 'Create your student account to access courses and assignments',
    additionalFields: ['rollNumber', 'classId', 'section']
  },
  [ROLES.FACULTY]: {
    title: 'Faculty Registration',
    icon: SupervisorIcon,
    color: '#4CAF50',
    description: 'Create your faculty account to manage courses and students',
    additionalFields: ['employeeId', 'department']
  },
  [ROLES.PARENT]: {
    title: 'Parent Registration',
    icon: PeopleIcon,
    color: '#FF9800',
    description: 'Create your parent account to monitor your child\'s progress',
    additionalFields: ['phoneNumber', 'studentId']
  }
};

const steps = ['Account Details', 'Additional Information', 'Verification'];

function UnifiedRegistration() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    // Basic info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Student specific
    rollNumber: '',
    classId: '',
    section: '',

    // Faculty specific
    employeeId: '',
    department: '',

    // Parent specific
    phoneNumber: '',
    studentId: ''
  });

  const { unifiedSignup, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (currentUser && userRole) {
      navigate(`/${userRole}-dashboard`, { replace: true });
    }
  }, [currentUser, userRole, navigate]);

  const validateStep = (step) => {
    setError('');

    switch (step) {
      case 0: // Account Details
        if (!selectedRole) {
          setError('Please select your role');
          return false;
        }
        if (!formData.firstName.trim()) {
          setError('First name is required');
          return false;
        }
        if (!formData.lastName.trim()) {
          setError('Last name is required');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email is required');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (!formData.password) {
          setError('Password is required');
          return false;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;

      case 1: // Additional Information
        if (selectedRole === ROLES.STUDENT) {
          if (!formData.rollNumber.trim()) {
            setError('Roll number is required');
            return false;
          }
          if (!formData.classId.trim()) {
            setError('Class is required');
            return false;
          }
          if (!formData.section.trim()) {
            setError('Section is required');
            return false;
          }
        } else if (selectedRole === ROLES.FACULTY) {
          if (!formData.employeeId.trim()) {
            setError('Employee ID is required');
            return false;
          }
          if (!formData.department.trim()) {
            setError('Department is required');
            return false;
          }
        } else if (selectedRole === ROLES.PARENT) {
          if (!formData.phoneNumber.trim()) {
            setError('Phone number is required');
            return false;
          }
          if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
            setError('Please enter a valid 10-digit phone number');
            return false;
          }
          if (!formData.studentId.trim()) {
            setError('Student ID is required');
            return false;
          }
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    setLoading(true);
    setError('');

    try {
      const displayName = `${formData.firstName} ${formData.lastName}`;

      // Prepare role-specific data
      const roleData = {};
      if (selectedRole === ROLES.STUDENT) {
        roleData.rollNumber = formData.rollNumber;
        roleData.classId = formData.classId;
        roleData.section = formData.section;
      } else if (selectedRole === ROLES.FACULTY) {
        roleData.employeeId = formData.employeeId;
        roleData.department = formData.department;
      } else if (selectedRole === ROLES.PARENT) {
        roleData.phoneNumber = formData.phoneNumber;
        roleData.studentId = formData.studentId;
      }

      await unifiedSignup(
        formData.email,
        formData.password,
        selectedRole,
        displayName,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          ...roleData
        }
      );

      setSuccess('Account created successfully! Please check your email for verification.');
      setActiveStep(2);

      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>I am registering as a</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="I am registering as a"
              >
                <MenuItem value={ROLES.STUDENT}>
                  <Box display="flex" alignItems="center">
                    <SchoolIcon sx={{ mr: 1, color: '#2196F3' }} />
                    Student
                  </Box>
                </MenuItem>
                <MenuItem value={ROLES.FACULTY}>
                  <Box display="flex" alignItems="center">
                    <SupervisorIcon sx={{ mr: 1, color: '#4CAF50' }} />
                    Faculty
                  </Box>
                </MenuItem>
                <MenuItem value={ROLES.PARENT}>
                  <Box display="flex" alignItems="center">
                    <PeopleIcon sx={{ mr: 1, color: '#FF9800' }} />
                    Parent
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {selectedRole && (
              <Alert severity="info" sx={{ my: 2 }}>
                {ROLE_CONFIGS[selectedRole].description}
              </Alert>
            )}            <Grid container spacing={2}>
              <Grid size={{xs:12,sm:6}}>
                <TextField
                  label="First Name"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                />
              </Grid>
              <Grid size={{xs:12,sm:6}}>
                <TextField
                  label="Last Name"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                />
              </Grid>
            </Grid>

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              margin="normal"
              required
              value={formData.email}
              onChange={handleInputChange('email')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                )}}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              required
              value={formData.password}
              onChange={handleInputChange('password')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )}}
              helperText="Password must be at least 6 characters long"
            />

            <TextField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )}}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            {selectedRole === ROLES.STUDENT && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Student Information
                </Typography>
                <TextField
                  label="Roll Number"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.rollNumber}
                  onChange={handleInputChange('rollNumber')}
                />
                <Grid container spacing={2}>
                  <Grid size={{xs:12,sm:6}}>
                    <TextField
                      label="Class"
                      fullWidth
                      margin="normal"
                      required
                      value={formData.classId}
                      onChange={handleInputChange('classId')}
                      placeholder="e.g., 10th, 12th, B.Tech"
                    />                  </Grid>
                  <Grid size={{xs:12,sm:6}}>
                    <TextField
                      label="Section"
                      fullWidth
                      margin="normal"
                      required
                      value={formData.section}
                      onChange={handleInputChange('section')}
                      placeholder="e.g., A, B, C"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {selectedRole === ROLES.FACULTY && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Faculty Information
                </Typography>
                <TextField
                  label="Employee ID"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.employeeId}
                  onChange={handleInputChange('employeeId')}
                />
                <TextField
                  label="Department"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.department}
                  onChange={handleInputChange('department')}
                  placeholder="e.g., Computer Science, Mathematics"
                />
              </Box>
            )}

            {selectedRole === ROLES.PARENT && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Parent Information
                </Typography>
                <TextField
                  label="Phone Number"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.phoneNumber}
                  onChange={handleInputChange('phoneNumber')}
                  placeholder="10-digit phone number"
                />
                <TextField
                  label="Student ID"
                  fullWidth
                  margin="normal"
                  required
                  value={formData.studentId}
                  onChange={handleInputChange('studentId')}
                  placeholder="Your child's student ID"
                  helperText="You can get this from your child or the school administration"
                />
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box textAlign="center">
            <AddIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Registration Successful!
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Your account has been created successfully. A verification email has been sent to{' '}
              <strong>{formData.email}</strong>.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Please check your email and click the verification link to activate your account.
              You will be redirected to the login page shortly.
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  const roleConfig = selectedRole ? ROLE_CONFIGS[selectedRole] : null;

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box textAlign="center" mb={4}>
            {roleConfig && (
              <roleConfig.icon sx={{ fontSize: 48, color: roleConfig.color, mb: 2 }} />
            )}
            <Typography variant="h4" gutterBottom>
              {roleConfig ? roleConfig.title : 'Create Your Account'}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Join our educational platform
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {getCurrentStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Typography variant="body2" color="textSecondary">
                Redirecting to login...
              </Typography>
            ) : (
              <Button
                variant="contained"
                onClick={activeStep === steps.length - 2 ? handleSubmit : handleNext}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : activeStep === steps.length - 2 ? (
                  'Create Account'
                ) : (
                  'Next'
                )}
              </Button>
            )}
          </Box>

          <Box textAlign="center" mt={3}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component={LinkBehavior} to="/login" underline="hover">
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default UnifiedRegistration;
