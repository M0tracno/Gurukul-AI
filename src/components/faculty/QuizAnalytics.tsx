import React, { useState, useEffect } from 'react';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  GetApp as ExportIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Timer as TimerIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as ViewIcon,
  BarChart as ChartIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import facultyService from '../../services/facultyService';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
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
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    minHeight: '100%',
    background: 'transparent',
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontWeight: 700,
    background: 'linear-gradient(45deg, #E3A648, #B97E26)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '2.5rem',
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: '1.25rem',
    marginBottom: theme.spacing(1),
  },
  description: {
    color: '#95a5a6',
    fontSize: '1rem',
    marginBottom: theme.spacing(3),
  },
  statsContainer: {
    marginBottom: theme.spacing(4),
  },
  statCard: {
    height: '100%',
    background:
      'linear-gradient(135deg, rgba(227, 166, 72, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    borderRadius: 16,
    border: '1px solid rgba(227, 166, 72, 0.2)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 40px rgba(227, 166, 72, 0.2)',
    },
  },
  statIcon: {
    fontSize: '3rem',
    color: '#E3A648',
    marginBottom: theme.spacing(1),
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statSubtitle: {
    fontSize: '0.875rem',
    color: '#95a5a6',
    marginTop: theme.spacing(0.5),
  },
  chartCard: {
    height: '100%',
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    },
  },
  chartTitle: {
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  formControl: {
    minWidth: 200,
    marginRight: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
      borderRadius: 12,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      '& fieldset': {
        borderColor: 'rgba(227, 166, 72, 0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(227, 166, 72, 0.6)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#E3A648',
      },
    },
  },
  primaryButton: {
    background: 'linear-gradient(45deg, #E3A648, #B97E26)',
    color: 'white',
    borderRadius: 12,
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1.5, 3),
    marginRight: theme.spacing(1),
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'linear-gradient(45deg, #C68F32, #8C5D17)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(227, 166, 72, 0.3)',
    },
    '&:disabled': {
      opacity: 0.6,
      transform: 'none',
    },
  },
  secondaryButton: {
    borderRadius: 12,
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1.5, 3),
    border: '2px solid #E3A648',
    color: '#E3A648',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(227, 166, 72, 0.1)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(227, 166, 72, 0.2)',
    },
  },
  refreshButton: {
    borderRadius: '50%',
    minWidth: 48,
    width: 48,
    height: 48,
    background: 'linear-gradient(45deg, #E3A648, #B97E26)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #C68F32, #8C5D17)',
      transform: 'rotate(180deg) scale(1.1)',
    },
  },
  tableContainer: {
    borderRadius: 15,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  headerRow: {
    background: 'linear-gradient(135deg, #E3A648, #B97E26)',
    '& .MuiTableCell-head': {
      color: 'white',
      fontWeight: 700,
      fontSize: '1rem',
    },
  },
  modernTable: {
    '& .MuiTableCell-root': {
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      padding: theme.spacing(2),
    },
    '& .MuiTableRow-root': {
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: 'rgba(227, 166, 72, 0.05)',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  trendIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    gap: theme.spacing(0.5),
  },
  trendUp: {
    color: '#4caf50',
  },
  trendDown: {
    color: '#f44336',
  },
  modernDialog: {
    '& .MuiDialog-paper': {
      borderRadius: 20,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
  },
  noDataContainer: {
    textAlign: 'center',
    padding: theme.spacing(6),
    '& .MuiTypography-root': {
      color: theme.palette.text.secondary,
      fontWeight: 500,
    },
  },
  emptyStateIcon: {
    fontSize: '4rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
}));

const QuizAnalytics = () => {
  const theme = useTheme();
  const classes = useStyles();

  // State
  const [quiz, setQuiz] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [attempts, setAttempts] = useState([]);
  const [timeRange, setTimeRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentDetailDialog, setStudentDetailDialog] = useState({ open: false, student: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [dashboardStats, setDashboardStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    averageTimeSpent: '0m',
  });

  useEffect(() => {
    loadQuizAnalytics();
  }, [timeRange]);

  const loadQuizAnalytics = async () => {
    try {
      setLoading(true);

      // Call the faculty-scoped quiz analytics API (not per-quiz, but all faculty's quizzes)
      const analyticsResponse = await facultyService.getQuizAnalytics(null, timeRange);

      if (analyticsResponse?.success && analyticsResponse?.data) {
        const apiData = analyticsResponse.data;
        
        // Map the backend QuizAnalytics shape to the UI expectations
        const mappedAnalytics = {
          totalAttempts: apiData.totalAttempts || 0,
          averageScore: apiData.averageScorePercent || 0,
          completionRate: apiData.completionRatePercent || 0,
          passRate: apiData.passRatePercent || 0,
          averageTimeSpent: '0m', // Not provided by backend, would need additional calculation
          maxTimeSpent: '0m', // Not provided by backend
          
          // Map scoreDistribution from backend format (e.g., {"0-20": 2, "21-40": 5, ...})
          scoreDistribution: [
            apiData.scoreDistribution?.['0-20'] || 0,
            apiData.scoreDistribution?.['21-40'] || 0,
            apiData.scoreDistribution?.['41-60'] || 0,
            apiData.scoreDistribution?.['61-80'] || 0,
            apiData.scoreDistribution?.['81-100'] || 0,
          ],
          
          // Map completionStatus from backend format (e.g., {queued: 0, processing: 1, completed: 39, failed: 0})
          completedAttempts: apiData.completionStatus?.completed || 0,
          inProgressAttempts: (apiData.completionStatus?.processing || 0) + (apiData.completionStatus?.queued || 0),
          notAttemptedCount: 0, // Not directly provided by backend
          
          // Attempts trend (mock for now, backend doesn't provide historical trend data)
          attemptsTrend: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            data: [0, 0, 0, apiData.totalAttempts || 0], // All attempts shown in current period
            change: 0,
          },
          
          // Question analysis from perAssessment data
          questionAnalysis: [], // Not directly provided in aggregated format
          
          scoreTrend: { change: 0 }, // Not provided by backend
        };
        
        setAnalytics(mappedAnalytics);
        
        // Set a generic quiz for the header (since this is faculty-wide analytics)
        setQuiz({
          id: 'faculty-all',
          title: 'All Assessments',
          subject: 'All Subjects',
          questions: [],
          duration: 0,
          passingScore: 40, // Default pass threshold
        });
        
        // Update dashboard stats
        setDashboardStats({
          totalAttempts: mappedAnalytics.totalAttempts,
          averageScore: mappedAnalytics.averageScore,
          completionRate: mappedAnalytics.completionRate,
          averageTimeSpent: mappedAnalytics.averageTimeSpent,
        });
        
        // For per-assessment details, we could display them in a table
        // Currently setting attempts to empty as we don't have individual submission details
        setAttempts([]);
        
      } else {
        throw new Error('Invalid response from analytics API');
      }
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
      
      // Show friendly error message
      setSnackbar({
        open: true,
        message: 'Unable to load quiz analytics. Please try again later.',
        severity: 'error',
      });
      
      // Set empty/zero state for graceful degradation
      setAnalytics({
        totalAttempts: 0,
        averageScore: 0,
        completionRate: 0,
        passRate: 0,
        averageTimeSpent: '0m',
        maxTimeSpent: '0m',
        scoreDistribution: [0, 0, 0, 0, 0],
        completedAttempts: 0,
        inProgressAttempts: 0,
        notAttemptedCount: 0,
        attemptsTrend: { labels: [], data: [], change: 0 },
        questionAnalysis: [],
        scoreTrend: { change: 0 },
      });
      
      setQuiz({
        id: 'faculty-all',
        title: 'All Assessments',
        subject: 'No Data',
        questions: [],
        duration: 0,
        passingScore: 40,
      });
      
      setDashboardStats({
        totalAttempts: 0,
        averageScore: 0,
        completionRate: 0,
        averageTimeSpent: '0m',
      });
      
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await loadQuizAnalytics();
      setSnackbar({
        open: true,
        message: 'Analytics data refreshed successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setSnackbar({
        open: true,
        message: 'Error refreshing data',
        severity: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const exportResults = async () => {
    try {
      // Note: Export functionality would need a faculty-wide export endpoint
      // For now, show a message that this feature is not yet implemented for faculty-wide analytics
      setSnackbar({
        open: true,
        message: 'Export feature coming soon for faculty-wide analytics',
        severity: 'info',
      });
    } catch (error) {
      console.error('Error exporting results:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting results. Please try again later.',
        severity: 'error',
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getScoreColor = score => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };
  const getTimeSpent = (startTime, endTime) => {
    const diff = new Date(endTime) - new Date(startTime);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Simple date formatting function
  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  // Chart configurations
  const scoreDistributionData = {
    labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
    datasets: [
      {
        label: 'Number of Students',
        data: analytics.scoreDistribution || [0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(244, 67, 54, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(139, 195, 74, 0.8)',
          'rgba(76, 175, 80, 0.8)',
        ],
        borderColor: [
          'rgba(244, 67, 54, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(139, 195, 74, 1)',
          'rgba(76, 175, 80, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const attemptsTrendData = {
    labels: analytics.attemptsTrend?.labels || [],
    datasets: [
      {
        label: 'Attempts',
        data: analytics.attemptsTrend?.data || [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const questionAnalysisData = {
    labels: analytics.questionAnalysis?.map(q => `Q${q.questionNumber}`) || [],
    datasets: [
      {
        label: 'Correct Answers (%)',
        data: analytics.questionAnalysis?.map(q => q.correctPercentage) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const completionStatusData = {
    labels: ['Completed', 'In Progress', 'Not Attempted'],
    datasets: [
      {
        data: [
          analytics.completedAttempts || 0,
          analytics.inProgressAttempts || 0,
          analytics.notAttemptedCount || 0,
        ],
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(158, 158, 158, 0.8)',
        ],
        borderColor: ['rgba(76, 175, 80, 1)', 'rgba(255, 193, 7, 1)', 'rgba(158, 158, 158, 1)'],
        borderWidth: 1,
      },
    ],
  }; // Enhanced StatCard component with modern styling
  const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend }) => (
    <Card className={classes.statCard}>
      <CardContent style={{ textAlign: 'center' }}>
        {React.cloneElement(icon, { className: classes.statIcon })}
        <Typography variant="h4" className={classes.statValue}>
          {value}
        </Typography>
        <Typography variant="caption" className={classes.statLabel}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" className={classes.statSubtitle}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box className={classes.trendIndicator}>
            {trend > 0 ? (
              <TrendingUpIcon className={classes.trendUp} />
            ) : (
              <TrendingDownIcon className={classes.trendDown} />
            )}
            <Typography
              variant="caption"
              className={trend > 0 ? classes.trendUp : classes.trendDown}
            >
              {Math.abs(trend)}% from last quiz
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.loadingContainer}>
          <CircularProgress size={60} style={{ color: '#E3A648' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {/* Header Section */}
      <Paper className={classes.paper}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography variant="h4" className={classes.title}>
              <AnalyticsIcon style={{ fontSize: '3rem' }} />
              Quiz Analytics
            </Typography>
            <Typography variant="h6" className={classes.subtitle}>
              {quiz?.title || 'Loading Quiz...'}
            </Typography>
            <Typography variant="body2" className={classes.description}>
              {quiz?.subject} • {quiz?.questions?.length || 0} questions • {quiz?.duration || 0}{' '}
              minutes
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <FormControl className={classes.formControl}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="quarter">Last Quarter</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              className={classes.secondaryButton}
              startIcon={<ExportIcon />}
              onClick={exportResults}
              style={{ marginRight: 16 }}
            >
              Export Results
            </Button>

            <Tooltip title="Refresh Data">
              <IconButton
                className={classes.refreshButton}
                onClick={handleRefreshData}
                disabled={refreshing}
              >
                {refreshing ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>{' '}
      {/* Summary Statistics */}
      <Grid container spacing={3} className={classes.statsContainer}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Attempts"
            value={analytics.totalAttempts || 0}
            icon={<PeopleIcon />}
            trend={analytics.attemptsTrend?.change}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Average Score"
            value={`${analytics.averageScore || 0}%`}
            subtitle={`${analytics.passRate || 0}% pass rate`}
            icon={<AssessmentIcon />}
            trend={analytics.scoreTrend?.change}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Completion Rate"
            value={`${analytics.completionRate || 0}%`}
            subtitle={`${analytics.completedAttempts || 0} completed`}
            icon={<CheckCircleIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Avg Time Spent"
            value={analytics.averageTimeSpent || '0m'}
            subtitle={`Max: ${analytics.maxTimeSpent || '0m'}`}
            icon={<TimerIcon />}
          />
        </Grid>
      </Grid>
      {/* Charts Row */}
      <Grid container spacing={3} style={{ marginBottom: 32 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className={classes.chartCard}>
            <CardContent>
              <Typography variant="h6" className={classes.chartTitle}>
                <ChartIcon />
                Score Distribution
              </Typography>
              <Box style={{ height: 300 }}>
                <Bar
                  data={scoreDistributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className={classes.chartCard}>
            <CardContent>
              <Typography variant="h6" className={classes.chartTitle}>
                <AssessmentIcon />
                Completion Status
              </Typography>
              <Box
                style={{
                  height: 300,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Doughnut
                  data={completionStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>{' '}
      {/* Question Analysis */}
      <Grid container spacing={3} style={{ marginBottom: 32 }}>
        <Grid size={{ xs: 12 }}>
          <Card className={classes.chartCard}>
            <CardContent>
              <Typography variant="h6" className={classes.chartTitle}>
                <SchoolIcon />
                Question-wise Performance
              </Typography>
              <Box style={{ height: 300 }}>
                <Bar
                  data={questionAnalysisData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function (value) {
                            return value + '%';
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Attempts Over Time */}
      <Grid container spacing={3} style={{ marginBottom: 32 }}>
        <Grid size={{ xs: 12 }}>
          <Card className={classes.chartCard}>
            <CardContent>
              <Typography variant="h6" className={classes.chartTitle}>
                <TrendingUpIcon />
                Quiz Attempts Over Time
              </Typography>
              <Box style={{ height: 300 }}>
                <Line
                  data={attemptsTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>{' '}
      {/* Student Results Table */}
      <Card className={classes.chartCard}>
        <CardContent>
          <Typography variant="h6" className={classes.chartTitle}>
            <PeopleIcon />
            Student Results
          </Typography>
          {attempts.length > 0 ? (
            <TableContainer className={classes.tableContainer}>
              <Table className={classes.modernTable}>
                <TableHead className={classes.headerRow}>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time Spent</TableCell>
                    <TableCell>Attempt Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attempts.map(attempt => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: 'linear-gradient(45deg, #E3A648, #B97E26)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              marginRight: 16,
                              fontSize: '0.875rem',
                            }}
                          >
                            {attempt.studentName?.charAt(0) || 'S'}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                              {attempt.studentName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {attempt.studentId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography variant="h6" style={{ marginRight: 8, fontWeight: 700 }}>
                            {attempt.score}%
                          </Typography>
                          <Chip
                            label={attempt.score >= (quiz?.passingScore || 60) ? 'Pass' : 'Fail'}
                            color={getScoreColor(attempt.score)}
                            size="small"
                            style={{
                              fontWeight: 600,
                              borderRadius: 12,
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={attempt.status}
                          color={
                            attempt.status === 'completed'
                              ? 'success'
                              : attempt.status === 'in-progress'
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                          style={{
                            fontWeight: 600,
                            borderRadius: 12,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" style={{ fontWeight: 500 }}>
                          {getTimeSpent(attempt.startTime, attempt.endTime)}
                        </Typography>
                      </TableCell>{' '}
                      <TableCell>
                        <Typography variant="body2" style={{ fontWeight: 500 }}>
                          {formatDate(attempt.submittedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setStudentDetailDialog({ open: true, student: attempt })}
                            style={{
                              background: 'linear-gradient(45deg, #E3A648, #B97E26)',
                              color: 'white',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #C68F32, #8C5D17)',
                              },
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box className={classes.noDataContainer}>
              <AssessmentIcon className={classes.emptyStateIcon} />
              <Typography variant="h6">No quiz attempts found</Typography>
              <Typography variant="body2" style={{ marginTop: 8 }}>
                Students haven't attempted this quiz yet.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>{' '}
      {/* Student Detail Dialog */}
      <Dialog
        open={studentDetailDialog.open}
        onClose={() => setStudentDetailDialog({ open: false, student: null })}
        maxWidth="md"
        fullWidth
        className={classes.modernDialog}
      >
        <DialogTitle>
          <Typography variant="h6" style={{ fontWeight: 600, color: '#2c3e50' }}>
            {studentDetailDialog.student?.studentName} - Quiz Results
          </Typography>
        </DialogTitle>
        <DialogContent>
          {studentDetailDialog.student && (
            <Box>
              <Grid container spacing={2} style={{ marginBottom: 24 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="textSecondary" style={{ fontWeight: 500 }}>
                    Score
                  </Typography>
                  <Typography variant="h6" style={{ fontWeight: 700, color: '#2c3e50' }}>
                    {studentDetailDialog.student.score}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="textSecondary" style={{ fontWeight: 500 }}>
                    Time Spent
                  </Typography>
                  <Typography variant="h6" style={{ fontWeight: 700, color: '#2c3e50' }}>
                    {getTimeSpent(
                      studentDetailDialog.student.startTime,
                      studentDetailDialog.student.endTime
                    )}
                  </Typography>
                </Grid>
              </Grid>

              <Typography
                variant="h6"
                style={{ marginBottom: 16, fontWeight: 600, color: '#2c3e50' }}
              >
                Question-wise Performance
              </Typography>
              <List style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: 12 }}>
                {studentDetailDialog.student.answers?.map((answer, index) => (
                  <Box key={index}>
                    <ListItem style={{ borderRadius: 8 }}>
                      <ListItemAvatar>
                        <Avatar
                          style={{
                            backgroundColor: answer.isCorrect ? '#4caf50' : '#f44336',
                            width: 32,
                            height: 32,
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Typography
                            variant="subtitle2"
                            style={{ fontWeight: 600, marginBottom: 8 }}
                          >
                            {answer.question}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              style={{ marginBottom: 4 }}
                            >
                              <strong>Student Answer:</strong> {answer.studentAnswer}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              style={{ marginBottom: 4 }}
                            >
                              <strong>Correct Answer:</strong> {answer.correctAnswer}
                            </Typography>
                            <Typography
                              variant="body2"
                              style={{
                                color: answer.isCorrect ? '#4caf50' : '#f44336',
                                fontWeight: 600,
                              }}
                            >
                              {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < studentDetailDialog.student.answers.length - 1 && (
                      <Divider style={{ margin: '8px 0' }} />
                    )}
                  </Box>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setStudentDetailDialog({ open: false, student: null })}
            className={classes.secondaryButton}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        action={
          <IconButton size="small" color="inherit" onClick={handleCloseSnackbar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default QuizAnalytics;
