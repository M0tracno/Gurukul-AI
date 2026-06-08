import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Refresh, Warning } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Divider, FormControl, FormControlLabel, Grid, InputLabel, List, ListItem, ListItemIcon, ListItemTextItem, Paper, Select, Switch, Tab, Tabs, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Timeline } from '@mui/lab';
// Phase 3C: Personalized Assessment Dashboard Component
// Comprehensive analytics and insights for assessment performance

// Register Chart.js components

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assessment-tabpanel-${index}`}
      aria-labelledby={`assessment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PersonalizedAssessmentDashboard = ({
  const theme = useTheme();
  const originalTheme = useTheme();
  studentId,
  assessmentService,
  onAssessmentSelect,
  onRecommendationApply,
  realTimeUpdates = true
}) => {const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [skillGaps, setSkillGaps] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30days');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const updateInterval = useRef(null);

  useEffect(() => {
    loadDashboardData();
    
    if (realTimeUpdates) {
      updateInterval.current = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    }

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [studentId, selectedTimeRange, selectedSubject]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load assessment performance data
      const assessments = await assessmentService.getStudentAssessments(studentId, {
        timeRange: selectedTimeRange,
        subject: selectedSubject
      });

      const performance = await assessmentService.getStudentPerformance(studentId, {
        timeRange: selectedTimeRange,
        subject: selectedSubject
      });

      const gaps = await assessmentService.identifySkillGaps(studentId);
      const recs = await assessmentService.generateRecommendations(studentId);

      setAssessmentData(assessments);
      setPerformanceData(performance);
      setSkillGaps(gaps);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getPerformanceChartData = () => {
    if (!performanceData?.timeline) return null;

    return {
      labels: performanceData.timeline.map(point => point.date),
      datasets: [
        {
          label: 'Accuracy %',
          data: performanceData.timeline.map(point => point.accuracy),
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.main + '20',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Speed (Questions/Min)',
          data: performanceData.timeline.map(point => point.speed),
          borderColor: theme.palette.secondary.main,
          backgroundColor: theme.palette.secondary.main + '20',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const getSubjectDistributionData = () => {
    if (!performanceData?.subjects) return null;

    const subjects = Object.keys(performanceData.subjects);
    const scores = subjects.map(subject => performanceData.subjects[subject].averageScore);

    return {
      labels: subjects,
      datasets: [
        {
          label: 'Average Score',
          data: scores,
          backgroundColor: [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.error.main,
            theme.palette.info.main
          ],
          borderWidth: 2,
          borderColor: theme.palette.background.paper
        }
      ]
    };
  };

  const getDifficultyProgressData = () => {
    if (!performanceData?.difficultyProgress) return null;

    return {
      labels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      datasets: [
        {
          label: 'Mastery Level %',
          data: [
            performanceData.difficultyProgress.beginner,
            performanceData.difficultyProgress.intermediate,
            performanceData.difficultyProgress.advanced,
            performanceData.difficultyProgress.expert
          ],
          backgroundColor: [
            theme.palette.success.main,
            theme.palette.info.main,
            theme.palette.warning.main,
            theme.palette.error.main
          ]
        }
      ]
    };
  };

  const getPerformanceScore = () => {
    if (!performanceData) return 0;
    return Math.round(performanceData.overallScore || 0);
  };

  const getPerformanceTrend = () => {
    if (!performanceData?.trend) return 'neutral';
    return performanceData.trend; // 'improving', 'declining', 'stable'
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp color="success" />;
      case 'declining': return <TrendingDown color="error" />;
      default: return <Timeline color="info" />;
    }
  };

  const getGradeColor = (score) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 80) return theme.palette.info.main;
    if (score >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading assessment dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Assessment sx={{ fontSize: 'inherit', mr: 2, verticalAlign: 'middle' }} />
          Assessment Dashboard
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Personalized insights and analytics for assessment performance
        </Typography>

        {/* Controls */}
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="3months">Last 3 Months</MenuItem>
              <MenuItem value="1year">Last Year</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubject}
              label="Subject"
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <MenuItem value="all">All Subjects</MenuItem>
              <MenuItem value="mathematics">Mathematics</MenuItem>
              <MenuItem value="science">Science</MenuItem>
              <MenuItem value="language">Language</MenuItem>
              <MenuItem value="history">History</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showAdvancedMetrics}
                onChange={(e) => setShowAdvancedMetrics(e.target.checked)}
              />
            }
            label="Advanced Metrics"
          />

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Performance Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{xs:12,md:3}}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Overall Score
                  </Typography>
                  <Typography variant="h4" sx={{ color: getGradeColor(getPerformanceScore()) }}>
                    {getPerformanceScore()}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: getGradeColor(getPerformanceScore()) }}>
                  <EmojiEvents />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12,md:3}}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Performance Trend
                  </Typography>
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {getPerformanceTrend()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  {getTrendIcon(getPerformanceTrend())}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12,md:3}}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Assessments Completed
                  </Typography>
                  <Typography variant="h4">
                    {assessmentData?.completed || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12,md:3}}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Skill Gaps
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {skillGaps.length}
                  </Typography>
                </Box>                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <GpsFixed />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Performance Analytics" icon={<BarChart />} />
          <Tab label="Skill Analysis" icon={<Psychology />} />
          <Tab label="Progress Tracking" icon={<ShowChart />} />
          <Tab label="Recommendations" icon={<Lightbulb />} />
        </Tabs>
      </Paper>

      {/* Tab 1: Performance Analytics */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Performance Timeline */}
          <Grid size={{xs:12,lg:8}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Timeline
                </Typography>
                {getPerformanceChartData() ? (
                  <Box height={400}>
                    <Line
                      data={getPerformanceChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Accuracy %' }
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Speed (Q/Min)' },
                            grid: { drawOnChartArea: false }
                          }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="textSecondary">No performance data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Subject Distribution */}
          <Grid size={{xs:12,lg:4}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Subject Performance
                </Typography>
                {getSubjectDistributionData() ? (
                  <Box height={400}>
                    <Doughnut
                      data={getSubjectDistributionData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="textSecondary">No subject data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Difficulty Progress */}
          <Grid size={{xs:12}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Difficulty Level Mastery
                </Typography>
                {getDifficultyProgressData() ? (
                  <Box height={300}>
                    <Bar
                      data={getDifficultyProgressData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Mastery %' }
                          }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="textSecondary">No difficulty data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Skill Analysis */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {/* Skill Gaps */}
          <Grid size={{xs:12,md:6}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Identified Skill Gaps
                </Typography>
                {skillGaps.length > 0 ? (
                  <List>
                    {skillGaps.map((gap, index) => (
                      <React.Fragment key={gap.id}>
                        <ListItem>                          <ListItemIcon>
                            <GpsFixed color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={gap.skill}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  Proficiency: {gap.currentLevel}% → Target: {gap.targetLevel}%
                                </Typography>
                                <Chip
                                  label={gap.priority}
                                  size="small"
                                  color={gap.priority === 'high' ? 'error' : gap.priority === 'medium' ? 'warning' : 'info'}
                                  sx={{ mt: 1 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < skillGaps.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Alert severity="success">
                    No significant skill gaps identified. Great work!
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Strengths */}
          <Grid size={{xs:12,md:6}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Star sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Skill Strengths
                </Typography>
                {performanceData?.strengths?.length > 0 ? (
                  <List>
                    {performanceData.strengths.map((strength, index) => (
                      <React.Fragment key={strength.id}>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={strength.skill}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  Proficiency: {strength.level}%
                                </Typography>
                                <Chip
                                  label="Strength"
                                  size="small"
                                  color="success"
                                  sx={{ mt: 1 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < performanceData.strengths.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">
                    Complete more assessments to identify your strengths.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Learning Style Analysis */}
          <Grid size={{xs:12}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Learning Style Analysis
                </Typography>
                {performanceData?.learningStyle ? (
                  <Grid container spacing={2}>
                    <Grid size={{xs:12,md:3}}>
                      <Box textAlign="center" p={2}>
                        <Typography variant="h4" color="primary">
                          {performanceData.learningStyle.visual}%
                        </Typography>
                        <Typography variant="body2">Visual</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{xs:12,md:3}}>
                      <Box textAlign="center" p={2}>
                        <Typography variant="h4" color="secondary">
                          {performanceData.learningStyle.auditory}%
                        </Typography>
                        <Typography variant="body2">Auditory</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{xs:12,md:3}}>
                      <Box textAlign="center" p={2}>
                        <Typography variant="h4" color="success.main">
                          {performanceData.learningStyle.kinesthetic}%
                        </Typography>
                        <Typography variant="body2">Kinesthetic</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{xs:12,md:3}}>
                      <Box textAlign="center" p={2}>
                        <Typography variant="h4" color="warning.main">
                          {performanceData.learningStyle.reading}%
                        </Typography>
                        <Typography variant="body2">Reading/Writing</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography color="textSecondary">
                    Learning style analysis will be available after completing more assessments.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Progress Tracking */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{xs:12}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Learning Progress Over Time
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Track your improvement across different subjects and difficulty levels.
                </Typography>
                {/* Progress tracking charts would go here */}
                <Alert severity="info">
                  Progress tracking visualization will be enhanced with more assessment data.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: Recommendations */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{xs:12}}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                  AI-Powered Recommendations
                </Typography>
                {recommendations.length > 0 ? (
                  <List>
                    {recommendations.map((rec, index) => (
                      <React.Fragment key={rec.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon>
                            <Psychology color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={rec.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary" paragraph>
                                  {rec.description}
                                </Typography>
                                <Box display="flex" gap={1} alignItems="center">
                                  <Chip
                                    label={rec.priority}
                                    size="small"
                                    color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                                  />
                                  <Chip
                                    label={rec.category}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Button
                                    size="small"
                                    onClick={() => onRecommendationApply && onRecommendationApply(rec)}
                                  >
                                    Apply
                                  </Button>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < recommendations.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    Complete more assessments to receive personalized recommendations.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default PersonalizedAssessmentDashboard;
