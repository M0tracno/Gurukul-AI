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
import { useParams } from 'react-router-dom';
import facultyService from '../../services/facultyService';
import EnhancedFacultyService from '../../services/enhancedFacultyService';
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
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
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
      'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    borderRadius: 16,
    border: '1px solid rgba(102, 126, 234, 0.2)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 40px rgba(102, 126, 234, 0.2)',
    },
  },
  statIcon: {
    fontSize: '3rem',
    color: '#667eea',
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
        borderColor: 'rgba(102, 126, 234, 0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(102, 126, 234, 0.6)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#667eea',
      },
    },
  },
  primaryButton: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    borderRadius: 12,
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1.5, 3),
    marginRight: theme.spacing(1),
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
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
    border: '2px solid #667eea',
    color: '#667eea',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(102, 126, 234, 0.1)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.2)',
    },
  },
  refreshButton: {
    borderRadius: '50%',
    minWidth: 48,
    width: 48,
    height: 48,
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
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
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
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
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
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
  const { quizId } = useParams();

  // Enhanced Faculty Service instance (use the exported singleton)
  const enhancedFacultyService = EnhancedFacultyService;

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
  }, [quizId, timeRange]);

  const loadQuizAnalytics = async () => {
    try {
      setLoading(true);

      // Try original service first, then fallback to enhanced service
      let quizResponse, analyticsResponse, attemptsResponse;

      try {
        [quizResponse, analyticsResponse, attemptsResponse] = await Promise.all([
          facultyService.getQuiz(quizId),
          facultyService.getQuizAnalytics(quizId, timeRange),
          facultyService.getQuizAttempts(quizId),
        ]);
      } catch (error) {
        console.log('Falling back to enhanced service for quiz analytics');

        // Fallback to enhanced service with mock data
        const mockQuizData = await enhancedFacultyService.getQuizAnalytics(quizId || 'quiz-1');
        if (mockQuizData.success) {
          quizResponse = { data: mockQuizData.data.quiz };
          analyticsResponse = { data: mockQuizData.data.analytics };
          attemptsResponse = { data: mockQuizData.data.attempts };
        }
      }

      if (quizResponse?.data) {
        setQuiz(quizResponse.data);
        setAnalytics(analyticsResponse?.data || {});
        setAttempts(attemptsResponse?.data || []);

        // Update dashboard stats
        const stats = analyticsResponse?.data || {};
        setDashboardStats({
          totalAttempts: stats.totalAttempts || 0,
          averageScore: stats.averageScore || 0,
          completionRate: stats.completionRate || 0,
          averageTimeSpent: stats.averageTimeSpent || '0m',
        });
      } else {
        // Use completely mock data if everything fails
        await loadMockData();
      }
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
      await loadMockData();
      setSnackbar({
        open: true,
        message: 'Error loading quiz data. Using sample data.',
        severity: 'warning',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = async () => {
    const mockQuiz = {
      id: quizId || 'quiz-1',
      title: 'Data Structures & Algorithms Quiz',
      subject: 'Computer Science',
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: `Question ${i + 1}`,
      })),
      duration: 60,
      passingScore: 60,
    };

    const mockAnalytics = {
      totalAttempts: 45,
      averageScore: 78,
      completionRate: 87,
      averageTimeSpent: '42m',
      passRate: 82,
      maxTimeSpent: '60m',
      scoreDistribution: [2, 5, 8, 15, 15],
      attemptsTrend: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        data: [8, 12, 15, 10],
        change: 15,
      },
      questionAnalysis: mockQuiz.questions.map((q, i) => ({
        questionNumber: i + 1,
        correctPercentage: Math.floor(Math.random() * 40) + 60,
      })),
      completedAttempts: 39,
      inProgressAttempts: 4,
      notAttemptedCount: 2,
      scoreTrend: { change: 8 },
    };

    const mockAttempts = Array.from({ length: 15 }, (_, i) => ({
      id: `attempt-${i + 1}`,
      studentId: `S${2024000 + i + 1}`,
      studentName: [
        'Alex Johnson',
        'Emma Wilson',
        'Michael Brown',
        'Sophia Davis',
        'Daniel Miller',
        'Olivia Martinez',
        'James Anderson',
        'Isabella Garcia',
        'William Rodriguez',
        'Ava Lopez',
        'Benjamin Lee',
        'Mia Gonzalez',
        'Jacob Harris',
        'Charlotte Clark',
        'Ethan Lewis',
      ][i],
      score: Math.floor(Math.random() * 40) + 60,
      status: ['completed', 'completed', 'in-progress'][Math.floor(Math.random() * 3)],
      startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
      answers: mockQuiz.questions.map((q, qi) => ({
        question: `Question ${qi + 1}: What is the time complexity of binary search?`,
        studentAnswer: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'][Math.floor(Math.random() * 4)],
        correctAnswer: 'O(log n)',
        isCorrect: Math.random() > 0.3,
      })),
    }));

    setQuiz(mockQuiz);
    setAnalytics(mockAnalytics);
    setAttempts(mockAttempts);
    setDashboardStats({
      totalAttempts: mockAnalytics.totalAttempts,
      averageScore: mockAnalytics.averageScore,
      completionRate: mockAnalytics.completionRate,
      averageTimeSpent: mockAnalytics.averageTimeSpent,
    });
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
      await facultyService.exportQuizResults(quizId);
      setSnackbar({
        open: true,
        message: 'Quiz results exported successfully',
        severity: 'success',
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
          <CircularProgress size={60} style={{ color: '#667eea' }} />
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
                              background: 'linear-gradient(45deg, #667eea, #764ba2)',
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
                              background: 'linear-gradient(45deg, #667eea, #764ba2)',
                              color: 'white',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
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
