import React, { useState, useEffect, useCallback } from 'react';
import { Line, Radar, Doughnut } from 'react-chartjs-2';
import AdaptiveLearningService from '../../services/AdaptiveLearningService';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  toLocaleString,
} from '@mui/material';
import { Timeline } from '@mui/lab';
import {
  School,
  AutoAwesome,
  Refresh,
  Psychology,
  Speed,
  Timeline as TimelineIcon,
  Analytics,
  GpsFixed,
  Lightbulb,
  Star,
  Warning,
  BookmarkBorder,
  CheckCircle,
  Insights,
  GraphicEq,
} from '@mui/icons-material';

// Phase 3B: Adaptive Learning Dashboard
// Analytics and insights for personalized learning
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  RadialLinearScale,
  BarElement,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  RadialLinearScale,
  BarElement,
  ArcElement
);

const AdaptiveLearningDashboard = ({ studentId, onPathSelect, onContentAdapt }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [learningProfile, setLearningProfile] = useState(null);
  // const [learningInsights, setLearningInsights] = useState(null); // TODO: Use for insights display
  const [learningPaths, setLearningPaths] = useState([]);
  const [adaptationHistory, setAdaptationHistory] = useState([]);
  const [error, setError] = useState(null);
  // Services
  const [adaptiveService, setAdaptiveService] = useState(null); // Callback functions
  const handleProfileUpdate = useCallback(
    data => {
      if (data.studentId === studentId) {
        setLearningProfile(data.profile);
      }
    },
    [studentId]
  );

  const handlePathGenerated = useCallback(
    data => {
      if (data.studentId === studentId) {
        setLearningPaths(prev => [...prev, data.path]);
      }
    },
    [studentId]
  );

  const handleContentAdapted = useCallback(
    data => {
      if (data.studentId === studentId) {
        setAdaptationHistory(prev => [
          ...prev,
          {
            timestamp: new Date(),
            contentId: data.contentId,
            adaptationType: data.adaptationType,
            effectiveness: data.effectiveness,
          },
        ]);
      }
    },
    [studentId]
  );

  const initializeService = useCallback(async () => {
    try {
      const service = new AdaptiveLearningService();
      await service.initialize();
      setAdaptiveService(service);

      // Setup event listeners
      service.on('profileUpdated', handleProfileUpdate);
      service.on('pathGenerated', handlePathGenerated);
      service.on('contentAdapted', handleContentAdapted);
    } catch (error) {
      console.error('Failed to initialize adaptive learning service:', error);
      setError(error.message);
    }
  }, [handleProfileUpdate, handlePathGenerated, handleContentAdapted]);

  const loadStudentData = useCallback(async () => {
    if (!adaptiveService || !studentId) return;

    try {
      setLoading(true);

      // Load or create learning profile
      let profile = adaptiveService.learningProfiles.get(studentId);
      if (!profile) {
        profile = await adaptiveService.createLearningProfile(studentId, {
          // Mock student data - in real app, fetch from database
          academicLevel: 'Grade 10',
          subjects: ['Mathematics', 'Science', 'English'],
          learningPreferences: {
            visualLearner: true,
            practiceOriented: true,
            challengeLevel: 'medium',
          },
          performanceHistory: [],
        });
      }

      setLearningProfile(profile);

      // Generate and set learning paths
      const paths = await adaptiveService.generateLearningPaths(studentId, [
        'Mathematics',
        'Science',
      ]);
      setLearningPaths(paths);

      // Get adaptation history
      const history = adaptiveService.adaptationHistory.get(studentId) || [];
      setAdaptationHistory(history);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load student data:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [
    adaptiveService,
    studentId,
    setLoading,
    setLearningProfile,
    setLearningPaths,
    setAdaptationHistory,
    setError,
  ]);

  useEffect(() => {
    initializeService();
  }, [initializeService]);

  useEffect(() => {
    if (adaptiveService && studentId) {
      loadStudentData();
    }
  }, [
    adaptiveService,
    studentId,
    loadStudentData,
    handleProfileUpdate,
    handlePathGenerated,
    handleContentAdapted,
  ]);

  const generateNewLearningPath = async subject => {
    try {
      const path = await adaptiveService.generateLearningPath(studentId, subject);
      if (onPathSelect) {
        onPathSelect(path);
      }
    } catch (error) {
      console.error('Failed to generate learning path:', error);
      setError(error.message);
    }
  };

  const refreshData = () => {
    loadStudentData();
  };

  // Chart configurations
  const learningProgressData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Learning Progress',
        data: [65, 75, 80, 85],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Engagement Level',
        data: [70, 78, 85, 82],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const learningStyleData = {
    labels: ['Visual', 'Auditory', 'Kinesthetic', 'Reading'],
    datasets: [
      {
        label: 'Learning Style Preference',
        data: [85, 65, 78, 72],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const difficultyDistribution = {
    labels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    datasets: [
      {
        data: [15, 45, 30, 10],
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336', '#9C27B0'],
      },
    ],
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading adaptive learning data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refreshData}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}{' '}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
          Adaptive Learning Dashboard
        </Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={refreshData}>
          Refresh Data
        </Button>
      </Box>
      {/* Learning Profile Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Psychology />
                </Avatar>
                <Typography variant="h6">Learning Style</Typography>
              </Box>
              <Chip
                label={learningProfile?.learningStyle || 'Mixed'}
                color="primary"
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                Confidence: {Math.round((learningProfile?.learningStyleConfidence || 0.75) * 100)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <Speed />
                </Avatar>
                <Typography variant="h6">Current Level</Typography>
              </Box>
              <Chip
                label={learningProfile?.currentLevel || 'Intermediate'}
                color="success"
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                Progress: 78%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              {' '}
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <TimelineIcon />
                </Avatar>
                <Typography variant="h6">Study Streak</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                12
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Days consecutive
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <Analytics />
                </Avatar>
                <Typography variant="h6">Completion Rate</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                85%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Tabs */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Learning Analytics" icon={<Analytics />} />
          <Tab label="Personalized Paths" icon={<GpsFixed />} />
          <Tab label="Adaptation History" icon={<AutoAwesome />} />
          <Tab label="Recommendations" icon={<Lightbulb />} />
        </Tabs>
      </Paper>
      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Learning Progress Chart */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Learning Progress & Engagement
                </Typography>
                <Line data={learningProgressData} />
              </CardContent>
            </Card>
          </Grid>

          {/* Learning Style Radar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Learning Style Analysis
                </Typography>
                <Radar data={learningStyleData} />
              </CardContent>
            </Card>
          </Grid>

          {/* Difficulty Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Content Difficulty Distribution
                </Typography>
                <Doughnut data={difficultyDistribution} />
              </CardContent>
            </Card>
          </Grid>

          {/* Strengths and Weaknesses */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Analysis
                </Typography>
                <Box mb={2}>
                  <Typography variant="subtitle2" color="success.main">
                    <Star sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Strengths
                  </Typography>
                  {learningProfile?.strengths?.map((strength, index) => (
                    <Chip
                      key={index}
                      label={strength}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="warning.main">
                    <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Areas for Improvement
                  </Typography>
                  {learningProfile?.weaknesses?.map((weakness, index) => (
                    <Chip
                      key={index}
                      label={weakness}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Active Learning Paths */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Active Learning Paths</Typography>{' '}
                  <Button
                    variant="contained"
                    startIcon={<GpsFixed />}
                    onClick={() => generateNewLearningPath('mathematics')}
                  >
                    Generate New Path
                  </Button>
                </Box>

                {learningPaths.length === 0 ? (
                  <Alert severity="info">
                    No active learning paths. Generate a personalized path to get started!
                  </Alert>
                ) : (
                  <List>
                    {learningPaths.map((path, index) => (
                      <React.Fragment key={path.pathId}>
                        <ListItem>
                          <ListItemIcon>
                            <School color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${path.subject} - ${path.startLevel} to ${path.targetLevel}`}
                            secondary={
                              <Box>
                                <Typography variant="body2" component="span">
                                  {path.modules.length} modules • {path.estimatedDuration} minutes
                                </Typography>
                                <Box mt={1}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={65}
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                  <Typography variant="caption" color="textSecondary">
                                    65% complete
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                          <Badge badgeContent="Active" color="success">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onPathSelect && onPathSelect(path)}
                            >
                              Continue
                            </Button>
                          </Badge>
                        </ListItem>
                        {index < learningPaths.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Path Recommendations */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommended Subjects
                </Typography>
                <List dense>
                  {['Mathematics', 'Science', 'Programming', 'Language Arts', 'History'].map(
                    subject => (
                      <ListItem
                        key={subject}
                        button
                        onClick={() => generateNewLearningPath(subject.toLowerCase())}
                      >
                        <ListItemIcon>
                          <BookmarkBorder />
                        </ListItemIcon>
                        <ListItemText primary={subject} secondary="Personalized path available" />
                      </ListItem>
                    )
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Real-time Adaptation History
            </Typography>
            {adaptationHistory.length === 0 ? (
              <Alert severity="info">
                No adaptations recorded yet. Adaptations will appear here as you interact with
                content.
              </Alert>
            ) : (
              <List>
                {adaptationHistory.map((adaptation, index) => (
                  <React.Fragment key={index}>
                    {' '}
                    <ListItem>
                      <ListItemIcon>
                        <AutoAwesome color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Content adapted: ${adaptation.contentId}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {new Date(adaptation.timestamp).toLocaleString()}
                            </Typography>
                            <Box mt={1}>
                              {adaptation.adaptations.map((adapt, i) => (
                                <Chip
                                  key={i}
                                  label={adapt.type}
                                  size="small"
                                  color="secondary"
                                  sx={{ mr: 1 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < adaptationHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* AI Recommendations */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Lightbulb sx={{ verticalAlign: 'middle', mr: 1 }} />
                  AI-Powered Recommendations
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Increase visual content"
                      secondary="Your learning style analysis suggests 85% visual preference"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Insights color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Schedule shorter sessions"
                      secondary="Optimal session length for you: 25-30 minutes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <GraphicEq color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Practice more problem-solving"
                      secondary="Detected weakness in analytical reasoning"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Study Schedule Optimization */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                {' '}
                <Typography variant="h6" gutterBottom>
                  <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Optimized Study Schedule
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Based on your engagement patterns, these are your optimal study times:
                </Alert>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Morning Focus Sessions"
                      secondary="9:00 AM - 10:30 AM (Peak concentration)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Afternoon Review"
                      secondary="2:00 PM - 3:00 PM (Light review sessions)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Evening Practice"
                      secondary="7:00 PM - 8:00 PM (Hands-on exercises)"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdaptiveLearningDashboard;
