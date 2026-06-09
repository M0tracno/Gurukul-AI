import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EnhancedFacultyService from '../../services/enhancedFacultyService';

// Styled components for modern design
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  background: 'linear-gradient(180deg, #10131A 0%, #08090C 150%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 26px 60px -34px rgba(0,0,0,0.9)',
  transition: 'all 0.3s ease-in-out',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  overflow: 'hidden',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
    '& .course-header': {
      background: 'linear-gradient(135deg, #E3A648 0%, #B97E26 100%)',
      color: 'white',
    },
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #E3A648 0%, #B97E26 50%, #E3A648 100%)',
  },
}));

const CourseHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
  transition: 'all 0.3s ease',
  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
}));

const StatChip = styled(Chip)(({ theme, color }) => ({
  borderRadius: 12,
  fontWeight: 600,
  fontSize: '0.875rem',
  background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
  color: color,
  border: `1px solid ${color}30`,
  '& .MuiChip-icon': {
    color: color,
  },
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  background: 'rgba(227, 166, 72, 0.05)',
  borderRadius: 12,
  border: '1px solid rgba(227, 166, 72, 0.1)',
}));

const FacultyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const result = await EnhancedFacultyService.getCourses();
        if (result.success) {
          const formattedCourses = result.data.map(course => ({
            id: course.id,
            name: course.name,
            code: course.code,
            students: course.enrolledStudents,
            schedule: course.schedule,
            assignments: course.assignments,
            quizzes: course.quizzes,
            progress: Math.round((course.assignments + course.quizzes) * 10), // Mock progress calculation
          }));
          setCourses(formattedCourses);
        } else {
          // Fallback to mock data
          const mockCourses = [
            {
              id: 1,
              name: 'Introduction to Programming',
              code: 'CS-101',
              students: 45,
              schedule: 'MWF 9:00-10:00',
              assignments: 8,
              quizzes: 5,
              progress: 75,
            },
            {
              id: 2,
              name: 'Data Structures and Algorithms',
              code: 'CS-201',
              students: 35,
              schedule: 'TTh 10:00-12:00',
              assignments: 6,
              quizzes: 4,
              progress: 60,
            },
            {
              id: 3,
              name: 'Database Systems',
              code: 'CS-301',
              students: 28,
              schedule: 'MW 2:00-3:30',
              assignments: 4,
              quizzes: 3,
              progress: 85,
            },
          ];
          setCourses(mockCourses);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
        // Fallback to mock data
        const mockCourses = [
          {
            id: 1,
            name: 'Introduction to Programming',
            code: 'CS-101',
            students: 45,
            schedule: 'MWF 9:00-10:00',
            assignments: 8,
            quizzes: 5,
            progress: 75,
          },
          {
            id: 2,
            name: 'Data Structures and Algorithms',
            code: 'CS-201',
            students: 35,
            schedule: 'TTh 10:00-12:00',
            assignments: 6,
            quizzes: 4,
            progress: 60,
          },
          {
            id: 3,
            name: 'Database Systems',
            code: 'CS-301',
            students: 28,
            schedule: 'MW 2:00-3:30',
            assignments: 4,
            quizzes: 3,
            progress: 85,
          },
        ];
        setCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const handleAddCourse = () => {
    console.log('Add new course');
  };

  const handleEditCourse = courseId => {
    console.log('Edit course:', courseId);
  };

  const handleViewStudents = courseId => {
    console.log('View students for course:', courseId);
  };
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography variant="h6" color="text.secondary">
            Loading courses...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 1,
        background: 'transparent',
        minHeight: '100%',
        borderRadius: 0,
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #10131A 0%, #08090C 140%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    fontSize: '1.5rem',
                  }}
                >
                  <SchoolIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight="bold" gutterBottom>
                    My Courses
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Manage and monitor your teaching courses
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleAddCourse}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    px: 3,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                >
                  Add New Course
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
            zIndex: 1,
          }}
        />
      </Box>

      {/* Courses Grid */}
      <Grid container spacing={4}>
        {courses.map(course => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={course.id}>
            <StyledCard>
              {/* Course Header */}
              <CourseHeader className="course-header">
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: '#1e293b' }}
                    >
                      {course.name}
                    </Typography>
                    <StatChip
                      label={course.code}
                      size="medium"
                      color="#E3A648"
                      icon={<SchoolIcon />}
                    />
                  </Box>
                  <IconButton
                    onClick={() => handleEditCourse(course.id)}
                    sx={{
                      bgcolor: 'rgba(227, 166, 72, 0.1)',
                      color: '#E3A648',
                      '&:hover': {
                        bgcolor: 'rgba(227, 166, 72, 0.2)',
                      },
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
              </CourseHeader>

              <CardContent sx={{ p: 3 }}>
                {/* Course Stats */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                        color: 'white',
                        textAlign: 'center',
                      }}
                    >
                      <PeopleIcon sx={{ fontSize: 24, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {course.students}
                      </Typography>
                      <Typography variant="caption">Students</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
                        color: 'white',
                        textAlign: 'center',
                      }}
                    >
                      <TimeIcon sx={{ fontSize: 24, mb: 1 }} />
                      <Typography variant="body2" fontWeight="bold">
                        Active
                      </Typography>
                      <Typography variant="caption">Status</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Schedule */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    mb: 3,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ScheduleIcon color="primary" />
                    <Typography variant="subtitle2" fontWeight="600" color="primary">
                      Schedule
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="500">
                    {course.schedule}
                  </Typography>
                </Box>

                {/* Assignments and Quizzes */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                        border: '1px solid #4CAF50',
                        borderRadius: 2,
                      }}
                    >
                      <AssignmentIcon sx={{ color: '#4CAF50', mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold" color="#2e7d32">
                        {course.assignments}
                      </Typography>
                      <Typography variant="caption" color="#2e7d32">
                        Assignments
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 30%)',
                        border: '1px solid #FF9800',
                        borderRadius: 2,
                      }}
                    >
                      <QuizIcon sx={{ color: '#FF9800', mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold" color="#e65100">
                        {course.quizzes}
                      </Typography>
                      <Typography variant="caption" color="#e65100">
                        Quizzes
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Progress Bar */}
                <ProgressContainer>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" fontWeight="600" color="primary">
                      Course Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {course.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={course.progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(227, 166, 72, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #E3A648 0%, #B97E26 100%)',
                      },
                    }}
                  />
                </ProgressContainer>

                {/* Action Button */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<PeopleIcon />}
                  onClick={() => handleViewStudents(course.id)}
                  sx={{
                    mt: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #E3A648 0%, #B97E26 100%)',
                    py: 1.5,
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #C68F32 0%, #8C5D17 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(227, 166, 72, 0.3)',
                    },
                  }}
                >
                  View Students
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {courses.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.light',
              mx: 'auto',
              mb: 3,
            }}
          >
            <SchoolIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            No Courses Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Start by creating your first course to begin teaching
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleAddCourse}
            sx={{ borderRadius: 3 }}
          >
            Create Your First Course
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default FacultyCourses;
