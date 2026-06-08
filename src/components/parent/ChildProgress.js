import React, {  useEffect } from 'react';
import { Assignment as AssignmentIcon, CheckCircle, Download, EventNote as EventNoteIcon, Grade, Quiz as QuizIcon, Refresh, Star as StarIcon, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon, Warning, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Container, Divider, Grid, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Paper, Tab, Tabs, Tooltip, Typography } from '@mui/material';
const ChildProgress = () => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [childrenData, setChildrenData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for children progress data
    const mockChildrenData = [
      {
        id: 1,
        name: 'Emma Johnson',
        grade: '10th Grade',
        class: 'A',
        avatar: '',
        overallGrade: 85,
        trend: 'up',
        subjects: [
          {
            name: 'Mathematics',
            currentGrade: 88,
            previousGrade: 82,
            trend: 'up',
            assignments: { completed: 8, total: 10, pending: 2 },
            quizzes: { completed: 4, total: 5, upcoming: 1 },
            attendance: 95
          },
          {
            name: 'English',
            currentGrade: 82,
            previousGrade: 85,
            trend: 'down',
            assignments: { completed: 9, total: 10, pending: 1 },
            quizzes: { completed: 5, total: 5, upcoming: 0 },
            attendance: 92
          },
          {
            name: 'Science',
            currentGrade: 90,
            previousGrade: 87,
            trend: 'up',
            assignments: { completed: 10, total: 12, pending: 2 },
            quizzes: { completed: 3, total: 4, upcoming: 1 },
            attendance: 98
          },
          {
            name: 'History',
            currentGrade: 78,
            previousGrade: 80,
            trend: 'down',
            assignments: { completed: 7, total: 9, pending: 2 },
            quizzes: { completed: 4, total: 4, upcoming: 0 },
            attendance: 90
          }
        ],
        progressChart: [
          { month: 'Jan', grade: 75 },
          { month: 'Feb', grade: 78 },
          { month: 'Mar', grade: 80 },
          { month: 'Apr', grade: 82 },
          { month: 'May', grade: 85 },
          { month: 'Jun', grade: 85 }
        ],
        recentActivities: [
          { type: 'assignment', subject: 'Mathematics', title: 'Algebra Quiz', score: 92, date: '2025-06-06' },
          { type: 'quiz', subject: 'Science', title: 'Chemistry Test', score: 88, date: '2025-06-05' },
          { type: 'assignment', subject: 'English', title: 'Essay Writing', score: 85, date: '2025-06-04' }
        ],
        strengths: ['Problem Solving', 'Critical Thinking', 'Science Experiments'],
        improvements: ['Time Management', 'Reading Comprehension']
      },
      {
        id: 2,
        name: 'Michael Johnson',
        grade: '8th Grade',
        class: 'B',
        avatar: '',
        overallGrade: 78,
        trend: 'up',
        subjects: [
          {
            name: 'Mathematics',
            currentGrade: 65,
            previousGrade: 60,
            trend: 'up',
            assignments: { completed: 6, total: 10, pending: 4 },
            quizzes: { completed: 3, total: 5, upcoming: 2 },
            attendance: 88
          },
          {
            name: 'English',
            currentGrade: 80,
            previousGrade: 78,
            trend: 'up',
            assignments: { completed: 8, total: 9, pending: 1 },
            quizzes: { completed: 4, total: 4, upcoming: 0 },
            attendance: 95
          },
          {
            name: 'Science',
            currentGrade: 85,
            previousGrade: 83,
            trend: 'up',
            assignments: { completed: 9, total: 10, pending: 1 },
            quizzes: { completed: 4, total: 5, upcoming: 1 },
            attendance: 92
          },
          {
            name: 'Geography',
            currentGrade: 82,
            previousGrade: 79,
            trend: 'up',
            assignments: { completed: 7, total: 8, pending: 1 },
            quizzes: { completed: 3, total: 3, upcoming: 0 },
            attendance: 90
          }
        ],
        progressChart: [
          { month: 'Jan', grade: 70 },
          { month: 'Feb', grade: 72 },
          { month: 'Mar', grade: 74 },
          { month: 'Apr', grade: 76 },
          { month: 'May', grade: 77 },
          { month: 'Jun', grade: 78 }
        ],
        recentActivities: [
          { type: 'quiz', subject: 'Science', title: 'Biology Test', score: 82, date: '2025-06-06' },
          { type: 'assignment', subject: 'English', title: 'Book Report', score: 78, date: '2025-06-05' },
          { type: 'assignment', subject: 'Mathematics', title: 'Geometry Problems', score: 70, date: '2025-06-04' }
        ],
        strengths: ['Creative Writing', 'Science Projects', 'Class Participation'],
        improvements: ['Mathematics Skills', 'Assignment Completion', 'Study Habits']
      }
    ];

    setTimeout(() => {
      setChildrenData(mockChildrenData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getGradeColor = (grade) => {
    if (grade >= 85) return 'success';
    if (grade >= 70) return 'warning';
    return 'error';
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? <TrendingUpIcon color="success" /> : <TrendingDownIcon color="error" />;
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'success' : 'error';
  };

  const getActivityIcon = (type) => {
    return type === 'assignment' ? <AssignmentIcon /> : <QuizIcon />;
  };
  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading progress data...</Typography>
      </Container>
    );
  }

  const currentChild = childrenData[selectedChild];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Child Progress Report
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{ borderRadius: 2 }}
          >
            Download Report
          </Button>
        </Box>
      </Box>

      {/* Child Selector */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={selectedChild}
          onChange={(e, value) => setSelectedChild(value)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {childrenData.map((child, index) => (
            <Tab
              key={child.id}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                    {child.name.charAt(0)}
                  </Avatar>
                  {child.name}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Overall Performance Card */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{xs:12,md:3}}>
              <Box display="flex" alignItems="center">
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    mr: 2,
                    fontSize: '1.5rem'
                  }}
                >
                  {currentChild.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {currentChild.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentChild.grade} - Class {currentChild.class}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{xs:12,md:3}}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h3" color={getGradeColor(currentChild.overallGrade)} fontWeight="bold">
                  {currentChild.overallGrade}%
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                  {getTrendIcon(currentChild.trend)}
                  <Typography variant="caption" color={getTrendColor(currentChild.trend)} sx={{ ml: 0.5 }}>
                    Overall Grade
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{xs:12,md:6}}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Progress Trend (Last 6 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={currentChild.progressChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="grade"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
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
        >
          <Tab label="Subject Performance" />
          <Tab label="Recent Activities" />
          <Tab label="Strengths & Areas for Improvement" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {currentChild.subjects.map((subject, index) => (
                <Grid size={{xs:12,md:6}} key={subject.name}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {subject.name}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <Typography variant="h5" color={getGradeColor(subject.currentGrade)} fontWeight="bold">
                            {subject.currentGrade}%
                          </Typography>
                          {getTrendIcon(subject.trend)}
                        </Box>
                      </Box>

                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Progress from {subject.previousGrade}% to {subject.currentGrade}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={subject.currentGrade}
                          color={getGradeColor(subject.currentGrade)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{xs:4}}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                            <Typography variant="caption" display="block">Assignments</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.assignments.completed}/{subject.assignments.total}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{xs:4}}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.light' }}>
                            <Typography variant="caption" display="block">Quizzes</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.quizzes.completed}/{subject.quizzes.total}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{xs:4}}>
                          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.light' }}>
                            <Typography variant="caption" display="block">Attendance</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.attendance}%
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Recent Activities & Assessments
            </Typography>
            <List>
              {currentChild.recentActivities.map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getGradeColor(activity.score) }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight="bold">
                            {activity.title}
                          </Typography>
                          <Chip
                            label={`${activity.score}%`}
                            color={getGradeColor(activity.score)}
                            size="small"
                          />
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
                  {index < currentChild.recentActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <StarIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        Strengths
                      </Typography>
                    </Box>
                    <List>
                      {currentChild.strengths.map((strength, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={strength} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{xs:12,md:6}}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Warning color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        Areas for Improvement
                      </Typography>
                    </Box>
                    <List>
                      {currentChild.improvements.map((improvement, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemIcon>
                            <AccessTimeIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={improvement} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert
              severity="info"
              sx={{ mt: 3, borderRadius: 2 }}
              icon={<EventNoteIcon />}
            >
              Consider scheduling a parent-teacher meeting to discuss specific strategies for improvement areas.
            </Alert>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ChildProgress;
