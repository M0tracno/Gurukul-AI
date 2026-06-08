import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as CoursesIcon,
  Assignment as AssignmentIcon,
  Grade as GradesIcon,
  Quiz as QuizIcon,
  EventNote as AttendanceIcon,
  Feedback as FeedbackIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  AccountCircle as ProfileIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayIcon,
  AccessTime as TimeIcon,
  PriorityHigh as PriorityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import UnifiedDashboardLayout from '../components/layout/UnifiedDashboardLayout';
import StudentService from '../services/studentService';
import { useAuth } from '../auth/AuthContext';

// Lazy load student components
const StudentCourses = React.lazy(() => import('../components/student/Courses'));
const StudentAttendance = React.lazy(() => import('../components/student/StudentAttendance'));

const LoadingComponent = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
    <CircularProgress size={60} thickness={4} />
  </Box>
);

const StudentDashboard = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false); // Start with false for immediate content
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  // Mock data for all sections
  const mockCourses = [
    {
      id: 1,
      name: 'Introduction to Computer Science',
      code: 'CS101',
      instructor: 'Dr. Smith',
      schedule: 'Mon, Wed 10:00-11:30 AM',
      assignments: 5,
      grade: 'A',
      progress: 85,
      color: '#4285F4',
      credits: 3,
      room: 'Lab 204'
    },
    {
      id: 2,
      name: 'Calculus I',
      code: 'MATH201',
      instructor: 'Dr. Williams',
      schedule: 'Tue, Thu 1:00-2:30 PM',
      assignments: 8,
      grade: 'B+',
      progress: 78,
      color: '#34A853',
      credits: 4,
      room: 'Room 301'
    },
    {
      id: 3,
      name: 'World History',
      code: 'HIST101',
      instructor: 'Prof. Johnson',
      schedule: 'Mon, Wed, Fri 2:00-3:00 PM',
      assignments: 4,
      grade: 'A',
      progress: 92,
      color: '#FBBC04',
      credits: 3,
      room: 'Room 205'
    },
    {
      id: 4,
      name: 'Introduction to Physics',
      code: 'PHYS101',
      instructor: 'Dr. Brown',
      schedule: 'Tue, Thu 9:00-10:30 AM',
      assignments: 6,
      grade: 'B',
      progress: 72,
      color: '#EA4335',
      credits: 4,
      room: 'Lab 101'
    }
  ];

  const mockAssignments = [
    {
      id: 1,
      title: 'Python Programming Project',
      subject: 'Computer Science',
      course: 'CS101',
      dueDate: '2025-06-20',
      status: 'pending',
      priority: 'high',
      description: 'Create a simple web scraper using Python',
      points: 100,
      submittedAt: null
    },
    {
      id: 2,
      title: 'Calculus Problem Set 7',
      subject: 'Mathematics',
      course: 'MATH201',
      dueDate: '2025-06-18',
      status: 'pending',
      priority: 'medium',
      description: 'Integration by parts exercises',
      points: 50,
      submittedAt: null
    },
    {
      id: 3,
      title: 'World War II Essay',
      subject: 'History',
      course: 'HIST101',
      dueDate: '2025-06-25',
      status: 'pending',
      priority: 'medium',
      description: '1500-word essay on causes of WWII',
      points: 75,
      submittedAt: null
    },
    {
      id: 4,
      title: 'Lab Report: Motion Physics',
      subject: 'Physics',
      course: 'PHYS101',
      dueDate: '2025-06-15',
      status: 'completed',
      priority: 'low',
      description: 'Analysis of projectile motion experiment',
      points: 40,
      grade: 'A-',
      submittedAt: '2025-06-14'
    },
    {
      id: 5,
      title: 'Algorithm Complexity Analysis',
      subject: 'Computer Science',
      course: 'CS101',
      dueDate: '2025-06-12',
      status: 'completed',
      priority: 'high',
      description: 'Big O notation and time complexity',
      points: 80,
      grade: 'A',
      submittedAt: '2025-06-11'
    }
  ];

  const mockGrades = [
    {
      id: 1,
      subject: 'Computer Science',
      course: 'CS101',
      assignment: 'Algorithm Analysis',
      grade: 'A',
      percentage: 94,
      date: '2025-06-10',
      feedback: 'Excellent understanding of time complexity',
      points: '94/100'
    },
    {
      id: 2,
      subject: 'Mathematics',
      course: 'MATH201',
      assignment: 'Derivatives Quiz',
      grade: 'B+',
      percentage: 87,
      date: '2025-06-08',
      feedback: 'Good work, minor calculation errors',
      points: '87/100'
    },
    {
      id: 3,
      subject: 'History',
      course: 'HIST101',
      assignment: 'Renaissance Presentation',
      grade: 'A',
      percentage: 96,
      date: '2025-06-05',
      feedback: 'Outstanding research and presentation skills',
      points: '96/100'
    },
    {
      id: 4,
      subject: 'Physics',
      course: 'PHYS101',
      assignment: 'Force and Motion Test',
      grade: 'B',
      percentage: 82,
      date: '2025-06-03',
      feedback: 'Solid understanding, practice more word problems',
      points: '82/100'
    },
    {
      id: 5,
      subject: 'Computer Science',
      course: 'CS101',
      assignment: 'Data Structures Project',
      grade: 'A-',
      percentage: 91,
      date: '2025-05-28',
      feedback: 'Great implementation, clean code',
      points: '91/100'
    }
  ];

  const [dashboardData] = useState({
    profile: {
      firstName: 'Arjun',
      lastName: 'Patel',
      studentId: 'STU123456',
      email: 'arjun.patel@gdc.edu',
      class: '12th Grade',
      section: 'A',
      enrollmentYear: '2023',
      gpa: '3.7'
    },
    courses: mockCourses,
    stats: {
      totalCourses: mockCourses.length,
      completedAssignments: mockAssignments.filter(a => a.status === 'completed').length,
      pendingAssignments: mockAssignments.filter(a => a.status === 'pending').length,
      averageGrade: '87%',
      attendanceRate: 94,
      gpa: '3.7'
    },
    recentGrades: mockGrades.slice(0, 3),
    upcomingAssignments: mockAssignments.filter(a => a.status === 'pending'),
    allAssignments: mockAssignments,
    allGrades: mockGrades,    recentFeedback: [
      {
        id: 1,
        from: 'Dr. Smith',
        subject: 'Computer Science - CS101',
        message: 'Excellent work on your Python programming project! Your code structure was clean and well-documented. You demonstrated a strong understanding of object-oriented programming concepts.',
        date: '2025-06-11',
        type: 'positive',
        rating: 5
      },
      {
        id: 2,
        from: 'Dr. Williams',
        subject: 'Mathematics - MATH201',
        message: 'Good progress on calculus concepts. Consider attending office hours for extra help with integration by parts techniques. Practice more word problems to improve application skills.',
        date: '2025-06-09',
        type: 'constructive',
        rating: 4
      },
      {
        id: 3,
        from: 'Prof. Johnson',
        subject: 'History - HIST101',
        message: 'Your essay on Renaissance art was well-researched and demonstrated critical thinking. Excellent use of primary sources and clear argumentation throughout.',
        date: '2025-06-07',
        type: 'positive',
        rating: 5
      },
      {
        id: 4,
        from: 'Dr. Brown',
        subject: 'Physics - PHYS101',
        message: 'Great improvement in lab report quality. Your analysis of experimental data shows good understanding of physics principles. Keep up the momentum!',
        date: '2025-06-05',
        type: 'positive',
        rating: 4
      },
      {
        id: 5,
        from: 'Academic Advisor',
        subject: 'General Academic Performance',
        message: 'Congratulations on maintaining excellent grades this semester. Your consistent effort and dedication are paying off. Continue this excellent work ethic.',
        date: '2025-06-03',
        type: 'general',
        rating: 5
      }
    ],
    attendance: {
      totalClasses: 120,
      attendedClasses: 113,
      percentage: 94,
      recentRecords: [
        { date: '2025-06-12', status: 'present', subject: 'Computer Science' },
        { date: '2025-06-11', status: 'present', subject: 'Mathematics' },
        { date: '2025-06-10', status: 'absent', subject: 'History' },
        { date: '2025-06-09', status: 'present', subject: 'Physics' },
        { date: '2025-06-08', status: 'present', subject: 'Computer Science' }
      ]
    }
  });

  // Menu items for student dashboard
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'courses', label: 'My Courses', icon: <CoursesIcon /> },
    { key: 'assignments', label: 'Assignments', icon: <AssignmentIcon /> },
    { key: 'grades', label: 'Grades & Progress', icon: <GradesIcon /> },
    { key: 'quizzes', label: 'Quizzes', icon: <QuizIcon /> },
    { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon /> },
    { key: 'feedback', label: 'Feedback', icon: <FeedbackIcon /> },
  ];
  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        sx={{
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
          border: `1px solid ${alpha(color, 0.3)}`,
          borderRadius: 3,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          }
        }}
      >
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: color,
                width: 48,
                height: 48,
                color: 'white'
              }}
            >
              {icon}
            </Avatar>
            {trend && (
              <Chip
                label={trend}
                size="small"
                sx={{
                  bgcolor: alpha(color, 0.15),
                  color: color,
                  fontWeight: 'bold'
                }}
              />
            )}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: color, mb: 0.5 }}>
            {value}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#1a1a1a' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: '#555555', fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
  const CourseCard = ({ course }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        sx={{
          borderRadius: 3,
          height: '100%',
          background: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: `2px solid ${alpha(course.color, 0.3)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: course.color,
                width: 40,
                height: 40,
                mr: 2,
                fontWeight: 'bold',
                color: 'white'
              }}
            >
              {course.code.substring(0, 2)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, color: '#1a1a1a' }}>
                {course.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666666', fontWeight: 500 }}>
                {course.code} • {course.credits} Credits
              </Typography>
            </Box>
            <Chip
              label={course.grade}
              sx={{
                bgcolor: alpha(course.color, 0.15),
                color: course.color,
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: '#333333', fontWeight: 500 }}>
              Progress: {course.progress}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={course.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(course.color, 0.15),
                '& .MuiLinearProgress-bar': {
                  bgcolor: course.color,
                  borderRadius: 4,
                }
              }}
            />
          </Box>

          <Divider sx={{ my: 2, bgcolor: alpha(course.color, 0.1) }} />

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProfileIcon sx={{ fontSize: 16, color: course.color }} />
              <Typography variant="body2" sx={{ color: '#444444', fontWeight: 500 }}>
                {course.instructor}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon sx={{ fontSize: 16, color: course.color }} />
              <Typography variant="body2" sx={{ color: '#444444', fontWeight: 500 }}>
                {course.schedule}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon sx={{ fontSize: 16, color: course.color }} />
              <Typography variant="body2" sx={{ color: '#444444', fontWeight: 500 }}>
                {course.assignments} assignments
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
  const AssignmentCard = ({ assignment }) => {
    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high': return '#f44336';
        case 'medium': return '#ff9800';
        case 'low': return '#4caf50';
        default: return '#2196f3';
      }
    };

    const getStatusColor = (status) => {
      return status === 'completed' ? '#4caf50' : '#ff9800';
    };

    return (
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          border: `2px solid ${alpha(getPriorityColor(assignment.priority), 0.3)}`,
          background: assignment.status === 'completed' ? alpha('#4caf50', 0.08) : 'white',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#1a1a1a' }}>
                {assignment.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "#444444", fontWeight: 600, mb: 1 }}>
                {assignment.subject} • {assignment.course}
              </Typography>              <Typography variant="body2" sx={{ color: '#222222', lineHeight: 1.5, fontWeight: 400 }}>
                {assignment.description}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={assignment.priority}
                size="small"
                sx={{
                  bgcolor: alpha(getPriorityColor(assignment.priority), 0.15),
                  color: getPriorityColor(assignment.priority),
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
              />
              <Chip
                label={assignment.status}
                size="small"
                sx={{
                  bgcolor: alpha(getStatusColor(assignment.status), 0.15),
                  color: getStatusColor(assignment.status),
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 16, color: getPriorityColor(assignment.priority) }} />
                <Typography variant="body2" sx={{ color: '#333333', fontWeight: 500 }}>
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                <Typography variant="body2" sx={{ color: '#333333', fontWeight: 500 }}>
                  {assignment.points} pts
                </Typography>
              </Box>
              {assignment.grade && (
                <Chip
                  label={`Grade: ${assignment.grade}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#4caf50', 0.15),
                    color: '#4caf50',
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>
            {assignment.status === 'pending' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayIcon />}
                sx={{ 
                  textTransform: 'none',
                  bgcolor: getPriorityColor(assignment.priority),
                  '&:hover': {
                    bgcolor: getPriorityColor(assignment.priority),
                    filter: 'brightness(0.9)'
                  }
                }}
              >
                Start
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDashboardContent = () => {
    const { profile, stats } = dashboardData;

    return (
      <Box sx={{ p: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{xs:12,md:8}}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: 'primary.main',
                      fontSize: '1.5rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                  >
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      Welcome back, {profile.firstName}!
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#555555", fontWeight: 500 }}>
                      {profile.class} - Section {profile.section}
                    </Typography>
                    <Chip
                      label={`Student ID: ${profile.studentId}`}
                      variant="outlined"
                      sx={{ mt: 1, fontWeight: 'bold' }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid size={{xs:12,md:4}}>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => window.location.reload()}
                    sx={{ mr: 1 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                  >
                    Export
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Enrolled Courses"
                value={stats.totalCourses}
                icon={<SchoolIcon />}
                color="#2196F3"
                subtitle="Active this semester"
                trend="Current"
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Completed Tasks"
                value={stats.completedAssignments}
                icon={<CheckIcon />}
                color="#4CAF50"
                subtitle={`${stats.pendingAssignments} pending`}
                trend="On Track"
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Average Grade"
                value={stats.averageGrade}
                icon={<StarIcon />}
                color="#FF9800"
                subtitle="Overall performance"
                trend="Excellent"
              />
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <StatCard
                title="Attendance"
                value={`${stats.attendanceRate}%`}
                icon={<AttendanceIcon />}
                color="#9C27B0"
                subtitle="This semester"
                trend="Great"
              />
            </Grid>
          </Grid>

          {/* Recent Activity */}
          <Grid container spacing={3}>
            <Grid size={{xs:12,md:6}}>
              <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GradesIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Recent Grades
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => setCurrentView('grades')}>
                      View All
                    </Button>
                  </Box>
                  <List dense>
                    {dashboardData.recentGrades.map((grade, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <StarIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${grade.assignment} - ${grade.grade}`}
                          secondary={`${grade.subject} • ${new Date(grade.date).toLocaleDateString()}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label={grade.points}
                          size="small"
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="warning" />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Upcoming Assignments
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => setCurrentView('assignments')}>
                      View All
                    </Button>
                  </Box>
                  <List dense>
                    {dashboardData.upcomingAssignments.slice(0, 3).map((assignment, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <TimeIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={assignment.title}
                          secondary={`${assignment.subject} • Due: ${new Date(assignment.dueDate).toLocaleDateString()}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          label={assignment.priority}
                          size="small"
                          color={assignment.priority === 'high' ? 'error' : 'warning'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      </Box>
    );
  };

  const renderCoursesContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        My Courses
      </Typography>
      <Grid container spacing={3}>
        {dashboardData.courses.map((course) => (
          <Grid size={{xs:12,md:6,lg:4}} key={course.id}>
            <CourseCard course={course} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
  const renderAssignmentsContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
        Assignments
      </Typography>
      
      <Tabs 
        value={0}        sx={{ 
          mb: 3,
          '& .MuiTab-root': {
            color: '#444444',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            minHeight: 48,
            '&.Mui-selected': {
              color: '#1976d2',
              fontWeight: 'bold'
            },
            '&:hover': {
              color: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#1976d2',
            height: 3,
            borderRadius: '3px 3px 0 0'
          }
        }}
      >
        <Tab label="All Assignments" />
        <Tab label="Pending" />
        <Tab label="Completed" />
      </Tabs>

      <Box>
        {dashboardData.allAssignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </Box>
    </Box>
  );
  const renderGradesContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
        Grades & Progress
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3, 
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(33, 150, 243, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.stats.gpa}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Overall GPA
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(76, 175, 80, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.stats.averageGrade}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Average Grade
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(255, 152, 0, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.stats.completedAssignments}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Completed
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(244, 67, 54, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.stats.pendingAssignments}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Pending
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        background: 'white'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
            Grade History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  '& .MuiTableCell-head': {
                    fontWeight: 'bold',
                    color: '#495057',
                    fontSize: '0.95rem'
                  }
                }}>
                  <TableCell>Assignment</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Feedback</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {dashboardData.allGrades.map((grade, index) => (
                  <TableRow key={grade.id} sx={{
                    '&:nth-of-type(even)': {
                      backgroundColor: '#f8f9fa'
                    },
                    '&:hover': {
                      backgroundColor: alpha('#2196F3', 0.05),
                      cursor: 'pointer'
                    },
                    transition: 'all 0.2s ease'
                  }}>
                    <TableCell sx={{ fontWeight: 500, color: '#333' }}>{grade.assignment}</TableCell>
                    <TableCell sx={{ color: '#555', fontWeight: 500 }}>{grade.course}</TableCell>
                    <TableCell>
                      <Chip 
                        label={grade.grade} 
                        sx={{
                          background: grade.grade.includes('A') ? 'linear-gradient(135deg, #4CAF50, #388E3C)' :
                                     grade.grade.includes('B') ? 'linear-gradient(135deg, #FF9800, #F57C00)' :
                                     'linear-gradient(135deg, #F44336, #D32F2F)',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#333' }}>{grade.points}</TableCell>
                    <TableCell sx={{ color: '#666' }}>{new Date(grade.date).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ maxWidth: 250 }}>
                      <Typography variant="body2" sx={{ 
                        color: '#555',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }} title={grade.feedback}>
                        {grade.feedback}
                      </Typography>                    </TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
  const renderAttendanceContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
        Attendance Record
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(156, 39, 176, 0.3)',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow: '0 12px 35px rgba(156, 39, 176, 0.4)',
            },
            transition: 'all 0.4s ease'
          }}>
            <AttendanceIcon sx={{ fontSize: 40, mb: 2, opacity: 0.9 }} />
            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.attendance.percentage}%
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Attendance Rate
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Excellent Performance
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(76, 175, 80, 0.3)',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow: '0 12px 35px rgba(76, 175, 80, 0.4)',
            },
            transition: 'all 0.4s ease'
          }}>
            <CheckIcon sx={{ fontSize: 40, mb: 2, opacity: 0.9 }} />
            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.attendance.attendedClasses}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Classes Attended
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Out of {dashboardData.attendance.totalClasses}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #FF5722 0%, #D84315 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(255, 87, 34, 0.3)',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow: '0 12px 35px rgba(255, 87, 34, 0.4)',
            },
            transition: 'all 0.4s ease'
          }}>
            <WarningIcon sx={{ fontSize: 40, mb: 2, opacity: 0.9 }} />
            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.attendance.totalClasses - dashboardData.attendance.attendedClasses}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Classes Missed
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Keep improving!
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        background: 'white'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
            Recent Attendance History
          </Typography>
          <List sx={{ p: 0 }}>
            {dashboardData.attendance.recentRecords.map((record, index) => (
              <ListItem 
                key={index}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  background: record.status === 'present' ? 
                    'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))' :
                    'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.05))',
                  border: `2px solid ${record.status === 'present' ? 
                    alpha('#4CAF50', 0.3) : alpha('#F44336', 0.3)}`,
                  '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: `0 4px 15px ${record.status === 'present' ? 
                      'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}`,
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {record.status === 'present' ? (
                    <CheckIcon sx={{ 
                      color: '#4CAF50', 
                      fontSize: 24,
                      p: 0.5,
                      borderRadius: '50%',
                      background: alpha('#4CAF50', 0.1)
                    }} />
                  ) : (
                    <WarningIcon sx={{ 
                      color: '#F44336',
                      fontSize: 24,
                      p: 0.5,
                      borderRadius: '50%',
                      background: alpha('#F44336', 0.1)
                    }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                      {record.subject}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Typography>
                  }
                />
                <Chip
                  label={record.status === 'present' ? 'Present' : 'Absent'}
                  sx={{
                    background: record.status === 'present' ? 
                      'linear-gradient(135deg, #4CAF50, #388E3C)' :
                      'linear-gradient(135deg, #F44336, #D32F2F)',
                    color: 'white',
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                    px: 2
                  }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
  const renderFeedbackContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
        Teacher Feedback & Reviews
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(76, 175, 80, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 10px 30px rgba(76, 175, 80, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <StarIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              4.6
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Average Rating
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              Based on teacher feedback
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(33, 150, 243, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 10px 30px rgba(33, 150, 243, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <FeedbackIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {dashboardData.recentFeedback.length}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Total Feedback
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              This semester
            </Typography>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:4}}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center', 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            color: 'white',
            boxShadow: '0 6px 25px rgba(255, 152, 0, 0.3)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 10px 30px rgba(255, 152, 0, 0.4)',
            },
            transition: 'all 0.3s ease'
          }}>
            <TrendingUpIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              92%
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              Positive Reviews
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              Excellent progress
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Feedback Cards */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
        Recent Feedback
      </Typography>
      {dashboardData.recentFeedback.map((feedback, index) => (
        <motion.div
          key={feedback.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            overflow: 'hidden',
            position: 'relative',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            },
            transition: 'all 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: feedback.type === 'positive' 
                ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' 
                : feedback.type === 'constructive'
                ? 'linear-gradient(90deg, #FF9800, #FFB74D)'
                : 'linear-gradient(90deg, #2196F3, #64B5F6)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Avatar sx={{ 
                      bgcolor: feedback.type === 'positive' ? '#4CAF50' : feedback.type === 'constructive' ? '#FF9800' : '#2196F3',
                      width: 40,
                      height: 40,
                      fontSize: '1rem'
                    }}>
                      {feedback.from.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                        {feedback.from}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                        {feedback.subject}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Chip
                    label={feedback.type}
                    sx={{
                      background: feedback.type === 'positive' 
                        ? 'linear-gradient(135deg, #4CAF50, #66BB6A)' 
                        : feedback.type === 'constructive'
                        ? 'linear-gradient(135deg, #FF9800, #FFB74D)'
                        : 'linear-gradient(135deg, #2196F3, #64B5F6)',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ color: '#888', fontWeight: 500 }}>
                    {new Date(feedback.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ 
                background: 'rgba(0,0,0,0.02)', 
                borderRadius: 2, 
                p: 2, 
                border: '1px solid rgba(0,0,0,0.05)' 
              }}>
                <Typography variant="body1" sx={{ 
                  color: '#333',
                  lineHeight: 1.6,
                  fontSize: '1rem'
                }}>
                  "{feedback.message}"
                </Typography>
              </Box>
              
              {feedback.rating && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                    Rating:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {[...Array(5)].map((_, i) => (
                      <StarIcon 
                        key={i} 
                        sx={{ 
                          fontSize: 18,
                          color: i < feedback.rating ? '#FFD700' : '#E0E0E0' 
                        }} 
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                    ({feedback.rating}/5)
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <UnifiedDashboardLayout
        title="Student Dashboard"
        menuItems={menuItems}
        currentView={currentView}
        onViewChange={setCurrentView}
        userStats={{}}
        notifications={0}
      >
        <LoadingComponent />
      </UnifiedDashboardLayout>
    );
  }

  return (
    <UnifiedDashboardLayout
      title="Student Dashboard"
      menuItems={menuItems}
      currentView={currentView}
      onViewChange={setCurrentView}
      userStats={{
        totalCourses: dashboardData.stats.totalCourses || 0,
        completedAssignments: dashboardData.stats.completedAssignments || 0,
        pendingAssignments: dashboardData.stats.pendingAssignments || 0,
        averageGrade: dashboardData.stats.averageGrade || 'N/A',
      }}
      notifications={dashboardData.upcomingAssignments.length + dashboardData.recentFeedback.length}
    >
      <AnimatePresence mode="wait">
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {currentView === 'dashboard' && renderDashboardContent()}
        {currentView === 'courses' && renderCoursesContent()}
        {currentView === 'assignments' && renderAssignmentsContent()}
        {currentView === 'grades' && renderGradesContent()}
        {currentView === 'attendance' && renderAttendanceContent()}
        {currentView === 'feedback' && renderFeedbackContent()}        {currentView === 'quizzes' && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
              Quizzes & Tests
            </Typography>
            
            {/* Quiz Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{xs:12,sm:6,md:3}}>
                <Card sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #673AB7 0%, #512DA8 100%)',
                  color: 'white',
                  boxShadow: '0 6px 25px rgba(103, 58, 183, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 30px rgba(103, 58, 183, 0.4)',
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <QuizIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    12
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    Total Quizzes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    This semester
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{xs:12,sm:6,md:3}}>
                <Card sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                  color: 'white',
                  boxShadow: '0 6px 25px rgba(76, 175, 80, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 30px rgba(76, 175, 80, 0.4)',
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <CheckIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    9
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    Completed
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    75% completion rate
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{xs:12,sm:6,md:3}}>
                <Card sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  color: 'white',
                  boxShadow: '0 6px 25px rgba(255, 152, 0, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 30px rgba(255, 152, 0, 0.4)',
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <StarIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    87%
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    Average Score
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    Excellent performance
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{xs:12,sm:6,md:3}}>
                <Card sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                  color: 'white',
                  boxShadow: '0 6px 25px rgba(244, 67, 54, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(244, 67, 54, 0.4)',
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <TimeIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    3
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    Upcoming
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    Due this week
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Available Quizzes */}
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
              Available Quizzes
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {[
                {
                  id: 1,
                  title: 'Python Fundamentals Quiz',
                  subject: 'Computer Science',
                  course: 'CS101',
                  questions: 15,
                  timeLimit: 30,
                  dueDate: '2025-06-20',
                  status: 'available',
                  difficulty: 'medium',
                  points: 50,
                  description: 'Test your knowledge of Python basics, variables, and functions'
                },
                {
                  id: 2,
                  title: 'Calculus Derivatives Test',
                  subject: 'Mathematics',
                  course: 'MATH201',
                  questions: 20,
                  timeLimit: 45,
                  dueDate: '2025-06-22',
                  status: 'available',
                  difficulty: 'hard',
                  points: 75,
                  description: 'Comprehensive test on derivative rules and applications'
                },
                {
                  id: 3,
                  title: 'Renaissance History Quiz',
                  subject: 'History',
                  course: 'HIST101',
                  questions: 12,
                  timeLimit: 25,
                  dueDate: '2025-06-18',
                  status: 'completed',
                  difficulty: 'easy',
                  points: 40,
                  score: 92,
                  description: 'Quiz on Renaissance art, culture, and key figures'
                },
                {
                  id: 4,
                  title: 'Force and Motion Assessment',
                  subject: 'Physics',
                  course: 'PHYS101',
                  questions: 18,
                  timeLimit: 40,
                  dueDate: '2025-06-25',
                  status: 'available',
                  difficulty: 'medium',
                  points: 60,
                  description: 'Assessment covering Newton\'s laws and kinematic equations'
                }
              ].map((quiz) => (
                <Grid size={{xs:12,md:6}} key={quiz.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: quiz.id * 0.1 }}
                  >
                    <Card sx={{
                      borderRadius: 3,
                      height: '100%',
                      background: quiz.status === 'completed' 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: quiz.status === 'completed'
                        ? '2px solid rgba(76, 175, 80, 0.3)'
                        : '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      },
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: quiz.difficulty === 'easy' 
                          ? 'linear-gradient(90deg, #4CAF50, #66BB6A)'
                          : quiz.difficulty === 'medium'
                          ? 'linear-gradient(90deg, #FF9800, #FFB74D)'
                          : 'linear-gradient(90deg, #F44336, #FF5722)',
                      }
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#1a1a1a' }}>
                              {quiz.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500, mb: 1 }}>
                              {quiz.subject} • {quiz.course}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.5 }}>
                              {quiz.description}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                            <Chip
                              label={quiz.difficulty}
                              size="small"
                              sx={{
                                bgcolor: quiz.difficulty === 'easy' ? 'rgba(76, 175, 80, 0.15)' :
                                        quiz.difficulty === 'medium' ? 'rgba(255, 152, 0, 0.15)' :
                                        'rgba(244, 67, 54, 0.15)',
                                color: quiz.difficulty === 'easy' ? '#4CAF50' :
                                       quiz.difficulty === 'medium' ? '#FF9800' :
                                       '#F44336',
                                fontWeight: 'bold',
                                textTransform: 'capitalize'
                              }}
                            />
                            {quiz.status === 'completed' && quiz.score && (
                              <Chip
                                label={`Score: ${quiz.score}%`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(76, 175, 80, 0.15)',
                                  color: '#4CAF50',
                                  fontWeight: 'bold'
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <QuizIcon sx={{ fontSize: 16, color: '#666' }} />
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                              {quiz.questions} questions
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimeIcon sx={{ fontSize: 16, color: '#666' }} />
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                              {quiz.timeLimit} minutes
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                              {quiz.points} points
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                            Due: {new Date(quiz.dueDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Typography>
                          {quiz.status === 'available' ? (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PlayIcon />}
                              sx={{
                                textTransform: 'none',
                                bgcolor: '#673AB7',
                                '&:hover': {
                                  bgcolor: '#512DA8'
                                }
                              }}
                            >
                              Start Quiz
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<CheckIcon />}
                              disabled
                              sx={{
                                textTransform: 'none',
                                color: '#4CAF50',
                                borderColor: '#4CAF50'
                              }}
                            >
                              Completed
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            {/* Quiz Performance Chart */}
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              background: 'white'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#1a1a1a' }}>
                  Recent Quiz Results
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ 
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        '& .MuiTableCell-head': {
                          fontWeight: 'bold',
                          color: '#495057',
                          fontSize: '0.95rem'
                        }
                      }}>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Questions</TableCell>
                        <TableCell>Time Taken</TableCell>
                        <TableCell>Date</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { title: 'Renaissance History Quiz', subject: 'HIST101', score: 92, questions: '11/12', time: '18 min', date: '2025-06-12' },
                        { title: 'Basic Programming Quiz', subject: 'CS101', score: 88, questions: '13/15', time: '22 min', date: '2025-06-10' },
                        { title: 'Algebra Fundamentals', subject: 'MATH201', score: 95, questions: '19/20', time: '35 min', date: '2025-06-08' },
                        { title: 'Physics Motion Quiz', subject: 'PHYS101', score: 84, questions: '15/18', time: '28 min', date: '2025-06-05' },
                        { title: 'Data Structures Quiz', subject: 'CS101', score: 91, questions: '16/18', time: '25 min', date: '2025-06-03' }
                      ].map((result, index) => (
                        <TableRow key={index} sx={{
                          '&:nth-of-type(even)': {
                            backgroundColor: '#f8f9fa'
                          },
                          '&:hover': {
                            backgroundColor: alpha('#673AB7', 0.05),
                            cursor: 'pointer'
                          },
                          transition: 'all 0.2s ease'
                        }}>
                          <TableCell sx={{ fontWeight: 500, color: '#333' }}>{result.title}</TableCell>
                          <TableCell sx={{ color: '#555', fontWeight: 500 }}>{result.subject}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${result.score}%`} 
                              sx={{
                                background: result.score >= 90 ? 'linear-gradient(135deg, #4CAF50, #388E3C)' :
                                           result.score >= 80 ? 'linear-gradient(135deg, #FF9800, #F57C00)' :
                                           'linear-gradient(135deg, #F44336, #D32F2F)',
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: '#333' }}>{result.questions}</TableCell>
                          <TableCell sx={{ color: '#666' }}>{result.time}</TableCell>
                          <TableCell sx={{ color: '#666' }}>{new Date(result.date).toLocaleDateString()}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </AnimatePresence>
    </UnifiedDashboardLayout>
  );
};

export default StudentDashboard;