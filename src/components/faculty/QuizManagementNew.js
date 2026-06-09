import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Snackbar,
  Avatar,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Analytics as AnalyticsIcon,
  Quiz as QuizIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Assessment,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EnhancedFacultyService from '../../services/enhancedFacultyService';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
  },
}));

const StatCard = styled(Card)(({ theme, color }) => ({
  borderRadius: 16,
  background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
  border: `1px solid ${color}30`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 25px ${color}20`,
  },
}));

const QuizManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [createQuizDialog, setCreateQuizDialog] = useState(false);
  const [editQuizDialog, setEditQuizDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    courseId: '',
    duration: 30,
    totalQuestions: 10,
    passingScore: 70,
    startDate: '',
    endDate: '',
    questions: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load courses
      const coursesResult = await EnhancedFacultyService.getCourses();
      if (coursesResult.success) {
        setCourses(coursesResult.data);
      }

      // Load quizzes
      const quizzesResult = await EnhancedFacultyService.getQuizzes();
      if (quizzesResult.success) {
        setQuizzes(quizzesResult.data);
      }

      showSnackbar('Data loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.courseId) {
      showSnackbar('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.createQuiz(newQuiz);
      if (result.success) {
        showSnackbar('Quiz created successfully', 'success');
        setCreateQuizDialog(false);
        setNewQuiz({
          title: '',
          description: '',
          courseId: '',
          duration: 30,
          totalQuestions: 10,
          passingScore: 70,
          startDate: '',
          endDate: '',
          questions: [],
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      showSnackbar('Error creating quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuiz = quiz => {
    setSelectedQuiz(quiz);
    setNewQuiz(quiz);
    setEditQuizDialog(true);
  };

  const handleUpdateQuiz = async () => {
    if (!newQuiz.title || !newQuiz.courseId) {
      showSnackbar('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.updateQuiz(selectedQuiz.id, newQuiz);
      if (result.success) {
        showSnackbar('Quiz updated successfully', 'success');
        setEditQuizDialog(false);
        setSelectedQuiz(null);
        await loadData();
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      showSnackbar('Error updating quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async quizId => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.deleteQuiz(quizId);
      if (result.success) {
        showSnackbar('Quiz deleted successfully', 'success');
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      showSnackbar('Error deleting quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getQuizStats = () => {
    const total = quizzes.length;
    const active = quizzes.filter(q => new Date(q.endDate) > new Date()).length;
    const completed = quizzes.filter(q => new Date(q.endDate) <= new Date()).length;
    const draft = quizzes.filter(q => q.status === 'draft').length;

    return { total, active, completed, draft };
  };

  const stats = getQuizStats();

  // Quiz Overview Tab
  const QuizOverviewTab = () => (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#667eea">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#667eea">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Quizzes
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#667eea20', color: '#667eea' }}>
                  <QuizIcon />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#4CAF50">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#4CAF50">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Quizzes
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4CAF5020', color: '#4CAF50' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#FF9800">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#FF9800">
                    {stats.completed}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FF980020', color: '#FF9800' }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#9C27B0">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#9C27B0">
                    {stats.draft}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Draft Quizzes
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#9C27B020', color: '#9C27B0' }}>
                  <RadioButtonUnchecked />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Quizzes Table */}
      <StyledCard>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight="bold">
              📋 Quiz Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateQuizDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Create Quiz
            </Button>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Quiz Title</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Questions</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quizzes.length > 0 ? (
                  quizzes.map(quiz => (
                    <TableRow key={quiz.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {quiz.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {quiz.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={courses.find(c => c.id === quiz.courseId)?.code || 'Unknown'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{quiz.totalQuestions} questions</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{quiz.duration} minutes</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={quiz.status || 'active'}
                          color={
                            quiz.status === 'active'
                              ? 'success'
                              : quiz.status === 'completed'
                                ? 'default'
                                : quiz.status === 'draft'
                                  ? 'warning'
                                  : 'primary'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Quiz">
                            <IconButton size="small" color="primary">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Quiz">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditQuiz(quiz)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Analytics">
                            <IconButton size="small" color="info">
                              <AnalyticsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Quiz">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={4}>
                        <QuizIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary">
                          No quizzes created yet
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Click "Create Quiz" to get started
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </StyledCard>
    </Box>
  );

  // Question Bank Tab
  const QuestionBankTab = () => (
    <StyledCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📚 Question Bank
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage your question library for quizzes
        </Typography>
        <Box mt={3}>
          <Button variant="outlined" startIcon={<AddIcon />}>
            Add Question
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );

  // Analytics Tab
  const AnalyticsTab = () => (
    <StyledCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📊 Quiz Analytics
        </Typography>
        <Typography variant="body2" color="textSecondary">
          View detailed analytics and reports for your quizzes
        </Typography>
      </CardContent>
    </StyledCard>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            🎯 Quiz Management System
          </Typography>
        </Box>

        {/* Tabs */}
        <StyledCard sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Quiz Overview" icon={<QuizIcon />} />
            <Tab label="Question Bank" icon={<PeopleIcon />} />
            <Tab label="Analytics" icon={<AnalyticsIcon />} />
          </Tabs>
        </StyledCard>

        {/* Tab Content */}
        {currentTab === 0 && <QuizOverviewTab />}
        {currentTab === 1 && <QuestionBankTab />}
        {currentTab === 2 && <AnalyticsTab />}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => setCreateQuizDialog(true)}
        >
          <AddIcon />
        </Fab>

        {/* Create Quiz Dialog */}
        <Dialog
          open={createQuizDialog}
          onClose={() => setCreateQuizDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Quiz</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Quiz Title"
                  value={newQuiz.title}
                  onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  value={newQuiz.description}
                  onChange={e => setNewQuiz({ ...newQuiz, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={newQuiz.courseId}
                    onChange={e => setNewQuiz({ ...newQuiz, courseId: e.target.value })}
                    label="Course"
                  >
                    {courses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={newQuiz.duration}
                  onChange={e => setNewQuiz({ ...newQuiz, duration: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Total Questions"
                  type="number"
                  value={newQuiz.totalQuestions}
                  onChange={e =>
                    setNewQuiz({ ...newQuiz, totalQuestions: parseInt(e.target.value) })
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Passing Score (%)"
                  type="number"
                  value={newQuiz.passingScore}
                  onChange={e => setNewQuiz({ ...newQuiz, passingScore: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={newQuiz.startDate}
                  onChange={e => setNewQuiz({ ...newQuiz, startDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="End Date"
                  type="datetime-local"
                  value={newQuiz.endDate}
                  onChange={e => setNewQuiz({ ...newQuiz, endDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateQuizDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateQuiz} variant="contained" disabled={loading}>
              Create Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Quiz Dialog */}
        <Dialog
          open={editQuizDialog}
          onClose={() => setEditQuizDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Quiz</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Quiz Title"
                  value={newQuiz.title}
                  onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  value={newQuiz.description}
                  onChange={e => setNewQuiz({ ...newQuiz, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={newQuiz.courseId}
                    onChange={e => setNewQuiz({ ...newQuiz, courseId: e.target.value })}
                    label="Course"
                  >
                    {courses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={newQuiz.duration}
                  onChange={e => setNewQuiz({ ...newQuiz, duration: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditQuizDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateQuiz} variant="contained" disabled={loading}>
              Update Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default QuizManagement;
