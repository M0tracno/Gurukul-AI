import React, { useState, useEffect } from 'react';
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
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Event as EventIcon,
  Grade as GradeIcon,
} from '@mui/icons-material';

const ChildrenOverview = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for children data
    const mockChildren = [
      {
        id: 1,
        name: 'Emma Johnson',
        grade: '10th Grade',
        class: 'A',
        avatar: '',
        overallGrade: 85,
        attendance: 92,
        upcomingEvents: 3,
        pendingAssignments: 2,
        recentQuizzes: 1,
        alerts: [
          { type: 'warning', message: 'Assignment due tomorrow' },
          { type: 'info', message: 'Parent-teacher meeting scheduled' },
        ],
        subjects: [
          { name: 'Mathematics', grade: 88, status: 'excellent' },
          { name: 'English', grade: 82, status: 'good' },
          { name: 'Science', grade: 90, status: 'excellent' },
          { name: 'History', grade: 78, status: 'average' },
        ],
      },
      {
        id: 2,
        name: 'Michael Johnson',
        grade: '8th Grade',
        class: 'B',
        avatar: '',
        overallGrade: 78,
        attendance: 88,
        upcomingEvents: 2,
        pendingAssignments: 4,
        recentQuizzes: 2,
        alerts: [
          { type: 'error', message: 'Low grade in Mathematics' },
          { type: 'warning', message: '3 assignments overdue' },
        ],
        subjects: [
          { name: 'Mathematics', grade: 65, status: 'needs-improvement' },
          { name: 'English', grade: 80, status: 'good' },
          { name: 'Science', grade: 85, status: 'excellent' },
          { name: 'Geography', grade: 82, status: 'good' },
        ],
      },
    ];

    setTimeout(() => {
      setChildren(mockChildren);
      setLoading(false);
    }, 1000);
  }, []);

  const getGradeColor = grade => {
    if (grade >= 85) return 'success';
    if (grade >= 70) return 'warning';
    return 'error';
  };

  const getStatusColor = status => {
    switch (status) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'primary';
      case 'average':
        return 'warning';
      case 'needs-improvement':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleViewDetails = childId => {
    console.log('View details for child:', childId);
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading children overview...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Children Overview
      </Typography>

      <Grid container spacing={3}>
        {children.map(child => (
          <Grid size={{ xs: 12, lg: 6 }} key={child.id}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Child Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'primary.main',
                        mr: 2,
                        fontSize: '1.5rem',
                      }}
                    >
                      {child.avatar || child.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {child.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {child.grade} - Class {child.class}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton color="primary" onClick={() => handleViewDetails(child.id)}>
                    <VisibilityIcon />
                  </IconButton>
                </Box>

                {/* Alerts */}
                {child.alerts.length > 0 && (
                  <Box mb={3}>
                    {child.alerts.map((alert, index) => (
                      <Alert
                        key={index}
                        severity={alert.type}
                        sx={{ mb: 1, borderRadius: 2 }}
                        size="small"
                      >
                        {alert.message}
                      </Alert>
                    ))}
                  </Box>
                )}

                {/* Quick Stats */}
                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 6 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography
                        variant="h4"
                        color={getGradeColor(child.overallGrade)}
                        fontWeight="bold"
                      >
                        {child.overallGrade}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Overall Grade
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography
                        variant="h4"
                        color={getGradeColor(child.attendance)}
                        fontWeight="bold"
                      >
                        {child.attendance}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Attendance
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Activity Summary */}
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 4 }}>
                      <Box display="flex" alignItems="center" justifyContent="center" p={1}>
                        <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {child.pendingAssignments}
                          </Typography>
                          <Typography variant="caption">Pending</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box display="flex" alignItems="center" justifyContent="center" p={1}>
                        <QuizIcon color="secondary" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {child.recentQuizzes}
                          </Typography>
                          <Typography variant="caption">Quizzes</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box display="flex" alignItems="center" justifyContent="center" p={1}>
                        <EventIcon color="warning" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {child.upcomingEvents}
                          </Typography>
                          <Typography variant="caption">Events</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Subject Performance */}
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Subject Performance
                  </Typography>
                  <List dense>
                    {child.subjects.map((subject, index) => (
                      <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: `${getStatusColor(subject.status)}.main`,
                            }}
                          >
                            <GradeIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={subject.name}
                          secondary={
                            <Box display="flex" alignItems="center" mt={0.5}>
                              <LinearProgress
                                variant="determinate"
                                value={subject.grade}
                                color={getGradeColor(subject.grade)}
                                sx={{ flexGrow: 1, mr: 1, borderRadius: 1 }}
                              />
                              <Typography variant="caption" fontWeight="bold">
                                {subject.grade}%
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip
                          label={subject.status.replace('-', ' ')}
                          size="small"
                          color={getStatusColor(subject.status)}
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Action Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewDetails(child.id)}
                  sx={{ borderRadius: 2 }}
                >
                  View Detailed Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ChildrenOverview;
