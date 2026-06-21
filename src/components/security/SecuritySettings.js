// filepath: c:\Users\AYUSHMAN NANDA\OneDrive\Desktop\GDC\src\components\security\SecuritySettings.js
import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountCircle,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Devices as DevicesIcon,
  Email as EmailIcon,
  Fingerprint as FingerprintIcon,
  Language as LanguageIcon,
  Laptop as LaptopIcon,
  Lock as LockIcon,
  NetworkCheck as NetworkIcon,
  Notifications as NotificationsIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  Settings,
  Shield as SecurityIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(3),
  },
  tabContent: {
    padding: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
  },
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: 200,
  },
  listItem: {
    marginBottom: theme.spacing(1),
  },
  deviceListItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
  },
  actionButton: {
    marginLeft: theme.spacing(1),
  },
  deviceIcon: {
    fontSize: '2rem',
  },
}));

function SecuritySettings({ onSettingsUpdate = () => {} }) {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);

  // Mock user data
  const [settings, setSettings] = useState({
    mfaEnabled: true,
    mfaType: 'app', // app, sms, email
    emailNotifications: true,
    smsNotifications: false,
    sessionDuration: 60, // minutes
    passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    devices: [
      {
        id: 1,
        name: 'Chrome on Windows 10',
        lastActive: new Date(),
        isCurrent: true,
        type: 'browser',
        status: 'active',
        location: 'New York, US',
      },
      {
        id: 2,
        name: 'iPhone 12',
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isCurrent: false,
        type: 'mobile',
        status: 'active',
        location: 'Boston, US',
      },
      {
        id: 3,
        name: 'Firefox on MacBook',
        lastActive: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        isCurrent: false,
        type: 'browser',
        status: 'inactive',
        location: 'San Francisco, US',
      },
    ],
    privacySettings: {
      dataCollection: 'minimal',
      shareAnalytics: false,
      cookiePreference: 'essential',
    },
    advancedSettings: {
      ipWhitelist: '',
      autoLogout: true,
      strictModeEnabled: false,
    },
  });

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    // Notify parent component
    onSettingsUpdate({ section, field, value });
  };

  const handleSwitchChange = (field, event) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));

    // Notify parent component
    onSettingsUpdate({ field, value: event.target.checked });
  };

  const handleRevokeDevice = deviceId => {
    setSettings(prev => ({
      ...prev,
      devices: prev.devices.map(device =>
        device.id === deviceId ? { ...device, status: 'revoked' } : device
      ),
    }));

    // Notify parent component
    onSettingsUpdate({ field: 'revokeDevice', value: deviceId });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatDate = date => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box className={classes.container}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        aria-label="security settings tabs"
      >
        <Tab icon={<SecurityIcon />} label="Authentication" />
        <Tab icon={<DevicesIcon />} label="Devices" />
        <Tab icon={<NotificationsIcon />} label="Notifications" />
        <Tab icon={<LanguageIcon />} label="Privacy" />
        <Tab icon={<LockIcon />} label="Advanced" />
      </Tabs>

      {/* Authentication Tab */}
      {tabValue === 0 && (
        <Box className={classes.tabContent}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Multi-Factor Authentication (MFA)
            </Typography>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.mfaEnabled}
                    onChange={e => handleSwitchChange('mfaEnabled', e)}
                    color="primary"
                  />
                }
                label="Enable Multi-Factor Authentication"
              />
            </FormGroup>

            {settings.mfaEnabled && (
              <FormControl variant="outlined" className={classes.formControl}>
                <TextField
                  select
                  label="MFA Method"
                  value={settings.mfaType}
                  onChange={e => setSettings({ ...settings, mfaType: e.target.value })}
                  variant="outlined"
                  fullWidth
                >
                  <MenuItem value="app">Authenticator App</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </TextField>
              </FormControl>
            )}
          </Box>

          <Divider />

          <Box className={classes.section} mt={3}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Password Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" gutterBottom>
                  Last password change: {formatDate(settings.passwordLastChanged)}
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<VpnKeyIcon />}
                  style={{ marginTop: 16 }}
                >
                  Change Password
                </Button>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl variant="outlined" className={classes.formControl}>
                  <TextField
                    type="number"
                    label="Session Duration (minutes)"
                    value={settings.sessionDuration}
                    onChange={e =>
                      setSettings({ ...settings, sessionDuration: parseInt(e.target.value) })
                    }
                    variant="outlined"
                    InputProps={{ inputProps: { min: 5, max: 1440 } }}
                    fullWidth
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      {/* Devices Tab */}
      {tabValue === 1 && (
        <Box className={classes.tabContent}>
          <Typography variant="h6" className={classes.sectionTitle}>
            Connected Devices
          </Typography>

          <List>
            {settings.devices.map(device => (
              <Paper key={device.id} className={classes.deviceListItem}>
                <ListItem>
                  <ListItemIcon>
                    {device.type === 'mobile' ? (
                      <PhoneIcon className={classes.deviceIcon} />
                    ) : (
                      <LaptopIcon className={classes.deviceIcon} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <>
                        {device.name}
                        {device.isCurrent && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="primary"
                            style={{ marginLeft: 8 }}
                          >
                            (Current)
                          </Typography>
                        )}
                      </>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          Last active: {formatDate(device.lastActive)}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Location: {device.location}
                        </Typography>
                        <Typography
                          component="span"
                          variant="body2"
                          color={device.status === 'active' ? 'primary' : 'textSecondary'}
                          style={{ marginLeft: 8 }}
                        >
                          Status: {device.status}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!device.isCurrent && device.status === 'active' && (
                      <IconButton
                        edge="end"
                        aria-label="revoke"
                        onClick={() => handleRevokeDevice(device.id)}
                      >
                        <BlockIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        </Box>
      )}

      {/* Notifications Tab */}
      {tabValue === 2 && (
        <Box className={classes.tabContent}>
          <Typography variant="h6" className={classes.sectionTitle}>
            Security Notifications
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={e => handleSwitchChange('emailNotifications', e)}
                  color="primary"
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.smsNotifications}
                  onChange={e => handleSwitchChange('smsNotifications', e)}
                  color="primary"
                />
              }
              label="SMS Notifications"
            />
          </FormGroup>

          <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
            You'll be notified about suspicious login attempts, password changes, and security
            alerts.
          </Typography>
        </Box>
      )}

      {/* Privacy Tab */}
      {tabValue === 3 && (
        <Box className={classes.tabContent}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Privacy Settings
            </Typography>

            <FormControl variant="outlined" className={classes.formControl} fullWidth>
              <TextField
                select
                label="Data Collection"
                value={settings.privacySettings.dataCollection}
                onChange={e => handleChange('privacySettings', 'dataCollection', e.target.value)}
                variant="outlined"
                helperText="Choose how much data we collect to improve your experience"
              >
                <MenuItem value="minimal">Minimal (Required Only)</MenuItem>
                <MenuItem value="balanced">Balanced (Recommended)</MenuItem>
                <MenuItem value="full">Full (Help Improve Features)</MenuItem>
              </TextField>
            </FormControl>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.privacySettings.shareAnalytics}
                    onChange={e =>
                      handleChange('privacySettings', 'shareAnalytics', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Share Anonymous Analytics"
              />
            </FormGroup>

            <FormControl
              variant="outlined"
              className={classes.formControl}
              fullWidth
              style={{ marginTop: 16 }}
            >
              <TextField
                select
                label="Cookie Preference"
                value={settings.privacySettings.cookiePreference}
                onChange={e => handleChange('privacySettings', 'cookiePreference', e.target.value)}
                variant="outlined"
              >
                <MenuItem value="essential">Essential Only</MenuItem>
                <MenuItem value="functional">Functional</MenuItem>
                <MenuItem value="all">All Cookies</MenuItem>
              </TextField>
            </FormControl>
          </Box>

          <Box mt={3}>
            <Button variant="outlined" color="secondary" startIcon={<DeleteIcon />}>
              Request Data Deletion
            </Button>
          </Box>
        </Box>
      )}

      {/* Advanced Tab */}
      {tabValue === 4 && (
        <Box className={classes.tabContent}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Advanced Security Settings
            </Typography>

            <FormControl variant="outlined" className={classes.formControl} fullWidth>
              <TextField
                label="IP Whitelist (Comma Separated)"
                value={settings.advancedSettings.ipWhitelist}
                onChange={e => handleChange('advancedSettings', 'ipWhitelist', e.target.value)}
                variant="outlined"
                helperText="Only allow logins from these IP addresses (leave empty to allow all)"
              />
            </FormControl>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advancedSettings.autoLogout}
                    onChange={e => handleChange('advancedSettings', 'autoLogout', e.target.checked)}
                    color="primary"
                  />
                }
                label="Auto-logout on browser close"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advancedSettings.strictModeEnabled}
                    onChange={e =>
                      handleChange('advancedSettings', 'strictModeEnabled', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Enable strict security mode (may impact usability)"
              />
            </FormGroup>
          </Box>

          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSettingsUpdate({ action: 'save' })}
              startIcon={<SaveIcon />}
            >
              Save Advanced Settings
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default SecuritySettings;
