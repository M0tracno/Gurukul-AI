import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Fade,
  Link,
} from '@mui/material';
import {
  FamilyRestroom as FamilyIcon,
  PhoneAndroid as PhoneIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { navigateToDashboard } from '../utils/navigationHelpers';
import LoginLayout from '../components/auth/LoginLayout';

function ParentLogin() {
  const navigate = useNavigate();
  const { sendParentOTP, verifyParentOTP, currentUser, userRole } = useAuth();

  const [step, setStep] = useState(1); // 1 = phone entry, 2 = OTP verification
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const accentColor = '#34d399';

  useEffect(() => {
    if (currentUser && userRole === 'parent') {
      navigateToDashboard(navigate, 'parent', { replace: true });
    }
  }, [navigate, currentUser, userRole]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!phone || !studentId) {
      setError('Please enter both phone number and student ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await sendParentOTP(phone, studentId);
      setOtpId(result?.otpId || result?.requestId || '');
      setStep(2);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyParentOTP(phone, otp, otpId);
      navigateToDashboard(navigate, 'parent', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const result = await sendParentOTP(phone, studentId);
      setOtpId(result?.otpId || result?.requestId || '');
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.03)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
      '&:hover fieldset': { borderColor: `${accentColor}60` },
      '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '1.5px' },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.4)',
      '&.Mui-focused': { color: accentColor },
    },
    '& .MuiOutlinedInput-input': { color: 'rgba(255, 255, 255, 0.9)' },
  };

  const buttonSx = {
    mt: 1,
    py: 1.5,
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '1rem',
    textTransform: 'none',
    background: `linear-gradient(135deg, ${accentColor} 0%, #059669 100%)`,
    color: '#ffffff',
    boxShadow: `0 4px 20px ${accentColor}30`,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: `0 8px 30px ${accentColor}40`,
      background: `linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)`,
    },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.06)',
      color: 'rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
    },
  };

  return (
    <LoginLayout
      title="Parent Portal"
      subtitle="Stay connected with your child's academic progress and receive real-time insights."
      icon={FamilyIcon}
      color={accentColor}
      backLink="/"
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)', mb: 0.5 }}
      >
        {step === 1 ? 'Sign In with OTP' : 'Verify OTP'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 3 }}>
        {step === 1
          ? 'OTP will be sent to the phone number linked to your ward\'s account'
          : `Enter the 6-digit code sent to ${phone}`}
      </Typography>

      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              '& .MuiAlert-icon': { color: '#f87171' },
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Step 1: Phone + Student ID */}
      {step === 1 && (
        <Box component="form" onSubmit={handleSendOTP} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="e.g. 9876543210"
            autoComplete="tel"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <PhoneIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1, fontSize: 20 }} />
              ),
            }}
            sx={inputSx}
          />

          <TextField
            fullWidth
            label="Student ID"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            placeholder="e.g. STU001"
            variant="outlined"
            sx={inputSx}
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading || !phone || !studentId}
            sx={buttonSx}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} sx={{ color: 'white' }} />
                Sending OTP...
              </Box>
            ) : (
              'Send OTP'
            )}
          </Button>
        </Box>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <Box component="form" onSubmit={handleVerifyOTP} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Enter OTP"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="6-digit OTP"
            autoComplete="one-time-code"
            variant="outlined"
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            InputProps={{
              startAdornment: (
                <LockIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1, fontSize: 20 }} />
              ),
            }}
            sx={inputSx}
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading || otp.length !== 6}
            sx={buttonSx}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} sx={{ color: 'white' }} />
                Verifying...
              </Box>
            ) : (
              'Verify & Sign In'
            )}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Link
              component="button"
              type="button"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              sx={{
                color: resendCooldown > 0 ? 'rgba(255,255,255,0.25)' : accentColor,
                textDecoration: 'none',
                fontSize: '0.875rem',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                '&:hover': {
                  textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                },
              }}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </Link>
          </Box>
        </Box>
      )}

      {/* Back to email login fallback */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component="button"
          type="button"
          onClick={() => navigate('/parent-login-email')}
          sx={{
            color: 'rgba(255, 255, 255, 0.4)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'color 0.2s',
            '&:hover': { color: accentColor },
          }}
        >
          Back to email login
        </Link>
      </Box>
    </LoginLayout>
  );
}

export default ParentLogin;
