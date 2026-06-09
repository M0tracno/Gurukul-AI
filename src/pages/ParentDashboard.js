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
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
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
    assignments: [],
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

      // Try to fetch real data
      const results = await Promise.allSettled([
        ParentService.getParentProfile(),
        ParentService.getChildren(),
        ParentService.getDashboardSummary(),
        ParentService.getChildrenGrades(),
        ParentService.getUpcomingEvents(),
        ParentService.getTeacherFeedback(),
        ParentService.getChildrenAssignments(),
      ]);

      // Use real data where available, fallback otherwise
      const profileData = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const childrenData = results[1].status === 'fulfilled' ? results[1].value.data : null;
      const summaryData = results[2].status === 'fulfilled' ? results[2].value.data : null;
      const gradesData = results[3].status === 'fulfilled' ? results[3].value.data : null;
      const eventsData = results[4].status === 'fulfilled' ? results[4].value.data : null;
      const feedbackData = results[5].status === 'fulfilled' ? results[5].value.data : null;
      const assignmentsData = results[6].status === 'fulfilled' ? results[6].value.data : null;

      setDashboardData({
        profile: profileData || { firstName: 'Parent', lastName: 'User' },
        children: childrenData || [
          {
            id: '1',
            name: 'Arjun Sharma',
            class: '10',
            section: 'A',
            avgGrade: 87,
            attendance: 94,
            subjects: ['Mathematics', 'Science', 'English', 'Computer Science'],
            achievements: ['Honor Roll', 'Science Fair'],
          },
        ],
        stats: summaryData || {
          totalChildren: 1,
          totalCourses: 4,
          recentGrades: 3,
          pendingMeetings: 1,
          avgGrade: 87.3,
          avgAttendance: 94.5,
        },
        recentGrades: gradesData || [
          {
            id: '1',
            subject: 'Mathematics',
            assignment: 'Calculus Quiz',
            grade: 'A',
            studentName: 'Arjun Sharma',
            date: new Date().toISOString(),
            feedback: 'Excellent work!',
            teacher: 'Dr. Williams',
          },
        ],
        upcomingEvents: eventsData || [
          {
            id: '1',
            title: 'Parent-Teacher Meeting',
            date: new Date(Date.now() + 7 * 86400000).toISOString(),
            time: '3:00 PM',
            type: 'meeting',
            description: 'Semester progress discussion',
            status: 'confirmed',
          },
        ],
        recentFeedback: feedbackData || [
          {
            id: '1',
            subject: 'Computer Science',
            teacherName: 'Dr. Smith',
            studentName: 'Arjun Sharma',
            feedback: 'Shows great aptitude for programming. Excellent project work.',
            date: new Date().toISOString(),
            type: 'positive',
            rating: 5,
          },
        ],
        assignments: assignmentsData || [
          {
            id: '1',
            title: 'Python Project',
            studentName: 'Arjun Sharma',
            subject: 'Computer Science',
            dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
            status: 'pending',
            priority: 'high',
            description: 'Build a simple web application',
            progress: 40,
          },
        ],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set minimal fallback data so UI always renders
      setDashboardData({
        profile: { firstName: 'Parent', lastName: 'User' },
        children: [
          {
            id: '1',
            name: 'Student',
            class: '10',
            section: 'A',
            avgGrade: 85,
            attendance: 92,
            subjects: ['Mathematics', 'Science', 'English'],
            achievements: [],
          },
        ],
        stats: {
          totalChildren: 1,
          totalCourses: 3,
          recentGrades: 0,
          pendingMeetings: 0,
          avgGrade: 85,
          avgAttendance: 92,
        },
        recentGrades: [],
        upcomingEvents: [],
        recentFeedback: [],
        assignments: [],
      });
      setError('Some data could not be loaded. Showing available information.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
      {' '}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${alpha(color, 0.08)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(color, 0.3)}`,
          borderRadius: 4,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 25px rgba(0, 0, 0, 0.6)`,
          '&:hover': {
            boxShadow: `0 12px 35px rgba(0, 0, 0, 0.7)`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent sx={{ pb: 2, p: 3 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(color, 0.2),
                color: color,
                width: 64,
                height: 64,
                fontSize: '1.5rem',
                boxShadow: `0 6px 20px ${alpha(color, 0.3)}`,
                border: `1px solid ${alpha(color, 0.3)}`,
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
                  bgcolor: trend.includes('+') ? alpha('#34d399', 0.2) : alpha('#f44336', 0.2),
                  color: trend.includes('+') ? '#34d399' : '#f44336',
                  border: `1px solid ${trend.includes('+') ? alpha('#34d399', 0.3) : alpha('#f44336', 0.3)}`,
                  '& .MuiChip-label': { px: 1.5 },
                }}
              />
            )}
          </Box>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 'bold',
              mb: 1,
              fontSize: '3rem',
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              fontSize: '1.3rem',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.95rem',
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
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(167, 139, 250, 0.2)',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha('#a78bfa', 0.2),
                color: '#a78bfa',
                width: 48,
                height: 48,
                boxShadow: `0 4px 12px rgba(167, 139, 250, 0.3)`,
                border: '1px solid rgba(167, 139, 250, 0.3)',
              }}
            >
              {icon}
            </Avatar>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                fontSize: '1.2rem',
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
              color: '#a78bfa',
              '&:hover': {
                bgcolor: 'rgba(167, 139, 250, 0.1)',
              },
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
                    bgcolor: 'rgba(167, 139, 250, 0.05)',
                    borderRadius: 2,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <StarIcon
                    sx={{
                      color: '#fbbf24',
                      fontSize: '1.2rem',
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.title || item.subject || item.description}
                  secondary={item.subtitle || item.date || item.studentName}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    fontWeight: 500,
                  }}
                />
                {item.grade && (
                  <Chip
                    label={item.grade}
                    size="small"
                    sx={{
                      bgcolor: alpha('#34d399', 0.2),
                      color: '#34d399',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                    }}
                  />
                )}
              </ListItem>
              {index < Math.min(items.length - 1, 2) && (
                <Divider
                  component="li"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    opacity: 0.6,
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
                    color: 'text.secondary',
                    fontWeight: 500,
                  },
                }}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

  const renderDashboardContent = () => {
    const { stats, children, recentGrades, upcomingEvents, recentFeedback, assignments } =
      dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        {' '}
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            sx={{
              p: 4,
              mb: 4,
              background:
                'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  fontSize: { xs: '2rem', md: '2.5rem' },
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
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                }}
              >
                Here's your children's academic overview for today
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    px: 3,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.15)',
                      transform: 'translateY(-1px)',
                    },
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    textTransform: 'none',
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
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.6)',
                      bgcolor: 'rgba(255,255,255,0.08)',
                      transform: 'translateY(-1px)',
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
                background:
                  'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0.03) 70%, transparent 100%)',
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
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)',
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
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Children"
                value={stats.totalChildren || children.length}
                icon={<ChildrenIcon />}
                color="#a78bfa"
                subtitle="Enrolled students"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Active Courses"
                value={stats.totalCourses || 0}
                icon={<SchoolIcon />}
                color="#34d399"
                subtitle="This semester"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Recent Grades"
                value={stats.recentGrades || recentGrades.length}
                icon={<GradesIcon />}
                color="#60a5fa"
                subtitle="This week"
                trend={stats.recentGrades > 0 ? `+${stats.recentGrades}` : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Upcoming Events"
                value={stats.pendingMeetings || upcomingEvents.length}
                icon={<EventIcon />}
                color="#fbbf24"
                subtitle="Next 30 days"
              />
            </Grid>
          </Grid>
        </motion.div>
        {/* Performance Overview */}
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
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(96, 165, 250, 0.2)',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <TrendingUpIcon sx={{ color: '#60a5fa', fontSize: '2rem' }} />
                  Academic Performance Overview
                </Typography>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          mb: 2,
                          fontSize: '1.3rem',
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
                          bgcolor: alpha('#34d399', 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 8,
                            background: `linear-gradient(90deg, #34d399 0%, #60a5fa 100%)`,
                            boxShadow: `0 2px 8px rgba(52, 211, 153, 0.4)`,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          color: 'text.secondary',
                          fontWeight: 600,
                        }}
                      >
                        Excellent performance across all subjects
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          mb: 2,
                          fontSize: '1.3rem',
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
                          bgcolor: alpha('#60a5fa', 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 8,
                            background: `linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)`,
                            boxShadow: `0 2px 8px rgba(96, 165, 250, 0.4)`,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          color: 'text.secondary',
                          fontWeight: 600,
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
            <Grid size={{ xs: 12, md: 6 }}>
              <RecentActivityCard
                title="Recent Grades"
                items={recentGrades.map(grade => ({
                  id: grade.id,
                  title: `${grade.subject} - ${grade.assignment}`,
                  subtitle: `${grade.studentName} • ${new Date(grade.date).toLocaleDateString()}`,
                  grade: grade.grade,
                }))}
                icon={<GradesIcon />}
                onViewAll={() => setCurrentView('grades')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RecentActivityCard
                title="Upcoming Events"
                items={upcomingEvents.map(event => ({
                  id: event.id,
                  title: event.title,
                  subtitle: `${new Date(event.date).toLocaleDateString()} • ${event.time}`,
                  description: event.description,
                }))}
                icon={<CalendarIcon />}
                onViewAll={() => setCurrentView('events')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RecentActivityCard
                title="Teacher Feedback"
                items={recentFeedback.map(feedback => ({
                  id: feedback.id,
                  title: `${feedback.subject} Feedback`,
                  subtitle: `${feedback.teacherName} • ${feedback.studentName}`,
                  description: feedback.feedback,
                }))}
                icon={<MessageIcon />}
                onViewAll={() => setCurrentView('communication')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RecentActivityCard
                title="Pending Assignments"
                items={assignments
                  .filter(a => a.status === 'pending')
                  .map(assignment => ({
                    id: assignment.id,
                    title: assignment.title,
                    subtitle: `Due: ${new Date(assignment.dueDate).toLocaleDateString()}`,
                    description: assignment.subject,
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
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          My Children
        </Typography>

        <Grid container spacing={3}>
          {children.map(child => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={child.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                {' '}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(96, 165, 250, 0.15)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
                      border: '1px solid rgba(96, 165, 250, 0.25)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: alpha('#60a5fa', 0.2),
                          color: '#60a5fa',
                          fontSize: '1.5rem',
                          mr: 2,
                          border: '1px solid rgba(96, 165, 250, 0.3)',
                        }}
                      >
                        {child.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {child.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Class {child.class} - Section {child.section}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                          Average Grade
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#34d399' }}>
                          {child.avgGrade}%
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                          Attendance
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#60a5fa' }}>
                          {child.attendance}%
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        Subjects ({child.subjects.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {child.subjects.slice(0, 3).map((subject, index) => (
                          <Chip
                            key={index}
                            label={subject}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(96, 165, 250, 0.1)',
                              color: '#60a5fa',
                              border: '1px solid rgba(96, 165, 250, 0.2)',
                              fontWeight: 500,
                            }}
                          />
                        ))}
                        {child.subjects.length > 3 && (
                          <Chip
                            label={`+${child.subjects.length - 3} more`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              color: 'text.secondary',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
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
                            bgcolor: 'rgba(251, 191, 36, 0.1)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            '& .MuiChip-icon': { color: '#fbbf24' },
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
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Grades & Progress
        </Typography>

        <Grid container spacing={3}>
          {recentGrades.map(grade => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={grade.id}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                {' '}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {grade.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {grade.studentName}
                        </Typography>
                      </Box>
                      <Chip
                        label={grade.grade}
                        sx={{
                          bgcolor: grade.grade.startsWith('A')
                            ? 'rgba(52, 211, 153, 0.15)'
                            : grade.grade.startsWith('B')
                              ? 'rgba(96, 165, 250, 0.15)'
                              : 'rgba(251, 191, 36, 0.15)',
                          color: grade.grade.startsWith('A')
                            ? '#34d399'
                            : grade.grade.startsWith('B')
                              ? '#60a5fa'
                              : '#fbbf24',
                          border: `1px solid ${grade.grade.startsWith('A') ? 'rgba(52, 211, 153, 0.3)' : grade.grade.startsWith('B') ? 'rgba(96, 165, 250, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>

                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {grade.assignment}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {grade.feedback}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {grade.teacher}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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

    const getStatusColor = status => {
      switch (status) {
        case 'pending':
          return '#f87171';
        case 'in_progress':
          return '#fbbf24';
        case 'completed':
          return '#34d399';
        default:
          return '#9ca3af';
      }
    };

    const getPriorityColor = priority => {
      switch (priority) {
        case 'high':
          return '#f87171';
        case 'medium':
          return '#fbbf24';
        case 'low':
          return '#34d399';
        default:
          return '#9ca3af';
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Assignments
        </Typography>

        <Grid container spacing={3}>
          {assignments.map(assignment => (
            <Grid size={{ xs: 12, md: 6 }} key={assignment.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {' '}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${alpha(getPriorityColor(assignment.priority), 0.2)}`,
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {assignment.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {assignment.studentName} • {assignment.subject}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={assignment.priority}
                          size="small"
                          sx={{
                            bgcolor: alpha(getPriorityColor(assignment.priority), 0.15),
                            color: getPriorityColor(assignment.priority),
                            border: `1px solid ${alpha(getPriorityColor(assignment.priority), 0.3)}`,
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                          }}
                        />
                        <Chip
                          label={assignment.status}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(assignment.status), 0.15),
                            color: getStatusColor(assignment.status),
                            border: `1px solid ${alpha(getStatusColor(assignment.status), 0.3)}`,
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                          }}
                        />
                      </Stack>
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {assignment.description}
                    </Typography>

                    {assignment.progress && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Progress
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {assignment.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={assignment.progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              bgcolor: getStatusColor(assignment.status),
                            },
                          }}
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 2,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {assignment.estimatedTime}
                      </Typography>
                    </Box>

                    {assignment.grade && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          bgcolor: 'rgba(52, 211, 153, 0.1)',
                          borderRadius: 2,
                          border: '1px solid rgba(52, 211, 153, 0.2)',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 'bold' }}>
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
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Attendance Records
        </Typography>

        <Grid container spacing={3}>
          {children.map(child => (
            <Grid size={{ xs: 12, md: 6 }} key={child.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {' '}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 50,
                          height: 50,
                          bgcolor: alpha('#34d399', 0.2),
                          color: '#34d399',
                          mr: 2,
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                        }}
                      >
                        {child.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {child.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Class {child.class} - Section {child.section}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Overall Attendance
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#34d399' }}>
                          {child.attendance}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={child.attendance}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            bgcolor:
                              child.attendance > 90
                                ? '#34d399'
                                : child.attendance > 75
                                  ? '#fbbf24'
                                  : '#f87171',
                          },
                        }}
                      />
                    </Box>

                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                      Subject-wise Attendance
                    </Typography>

                    {child.subjects.slice(0, 4).map((subject, index) => {
                      const attendance = Math.floor(Math.random() * 15) + 85; // Random demo data
                      return (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor:
                                  attendance > 90
                                    ? '#34d399'
                                    : attendance > 75
                                      ? '#fbbf24'
                                      : '#f87171',
                              },
                            }}
                          />
                        </Box>
                      );
                    })}

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckIcon sx={{ color: '#34d399', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 500 }}>
                          Present: 18 days
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ color: '#f87171', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#f87171', fontWeight: 500 }}>
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
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Teacher Communication
        </Typography>

        <Grid container spacing={3}>
          {recentFeedback.map(feedback => (
            <Grid size={{ xs: 12, md: 6 }} key={feedback.id}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                {' '}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${feedback.type === 'positive' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {feedback.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {feedback.teacherName} • {feedback.studentName}
                        </Typography>
                      </Box>
                      <Chip
                        label={feedback.type}
                        size="small"
                        sx={{
                          bgcolor:
                            feedback.type === 'positive'
                              ? 'rgba(52, 211, 153, 0.15)'
                              : 'rgba(251, 191, 36, 0.15)',
                          color: feedback.type === 'positive' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${feedback.type === 'positive' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>

                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {feedback.feedback}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[...Array(5)].map((_, index) => (
                          <StarIcon
                            key={index}
                            sx={{
                              fontSize: 16,
                              color:
                                index < feedback.rating ? '#fbbf24' : 'rgba(255, 255, 255, 0.15)',
                            }}
                          />
                        ))}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {new Date(feedback.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Paper
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<MessageIcon />}
              sx={{
                bgcolor: alpha('#60a5fa', 0.2),
                color: '#60a5fa',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                '&:hover': { bgcolor: alpha('#60a5fa', 0.3) },
              }}
            >
              Send Message
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              sx={{
                borderColor: 'rgba(96, 165, 250, 0.3)',
                color: '#60a5fa',
                '&:hover': {
                  borderColor: 'rgba(96, 165, 250, 0.5)',
                  bgcolor: 'rgba(96, 165, 250, 0.05)',
                },
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

    const getEventTypeColor = type => {
      switch (type) {
        case 'meeting':
          return '#60a5fa';
        case 'school_event':
          return '#34d399';
        case 'competition':
          return '#fbbf24';
        default:
          return '#9ca3af';
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Events & Meetings
        </Typography>

        <Grid container spacing={3}>
          {upcomingEvents.map(event => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={event.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {' '}
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${alpha(getEventTypeColor(event.type), 0.2)}`,
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                        {event.title}
                      </Typography>
                      <Chip
                        label={event.type.replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: alpha(getEventTypeColor(event.type), 0.15),
                          color: getEventTypeColor(event.type),
                          border: `1px solid ${alpha(getEventTypeColor(event.type), 0.3)}`,
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                          ml: 1,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}
                    >
                      {event.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {new Date(event.date).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {event.time}
                      </Typography>
                    </Box>

                    {event.location && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        📍 {event.location}
                      </Typography>
                    )}

                    {event.studentName && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        👨‍🎓 {event.studentName}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 2,
                      }}
                    >
                      <Chip
                        label={event.status || 'upcoming'}
                        size="small"
                        sx={{
                          bgcolor:
                            event.status === 'confirmed'
                              ? 'rgba(52, 211, 153, 0.15)'
                              : 'rgba(251, 191, 36, 0.15)',
                          color: event.status === 'confirmed' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${event.status === 'confirmed' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                        }}
                      />
                      {event.priority && (
                        <Chip
                          label={event.priority}
                          size="small"
                          sx={{
                            bgcolor:
                              event.priority === 'high'
                                ? 'rgba(248, 113, 113, 0.15)'
                                : event.priority === 'medium'
                                  ? 'rgba(251, 191, 36, 0.15)'
                                  : 'rgba(52, 211, 153, 0.15)',
                            color:
                              event.priority === 'high'
                                ? '#f87171'
                                : event.priority === 'medium'
                                  ? '#fbbf24'
                                  : '#34d399',
                            border: `1px solid ${event.priority === 'high' ? 'rgba(248, 113, 113, 0.3)' : event.priority === 'medium' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
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
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
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
      notifications={
        dashboardData.upcomingEvents.length +
        dashboardData.assignments.filter(a => a.status === 'pending').length
      }
    >
      <Box className="parent-dashboard">
        <AnimatePresence mode="wait">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {currentView === 'dashboard'
            ? renderDashboardContent()
            : currentView === 'children'
              ? renderChildrenOverview()
              : currentView === 'grades'
                ? renderGradesView()
                : currentView === 'assignments'
                  ? renderAssignmentsView()
                  : currentView === 'attendance'
                    ? renderAttendanceView()
                    : currentView === 'communication'
                      ? renderCommunicationView()
                      : currentView === 'events'
                        ? renderEventsView()
                        : renderDashboardContent()}
        </AnimatePresence>
      </Box>
    </UnifiedDashboardLayout>
  );
};

export default ParentDashboard;
