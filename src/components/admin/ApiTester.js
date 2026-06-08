import React, { useState } from 'react';
import { Refresh, Warning as WarningIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Collapse, Grid, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import env from '../../config/env';

const API_BASE_URL = `${env.API_URL}/api`;

const ApiTester = () => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  // Define all API endpoints to test
  const apiEndpoints = {
    'Authentication': [
      { method: 'POST', endpoint: '/auth/login', description: 'User login' },
      { method: 'POST', endpoint: '/auth/register', description: 'User registration' },
      { method: 'POST', endpoint: '/auth/logout', description: 'User logout' },
      { method: 'GET', endpoint: '/auth/verify', description: 'Token verification' },
    ],
    'Admin': [
      { method: 'GET', endpoint: '/admin/users', description: 'Get all users' },
      { method: 'GET', endpoint: '/admin/users/stats', description: 'Get user statistics' },
      { method: 'GET', endpoint: '/admin/system/stats', description: 'Get system statistics' },
      { method: 'POST', endpoint: '/admin/users', description: 'Create new user' },
      { method: 'PUT', endpoint: '/admin/users/:id', description: 'Update user' },
      { method: 'DELETE', endpoint: '/admin/users/:id', description: 'Delete user' },
    ],
    'Faculty': [
      { method: 'GET', endpoint: '/faculty/courses', description: 'Get faculty courses' },
      { method: 'GET', endpoint: '/faculty/students', description: 'Get faculty students' },
      { method: 'POST', endpoint: '/faculty/assignments', description: 'Create assignment' },
      { method: 'GET', endpoint: '/faculty/assignments', description: 'Get assignments' },
      { method: 'POST', endpoint: '/faculty/grades', description: 'Submit grades' },
    ],
    'Student': [
      { method: 'GET', endpoint: '/student/courses', description: 'Get student courses' },
      { method: 'GET', endpoint: '/student/assignments', description: 'Get assignments' },
      { method: 'GET', endpoint: '/student/grades', description: 'Get grades' },
      { method: 'POST', endpoint: '/student/submissions', description: 'Submit assignment' },
    ],
    'Parent': [
      { method: 'GET', endpoint: '/parent/children', description: 'Get children data' },
      { method: 'GET', endpoint: '/parent/grades', description: 'Get children grades' },
      { method: 'POST', endpoint: '/parent/communication', description: 'Send message to teacher' },
    ]
  };

  // Test individual endpoint
  const testEndpoint = async (method, endpoint, description) => {
    try {
      const token = localStorage.getItem('token');
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      };

      // Add sample data for POST/PUT requests
      if (['POST', 'PUT'].includes(method)) {
        options.body = JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        });
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'ERROR',
        statusText: error.message,
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  };

  // Test all endpoints
  const runAllTests = async () => {
    setTesting(true);
    setTestResults({});

    const results = {};

    for (const [category, endpoints] of Object.entries(apiEndpoints)) {
      results[category] = {};

      for (const { method, endpoint, description } of endpoints) {
        const testKey = `${method} ${endpoint}`;
        results[category][testKey] = { description, testing: true };

        setTestResults({ ...results });
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await testEndpoint(method, endpoint, description);
        results[category][testKey] = { description, ...result, testing: false };

        setTestResults({ ...results });
      }
    }

    setTesting(false);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get status color and icon
  const getStatusInfo = (result) => {
    if (result.testing) {
      return { color: 'info', icon: <LinearProgress size={20} /> };
    }
    if (result.ok) {
      return { color: 'success', icon: <SuccessIcon /> };
    }
    if (result.status >= 400 && result.status < 500) {
      return { color: 'warning', icon: <WarningIcon /> };
    }
    return { color: 'error', icon: <ErrorIcon /> };
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    let total = 0;
    let success = 0;
    let warning = 0;
    let error = 0;

    Object.values(testResults).forEach(category => {
      Object.values(category).forEach(result => {
        if (!result.testing) {
          total++;
          if (result.ok) success++;
          else if (result.status >= 400 && result.status < 500) warning++;
          else error++;
        }
      });
    });

    return { total, success, warning, error };
  };

  const stats = getSummaryStats();

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            API Endpoint Testing
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Test all API endpoints to ensure proper connectivity and functionality.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={runAllTests}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Run All Tests'}
            </Button>
          </Box>

          {/* Summary Stats */}
          {stats.total > 0 && (
            <Grid container spacing={2}>
              <Grid size={{xs:3}}>
                <Chip label={`Total: ${stats.total}`} color="default" variant="outlined" />
              </Grid>
              <Grid size={{xs:3}}>
                <Chip label={`Success: ${stats.success}`} color="success" variant="outlined" />
              </Grid>
              <Grid size={{xs:3}}>
                <Chip label={`Warning: ${stats.warning}`} color="warning" variant="outlined" />
              </Grid>
              <Grid size={{xs:3}}>
                <Chip label={`Error: ${stats.error}`} color="error" variant="outlined" />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {Object.entries(testResults).map(([category, endpoints]) => (
        <Card key={category} sx={{ mb: 2 }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleSection(category)}
            >
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {category} APIs
              </Typography>
              <IconButton>
                {expandedSections[category] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={expandedSections[category]}>
              <List>
                {Object.entries(endpoints).map(([testKey, result]) => {
                  const { color, icon } = getStatusInfo(result);

                  return (
                    <ListItem key={testKey}>
                      <ListItemIcon>
                        {icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={testKey}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {result.description}
                            </Typography>
                            {!result.testing && (
                              <Typography variant="caption" color="textSecondary">
                                Status: {result.status} {result.statusText}
                                {result.timestamp && ` • ${new Date(result.timestamp).toLocaleTimeString()}`}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      {!result.testing && (
                        <Chip label={result.status} color={color} size="small" />
                      )}
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ApiTester;