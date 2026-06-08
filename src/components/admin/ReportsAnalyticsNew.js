import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import AdminService from '../../services/adminService';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
  },
}));

const MetricCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  textAlign: 'center',
  '& .MuiCardContent-root': {
    padding: theme.spacing(2),
  },
}));

const ChartCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  color: 'white',
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
  },
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsAnalyticsNew = () => {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      activeUsers: 0,
      completionRate: 0,
    },
    userStats: [],
    courseStats: [],
    enrollmentTrends: [],
    systemMetrics: {
      serverUptime: '99.9%',
      avgResponseTime: '120ms',
      errorRate: '0.1%',
      storageUsed: '45GB',
    },
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, reportType]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API calls for analytics data
      const [usersResponse, coursesResponse] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getAllCourses(),
      ]);

      const users = usersResponse.data || [];
      const courses = coursesResponse.data || [];

      // Calculate analytics
      const totalUsers = users.length;
      const totalCourses = courses.length;
      const students = users.filter(user => user.role === 'student');
      const faculty = users.filter(user => user.role === 'faculty');
      
      // Mock enrollment data
      const totalEnrollments = students.length * 2; // Assume each student is enrolled in 2 courses
      const activeUsers = Math.floor(totalUsers * 0.8); // 80% active users
      const completionRate = 75.5; // Mock completion rate

      setAnalyticsData({
        overview: {
          totalUsers,
          totalCourses,
          totalEnrollments,
          activeUsers,
          completionRate,
        },
        userStats: [
          { role: 'Students', count: students.length, percentage: (students.length / totalUsers) * 100 },
          { role: 'Faculty', count: faculty.length, percentage: (faculty.length / totalUsers) * 100 },
          { role: 'Parents', count: users.filter(u => u.role === 'parent').length, percentage: (users.filter(u => u.role === 'parent').length / totalUsers) * 100 },
        ],
        courseStats: courses.slice(0, 10).map(course => ({
          name: course.name || course.title || 'Unnamed Course',
          enrollments: Math.floor(Math.random() * 50) + 10,
          completions: Math.floor(Math.random() * 30) + 5,
          rating: (Math.random() * 2 + 3).toFixed(1),
        })),
        enrollmentTrends: [
          { month: 'Jan', enrollments: 45, completions: 32 },
          { month: 'Feb', enrollments: 52, completions: 38 },
          { month: 'Mar', enrollments: 48, completions: 35 },
          { month: 'Apr', enrollments: 61, completions: 45 },
          { month: 'May', enrollments: 55, completions: 42 },
          { month: 'Jun', enrollments: 67, completions: 51 },
        ],
        systemMetrics: {
          serverUptime: '99.9%',
          avgResponseTime: '120ms',
          errorRate: '0.1%',
          storageUsed: '45GB',
        },
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExportReport = () => {
    // Mock export functionality
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
          Reports & Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 3 Months</MenuItem>
              <MenuItem value="365">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAnalyticsData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            }}
          >
            Export Report
          </Button>
        </Box>
      </Box>      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{xs:12,sm:6,md:2.4}}>
          <MetricCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <PeopleIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {analyticsData.overview.totalUsers}
              </Typography>
              <Typography variant="body2">Total Users</Typography>
            </CardContent>
          </MetricCard>
        </Grid>        <Grid size={{xs:12,sm:6,md:2.4}}>
          <MetricCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <SchoolIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {analyticsData.overview.totalCourses}
              </Typography>
              <Typography variant="body2">Total Courses</Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid size={{xs:12,sm:6,md:2.4}}>
          <MetricCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <AssignmentIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {analyticsData.overview.totalEnrollments}
              </Typography>
              <Typography variant="body2">Total Enrollments</Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid size={{xs:12,sm:6,md:2.4}}>
          <MetricCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {analyticsData.overview.activeUsers}
              </Typography>
              <Typography variant="body2">Active Users</Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid size={{xs:12,sm:6,md:2.4}}>
          <MetricCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <AssessmentIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {analyticsData.overview.completionRate}%
              </Typography>
              <Typography variant="body2">Completion Rate</Typography>
            </CardContent>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Detailed Reports */}
      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab icon={<PieChartIcon />} label="User Analytics" />
          <Tab icon={<BarChartIcon />} label="Course Performance" />
          <Tab icon={<ShowChartIcon />} label="Enrollment Trends" />
          <Tab icon={<AssessmentIcon />} label="System Metrics" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{xs:12,md:6}}>
              <ChartCard>
                <CardHeader title="User Distribution" />
                <CardContent>
                  {analyticsData.userStats.map((stat, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1">{stat.role}</Typography>
                        <Typography variant="body1">{stat.count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={stat.percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </ChartCard>
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <StyledCard>
                <CardHeader title="User Activity Summary" />
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Daily Active Users: 85%</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={85}
                      sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Weekly Retention: 72%</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={72}
                      sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Monthly Retention: 65%</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={65}
                      sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow><TableCell>Course Name</TableCell>
                  <TableCell align="right">Enrollments</TableCell>
                  <TableCell align="right">Completions</TableCell>
                  <TableCell align="right">Completion Rate</TableCell>
                  <TableCell align="right">Rating</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {analyticsData.courseStats.map((course, index) => (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row">
                      {course.name}
                    </TableCell>
                    <TableCell align="right">{course.enrollments}</TableCell>
                    <TableCell align="right">{course.completions}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${Math.round((course.completions / course.enrollments) * 100)}%`}
                        color={Math.round((course.completions / course.enrollments) * 100) > 70 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {course.rating}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ★
                        </Typography>
                      </Box>
                    </TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <ChartCard>
            <CardHeader title="Enrollment Trends (Last 6 Months)" />
            <CardContent>
              <Grid container spacing={2}>
                {analyticsData.enrollmentTrends.map((trend, index) => (
                  <Grid size={{xs:12,sm:6,md:2}} key={index}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {trend.month}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {trend.enrollments}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Enrollments
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {trend.completions} completed
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </ChartCard>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid size={{xs:12,md:6}}>
              <StyledCard>
                <CardHeader title="System Performance" />
                <CardContent>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Server Uptime: {analyticsData.systemMetrics.serverUptime}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={99.9}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Avg Response Time: {analyticsData.systemMetrics.avgResponseTime}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={75}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Error Rate: {analyticsData.systemMetrics.errorRate}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={5}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                    />
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <ChartCard>
                <CardHeader title="Storage & Resources" />
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Storage Usage: {analyticsData.systemMetrics.storageUsed} / 100GB
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={45}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'white',
                      },
                    }}
                  />
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Database Size: 12GB
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Media Files: 28GB
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Backup Files: 5GB
                    </Typography>
                    <Typography variant="body2">
                      System Files: 55MB
                    </Typography>
                  </Box>
                </CardContent>
              </ChartCard>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ReportsAnalyticsNew;