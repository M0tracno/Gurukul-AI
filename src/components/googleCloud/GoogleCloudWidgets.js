import React, { useState, useEffect } from 'react';
import { CheckCircle, Refresh, Warning } from '@mui/icons-material';
import googleCloudService from '../../services/googleCloudService';

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
const GoogleCloudStatusWidget = ({ classes }) => {
  const [status, setStatus] = useState({
    overall: 'loading',
    services: {},
    timestamp: null,
  });
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      await googleCloudService.initialize();
      const healthCheck = await googleCloudService.healthCheck();
      setStatus(healthCheck);
    } catch (error) {
      console.error('Google Cloud status check failed:', error);
      setStatus({
        overall: 'error',
        services: {},
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = statusValue => {
    switch (statusValue) {
      case 'healthy':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'degraded':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'error':
        return <Error sx={{ color: 'error.main' }} />;
      default:
        return <CloudQueue sx={{ color: 'info.main' }} />;
    }
  };

  const getStatusColor = statusValue => {
    switch (statusValue) {
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

  if (loading) {
    return (
      <Card className={classes?.statCard || ''} sx={{ height: 200 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CloudQueue sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Google Cloud Services</Typography>
          </Box>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Checking service status...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={classes?.statCard || ''} sx={{ height: 200 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudQueue sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Google Cloud Services</Typography>
          </Box>
          <IconButton size="small" onClick={loadStatus} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {getStatusIcon(status.overall)}
          <Typography variant="h6" sx={{ ml: 1 }}>
            Status:
            <Chip
              label={status.overall.toUpperCase()}
              color={getStatusColor(status.overall)}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>

        {status.error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {status.error}
          </Alert>
        ) : (
          <Grid container spacing={1}>
            {Object.entries(status.services || {}).map(([service, serviceStatus]) => (
              <Grid key={service}>
                <Chip
                  icon={getStatusIcon(serviceStatus)}
                  label={service}
                  color={getStatusColor(serviceStatus)}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        )}

        {status.timestamp && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Last updated: {new Date(status.timestamp).toLocaleTimeString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const GoogleCloudQuickActions = ({ classes }) => {
  const quickActions = [
    {
      title: 'Cloud Storage',
      description: 'Manage files and media',
      icon: <Storage />,
      color: '#4285f4',
      path: '/admin-dashboard/google-cloud',
    },
    {
      title: 'AI Services',
      description: 'Translation & Speech',
      icon: <Translate />,
      color: '#34a853',
      path: '/admin-dashboard/google-cloud',
    },
    {
      title: 'Functions',
      description: 'Serverless operations',
      icon: <Functions />,
      color: '#fbbc04',
      path: '/admin-dashboard/google-cloud',
    },
    {
      title: 'Security',
      description: 'Monitor & protect',
      icon: <Security />,
      color: '#ea4335',
      path: '/admin-dashboard/google-cloud',
    },
  ];

  return (
    <Card className={classes?.statCard || ''} sx={{ height: 200 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <CloudQueue sx={{ mr: 1, verticalAlign: 'middle' }} />
          Quick Actions
        </Typography>

        <Grid container spacing={1}>
          {quickActions.map((action, index) => (
            <Grid size={{ xs: 6 }} key={index}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => (window.location.href = action.path)}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ color: action.color, mr: 0.5 }}>{action.icon}</Box>
                    <Typography variant="subtitle2" noWrap>
                      {action.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export { GoogleCloudStatusWidget, GoogleCloudQuickActions };
