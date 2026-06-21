import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdvancedAnalyticsService from '../../services/AdvancedAnalyticsService';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Analytics,
  Assessment,
  Assignment,
  Download,
  People,
  Psychology,
  Refresh,
  Timeline,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
const AdvancedAnalyticsDashboard = ({ userId, role = 'admin' }) => {
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    performance: null,
    engagement: null,
    realtime: null,
  });
  const [filters, setFilters] = useState({
    subject: 'all',
    grade: 'all',
    class: 'all',
  });

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, filters]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [overview, performance, engagement, predictions, realtime] = await Promise.all([
        AdvancedAnalyticsService.getInstitutionalOverview(timeRange, filters),
        AdvancedAnalyticsService.getPerformanceAnalytics(timeRange, filters),
        AdvancedAnalyticsService.getEngagementMetrics(timeRange, filters),
        AdvancedAnalyticsService.getPredictiveInsights(timeRange, filters),
        AdvancedAnalyticsService.getRealTimeMetrics(),
      ]);

      setData({
        overview,
        performance,
        engagement,
        predictions,
        realtime,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = event => {
    setTimeRange(event.target.value);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const exportData = async () => {
    try {
      const exportData = await AdvancedAnalyticsService.exportAnalytics(timeRange, filters);
      // Create and download CSV
      const blob = new Blob([exportData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${timeRange}_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = 'primary' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography color="textSecondary" gutterBottom variant="h6">
                {title}
              </Typography>
              <Typography variant="h4" color={color}>
                {value}
              </Typography>
              {change !== undefined && (
                <Box display="flex" alignItems="center" mt={1}>
                  {change >= 0 ? (
                    <TrendingUp color="success" fontSize="small" />
                  ) : (
                    <TrendingDown color="error" fontSize="small" />
                  )}
                  <Typography
                    variant="body2"
                    color={change >= 0 ? 'success.main' : 'error.main'}
                    sx={{ ml: 0.5 }}
                  >
                    {change >= 0 ? '+' : ''}
                    {change}%
                  </Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
              <Icon fontSize="large" />
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const OverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          title="Total Students"
          value={data.overview?.totalStudents || 1247}
          change={data.overview?.studentGrowth || 12.5}
          icon={People}
          color="primary"
        />
      </Grid>{' '}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          title="Active Courses"
          value={data.overview?.activeCourses || 48}
          change={data.overview?.courseGrowth || 8.3}
          icon={Assignment}
          color="secondary"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          title="Completion Rate"
          value={`${data.overview?.completionRate || 87}%`}
          change={data.overview?.completionChange || 5.2}
          icon={Assignment}
          color="success"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          title="Avg. Performance"
          value={`${data.overview?.avgPerformance || 82}%`}
          change={data.overview?.performanceChange || -1.8}
          icon={Assessment}
          color="warning"
        />
      </Grid>
      {/* Charts */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Student Performance Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.overview?.performanceTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="median" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="top10" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subject Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.overview?.subjectDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(data.overview?.subjectDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      {/* Recent Activity */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {(data.overview?.recentActivity || []).map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        {activity.type === 'assignment' && <Assignment />}
                        {activity.type === 'grade' && <Assessment />}
                        {activity.type === 'login' && <People />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={activity.description} secondary={activity.timestamp} />
                    <Chip
                      label={activity.type}
                      size="small"
                      color={activity.type === 'assignment' ? 'primary' : 'secondary'}
                    />
                  </ListItem>
                  {index < (data.overview?.recentActivity || []).length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const PerformanceTab = () => (
    <Grid container spacing={3}>
      {/* Performance Metrics */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Grade Distribution Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data.performance?.gradeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="A" stackId="1" stroke="#4caf50" fill="#4caf50" />
                <Area type="monotone" dataKey="B" stackId="1" stroke="#8bc34a" fill="#8bc34a" />
                <Area type="monotone" dataKey="C" stackId="1" stroke="#ffc107" fill="#ffc107" />
                <Area type="monotone" dataKey="D" stackId="1" stroke="#ff9800" fill="#ff9800" />
                <Area type="monotone" dataKey="F" stackId="1" stroke="#f44336" fill="#f44336" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performers
            </Typography>
            <List>
              {(data.performance?.topPerformers || []).map((student, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: index < 3 ? 'gold' : 'primary.main' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={student.name} secondary={`${student.score}% avg`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance by Subject */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance by Subject
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.performance?.subjectPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#8884d8" />
                <Bar dataKey="median" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Performance Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed Performance Analysis
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell align="right">Avg Score</TableCell>
                    <TableCell align="right">Completion Rate</TableCell>
                    <TableCell align="right">Pass Rate</TableCell>
                    <TableCell align="right">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.performance?.detailedAnalysis || []).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">
                        {row.subject}
                      </TableCell>
                      <TableCell align="right">{row.avgScore}%</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={row.completionRate}
                            sx={{ width: 60, mr: 1 }}
                          />
                          {row.completionRate}%
                        </Box>
                      </TableCell>
                      <TableCell align="right">{row.passRate}%</TableCell>
                      <TableCell align="right">
                        {row.trend >= 0 ? (
                          <TrendingUp color="success" />
                        ) : (
                          <TrendingDown color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const EngagementTab = () => (
    <Grid container spacing={3}>
      {/* Engagement Metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Active Users
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.engagement?.dailyActiveUsers || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Session Duration
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.engagement?.sessionDuration || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeRange" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sessions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Feature Usage */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feature Usage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.engagement?.featureUsage || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="usage"
                >
                  {(data.engagement?.featureUsage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Engagement Score */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Engagement Score by Cohort
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.engagement?.engagementScore || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="cohort" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Engagement"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const PredictionsTab = () => (
    <Grid container spacing={3}>
      {/* Risk Alerts */}
      <Grid size={{ xs: 12 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {data.predictions?.riskAlerts ||
            'Found 12 students at risk of dropping out based on current trends.'}
        </Alert>
      </Grid>

      {/* Prediction Charts */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Predictions
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data.predictions?.performanceForecast || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#8884d8" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#ffc658"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* At-Risk Students */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              At-Risk Students
            </Typography>
            <List>
              {(data.predictions?.atRiskStudents || []).map((student, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <Psychology />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={student.name}
                    secondary={`${student.riskScore}% risk score`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Analytics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Advanced Analytics Dashboard
        </Typography>

        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={handleTimeRangeChange} label="Time Range">
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
              <MenuItem value="90d">90 Days</MenuItem>
              <MenuItem value="1y">1 Year</MenuItem>
            </Select>
          </FormControl>

          <Button startIcon={<Download />} onClick={exportData} variant="outlined">
            Export
          </Button>

          <Button startIcon={<Refresh />} onClick={loadAnalyticsData} variant="contained">
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Overview" icon={<Analytics />} />
          <Tab label="Performance" icon={<Assessment />} />
          <Tab label="Engagement" icon={<Psychology />} />
          <Tab label="Predictions" icon={<Timeline />} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {tabValue === 0 && <OverviewTab />}
        {tabValue === 1 && <PerformanceTab />}
        {tabValue === 2 && <EngagementTab />}
        {tabValue === 3 && <PredictionsTab />}
      </Box>
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;
