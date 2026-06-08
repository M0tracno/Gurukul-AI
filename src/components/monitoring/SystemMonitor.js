import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Alert, Box, Card, CardContent, Chip, FormControlLabel, Grid, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Switch, Tooltip, Typography } from '@mui/material';
import { Download } from '@mui/icons-material';

// Real-time system monitoring and analytics
  Timeline as TimelineIcon} from '@mui/icons-material';
  Legend} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const SystemMonitor = () => {
  const [metrics, setMetrics] = useState({
    performance: {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      bundleSize: 0},
    network: {
      status: 'online',
      speed: 'unknown',
      latency: 0},
    errors: [],
    warnings: [],
    realTimeData: {
      timestamps: [],
      memoryData: [],
      performanceData: []}});

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef();

  // Performance monitoring
  useEffect(() => {
    const measurePerformance = () => {
      if (!performance) return;

      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      
      const newMetrics = {
        loadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        renderTime: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
        memoryUsage: performance.memory?.usedJSHeapSize || 0,
        bundleSize: resources.reduce((total, resource) => 
          total + (resource.transferSize || 0), 0)};

      setMetrics(prev => ({
        ...prev,
        performance: newMetrics}));
    };

    measurePerformance();
  }, []);

  // Network monitoring
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      setMetrics(prev => ({
        ...prev,
        network: {
          status: navigator.onLine ? 'online' : 'offline',
          speed: connection?.effectiveType || 'unknown',
          latency: connection?.rtt || 0}}));
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Error monitoring
  useEffect(() => {
    const handleError = (event) => {
      const error = {
        id: Date.now(),
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        timestamp: new Date().toISOString(),
        type: 'error'};

      setMetrics(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-9), error], // Keep last 10 errors
      }));
    };

    const handleUnhandledRejection = (event) => {
      const error = {
        id: Date.now(),
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        type: 'promise-rejection'};

      setMetrics(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-9), error]}));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Real-time data collection
  useEffect(() => {
    if (!isMonitoring) return;

    intervalRef.current = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      const memoryUsage = performance.memory?.usedJSHeapSize || 0;
      const performanceScore = calculatePerformanceScore();

      setMetrics(prev => ({
        ...prev,
        realTimeData: {
          timestamps: [...prev.realTimeData.timestamps.slice(-19), now],
          memoryData: [...prev.realTimeData.memoryData.slice(-19), memoryUsage / 1024 / 1024],
          performanceData: [...prev.realTimeData.performanceData.slice(-19), performanceScore]}}));
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring]);

  const calculatePerformanceScore = () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return 0;

    const loadTime = navigation.loadEventEnd - navigation.fetchStart;
    const score = Math.max(0, 100 - (loadTime / 50)); // 5 seconds = 0 score
    return Math.round(score);
  };

  const getMemoryUsageColor = (usage) => {
    const mb = usage / 1024 / 1024;
    if (mb < 50) return 'success';
    if (mb < 100) return 'warning';
    return 'error';
  };

  const getNetworkStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      default: return 'warning';
    }
  };

  const exportMetrics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      userAgent: navigator.userAgent,
      url: window.location.href};

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'});
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = {
    labels: metrics.realTimeData.timestamps,
    datasets: [
      {
        label: 'Memory Usage (MB)',
        data: metrics.realTimeData.memoryData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1},
      {
        label: 'Performance Score',
        data: metrics.realTimeData.performanceData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1},
    ]};

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'},
      title: {
        display: true,
        text: 'Real-time System Metrics'}},
    scales: {
      y: {
        beginAtZero: true}}};

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Monitor
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={isMonitoring}
              onChange={(e) => setIsMonitoring(e.target.checked)}
            />
          }
          label="Real-time Monitoring"
        />
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
          }
          label="Auto Refresh"
        />
        <Tooltip title="Export Metrics">
          <IconButton onClick={exportMetrics}>
            <Download />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Performance
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Page Load Time
                </Typography>
                <Typography variant="h4">
                  {(metrics.performance.loadTime / 1000).toFixed(2)}s
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (5000 - metrics.performance.loadTime) / 50)}
                  sx={{ mt: 1, mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="h4">
                  {(metrics.performance.memoryUsage / 1024 / 1024).toFixed(1)} MB
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.performance.memoryUsage / 1024 / 1024 / 100) * 100}
                  color={getMemoryUsageColor(metrics.performance.memoryUsage)}
                  sx={{ mt: 1, mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary">
                  Bundle Size
                </Typography>
                <Typography variant="h4">
                  {(metrics.performance.bundleSize / 1024).toFixed(0)} KB
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Status */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <NetworkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Network
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={metrics.network.status.toUpperCase()}
                  color={getNetworkStatusColor(metrics.network.status)}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary">
                  Connection Speed
                </Typography>
                <Typography variant="h4">
                  {metrics.network.speed}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Latency
                </Typography>
                <Typography variant="h4">
                  {metrics.network.latency}ms
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Chart */}
        <Grid size={{xs:12}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Real-time Metrics
              </Typography>
              
              {metrics.realTimeData.timestamps.length > 0 ? (
                <Box sx={{ height: 300, mt: 2 }}>
                  <Line data={chartData} options={chartOptions} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No data available. Enable monitoring to see real-time metrics.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Errors and Warnings */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Errors
              </Typography>
              
              {metrics.errors.length === 0 ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  No errors detected
                </Alert>
              ) : (
                <List>
                  {metrics.errors.map((error) => (
                    <ListItem key={error.id}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={error.message}
                        secondary={`${error.timestamp} - ${error.filename}:${error.lineno}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SuccessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Health
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Chip
                      size="small"
                      color={metrics.performance.loadTime < 3000 ? 'success' : 'warning'}
                      label={metrics.performance.loadTime < 3000 ? 'Good' : 'Slow'}
                    />
                  </ListItemIcon>
                  <ListItemText primary="Page Load Performance" />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Chip
                      size="small"
                      color={getMemoryUsageColor(metrics.performance.memoryUsage)}
                      label={
                        metrics.performance.memoryUsage / 1024 / 1024 < 50 ? 'Good' :
                        metrics.performance.memoryUsage / 1024 / 1024 < 100 ? 'Fair' : 'High'
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="Memory Usage" />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Chip
                      size="small"
                      color={getNetworkStatusColor(metrics.network.status)}
                      label={metrics.network.status}
                    />
                  </ListItemIcon>
                  <ListItemText primary="Network Status" />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Chip
                      size="small"
                      color={metrics.errors.length === 0 ? 'success' : 'error'}
                      label={metrics.errors.length === 0 ? 'Stable' : 'Issues'}
                    />
                  </ListItemIcon>
                  <ListItemText primary="Error Rate" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitor;
