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
import { authFieldSx, authButtonSx, authErrorAlertSx } from '../components/auth/authStyles';
import { accents, ink } from '../theme/cinematic';

const ACCENT = 'teal';

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

  const a = accents[ACCENT];

  useEffect(() => {
    if (currentUser && userRole === 'parent') {
      navigateToDashboard(navigate, 'parent', { replace: true });
    }
  }, [navigate, currentUser, userRole]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOTP = async e => {
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

  const handleVerifyOTP = async e => {
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

  return (
    <LoginLayout
      title="Parent Portal"
      eyebrow="Parent"
      subtitle="Stay close to your child's school day with real-time progress and updates."
      icon={FamilyIcon}
      accent={ACCENT}
    >
      <Typography variant="h5" sx={{ color: ink.primary, mb: 0.5 }}>
        {step === 1 ? 'Sign in with OTP' : 'Verify OTP'}
      </Typography>
      <Typography variant="body2" sx={{ color: ink.tertiary, mb: 3 }}>
        {step === 1
          ? "We'll send a code to the phone linked to your ward's account"
          : `Enter the 6-digit code sent to ${phone}`}
      </Typography>

      {error && (
        <Fade in>
          <Alert severity="error" sx={authErrorAlertSx}>
            {error}
          </Alert>
        </Fade>
      )}

      {step === 1 && (
        <Box
          component="form"
          onSubmit={handleSendOTP}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            fullWidth
            label="Phone number"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            placeholder="e.g. 9876543210"
            autoComplete="tel"
            variant="outlined"
            sx={authFieldSx(ACCENT)}
            InputProps={{
              startAdornment: <PhoneIcon sx={{ color: ink.disabled, mr: 1, fontSize: 20 }} />,
            }}
          />
          <TextField
            fullWidth
            label="Student ID"
            type="text"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            required
            placeholder="e.g. STU001"
            variant="outlined"
            sx={authFieldSx(ACCENT)}
          />
          <Button type="submit" fullWidth disabled={loading || !phone || !studentId} sx={authButtonSx(ACCENT)}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} sx={{ color: 'white' }} />
                Sending code…
              </Box>
            ) : (
              'Send code'
            )}
          </Button>
        </Box>
      )}

      {step === 2 && (
        <Box
          component="form"
          onSubmit={handleVerifyOTP}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            fullWidth
            label="Enter OTP"
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="6-digit code"
            autoComplete="one-time-code"
            variant="outlined"
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            sx={authFieldSx(ACCENT)}
            InputProps={{
              startAdornment: <LockIcon sx={{ color: ink.disabled, mr: 1, fontSize: 20 }} />,
            }}
          />
          <Button type="submit" fullWidth disabled={loading || otp.length !== 6} sx={authButtonSx(ACCENT)}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} sx={{ color: 'white' }} />
                Verifying…
              </Box>
            ) : (
              'Verify & sign in'
            )}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Link
              component="button"
              type="button"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              sx={{
                color: resendCooldown > 0 ? ink.disabled : a.light,
                textDecoration: 'none',
                fontSize: '0.875rem',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                '&:hover': { textDecoration: resendCooldown > 0 ? 'none' : 'underline' },
              }}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </Link>
          </Box>
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component="button"
          type="button"
          onClick={() => navigate('/parent-login-email')}
          sx={{
            color: ink.tertiary,
            textDecoration: 'none',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'color 0.2s',
            '&:hover': { color: a.light },
          }}
        >
          Use email login instead
        </Link>
      </Box>
    </LoginLayout>
  );
}

export default ParentLogin;
