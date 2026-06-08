import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, FormControl, Grid, IconButton, InputLabel, LinearProgressItem, Paper, Select, Tooltip, Typography } from '@mui/material';
import { 
  Download,
  Insights as InsightsIcon,
  Refresh,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { 
  Area,
  AreaChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Cell
} from 'recharts';

const EnhancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [insights, setInsights] = useState([]);
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = generateMockAnalyticsData();
      setAnalyticsData(mockData);
      setInsights(generateInsights(mockData));
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedMetric]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const generateMockAnalyticsData = () => {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 200) + 150,
        sessions: Math.floor(Math.random() * 300) + 200,
        assignments: Math.floor(Math.random() * 50) + 20,
        quizzes: Math.floor(Math.random() * 30) + 10,
        engagement: Math.floor(Math.random() * 100) + 50,
        performance: Math.floor(Math.random() * 100) + 60};
    });

    const userDistribution = [
      { name: 'Students', value: 450, color: '#8884d8' },
      { name: 'Faculty', value: 45, color: '#82ca9d' },
      { name: 'Parents', value: 320, color: '#ffc658' },
      { name: 'Admins', value: 8, color: '#ff7300' },
    ];

    const subjectPerformance = [
      { subject: 'Mathematics', average: 85, students: 120 },
      { subject: 'Science', average: 78, students: 115 },
      { subject: 'English', average: 82, students: 130 },
      { subject: 'History', average: 75, students: 95 },
      { subject: 'Geography', average: 80, students: 88 },
    ];

    const engagementMetrics = [
      { metric: 'Daily Active Users', value: 342, change: 12.5, trend: 'up' },
      { metric: 'Average Session Duration', value: '24min', change: -2.3, trend: 'down' },
      { metric: 'Quiz Completion Rate', value: '87%', change: 5.7, trend: 'up' },
      { metric: 'Assignment Submission Rate', value: '93%', change: 1.2, trend: 'up' },
    ];

    return {
      dailyData,
      userDistribution,
      subjectPerformance,
      engagementMetrics,
      totalUsers: userDistribution.reduce((sum, item) => sum + item.value, 0),
      activeToday: Math.floor(Math.random() * 400) + 200,
      systemHealth: 98.5};
  };

  const generateInsights = (data) => {
    const insights = [
      {
        type: 'positive',
        title: 'High Engagement Detected',
        description: 'User engagement increased by 12.5% this week, indicating improved learning outcomes.',
        priority: 'high'},
      {
        type: 'warning',
        title: 'Mathematics Performance Concern',
        description: 'Mathematics has the highest average but lowest completion rate. Consider additional support.',
        priority: 'medium'},
      {
        type: 'info',
        title: 'Peak Usage Hours',
        description: 'Most activity occurs between 10 AM - 2 PM. Schedule maintenance outside these hours.',
        priority: 'low'},
      {
        type: 'positive',
        title: 'Assignment Completion Excellence',
        description: 'Assignment submission rate of 93% exceeds the target of 90%.',
        priority: 'medium'},
    ];

    return insights;
  };

  const exportData = () => {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Enhanced Analytics Dashboard</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Metric"
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <MenuItem value="overview">Overview</MenuItem>
              <MenuItem value="users">Users</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="engagement">Engagement</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh Data">
            <IconButton onClick={loadAnalyticsData}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export Data">
            <IconButton onClick={exportData}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* AI-Powered Insights */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <InsightsIcon />
            <Typography variant="h6">AI-Powered Insights</Typography>
          </Box>
          <Grid container spacing={2}>
            {insights.map((insight, index) => (
              <Grid size={{xs:12,md:6}} key={index}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip 
                      label={insight.type} 
                      size="small" 
                      color={insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : 'info'}
                    />
                    <Chip label={insight.priority} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {insight.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {insight.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {analyticsData.engagementMetrics.map((metric, index) => (
          <Grid size={{xs:12,sm:6,md:3}} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {metric.metric}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {metric.trend === 'up' ? (
                      <TrendingUpIcon color="success" />
                    ) : (
                      <TrendingDownIcon color="error" />
                    )}
                    <Typography 
                      variant="caption" 
                      color={metric.trend === 'up' ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {Math.abs(metric.change)}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={typeof metric.value === 'string' && metric.value.includes('%') 
                    ? parseInt(metric.value) 
                    : Math.min(100, (typeof metric.value === 'number' ? metric.value : 50))
                  }
                  sx={{ mt: 2, height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Daily Activity Trend */}
        <Grid size={{xs:12,lg:8}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Activity Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analyticsData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="sessions" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <Line type="monotone" dataKey="engagement" stroke="#ff7300" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Distribution */}
        <Grid size={{xs:12,lg:4}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Subject Performance */}
        <Grid size={{xs:12}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subject Performance Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="average" fill="#8884d8" name="Average Score" />
                  <Bar dataKey="students" fill="#82ca9d" name="Student Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health Monitor */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Real-time System Health
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flex={1}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Overall System Health
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analyticsData.systemHealth}
                sx={{ height: 12, borderRadius: 6 }}
                color={analyticsData.systemHealth > 95 ? 'success' : analyticsData.systemHealth > 80 ? 'warning' : 'error'}
              />
              <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 1 }}>
                {analyticsData.systemHealth}%
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h3" fontWeight="bold">
                {analyticsData.activeToday}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Users Today
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnhancedAnalytics;
