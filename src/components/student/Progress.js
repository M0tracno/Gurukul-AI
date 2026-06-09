import React, { useEffect } from 'react';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Download,
  Quiz as QuizIcon,
  Refresh,
  School as SchoolIcon,
  Star as StarIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
const Progress = () => {
  const [tabValue, setTabValue] = useState(0);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for student progress data
    const mockProgressData = {
      student: {
        name: 'Current Student',
        grade: '10th Grade',
        class: 'A',
        studentId: 'STU001',
        overallGrade: 85,
        rank: 12,
        totalStudents: 45,
        trend: 'up',
      },
      subjects: [
        {
          name: 'Mathematics',
          currentGrade: 88,
          previousGrade: 82,
          trend: 'up',
          targetGrade: 90,
          assignments: { completed: 8, total: 10, pending: 2, overdue: 0 },
          quizzes: { completed: 4, total: 5, upcoming: 1 },
          attendance: 95,
          teacherFeedback: 'Excellent problem-solving skills. Keep up the good work!',
        },
        {
          name: 'English Literature',
          currentGrade: 82,
          previousGrade: 85,
          trend: 'down',
          targetGrade: 88,
          assignments: { completed: 9, total: 10, pending: 1, overdue: 0 },
          quizzes: { completed: 5, total: 5, upcoming: 0 },
          attendance: 92,
          teacherFeedback: 'Good analytical skills. Focus more on essay structure.',
        },
        {
          name: 'Physics',
          currentGrade: 90,
          previousGrade: 87,
          trend: 'up',
          targetGrade: 92,
          assignments: { completed: 10, total: 12, pending: 2, overdue: 0 },
          quizzes: { completed: 3, total: 4, upcoming: 1 },
          attendance: 98,
          teacherFeedback: 'Outstanding performance in lab work and theory.',
        },
        {
          name: 'Chemistry',
          currentGrade: 78,
          previousGrade: 80,
          trend: 'down',
          targetGrade: 85,
          assignments: { completed: 7, total: 9, pending: 1, overdue: 1 },
          quizzes: { completed: 4, total: 4, upcoming: 0 },
          attendance: 90,
          teacherFeedback: 'Need to improve lab report quality and theory understanding.',
        },
        {
          name: 'History',
          currentGrade: 86,
          previousGrade: 84,
          trend: 'up',
          targetGrade: 88,
          assignments: { completed: 9, total: 10, pending: 1, overdue: 0 },
          quizzes: { completed: 5, total: 5, upcoming: 0 },
          attendance: 94,
          teacherFeedback: 'Great research skills and historical analysis.',
        },
      ],
      progressChart: [
        {
          month: 'Jan',
          overall: 75,
          math: 70,
          english: 80,
          physics: 78,
          chemistry: 72,
          history: 76,
        },
        {
          month: 'Feb',
          overall: 78,
          math: 75,
          english: 82,
          physics: 80,
          chemistry: 74,
          history: 78,
        },
        {
          month: 'Mar',
          overall: 80,
          math: 78,
          english: 83,
          physics: 85,
          chemistry: 76,
          history: 80,
        },
        {
          month: 'Apr',
          overall: 82,
          math: 82,
          english: 84,
          physics: 87,
          chemistry: 78,
          history: 82,
        },
        {
          month: 'May',
          overall: 84,
          math: 85,
          english: 84,
          physics: 89,
          chemistry: 79,
          history: 84,
        },
        {
          month: 'Jun',
          overall: 85,
          math: 88,
          english: 82,
          physics: 90,
          chemistry: 78,
          history: 86,
        },
      ],
      skillsRadar: [
        { skill: 'Problem Solving', score: 85 },
        { skill: 'Critical Thinking', score: 78 },
        { skill: 'Communication', score: 82 },
        { skill: 'Collaboration', score: 88 },
        { skill: 'Creativity', score: 75 },
        { skill: 'Time Management', score: 70 },
      ],
      achievements: [
        { title: 'Math Quiz Champion', date: '2025-06-01', icon: 'trophy', type: 'academic' },
        { title: 'Perfect Attendance', date: '2025-05-30', icon: 'star', type: 'attendance' },
        { title: 'Science Fair Winner', date: '2025-05-15', icon: 'trophy', type: 'competition' },
        { title: 'Assignment Streak', date: '2025-05-10', icon: 'target', type: 'assignment' },
      ],
      goals: [
        { title: 'Achieve 90+ in Mathematics', progress: 88, target: 90, deadline: '2025-07-01' },
        { title: 'Improve Chemistry Grade', progress: 78, target: 85, deadline: '2025-06-30' },
        {
          title: 'Complete All Pending Assignments',
          progress: 70,
          target: 100,
          deadline: '2025-06-15',
        },
      ],
      recentActivities: [
        {
          type: 'assignment',
          subject: 'Mathematics',
          title: 'Calculus Problems',
          score: 92,
          date: '2025-06-06',
          status: 'completed',
        },
        {
          type: 'quiz',
          subject: 'Physics',
          title: 'Mechanics Test',
          score: 88,
          date: '2025-06-05',
          status: 'completed',
        },
        {
          type: 'assignment',
          subject: 'English',
          title: 'Literary Analysis',
          score: 85,
          date: '2025-06-04',
          status: 'completed',
        },
        {
          type: 'assignment',
          subject: 'Chemistry',
          title: 'Lab Report',
          score: null,
          date: '2025-06-07',
          status: 'pending',
        },
      ],
    };

    setTimeout(() => {
      setProgressData(mockProgressData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getGradeColor = grade => {
    if (grade >= 85) return 'success';
    if (grade >= 70) return 'warning';
    return 'error';
  };

  const getTrendIcon = trend => {
    return trend === 'up' ? <TrendingUpIcon color="success" /> : <TrendingDownIcon color="error" />;
  };

  const getTrendColor = trend => {
    return trend === 'up' ? 'success' : 'error';
  };

  const getActivityIcon = type => {
    return type === 'assignment' ? <AssignmentIcon /> : <QuizIcon />;
  };

  const getAchievementIcon = iconType => {
    switch (iconType) {
      case 'trophy':
        return <TrophyIcon />;
      case 'star':
        return <StarIcon />;
      case 'target':
        return <TargetIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading progress data...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          My Academic Progress
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Download />} sx={{ borderRadius: 2 }}>
            Download Report
          </Button>
        </Box>
      </Box>

      {/* Overall Performance Summary */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h2" color="primary" fontWeight="bold">
                  {progressData.student.overallGrade}%
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Overall Grade
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center">
                  {getTrendIcon(progressData.student.trend)}
                  <Typography
                    variant="body2"
                    color={getTrendColor(progressData.student.trend)}
                    sx={{ ml: 0.5 }}
                  >
                    Trending {progressData.student.trend}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h3" color="secondary" fontWeight="bold">
                  #{progressData.student.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Class Rank out of {progressData.student.totalStudents}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Progress Trend (Last 6 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={progressData.progressChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="#8884d8"
                    strokeWidth={3}
                    name="Overall"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Progress Details Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Subject Performance" />
          <Tab label="Skills Analysis" />
          <Tab label="Goals & Achievements" />
          <Tab label="Recent Activities" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {progressData.subjects.map((subject, index) => (
                <Grid size={{ xs: 12, lg: 6 }} key={subject.name}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {subject.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="h5"
                            color={getGradeColor(subject.currentGrade)}
                            fontWeight="bold"
                          >
                            {subject.currentGrade}%
                          </Typography>
                          {getTrendIcon(subject.trend)}
                        </Box>
                      </Box>

                      {/* Progress Bar */}
                      <Box mb={2}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Current: {subject.currentGrade}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Target: {subject.targetGrade}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(subject.currentGrade / subject.targetGrade) * 100}
                          color={getGradeColor(subject.currentGrade)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {/* Stats Grid */}
                      <Grid container spacing={1} mb={2}>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                            <Typography variant="caption" display="block">
                              Assignments
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.assignments.completed}/{subject.assignments.total}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.light' }}>
                            <Typography variant="caption" display="block">
                              Quizzes
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.quizzes.completed}/{subject.quizzes.total}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.light' }}>
                            <Typography variant="caption" display="block">
                              Attendance
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.attendance}%
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Teacher Feedback */}
                      <Alert severity="info" sx={{ borderRadius: 2 }} icon={<SchoolIcon />}>
                        <Typography variant="body2">
                          <strong>Teacher's Note:</strong> {subject.teacherFeedback}
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Skills Assessment
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={progressData.skillsRadar}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar
                          name="Skills"
                          dataKey="score"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Subject Comparison
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={progressData.subjects}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="currentGrade" fill="#8884d8" name="Current Grade" />
                        <Bar dataKey="targetGrade" fill="#82ca9d" name="Target Grade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Recent Achievements
                    </Typography>
                    <List>
                      {progressData.achievements.map((achievement, index) => (
                        <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {getAchievementIcon(achievement.icon)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={achievement.title}
                            secondary={new Date(achievement.date).toLocaleDateString()}
                          />
                          <Chip
                            label={achievement.type}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Current Goals
                    </Typography>
                    <List>
                      {progressData.goals.map((goal, index) => (
                        <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                          <ListItemIcon>
                            <TargetIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={goal.title}
                            secondary={
                              <Box>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  mb={1}
                                >
                                  <Typography variant="caption">
                                    Progress: {goal.progress}/{goal.target}
                                  </Typography>
                                  <Typography variant="caption">
                                    Due: {new Date(goal.deadline).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(goal.progress / goal.target) * 100}
                                  sx={{ borderRadius: 2 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Recent Activities & Assessments
            </Typography>
            <List>
              {progressData.recentActivities.map((activity, index) => (
                <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        bgcolor:
                          activity.status === 'completed'
                            ? getGradeColor(activity.score || 0)
                            : 'warning.main',
                      }}
                    >
                      {getActivityIcon(activity.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {activity.title}
                        </Typography>
                        {activity.score ? (
                          <Chip
                            label={`${activity.score}%`}
                            color={getGradeColor(activity.score)}
                            size="small"
                          />
                        ) : (
                          <Chip label={activity.status} color="warning" size="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {activity.subject} • {activity.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Progress;
