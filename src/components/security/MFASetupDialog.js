import React, { useState, useEffect } from 'react';
import makeStyles from '../../utils/makeStylesCompat';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
} from '@mui/material';
import {
  Shield as SecurityIcon,
  PhoneAndroid as PhoneIcon,
  Email as EmailIcon,
  Fingerprint as FingerprintIcon,
  VpnKey as KeyIcon,
  QrCode as QrCodeIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

/**
 * Multi-Factor Authentication Setup Dialog
 *
 * Provides a comprehensive interface for setting up various MFA methods
 * including TOTP, SMS, Email, Biometric, and Hardware Key authentication
 */

const useStyles = makeStyles(theme => ({
  dialog: {
    '& .MuiDialog-paper': {
      minWidth: 700,
      maxWidth: 900,
      minHeight: 600,
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(2),
  },
  mfaMethodCard: {
    height: '100%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: `2px solid transparent`,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
      borderColor: theme.palette.primary.main,
    },
  },
  selectedMethod: {
    borderColor: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.main}10`,
  },
  methodIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  methodTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  methodDescription: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  securityLevel: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  securityChip: {
    fontSize: '0.75rem',
    height: 24,
  },
  highSecurity: {
    backgroundColor: theme.palette.success.main,
    color: 'white',
  },
  mediumSecurity: {
    backgroundColor: theme.palette.warning.main,
    color: 'white',
  },
  lowSecurity: {
    backgroundColor: theme.palette.error.main,
    color: 'white',
  },
  qrCodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  qrCode: {
    border: `4px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  secretKey: {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    wordBreak: 'break-all',
    fontSize: '0.875rem',
  },
  verificationCode: {
    textAlign: 'center',
    '& input': {
      textAlign: 'center',
      fontSize: '1.5rem',
      letterSpacing: '0.5rem',
    },
  },
  backupCodes: {
    backgroundColor: theme.palette.warning.light,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
  },
  backupCode: {
    fontFamily: 'monospace',
    fontSize: '1rem',
    fontWeight: 600,
    margin: theme.spacing(0.5, 0),
  },
  biometricSetup: {
    textAlign: 'center',
    padding: theme.spacing(4),
  },
  fingerprintAnimation: {
    animation: '$pulse 2s infinite',
    color: theme.palette.primary.main,
    fontSize: 80,
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.7,
      transform: 'scale(1.1)',
    },
    '100%': {
      opacity: 1,
      transform: 'scale(1)',
    },
  },
  statusIcon: {
    marginRight: theme.spacing(1),
  },
  enabledMethod: {
    backgroundColor: `${theme.palette.success.main}10`,
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
  actionButton: {
    minWidth: 'auto',
  },
  stepperContent: {
    paddingTop: theme.spacing(2),
  },
}));

const MFASetupDialog = ({ open, onClose, onMFASetup }) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [enabledMethods, setEnabledMethods] = useState([]);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hardwareKeySupported, setHardwareKeySupported] = useState(false);

  const mfaMethods = [
    {
      id: 'totp',
      title: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or similar apps',
      icon: <SecurityIcon className={classes.methodIcon} />,
      securityLevel: 'high',
      supported: true,
    },
    {
      id: 'sms',
      title: 'SMS Text Message',
      description: 'Receive codes via text message',
      icon: <PhoneIcon className={classes.methodIcon} />,
      securityLevel: 'medium',
      supported: true,
    },
    {
      id: 'email',
      title: 'Email Verification',
      description: 'Receive codes via email',
      icon: <EmailIcon className={classes.methodIcon} />,
      securityLevel: 'medium',
      supported: true,
    },
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      description: 'Use fingerprint, face, or voice recognition',
      icon: <FingerprintIcon className={classes.methodIcon} />,
      securityLevel: 'high',
      supported: biometricSupported,
    },
    {
      id: 'hardware',
      title: 'Hardware Security Key',
      description: 'Use YubiKey or similar hardware tokens',
      icon: <KeyIcon className={classes.methodIcon} />,
      securityLevel: 'high',
      supported: hardwareKeySupported,
    },
  ];

  useEffect(() => {
    // Check for biometric and hardware key support
    if (window.PublicKeyCredential) {
      setBiometricSupported(true);
      setHardwareKeySupported(true);
    }
  }, []);

  const handleMethodSelect = method => {
    setSelectedMethod(method);
    setActiveStep(1);
  };

  const handleSetupTOTP = async () => {
    setLoading(true);
    try {
      // Generate QR code and secret key for TOTP setup
      const response = await fetch('/api/auth/mfa/setup-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      setQrCodeUrl(data.qrCodeUrl);
      setSecretKey(data.secretKey);
      setActiveStep(2);
    } catch (error) {
      console.error('Error setting up TOTP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod.id,
          code: verificationCode,
          phoneNumber: selectedMethod.id === 'sms' ? phoneNumber : undefined,
          email: selectedMethod.id === 'email' ? emailAddress : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes || []);
        setEnabledMethods([...enabledMethods, selectedMethod.id]);
        setActiveStep(3);

        if (onMFASetup) {
          onMFASetup(selectedMethod.id, data);
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'GDC Educational System' },
          user: {
            id: new Uint8Array(16),
            name: 'user@example.com',
            displayName: 'User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
        },
      });

      if (credential) {
        setEnabledMethods([...enabledMethods, 'biometric']);
        setActiveStep(3);
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = text => {
    navigator.clipboard.writeText(text);
  };

  const getSecurityLevelColor = level => {
    switch (level) {
      case 'high':
        return classes.highSecurity;
      case 'medium':
        return classes.mediumSecurity;
      case 'low':
        return classes.lowSecurity;
      default:
        return '';
    }
  };

  const renderMethodSelection = () => (
    <Grid container spacing={3}>
      {mfaMethods
        .filter(method => method.supported)
        .map(method => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={method.id}>
            <Card
              className={`${classes.mfaMethodCard} ${
                selectedMethod?.id === method.id ? classes.selectedMethod : ''
              }`}
            >
              <CardActionArea onClick={() => handleMethodSelect(method)}>
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                    {method.icon}
                    <Typography variant="h6" className={classes.methodTitle}>
                      {method.title}
                    </Typography>
                    <Typography className={classes.methodDescription}>
                      {method.description}
                    </Typography>
                    <Box className={classes.securityLevel}>
                      <Chip
                        label={`${method.securityLevel.toUpperCase()} SECURITY`}
                        size="small"
                        className={`${classes.securityChip} ${getSecurityLevelColor(method.securityLevel)}`}
                      />
                    </Box>
                    {enabledMethods.includes(method.id) && (
                      <CheckIcon color="success" style={{ marginTop: 8 }} />
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
    </Grid>
  );

  const renderTOTPSetup = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Setup Authenticator App
      </Typography>
      <Typography color="textSecondary" paragraph>
        Scan the QR code with your authenticator app or manually enter the secret key.
      </Typography>

      <Box className={classes.qrCodeContainer}>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code" className={classes.qrCode} width={200} height={200} />
        ) : (
          <CircularProgress />
        )}

        <Typography variant="body2" gutterBottom>
          Or enter this key manually:
        </Typography>
        <Box display="flex" alignItems="center" width="100%">
          <Box className={classes.secretKey} flex={1}>
            {secretKey}
          </Box>
          <IconButton onClick={() => copyToClipboard(secretKey)} size="small">
            <CopyIcon />
          </IconButton>
        </Box>
      </Box>

      <TextField
        fullWidth
        label="Verification Code"
        placeholder="Enter 6-digit code"
        value={verificationCode}
        onChange={e => setVerificationCode(e.target.value)}
        className={classes.verificationCode}
        inputProps={{ maxLength: 6 }}
        margin="normal"
      />

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleVerifyCode}
          disabled={verificationCode.length !== 6 || loading}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Verify and Enable'}
        </Button>
      </Box>
    </Box>
  );

  const renderSMSSetup = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Setup SMS Authentication
      </Typography>
      <TextField
        fullWidth
        label="Phone Number"
        placeholder="+1 (555) 123-4567"
        value={phoneNumber}
        onChange={e => setPhoneNumber(e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Verification Code"
        placeholder="Enter code sent to your phone"
        value={verificationCode}
        onChange={e => setVerificationCode(e.target.value)}
        className={classes.verificationCode}
        margin="normal"
      />
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleVerifyCode} fullWidth>
          Verify Phone Number
        </Button>
      </Box>
    </Box>
  );

  const renderBiometricSetup = () => (
    <Box className={classes.biometricSetup}>
      <FingerprintIcon className={classes.fingerprintAnimation} />
      <Typography variant="h6" gutterBottom>
        Setup Biometric Authentication
      </Typography>
      <Typography color="textSecondary" paragraph>
        Click the button below and follow your device's prompts to register your biometric data.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleBiometricSetup}
        disabled={loading}
        size="large"
      >
        {loading ? <CircularProgress size={24} /> : 'Setup Biometric'}
      </Button>
    </Box>
  );
  const renderSuccess = () => (
    <Box textAlign="center">
      <CheckIcon style={{ fontSize: 80, color: 'green', marginBottom: 16 }} />
      <Typography variant="h6" gutterBottom>
        {selectedMethod?.title} Enabled Successfully!
      </Typography>
      <Typography color="textSecondary" paragraph>
        Your account is now more secure with multi-factor authentication.
      </Typography>

      {backupCodes.length > 0 && (
        <Paper className={classes.backupCodes}>
          <Typography variant="subtitle1" gutterBottom>
            <WarningIcon className={classes.statusIcon} />
            Save These Backup Codes
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Store these codes safely. You can use them to access your account if you lose your
            device.
          </Typography>
          {backupCodes.map((code, index) => (
            <Typography key={index} className={classes.backupCode}>
              {code}
            </Typography>
          ))}
          <Button
            variant="outlined"
            size="small"
            startIcon={<CopyIcon />}
            onClick={() => copyToClipboard(backupCodes.join('\n'))}
            style={{ marginTop: 16 }}
          >
            Copy All Codes
          </Button>
        </Paper>
      )}
    </Box>
  );

  const renderStepContent = step => {
    switch (step) {
      case 0:
        return renderMethodSelection();
      case 1:
        if (selectedMethod?.id === 'totp') {
          return renderTOTPSetup();
        } else if (selectedMethod?.id === 'biometric') {
          return renderBiometricSetup();
        } else if (selectedMethod?.id === 'sms') {
          return renderSMSSetup();
        }
        return <div>Setup for {selectedMethod?.title}</div>;
      case 2:
        return renderSuccess();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className={classes.dialog} maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        <Box display="flex" alignItems="center">
          <SecurityIcon style={{ marginRight: 8 }} />
          Multi-Factor Authentication Setup
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box className={classes.stepperContent}>{renderStepContent(activeStep)}</Box>
      </DialogContent>

      <DialogActions>
        {activeStep > 0 && <Button onClick={() => setActiveStep(activeStep - 1)}>Back</Button>}
        {activeStep === 2 && (
          <Button variant="contained" color="primary" onClick={onClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MFASetupDialog;
