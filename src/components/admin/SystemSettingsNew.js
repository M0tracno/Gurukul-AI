import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
  Update as UpdateIcon,
  Bug as BugIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import AdminService from '../../services/adminService';

import { toLocaleString } from '@mui/material';
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'linear-gradient(135deg, #E5484D 0%, #B4282E 100%)',
  color: 'white',
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
  },
}));

const SettingCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiCardHeader-root': {
    backgroundColor: theme.palette.grey[50],
  },
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SystemSettingsNew = () => {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  const [settings, setSettings] = useState({
    general: {
      siteName: 'Global Digital Campus',
      siteDescription: 'Advanced Learning Management System',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      allowRegistration: true,
      requireEmailVerification: true,
      maintenanceMode: false,
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireNumbers: true,
        requireSymbols: true,
        requireUppercase: true,
        requireLowercase: true,
      },
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      twoFactorAuth: false,
      ipRestriction: false,
      allowedIPs: '',
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      digestFrequency: 'daily',
      notifyAdminLogin: true,
      notifyUserRegistration: true,
      notifySystemErrors: true,
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpEncryption: 'tls',
      fromEmail: 'admin@gdc.edu',
      fromName: 'GDC Admin',
      testEmailSent: false,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      backupLocation: 'cloud',
      lastBackup: new Date().toISOString(),
    },
    system: {
      debugMode: false,
      logLevel: 'info',
      cacheEnabled: true,
      compressionEnabled: true,
      maxFileSize: 50,
      allowedFileTypes: 'pdf,doc,docx,ppt,pptx,jpg,jpeg,png,gif',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Mock loading settings from API
      // const response = await AdminService.getSystemSettings();
      // setSettings(response.data);

      // For now, use default settings above
      console.log('Settings loaded');
    } catch (error) {
      console.error('Error loading settings:', error);
      showSnackbar('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section = null) => {
    setLoading(true);
    try {
      // Mock saving settings to API
      // await AdminService.updateSystemSettings(section ? { [section]: settings[section] } : settings);

      showSnackbar('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showSnackbar('Error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleNestedSettingChange = (section, parentKey, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentKey]: {
          ...prev[section][parentKey],
          [key]: value,
        },
      },
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const showConfirmDialog = (title, message, action) => {
    setConfirmDialog({ open: true, title, message, action });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action) {
      confirmDialog.action();
    }
    setConfirmDialog({ open: false, title: '', message: '', action: null });
  };

  const testEmailConfiguration = async () => {
    setLoading(true);
    try {
      // Mock email test
      await new Promise(resolve => setTimeout(resolve, 2000));
      handleSettingChange('email', 'testEmailSent', true);
      showSnackbar('Test email sent successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to send test email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const performBackup = async () => {
    setLoading(true);
    try {
      // Mock backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      handleSettingChange('backup', 'lastBackup', new Date().toISOString());
      showSnackbar('Backup completed successfully', 'success');
    } catch (error) {
      showSnackbar('Backup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    showConfirmDialog(
      'Clear System Cache',
      'This will clear all cached data. The system may be slower until the cache is rebuilt. Continue?',
      async () => {
        setLoading(true);
        try {
          // Mock cache clearing
          await new Promise(resolve => setTimeout(resolve, 2000));
          showSnackbar('Cache cleared successfully', 'success');
        } catch (error) {
          showSnackbar('Failed to clear cache', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
          System Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => saveSettings()}
          disabled={loading}
          sx={{
            background: 'linear-gradient(45deg, #E5484D 30%, #B4282E 90%)',
          }}
        >
          Save All Settings
        </Button>
      </Box>

      {/* Settings Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<SettingsIcon />} label="General" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<EmailIcon />} label="Email" />
          <Tab icon={<BackupIcon />} label="Backup" />
          <Tab icon={<StorageIcon />} label="System" />
        </Tabs>

        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Site Configuration" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Site Name"
                    value={settings.general.siteName}
                    onChange={e => handleSettingChange('general', 'siteName', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Site Description"
                    value={settings.general.siteDescription}
                    onChange={e =>
                      handleSettingChange('general', 'siteDescription', e.target.value)
                    }
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={settings.general.language}
                      label="Language"
                      onChange={e => handleSettingChange('general', 'language', e.target.value)}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="de">German</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={settings.general.timezone}
                      label="Timezone"
                      onChange={e => handleSettingChange('general', 'timezone', e.target.value)}
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="EST">Eastern Standard Time</MenuItem>
                      <MenuItem value="PST">Pacific Standard Time</MenuItem>
                      <MenuItem value="GMT">Greenwich Mean Time</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="User Registration" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.allowRegistration}
                        onChange={e =>
                          handleSettingChange('general', 'allowRegistration', e.target.checked)
                        }
                      />
                    }
                    label="Allow User Registration"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.requireEmailVerification}
                        onChange={e =>
                          handleSettingChange(
                            'general',
                            'requireEmailVerification',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Require Email Verification"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.maintenanceMode}
                        onChange={e =>
                          handleSettingChange('general', 'maintenanceMode', e.target.checked)
                        }
                      />
                    }
                    label="Maintenance Mode"
                    sx={{ mb: 1 }}
                  />
                  {settings.general.maintenanceMode && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Maintenance mode is enabled. Only administrators can access the site.
                    </Alert>
                  )}
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Password Policy" />
                <CardContent>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Password Length"
                    value={settings.security.passwordPolicy.minLength}
                    onChange={e =>
                      handleNestedSettingChange(
                        'security',
                        'passwordPolicy',
                        'minLength',
                        parseInt(e.target.value)
                      )
                    }
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.passwordPolicy.requireNumbers}
                        onChange={e =>
                          handleNestedSettingChange(
                            'security',
                            'passwordPolicy',
                            'requireNumbers',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Require Numbers"
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.passwordPolicy.requireSymbols}
                        onChange={e =>
                          handleNestedSettingChange(
                            'security',
                            'passwordPolicy',
                            'requireSymbols',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Require Symbols"
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.passwordPolicy.requireUppercase}
                        onChange={e =>
                          handleNestedSettingChange(
                            'security',
                            'passwordPolicy',
                            'requireUppercase',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Require Uppercase"
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.passwordPolicy.requireLowercase}
                        onChange={e =>
                          handleNestedSettingChange(
                            'security',
                            'passwordPolicy',
                            'requireLowercase',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Require Lowercase"
                  />
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Session & Login Security" />
                <CardContent>
                  <TextField
                    fullWidth
                    type="number"
                    label="Session Timeout (minutes)"
                    value={settings.security.sessionTimeout}
                    onChange={e =>
                      handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Login Attempts"
                    value={settings.security.maxLoginAttempts}
                    onChange={e =>
                      handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Lockout Duration (minutes)"
                    value={settings.security.lockoutDuration}
                    onChange={e =>
                      handleSettingChange('security', 'lockoutDuration', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.twoFactorAuth}
                        onChange={e =>
                          handleSettingChange('security', 'twoFactorAuth', e.target.checked)
                        }
                      />
                    }
                    label="Enable Two-Factor Authentication"
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.ipRestriction}
                        onChange={e =>
                          handleSettingChange('security', 'ipRestriction', e.target.checked)
                        }
                      />
                    }
                    label="Enable IP Restriction"
                  />
                  {settings.security.ipRestriction && (
                    <TextField
                      fullWidth
                      label="Allowed IP Addresses (comma separated)"
                      value={settings.security.allowedIPs}
                      onChange={e => handleSettingChange('security', 'allowedIPs', e.target.value)}
                      sx={{ mt: 2 }}
                      placeholder="192.168.1.1, 10.0.0.1"
                    />
                  )}
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Settings */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Notification Channels" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.emailNotifications}
                        onChange={e =>
                          handleSettingChange(
                            'notifications',
                            'emailNotifications',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Email Notifications"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.pushNotifications}
                        onChange={e =>
                          handleSettingChange(
                            'notifications',
                            'pushNotifications',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Push Notifications"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.smsNotifications}
                        onChange={e =>
                          handleSettingChange('notifications', 'smsNotifications', e.target.checked)
                        }
                      />
                    }
                    label="SMS Notifications"
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Digest Frequency</InputLabel>
                    <Select
                      value={settings.notifications.digestFrequency}
                      label="Digest Frequency"
                      onChange={e =>
                        handleSettingChange('notifications', 'digestFrequency', e.target.value)
                      }
                    >
                      <MenuItem value="immediate">Immediate</MenuItem>
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Admin Notifications" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.notifyAdminLogin}
                        onChange={e =>
                          handleSettingChange('notifications', 'notifyAdminLogin', e.target.checked)
                        }
                      />
                    }
                    label="Notify on Admin Login"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.notifyUserRegistration}
                        onChange={e =>
                          handleSettingChange(
                            'notifications',
                            'notifyUserRegistration',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Notify on User Registration"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.notifySystemErrors}
                        onChange={e =>
                          handleSettingChange(
                            'notifications',
                            'notifySystemErrors',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label="Notify on System Errors"
                  />
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Email Settings */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="SMTP Configuration" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={settings.email.smtpHost}
                    onChange={e => handleSettingChange('email', 'smtpHost', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="SMTP Port"
                    value={settings.email.smtpPort}
                    onChange={e =>
                      handleSettingChange('email', 'smtpPort', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={settings.email.smtpUsername}
                    onChange={e => handleSettingChange('email', 'smtpUsername', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label="SMTP Password"
                    value={settings.email.smtpPassword}
                    onChange={e => handleSettingChange('email', 'smtpPassword', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Encryption</InputLabel>
                    <Select
                      value={settings.email.smtpEncryption}
                      label="Encryption"
                      onChange={e => handleSettingChange('email', 'smtpEncryption', e.target.value)}
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="tls">TLS</MenuItem>
                      <MenuItem value="ssl">SSL</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Email Settings" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="From Email"
                    value={settings.email.fromEmail}
                    onChange={e => handleSettingChange('email', 'fromEmail', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="From Name"
                    value={settings.email.fromName}
                    onChange={e => handleSettingChange('email', 'fromName', e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={testEmailConfiguration}
                    disabled={loading}
                    startIcon={<EmailIcon />}
                  >
                    Send Test Email
                  </Button>
                  {settings.email.testEmailSent && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Test email sent successfully!
                    </Alert>
                  )}
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Backup Settings */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Backup Configuration" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.backup.autoBackup}
                        onChange={e =>
                          handleSettingChange('backup', 'autoBackup', e.target.checked)
                        }
                      />
                    }
                    label="Enable Automatic Backup"
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={settings.backup.backupFrequency}
                      label="Backup Frequency"
                      onChange={e =>
                        handleSettingChange('backup', 'backupFrequency', e.target.value)
                      }
                      disabled={!settings.backup.autoBackup}
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    type="number"
                    label="Backup Retention (days)"
                    value={settings.backup.backupRetention}
                    onChange={e =>
                      handleSettingChange('backup', 'backupRetention', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Backup Location</InputLabel>
                    <Select
                      value={settings.backup.backupLocation}
                      label="Backup Location"
                      onChange={e =>
                        handleSettingChange('backup', 'backupLocation', e.target.value)
                      }
                    >
                      <MenuItem value="local">Local Storage</MenuItem>
                      <MenuItem value="cloud">Cloud Storage</MenuItem>
                      <MenuItem value="external">External Drive</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="Backup Actions" />
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Last Backup: {new Date(settings.backup.lastBackup).toLocaleString()}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={performBackup}
                    disabled={loading}
                    startIcon={<BackupIcon />}
                    sx={{ mb: 2 }}
                  >
                    Create Backup Now
                  </Button>
                  <Button fullWidth variant="outlined" startIcon={<RestoreIcon />}>
                    Restore from Backup
                  </Button>
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* System Settings */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="System Configuration" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.debugMode}
                        onChange={e => handleSettingChange('system', 'debugMode', e.target.checked)}
                      />
                    }
                    label="Debug Mode"
                    sx={{ mb: 2 }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Log Level</InputLabel>
                    <Select
                      value={settings.system.logLevel}
                      label="Log Level"
                      onChange={e => handleSettingChange('system', 'logLevel', e.target.value)}
                    >
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="warn">Warning</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="debug">Debug</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.cacheEnabled}
                        onChange={e =>
                          handleSettingChange('system', 'cacheEnabled', e.target.checked)
                        }
                      />
                    }
                    label="Enable Cache"
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.compressionEnabled}
                        onChange={e =>
                          handleSettingChange('system', 'compressionEnabled', e.target.checked)
                        }
                      />
                    }
                    label="Enable Compression"
                  />
                </CardContent>
              </SettingCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SettingCard>
                <CardHeader title="File Management" />
                <CardContent>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max File Size (MB)"
                    value={settings.system.maxFileSize}
                    onChange={e =>
                      handleSettingChange('system', 'maxFileSize', parseInt(e.target.value))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Allowed File Types"
                    value={settings.system.allowedFileTypes}
                    onChange={e =>
                      handleSettingChange('system', 'allowedFileTypes', e.target.value)
                    }
                    helperText="Comma separated file extensions"
                    sx={{ mb: 3 }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={clearCache}
                    startIcon={<DeleteIcon />}
                    color="warning"
                  >
                    Clear System Cache
                  </Button>
                </CardContent>
              </SettingCard>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button onClick={handleConfirmAction} variant="contained" color="warning">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemSettingsNew;
