import React, { useState, useEffect } from 'react';
import { Assignment, Close, Grade, Message, Refresh } from '@mui/icons-material';
import makeStyles from '../../utils/makeStylesCompat';
import {
  gradeAssignmentWithAI,
  generatePersonalizedFeedback,
  evaluateEssayWithVertexAI,
} from '../../services/aiService';
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
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Tab,
  TextField,
  Tabs,
  Typography,
} from '@mui/material';
import {
  AutorenewRounded as AIIcon,
  Search as SearchIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Save as SaveIcon,
  Send as SendIcon,
  AutoFixHigh as AutoGradeIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components for modern design
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  overflow: 'hidden',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
  },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 24,
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  color: 'white',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
  },
}));

const AssignmentCard = styled(StyledCard)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '& .MuiCardContent-root': {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(3),
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const getColors = () => {
    switch (status) {
      case 'completed':
        return { bg: '#4CAF50', color: 'white' };
      case 'pending':
        return { bg: '#FF9800', color: 'white' };
      case 'in-progress':
        return { bg: '#2196F3', color: 'white' };
      default:
        return { bg: '#f44336', color: 'white' };
    }
  };

  const colors = getColors();
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontWeight: 600,
    borderRadius: 12,
  };
});

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
  },
}));

const useStyles = makeStyles(theme => ({
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: theme.spacing(3),
  },
  searchContainer: {
    marginBottom: theme.spacing(3),
    '& .MuiOutlinedInput-root': {
      borderRadius: 16,
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
  tabsContainer: {
    marginBottom: theme.spacing(3),
    '& .MuiTabs-root': {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: 15,
      padding: theme.spacing(0.5),
    },
    '& .MuiTab-root': {
      borderRadius: 12,
      textTransform: 'none',
      fontWeight: 600,
      transition: 'all 0.3s ease',
      '&.Mui-selected': {
        background: 'linear-gradient(45deg, #667eea, #764ba2)',
        color: 'white',
      },
    },
  },
  assignmentGrid: {
    '& .MuiGrid-item': {
      transition: 'all 0.3s ease',
    },
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
    color: '#666',
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  submissionCard: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(3),
    borderRadius: 15,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  questionItem: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(3),
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 15,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
  },
  feedback: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(3),
    background: 'linear-gradient(135deg, rgba(103, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
    backdropFilter: 'blur(10px)',
    borderRadius: 15,
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  score: {
    fontSize: '3rem',
    fontWeight: 700,
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
}));

// Mock data for assignments
const MOCK_ASSIGNMENTS = [
  {
    id: 'a1',
    title: 'Algorithm Analysis Assignment',
    subject: 'Data Structures & Algorithms',
    dueDate: '2025-06-20',
    totalSubmissions: 18,
    pendingGrading: 5,
    gradedSubmissions: 13,
    totalPoints: 50,
    status: 'pending',
  },
  {
    id: 'a2',
    title: 'Binary Tree Implementation',
    subject: 'Data Structures & Algorithms',
    dueDate: '2025-06-15',
    totalSubmissions: 20,
    pendingGrading: 0,
    gradedSubmissions: 20,
    totalPoints: 75,
    status: 'completed',
  },
  {
    id: 'a3',
    title: 'Database Design Project',
    subject: 'Database Systems',
    dueDate: '2025-06-18',
    totalSubmissions: 15,
    pendingGrading: 8,
    gradedSubmissions: 7,
    totalPoints: 40,
    status: 'in-progress',
  },
  {
    id: 'a4',
    title: 'Machine Learning Basics',
    subject: 'Artificial Intelligence',
    dueDate: '2025-06-25',
    totalSubmissions: 12,
    pendingGrading: 12,
    gradedSubmissions: 0,
    totalPoints: 60,
    status: 'pending',
  },
  {
    id: 'a5',
    title: 'Network Protocol Analysis',
    subject: 'Computer Networks',
    dueDate: '2025-06-22',
    totalSubmissions: 22,
    pendingGrading: 3,
    gradedSubmissions: 19,
    totalPoints: 45,
    status: 'in-progress',
  },
  {
    id: 'a6',
    title: 'Web Development Portfolio',
    subject: 'Web Technologies',
    dueDate: '2025-06-30',
    totalSubmissions: 35,
    pendingGrading: 10,
    gradedSubmissions: 25,
    totalPoints: 80,
    status: 'in-progress',
  },
  {
    id: 'a7',
    title: 'Software Engineering Case Study',
    subject: 'Software Engineering',
    dueDate: '2025-07-05',
    totalSubmissions: 28,
    pendingGrading: 15,
    gradedSubmissions: 13,
    totalPoints: 100,
    status: 'pending',
  },
];

function GradeAssignments() {
  const classes = useStyles();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS); // Initialize with mock data
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load assignments when component mounts
  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      try {
        const result = await EnhancedFacultyService.getAssignments();
        if (result.success && result.data && result.data.length > 0) {
          const formattedAssignments = result.data.map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            subject: assignment.courseName || assignment.course,
            dueDate: assignment.dueDate,
            totalSubmissions: assignment.submissions || 0,
            pendingGrading: assignment.pending || 0,
            gradedSubmissions: assignment.graded || 0,
            totalPoints: assignment.totalPoints || 100,
            status: assignment.status === 'Active' ? 'pending' : assignment.status || 'pending',
          }));
          setAssignments(formattedAssignments);
        } else {
          // Keep mock data as fallback
          setAssignments(MOCK_ASSIGNMENTS);
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
        // Keep mock data as fallback
        setAssignments(MOCK_ASSIGNMENTS);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  // Handle search change
  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  };

  // Filter assignments based on search and tab
  const getFilteredAssignments = () => {
    let filtered = assignments;

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        assignment =>
          assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    switch (tabValue) {
      case 0: // Pending
        return filtered.filter(assignment => assignment.status === 'pending');
      case 1: // In Progress
        return filtered.filter(assignment => assignment.status === 'in-progress');
      case 2: // Completed
        return filtered.filter(assignment => assignment.status === 'completed');
      default:
        return filtered;
    }
  };

  const filteredAssignments = getFilteredAssignments();

  const handleSelectAssignment = assignment => {
    setSelectedAssignment(assignment);
    console.log('Selected assignment:', assignment);
  };

  // Main render
  return (
    <Container maxWidth="xl" className={classes.container}>
      {/* Header Section */}
      <HeaderSection>
        <Box position="relative" zIndex={2}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <SchoolIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Assignments to Grade
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Review and grade student submissions efficiently
              </Typography>
            </Box>
          </Box>
        </Box>
      </HeaderSection>

      {/* Search Bar */}
      <Box className={classes.searchContainer}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search assignments by title or subject..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Tabs */}
      <Box className={classes.tabsContainer}>
        <Tabs
          value={tabValue}
          onChange={(event, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>📋</span>
                <span>Pending ({assignments.filter(a => a.status === 'pending').length})</span>
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>⏳</span>
                <span>
                  In Progress ({assignments.filter(a => a.status === 'in-progress').length})
                </span>
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>✅</span>
                <span>Completed ({assignments.filter(a => a.status === 'completed').length})</span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <Box className={classes.emptyState}>
          <Assignment sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No assignments found
          </Typography>
          <Typography variant="body2">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'No assignments available for this filter'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3} className={classes.assignmentGrid}>
          {filteredAssignments.map(assignment => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment.id}>
              <AssignmentCard>
                <CardContent>
                  {/* Assignment Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                        {assignment.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {assignment.subject}
                      </Typography>
                    </Box>
                    <StatusChip
                      status={assignment.status}
                      label={
                        assignment.status === 'pending'
                          ? 'Pending'
                          : assignment.status === 'in-progress'
                            ? 'In Progress'
                            : 'Completed'
                      }
                      size="small"
                    />
                  </Box>

                  {/* Assignment Details */}
                  <Box mb={3}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <CalendarIcon sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2" color="text.secondary">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <PeopleIcon sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2" color="text.secondary">
                        {assignment.totalSubmissions} submissions
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <GradeIcon sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2" color="text.secondary">
                        Max Points: {assignment.totalPoints}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress Section */}
                  <Box mb={3}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" fontWeight="bold" color="primary">
                        GRADING PROGRESS
                      </Typography>
                      <Typography variant="caption" fontWeight="bold" color="primary">
                        {assignment.gradedSubmissions}/{assignment.totalSubmissions}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                        borderRadius: 1,
                        height: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(assignment.gradedSubmissions / assignment.totalSubmissions) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Stats Cards */}
                  <Grid container spacing={1} mb={3}>
                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                          color: 'white',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          {assignment.gradedSubmissions}
                        </Typography>
                        <Typography variant="caption">Graded</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
                          color: 'white',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          {assignment.pendingGrading}
                        </Typography>
                        <Typography variant="caption">Pending</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Action Buttons */}
                  <Box display="flex" gap={1}>
                    <ActionButton
                      variant="contained"
                      fullWidth
                      startIcon={<GradeIcon />}
                      onClick={() => handleSelectAssignment(assignment)}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        },
                      }}
                    >
                      Grade Now
                    </ActionButton>
                    <ActionButton
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      sx={{
                        borderColor: '#667eea',
                        color: '#667eea',
                        '&:hover': {
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          borderColor: '#667eea',
                        },
                      }}
                    >
                      View
                    </ActionButton>
                  </Box>
                </CardContent>
              </AssignmentCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default GradeAssignments;
