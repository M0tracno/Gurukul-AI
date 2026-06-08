import React, { useState, useEffect } from 'react';
import '../styles/parentDashboardFix.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Alert,
  Paper,
  CircularProgress,
  useTheme,
  alpha,
  Badge,
  Stack,
} from '@mui/material';
import {
  ChildCare as ChildrenIcon,
  School as SchoolIcon,
  Grade as GradesIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,  Assignment as AssignmentIcon,
  EventNote as AttendanceIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  AccountCircle as ProfileIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import UnifiedDashboardLayout from '../components/layout/UnifiedDashboardLayout';
import ParentService from '../services/parentService';

const ParentDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    profile: {},
    children: [],
    stats: {},
    recentGrades: [],
    upcomingEvents: [],
    recentFeedback: [],
    assignments: []
  });
  const [currentView, setCurrentView] = useState('dashboard');

  // Menu items for parent dashboard
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <SchoolIcon /> },
    { key: 'children', label: 'My Children', icon: <ChildrenIcon /> },
    { key: 'grades', label: 'Grades & Progress', icon: <GradesIcon /> },
    { key: 'assignments', label: 'Assignments', icon: <AssignmentIcon /> },
    { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon /> },
    { key: 'communication', label: 'Teacher Communication', icon: <MessageIcon /> },
    { key: 'events', label: 'Events & Meetings', icon: <EventIcon /> },
  ];

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        profileResponse,
        childrenResponse,
        summaryResponse,
        gradesResponse,
        eventsResponse,
        feedbackResponse,
        assignmentsResponse
      ] = await Promise.all([
        ParentService.getParentProfile(),
        ParentService.getChildren(),
        ParentService.getDashboardSummary(),
        ParentService.getChildrenGrades(),
        ParentService.getUpcomingEvents(),
        ParentService.getTeacherFeedback(),
        ParentService.getChildrenAssignments()
      ]);

      setDashboardData({
        profile: profileResponse.data || {},
        children: childrenResponse.data || [],
        stats: summaryResponse.data || {},
        recentGrades: gradesResponse.data || [],
        upcomingEvents: eventsResponse.data || [],
        recentFeedback: feedbackResponse.data || [],
        assignments: assignmentsResponse.data || []
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >      <Card
        sx={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          backgroundColor: '#ffffff !important',
          border: `3px solid ${color}`,
          borderRadius: 4,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 25px ${color}30`,
          '&:hover': {
            boxShadow: `0 12px 35px ${color}40`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent sx={{ pb: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: color,
                color: 'white',
                width: 64,
                height: 64,
                fontSize: '1.5rem',
                boxShadow: `0 6px 20px ${color}40`,
                border: `2px solid white`,
              }}
            >
              {icon}
            </Avatar>
            {trend && (
              <Chip
                label={trend}
                size="small"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  bgcolor: trend.includes('+') ? '#4caf50' : '#f44336',
                  color: 'white',
                  '& .MuiChip-label': { px: 1.5 }
                }}
              />
            )}
          </Box>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 'bold', 
              color: '#1a1a1a', 
              mb: 1,
              fontSize: '3rem',
              lineHeight: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {value}
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              color: '#2c2c2c', 
              mb: 0.5,
              fontSize: '1.3rem'
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#555555',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </CardContent>
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
            borderRadius: '0 0 16px 16px',
          }}
        />
      </Card>
    </motion.div>
  );
  const RecentActivityCard = ({ title, items, icon, onViewAll }) => (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: '2px solid',
        borderColor: theme.palette.primary.main + '30',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                width: 48, 
                height: 48,
                boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
              }}
            >
              {icon}
            </Avatar>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                color: '#1a1a1a',
                fontSize: '1.2rem'
              }}
            >
              {title}
            </Typography>
          </Box>
          <Button 
            size="small" 
            onClick={onViewAll} 
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.main + '10'
              }
            }}
          >
            View All
          </Button>
        </Box>
        <List sx={{ py: 0 }}>
          {items.slice(0, 3).map((item, index) => (
            <React.Fragment key={item.id || index}>
              <ListItem 
                sx={{ 
                  px: 0, 
                  py: 2,
                  '&:hover': {
                    bgcolor: theme.palette.primary.main + '05',
                    borderRadius: 2
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <StarIcon 
                    sx={{ 
                      color: theme.palette.warning.main,
                      fontSize: '1.2rem'
                    }} 
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.title || item.subject || item.description}
                  secondary={item.subtitle || item.date || item.studentName}
                  primaryTypographyProps={{ 
                    fontWeight: 600,
                    color: '#2c2c2c',
                    fontSize: '1rem'
                  }}
                  secondaryTypographyProps={{ 
                    fontSize: '0.9rem',
                    color: '#666666',
                    fontWeight: 500
                  }}
                />
                {item.grade && (
                  <Chip
                    label={item.grade}
                    size="small"
                    sx={{
                      bgcolor: theme.palette.success.main,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}
                  />
                )}
              </ListItem>
              {index < Math.min(items.length - 1, 2) && (
                <Divider 
                  component="li" 
                  sx={{ 
                    borderColor: theme.palette.divider,
                    opacity: 0.6 
                  }} 
                />
              )}
            </React.Fragment>
          ))}
          {items.length === 0 && (
            <ListItem sx={{ px: 0, py: 3 }}>
              <ListItemText
                primary="No recent activity"
                secondary="Check back later for updates"
                sx={{ 
                  textAlign: 'center',
                  '& .MuiTypography-root': {
                    color: '#888888',
                    fontWeight: 500
                  }
                }}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

  const renderDashboardContent = () => {
    const { stats, children, recentGrades, upcomingEvents, recentFeedback, assignments } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            sx={{
              p: 4,
              mb: 4,
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 50%, #0d47a1 100%)',
              color: 'white',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(33, 150, 243, 0.3)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 2,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontSize: { xs: '2rem', md: '2.5rem' }
                }}
              >
                Welcome back, {dashboardData.profile.firstName || 'Parent'}! 👋
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  opacity: 0.95, 
                  mb: 3,
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}
              >
                Here's your children's academic overview for today
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.25)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    px: 3,
                    py: 1.5,
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.35)',
                      transform: 'translateY(-1px)'
                    },
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    textTransform: 'none'
                  }}
                  startIcon={<RefreshIcon />}
                  onClick={loadDashboardData}
                >
                  Refresh Data
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.7)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    '&:hover': { 
                      borderColor: 'white', 
                      bgcolor: 'rgba(255,255,255,0.15)',
                      transform: 'translateY(-1px)'
                    },
                  }}
                  startIcon={<EventIcon />}
                  onClick={() => setCurrentView('events')}
                >
                  View Calendar
                </Button>
              </Stack>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                backdropFilter: 'blur(20px)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -40,
                left: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                backdropFilter: 'blur(15px)',
              }}
            />
          </Paper>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Total Children"
                value={stats.totalChildren || children.length}
                icon={<ChildrenIcon />}
                color={theme.palette.primary.main}
                subtitle="Enrolled students"
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Active Courses"
                value={stats.totalCourses || 0}
                icon={<SchoolIcon />}
                color={theme.palette.success.main}
                subtitle="This semester"
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Recent Grades"
                value={stats.recentGrades || recentGrades.length}
                icon={<GradesIcon />}
                color={theme.palette.info.main}
                subtitle="This week"
                trend={stats.recentGrades > 0 ? `+${stats.recentGrades}` : ''}
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Upcoming Events"
                value={stats.pendingMeetings || upcomingEvents.length}
                icon={<EventIcon />}
                color={theme.palette.warning.main}
                subtitle="Next 30 days"
              />
            </Grid>
          </Grid>
        </motion.div>        {/* Performance Overview */}
        {(stats.avgGrade > 0 || Object.keys(stats).length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card 
              sx={{ 
                mb: 4, 
                borderRadius: 4, 
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: `2px solid ${theme.palette.info.main}30`,
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 3,
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <TrendingUpIcon sx={{ color: theme.palette.info.main, fontSize: '2rem' }} />
                  Academic Performance Overview
                </Typography>
                <Grid container spacing={4}>
                  <Grid size={{xs:12,md:6}}>
                    <Box sx={{ mb: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          mb: 2,
                          color: '#2c2c2c',
                          fontSize: '1.3rem'
                        }}
                      >
                        Average Grade: {(stats.avgGrade || 87.3)?.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stats.avgGrade || 87.3}
                        sx={{
                          height: 16,
                          borderRadius: 8,
                          bgcolor: alpha(theme.palette.success.main, 0.15),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 8,
                            background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.info.main} 100%)`,
                            boxShadow: `0 2px 8px ${theme.palette.success.main}40`,
                          },
                        }}
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 1, 
                          color: '#666666',
                          fontWeight: 600 
                        }}
                      >
                        Excellent performance across all subjects
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{xs:12,md:6}}>
                    <Box sx={{ mb: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          mb: 2,
                          color: '#2c2c2c',
                          fontSize: '1.3rem'
                        }}
                      >
                        Attendance Rate: {(stats.avgAttendance || 94.5)?.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stats.avgAttendance || 94.5}
                        sx={{
                          height: 16,
                          borderRadius: 8,
                          bgcolor: alpha(theme.palette.info.main, 0.15),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 8,
                            background: `linear-gradient(90deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                            boxShadow: `0 2px 8px ${theme.palette.info.main}40`,
                          },
                        }}
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 1, 
                          color: '#666666',
                          fontWeight: 600 
                        }}
                      >
                        Consistent attendance record
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Activity Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid size={{xs:12,md:6}}>
              <RecentActivityCard
                title="Recent Grades"
                items={recentGrades.map(grade => ({
                  id: grade.id,
                  title: `${grade.subject} - ${grade.assignment}`,
                  subtitle: `${grade.studentName} • ${new Date(grade.date).toLocaleDateString()}`,
                  grade: grade.grade
                }))}
                icon={<GradesIcon />}
                onViewAll={() => setCurrentView('grades')}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <RecentActivityCard
                title="Upcoming Events"
                items={upcomingEvents.map(event => ({
                  id: event.id,
                  title: event.title,
                  subtitle: `${new Date(event.date).toLocaleDateString()} • ${event.time}`,
                  description: event.description
                }))}
                icon={<CalendarIcon />}
                onViewAll={() => setCurrentView('events')}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <RecentActivityCard
                title="Teacher Feedback"
                items={recentFeedback.map(feedback => ({
                  id: feedback.id,
                  title: `${feedback.subject} Feedback`,
                  subtitle: `${feedback.teacherName} • ${feedback.studentName}`,
                  description: feedback.feedback
                }))}
                icon={<MessageIcon />}
                onViewAll={() => setCurrentView('communication')}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <RecentActivityCard
                title="Pending Assignments"
                items={assignments.filter(a => a.status === 'pending').map(assignment => ({
                  id: assignment.id,
                  title: assignment.title,
                  subtitle: `Due: ${new Date(assignment.dueDate).toLocaleDateString()}`,
                  description: assignment.subject
                }))}
                icon={<AssignmentIcon />}
                onViewAll={() => setCurrentView('assignments')}
              />
            </Grid>
          </Grid>
        </motion.div>
      </Box>
    );
  };

  // Children Overview Section
  const renderChildrenOverview = () => {
    const { children } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          My Children
        </Typography>
        
        <Grid container spacing={3}>
          {children.map((child) => (
            <Grid size={{xs:12,md:6,lg:4}} key={child.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -5 }}
              >                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '2px solid rgba(58, 134, 255, 0.1)',
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                  '&:hover': {
                    boxShadow: '0 12px 40px rgba(58, 134, 255, 0.2)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: '#3a86ff',
                          fontSize: '1.5rem',
                          mr: 2
                        }}
                      >
                        {child.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                          {child.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Class {child.class} - Section {child.section}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                          Average Grade
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#22c55e' }}>
                          {child.avgGrade}%
                        </Typography>
                      </Grid>
                      <Grid size={{xs:6}}>
                        <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                          Attendance
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#3b82f6' }}>
                          {child.attendance}%
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Subjects ({child.subjects.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {child.subjects.slice(0, 3).map((subject, index) => (
                          <Chip
                            key={index}
                            label={subject}
                            size="small"
                            sx={{ 
                              bgcolor: '#f0f9ff', 
                              color: '#0369a1',
                              fontWeight: 500
                            }}
                          />
                        ))}
                        {child.subjects.length > 3 && (
                          <Chip
                            label={`+${child.subjects.length - 3} more`}
                            size="small"
                            sx={{ bgcolor: '#f3f4f6', color: '#6b7280' }}
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Achievements
                      </Typography>
                      {child.achievements.map((achievement, index) => (
                        <Chip
                          key={index}
                          label={achievement}
                          size="small"
                          icon={<StarIcon />}
                          sx={{ 
                            mr: 1, 
                            mb: 1,
                            bgcolor: '#fef3c7',
                            color: '#92400e'
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Grades View Section
  const renderGradesView = () => {
    const { recentGrades } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          Grades & Progress
        </Typography>
        
        <Grid container spacing={3}>
          {recentGrades.map((grade) => (
            <Grid size={{xs:12,md:6,lg:4}} key={grade.id}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                          {grade.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {grade.studentName}
                        </Typography>
                      </Box>
                      <Chip
                        label={grade.grade}
                        sx={{
                          bgcolor: grade.grade.startsWith('A') ? '#dcfce7' : grade.grade.startsWith('B') ? '#dbeafe' : '#fef3c7',
                          color: grade.grade.startsWith('A') ? '#166534' : grade.grade.startsWith('B') ? '#1e40af' : '#92400e',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: '#1a1a1a' }}>
                      {grade.assignment}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                      {grade.feedback}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {grade.teacher}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {new Date(grade.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Assignments View Section
  const renderAssignmentsView = () => {
    const { assignments } = dashboardData;

    const getStatusColor = (status) => {
      switch (status) {
        case 'pending': return '#ef4444';
        case 'in_progress': return '#f59e0b';
        case 'completed': return '#22c55e';
        default: return '#6b7280';
      }
    };

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#22c55e';
        default: return '#6b7280';
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          Assignments
        </Typography>
        
        <Grid container spacing={3}>
          {assignments.map((assignment) => (
            <Grid size={{xs:12,md:6}} key={assignment.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: `2px solid ${getPriorityColor(assignment.priority)}20`,
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a', mb: 0.5 }}>
                          {assignment.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {assignment.studentName} • {assignment.subject}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={assignment.priority}
                          size="small"
                          sx={{
                            bgcolor: `${getPriorityColor(assignment.priority)}20`,
                            color: getPriorityColor(assignment.priority),
                            fontWeight: 'bold',
                            textTransform: 'capitalize'
                          }}
                        />
                        <Chip
                          label={assignment.status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(assignment.status)}20`,
                            color: getStatusColor(assignment.status),
                            fontWeight: 'bold',
                            textTransform: 'capitalize'
                          }}
                        />
                      </Stack>
                    </Box>
                    
                    <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                      {assignment.description}
                    </Typography>
                    
                    {assignment.progress && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            Progress
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {assignment.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={assignment.progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#f3f4f6',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              bgcolor: getStatusColor(assignment.status)
                            }
                          }}
                        />
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {assignment.estimatedTime}
                      </Typography>
                    </Box>
                    
                    {assignment.grade && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#166534', fontWeight: 'bold' }}>
                          Grade: {assignment.grade}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Attendance View Section
  const renderAttendanceView = () => {
    const { children } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          Attendance Records
        </Typography>
        
        <Grid container spacing={3}>
          {children.map((child) => (
            <Grid size={{xs:12,md:6}} key={child.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '2px solid rgba(34, 197, 94, 0.2)',
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 50,
                          height: 50,
                          bgcolor: '#22c55e',
                          mr: 2
                        }}
                      >
                        {child.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                          {child.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Class {child.class} - Section {child.section}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Overall Attendance
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#22c55e' }}>
                          {child.attendance}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={child.attendance}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            bgcolor: child.attendance > 90 ? '#22c55e' : child.attendance > 75 ? '#f59e0b' : '#ef4444'
                          }
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2, color: '#1a1a1a' }}>
                      Subject-wise Attendance
                    </Typography>
                    
                    {child.subjects.slice(0, 4).map((subject, index) => {
                      const attendance = Math.floor(Math.random() * 15) + 85; // Random demo data
                      return (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {subject}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {attendance}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={attendance}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: '#f3f4f6',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: attendance > 90 ? '#22c55e' : attendance > 75 ? '#f59e0b' : '#ef4444'
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckIcon sx={{ color: '#22c55e', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 500 }}>
                          Present: 18 days
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ color: '#ef4444', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 500 }}>
                          Absent: 2 days
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Communication View Section
  const renderCommunicationView = () => {
    const { recentFeedback } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          Teacher Communication
        </Typography>
        
        <Grid container spacing={3}>
          {recentFeedback.map((feedback) => (
            <Grid size={{xs:12,md:6}} key={feedback.id}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: `2px solid ${feedback.type === 'positive' ? '#22c55e' : '#f59e0b'}20`,
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                          {feedback.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {feedback.teacherName} • {feedback.studentName}
                        </Typography>
                      </Box>
                      <Chip
                        label={feedback.type}
                        size="small"
                        sx={{
                          bgcolor: feedback.type === 'positive' ? '#dcfce7' : '#fef3c7',
                          color: feedback.type === 'positive' ? '#166534' : '#92400e',
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body1" sx={{ color: '#1a1a1a', mb: 2, lineHeight: 1.6 }}>
                      {feedback.feedback}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[...Array(5)].map((_, index) => (
                          <StarIcon
                            key={index}
                            sx={{
                              fontSize: 16,
                              color: index < feedback.rating ? '#fbbf24' : '#d1d5db'
                            }}
                          />
                        ))}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {new Date(feedback.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        
        <Paper sx={{ mt: 4, p: 3, borderRadius: 3, bgcolor: '#f8fafc' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#1a1a1a' }}>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<MessageIcon />}
              sx={{ 
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' }
              }}
            >
              Send Message
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              sx={{ 
                borderColor: '#3b82f6',
                color: '#3b82f6',
                '&:hover': { borderColor: '#2563eb', bgcolor: '#eff6ff' }
              }}
            >
              Schedule Meeting
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  };

  // Events View Section
  const renderEventsView = () => {
    const { upcomingEvents } = dashboardData;

    const getEventTypeColor = (type) => {
      switch (type) {
        case 'meeting': return '#3b82f6';
        case 'school_event': return '#22c55e';
        case 'competition': return '#f59e0b';
        default: return '#6b7280';
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
          Events & Meetings
        </Typography>
        
        <Grid container spacing={3}>
          {upcomingEvents.map((event) => (
            <Grid size={{xs:12,md:6,lg:4}} key={event.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >                <Card sx={{ 
                  backgroundColor: '#ffffff !important',
                  background: '#ffffff !important',
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: `2px solid ${getEventTypeColor(event.type)}20`,
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a', flexGrow: 1 }}>
                        {event.title}
                      </Typography>
                      <Chip
                        label={event.type.replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: `${getEventTypeColor(event.type)}20`,
                          color: getEventTypeColor(event.type),
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                          ml: 1
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ color: '#666', mb: 2, lineHeight: 1.6 }}>
                      {event.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {new Date(event.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ScheduleIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {event.time}
                      </Typography>
                    </Box>
                    
                    {event.location && (
                      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                        📍 {event.location}
                      </Typography>
                    )}
                    
                    {event.studentName && (
                      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                        👨‍🎓 {event.studentName}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Chip
                        label={event.status || 'upcoming'}
                        size="small"
                        sx={{
                          bgcolor: event.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                          color: event.status === 'confirmed' ? '#166534' : '#92400e',
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}
                      />
                      {event.priority && (
                        <Chip
                          label={event.priority}
                          size="small"
                          sx={{
                            bgcolor: event.priority === 'high' ? '#fee2e2' : event.priority === 'medium' ? '#fef3c7' : '#dcfce7',
                            color: event.priority === 'high' ? '#dc2626' : event.priority === 'medium' ? '#92400e' : '#166534',
                            fontWeight: 'bold',
                            textTransform: 'capitalize'
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <UnifiedDashboardLayout
      title="Parent Dashboard"
      menuItems={menuItems}
      currentView={currentView}
      onViewChange={setCurrentView}
      userStats={{
        totalChildren: dashboardData.stats.totalChildren || 0,
        totalCourses: dashboardData.stats.totalCourses || 0,
        recentGrades: dashboardData.stats.recentGrades || 0,
        pendingMeetings: dashboardData.stats.pendingMeetings || 0,
      }}
      notifications={dashboardData.upcomingEvents.length + dashboardData.assignments.filter(a => a.status === 'pending').length}    >
      <Box className="parent-dashboard">
        <AnimatePresence mode="wait">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
            {currentView === 'dashboard' ? (
            renderDashboardContent()
          ) : currentView === 'children' ? (
            renderChildrenOverview()
          ) : currentView === 'grades' ? (
            renderGradesView()
          ) : currentView === 'assignments' ? (
            renderAssignmentsView()
          ) : currentView === 'attendance' ? (
            renderAttendanceView()
          ) : currentView === 'communication' ? (
            renderCommunicationView()
          ) : currentView === 'events' ? (
            renderEventsView()
          ) : (
            renderDashboardContent()
          )}
        </AnimatePresence>
      </Box>
    </UnifiedDashboardLayout>
  );
};

export default ParentDashboard;
