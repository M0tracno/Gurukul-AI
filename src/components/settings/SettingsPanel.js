import React, { useState } from 'react';
import {
  Accessibility as AccessibilityIcon,
  Backup as BackupIcon,
  DarkMode as DarkModeIcon,
  Language as LanguageIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Restore,
  Restore as RestoreIcon,
  Shield as SecurityIcon,
  Settings,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabelItem,
  Radio,
  Select,
  Slider,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
const SettingsPanel = () => {
  const theme = useTheme();
  const originalTheme = useTheme();
  const { mode, primaryColor, toggleMode, changePrimaryColor } = useTheme();
  const { showSnackbar } = useNotifications();

  const [settings, setSettings] = useState({
    notifications: {
      push: true,
      email: true,
      sound: true,
      desktop: false,
    },
    privacy: {
      profileVisibility: 'public',
      dataCollection: true,
      analyticsTracking: false,
    },
    accessibility: {
      fontSize: 16,
      highContrast: false,
      reduceMotion: false,
      screenReader: false,
    },
    language: 'en',
    autoSave: true,
    compactMode: false,
  });

  const colorOptions = [
    { name: 'Red', value: 'red', color: '#e74c3c' },
    { name: 'Blue', value: 'blue', color: '#3498db' },
    { name: 'Green', value: 'green', color: '#27ae60' },
    { name: 'Purple', value: 'purple', color: '#9b59b6' },
  ];

  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  ];

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));

    showSnackbar(`${setting} setting updated`, 'success');
  };

  const exportSettings = () => {
    const settingsData = {
      theme: { mode, primaryColor },
      ...settings,
      exportDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(settingsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showSnackbar('Settings exported successfully', 'success');
  };

  const importSettings = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(importedSettings);
          if (importedSettings.theme) {
            if (importedSettings.theme.mode !== mode) toggleMode();
            if (importedSettings.theme.primaryColor !== primaryColor) {
              changePrimaryColor(importedSettings.theme.primaryColor);
            }
          }
          showSnackbar('Settings imported successfully', 'success');
        } catch (error) {
          showSnackbar('Failed to import settings', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      notifications: {
        push: true,
        email: true,
        sound: true,
        desktop: false,
      },
      privacy: {
        profileVisibility: 'public',
        dataCollection: true,
        analyticsTracking: false,
      },
      accessibility: {
        fontSize: 16,
        highContrast: false,
        reduceMotion: false,
        screenReader: false,
      },
      language: 'en',
      autoSave: true,
      compactMode: false,
    });

    showSnackbar('Settings reset to defaults', 'info');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings & Preferences
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <PaletteIcon color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Box>

              <Box mb={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={mode === 'dark'}
                      onChange={toggleMode}
                      icon={<LightModeIcon />}
                      checkedIcon={<DarkModeIcon />}
                    />
                  }
                  label={`${mode === 'dark' ? 'Dark' : 'Light'} Mode`}
                />
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Primary Color
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {colorOptions.map(color => (
                    <Tooltip key={color.value} title={color.name}>
                      <IconButton
                        onClick={() => changePrimaryColor(color.value)}
                        sx={{
                          backgroundColor: color.color,
                          border: primaryColor === color.value ? '3px solid' : '1px solid',
                          borderColor: primaryColor === color.value ? 'primary.main' : 'divider',
                          '&:hover': {
                            backgroundColor: color.color,
                            opacity: 0.8,
                          },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.compactMode}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, compactMode: e.target.checked }))
                    }
                  />
                }
                label="Compact Mode"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>

              {Object.entries(settings.notifications).map(([key, value]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Switch
                      checked={value}
                      onChange={e => handleSettingChange('notifications', key, e.target.checked)}
                    />
                  }
                  label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Language & Localization */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <LanguageIcon color="primary" />
                <Typography variant="h6">Language & Region</Typography>
              </Box>

              <FormControl fullWidth mb={2}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.language}
                  label="Language"
                  onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                >
                  {languageOptions.map(lang => (
                    <MenuItem key={lang.code} value={lang.code}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Alert severity="info" sx={{ mt: 2 }}>
                Language changes will take effect after page refresh.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Accessibility Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <AccessibilityIcon color="primary" />
                <Typography variant="h6">Accessibility</Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Font Size: {settings.accessibility.fontSize}px
                </Typography>
                <Slider
                  value={settings.accessibility.fontSize}
                  onChange={(e, value) => handleSettingChange('accessibility', 'fontSize', value)}
                  min={12}
                  max={24}
                  step={2}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>

              {['highContrast', 'reduceMotion', 'screenReader'].map(setting => (
                <FormControlLabel
                  key={setting}
                  control={
                    <Switch
                      checked={settings.accessibility[setting]}
                      onChange={e =>
                        handleSettingChange('accessibility', setting, e.target.checked)
                      }
                    />
                  }
                  label={
                    setting.charAt(0).toUpperCase() + setting.slice(1).replace(/([A-Z])/g, ' $1')
                  }
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Privacy Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Privacy & Security</Typography>
              </Box>

              <FormControl component="fieldset" mb={3}>
                <FormLabel component="legend">Profile Visibility</FormLabel>
                <RadioGroup
                  value={settings.privacy.profileVisibility}
                  onChange={e =>
                    handleSettingChange('privacy', 'profileVisibility', e.target.value)
                  }
                >
                  <FormControlLabel value="public" control={<Radio />} label="Public" />
                  <FormControlLabel value="restricted" control={<Radio />} label="Restricted" />
                  <FormControlLabel value="private" control={<Radio />} label="Private" />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.privacy.dataCollection}
                    onChange={e =>
                      handleSettingChange('privacy', 'dataCollection', e.target.checked)
                    }
                  />
                }
                label="Allow Data Collection"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.privacy.analyticsTracking}
                    onChange={e =>
                      handleSettingChange('privacy', 'analyticsTracking', e.target.checked)
                    }
                  />
                }
                label="Analytics Tracking"
                sx={{ display: 'block', mb: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <StorageIcon color="primary" />
                <Typography variant="h6">Data Management</Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSave}
                    onChange={e => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                  />
                }
                label="Auto-save Settings"
                sx={{ display: 'block', mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Backup & Restore
              </Typography>

              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<BackupIcon />}
                  onClick={exportSettings}
                  size="small"
                >
                  Export Settings
                </Button>

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<RestoreIcon />}
                  size="small"
                >
                  Import Settings
                  <input type="file" hidden accept=".json" onChange={importSettings} />
                </Button>

                <Button variant="outlined" color="warning" onClick={resetToDefaults} size="small">
                  Reset to Defaults
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      v2.1.0
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Application Version
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      98.5%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      System Health
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      156ms
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average Response Time
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      2.4GB
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Storage Used
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mt: 2 }}>
                All systems are operating normally. Last maintenance: 2 days ago.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPanel;
