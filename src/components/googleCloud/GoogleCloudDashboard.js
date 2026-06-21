import env from '../../config/env';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Refresh, VolumeUp, Warning } from '@mui/icons-material';
import googleCloudService from '../../services/googleCloudService';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemTextItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  toLocaleString,
} from '@mui/material';
const GoogleCloudDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [serviceStatus, setServiceStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [healthCheck, setHealthCheck] = useState(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [translationDialog, setTranslationDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [translationText, setTranslationText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    initializeGoogleCloud();
    loadRecentActivities();
  }, []);

  const initializeGoogleCloud = async () => {
    setLoading(true);
    try {
      await googleCloudService.initialize();
      const serviceInfo = await googleCloudService.getServiceInfo();
      setServiceStatus(serviceInfo);

      const health = await googleCloudService.healthCheck();
      setHealthCheck(health);

      await googleCloudService.logEvent('INFO', 'Google Cloud Dashboard accessed', {
        userId: 'current-user', // Replace with actual user ID
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to initialize Google Cloud:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = () => {
    // Mock recent activities - replace with actual data from logging service
    setRecentActivities([
      {
        id: 1,
        type: 'upload',
        description: 'Document uploaded to Cloud Storage',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'success',
      },
      {
        id: 2,
        type: 'translation',
        description: 'Text translated from English to Spanish',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'success',
      },
      {
        id: 3,
        type: 'analysis',
        description: 'Image analysis completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        status: 'success',
      },
    ]);
  };

  const handleFileUpload = useCallback(async event => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await googleCloudService.uploadFile(
        env.GOOGLE_CLOUD_STORAGE_BUCKET_MAIN || 'main-bucket',
        `uploads/${Date.now()}-${file.name}`,
        buffer,
        {
          originalName: file.name,
          userId: 'current-user', // Replace with actual user ID
          makePublic: false,
          metadata: {
            uploadedFrom: 'dashboard',
            fileType: file.type,
            fileSize: file.size,
          },
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      setRecentActivities(prev => [
        {
          id: Date.now(),
          type: 'upload',
          description: `File "${file.name}" uploaded successfully`,
          timestamp: new Date().toISOString(),
          status: 'success',
          details: result,
        },
        ...prev.slice(0, 9),
      ]);

      setTimeout(() => {
        setUploadDialog(false);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 1500);
    } catch (error) {
      console.error('Upload failed:', error);
      setRecentActivities(prev => [
        {
          id: Date.now(),
          type: 'upload',
          description: `Upload failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          status: 'error',
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, []);

  const handleTranslation = async () => {
    if (!translationText.trim()) return;

    try {
      setLoading(true);
      const result = await googleCloudService.translateText(translationText, targetLanguage);

      setRecentActivities(prev => [
        {
          id: Date.now(),
          type: 'translation',
          description: `Text translated to ${targetLanguage.toUpperCase()}`,
          timestamp: new Date().toISOString(),
          status: 'success',
          details: result,
        },
        ...prev.slice(0, 9),
      ]);

      setTranslationDialog(false);
      setTranslationText('');
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshHealthCheck = async () => {
    setLoading(true);
    try {
      const health = await googleCloudService.healthCheck();
      setHealthCheck(health);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'degraded':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'error':
        return <Error sx={{ color: 'error.main' }} />;
      default:
        return <Info sx={{ color: 'info.main' }} />;
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`google-cloud-tabpanel-${index}`}
      aria-labelledby={`google-cloud-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'linear-gradient(45deg, #4285f4, #34a853)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
        }}
      >
        <CloudQueue sx={{ fontSize: 40, color: '#4285f4' }} />
        Google Cloud Services Dashboard
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Service Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Service Status</Typography>
            <IconButton onClick={refreshHealthCheck} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>

          {healthCheck && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(healthCheck.overall)}
                  <Typography variant="h6">
                    Overall Status:
                    <Chip
                      label={healthCheck.overall.toUpperCase()}
                      color={getStatusColor(healthCheck.overall)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated: {new Date(healthCheck.timestamp).toLocaleString()}
                </Typography>
              </Grid>

              {healthCheck.services && (
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={1}>
                    {Object.entries(healthCheck.services).map(([service, status]) => (
                      <Grid key={service}>
                        <Chip
                          icon={getStatusIcon(status)}
                          label={service}
                          color={getStatusColor(status)}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Storage />} label="Cloud Storage" />
          <Tab icon={<Translate />} label="AI Services" />
        </Tabs>

        {/* Cloud Storage Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <CloudUpload sx={{ mr: 1 }} />
                    File Upload
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => setUploadDialog(true)}
                    fullWidth
                  >
                    Upload File to Cloud Storage
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <CloudDownload sx={{ mr: 1 }} />
                    File Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your files stored in Google Cloud Storage
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>
                    Browse Files
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* AI Services Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Translate sx={{ mr: 1 }} />
                    Translation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Translate text using Google Cloud Translation API
                  </Typography>
                  <Button variant="contained" onClick={() => setTranslationDialog(true)} fullWidth>
                    Translate Text
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <VolumeUp sx={{ mr: 1 }} />
                    Text-to-Speech
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Convert text to natural speech
                  </Typography>
                  <Button variant="outlined" fullWidth>
                    Synthesize Speech
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Visibility sx={{ mr: 1 }} />
                    Vision Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Analyze images with AI
                  </Typography>
                  <Button variant="outlined" fullWidth>
                    Analyze Image
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Recent Activities */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activities
          </Typography>
          <List>
            {recentActivities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ListItem>
                  <ListItemIcon>
                    {activity.status === 'success' ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Error color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={new Date(activity.timestamp).toLocaleString()}
                  />
                </ListItem>
                {index < recentActivities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File to Cloud Storage</DialogTitle>
        <DialogContent>
          <input type="file" onChange={handleFileUpload} style={{ margin: '20px 0' }} />
          {uploadProgress > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading: {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Translation Dialog */}
      <Dialog
        open={translationDialog}
        onClose={() => setTranslationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Translate Text</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Text to translate"
            value={translationText}
            onChange={e => setTranslationText(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>Target Language</InputLabel>
            <Select
              value={targetLanguage}
              onChange={e => setTargetLanguage(e.target.value)}
              label="Target Language"
            >
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
              <MenuItem value="de">German</MenuItem>
              <MenuItem value="it">Italian</MenuItem>
              <MenuItem value="pt">Portuguese</MenuItem>
              <MenuItem value="zh">Chinese</MenuItem>
              <MenuItem value="ja">Japanese</MenuItem>
              <MenuItem value="ko">Korean</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTranslationDialog(false)}>Cancel</Button>
          <Button
            onClick={handleTranslation}
            variant="contained"
            disabled={!translationText.trim()}
          >
            Translate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoogleCloudDashboard;
