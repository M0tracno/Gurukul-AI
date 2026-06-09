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
  Rating,
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Feedback as FeedbackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Star as StarIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
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

const FacultyFeedback = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [feedbacks, setFeedbacks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [replyDialog, setReplyDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [requestFeedbackDialog, setRequestFeedbackDialog] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState({
    courseId: '',
    subject: '',
    message: '',
    anonymous: false,
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

      // Load feedback
      const feedbackResult = await EnhancedFacultyService.getFeedback();
      if (feedbackResult.success) {
        setFeedbacks(feedbackResult.data);
      }

      showSnackbar('Feedback data loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading feedback data:', error);
      showSnackbar('Error loading feedback data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleReply = feedback => {
    setSelectedFeedback(feedback);
    setReplyDialog(true);
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      showSnackbar('Please enter a reply message', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.replyToFeedback(selectedFeedback.id, replyText);
      if (result.success) {
        showSnackbar('Reply sent successfully', 'success');
        setReplyDialog(false);
        setReplyText('');
        setSelectedFeedback(null);
        await loadData();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      showSnackbar('Error sending reply', 'error');
    } finally {
      setLoading(false);
    }
  };

  const requestFeedback = async () => {
    if (!feedbackRequest.courseId || !feedbackRequest.subject) {
      showSnackbar('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.requestFeedback(feedbackRequest);
      if (result.success) {
        showSnackbar('Feedback request sent to students', 'success');
        setRequestFeedbackDialog(false);
        setFeedbackRequest({
          courseId: '',
          subject: '',
          message: '',
          anonymous: false,
        });
      }
    } catch (error) {
      console.error('Error requesting feedback:', error);
      showSnackbar('Error requesting feedback', 'error');
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

  const getFeedbackStats = () => {
    const total = feedbacks.length;
    const positive = feedbacks.filter(f => f.rating >= 4).length;
    const negative = feedbacks.filter(f => f.rating <= 2).length;
    const pending = feedbacks.filter(f => !f.replied).length;
    const averageRating =
      feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;

    return { total, positive, negative, pending, averageRating };
  };

  const stats = getFeedbackStats();

  // Feedback Overview Tab
  const FeedbackOverviewTab = () => (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#E3A648">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#E3A648">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Feedback
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#E3A64820', color: '#E3A648' }}>
                  <FeedbackIcon />
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
                    {stats.positive}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Positive Reviews
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4CAF5020', color: '#4CAF50' }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard color="#F44336">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#F44336">
                    {stats.negative}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Needs Attention
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#F4433620', color: '#F44336' }}>
                  <TrendingDownIcon />
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
                    {stats.averageRating.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Average Rating
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FF980020', color: '#FF9800' }}>
                  <StarIcon />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Recent Feedback */}
      <StyledCard>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight="bold">
              Recent Feedback
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{ mr: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => setRequestFeedbackDialog(true)}
              >
                Request Feedback
              </Button>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <List>
            {feedbacks.length > 0 ? (
              feedbacks.slice(0, 10).map((feedback, index) => (
                <React.Fragment key={feedback.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {feedback.anonymous ? '?' : feedback.studentName?.charAt(0) || 'S'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {feedback.anonymous ? 'Anonymous Student' : feedback.studentName}
                          </Typography>
                          <Rating value={feedback.rating} readOnly size="small" />
                          <Chip
                            label={courses.find(c => c.id === feedback.courseId)?.code || 'Unknown'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textPrimary" sx={{ mt: 1 }}>
                            {feedback.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {feedback.timestamp}
                          </Typography>
                          {feedback.replied && (
                            <Chip label="Replied" size="small" color="success" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                    />
                    <Box>
                      <Tooltip title="Reply to feedback">
                        <IconButton
                          color="primary"
                          onClick={() => handleReply(feedback)}
                          disabled={feedback.replied}
                        >
                          <ReplyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                  {index < feedbacks.slice(0, 10).length - 1 && <Divider />}
                </React.Fragment>
              ))
            ) : (
              <Box textAlign="center" py={4}>
                <FeedbackIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  No feedback received yet
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Request feedback from your students to see their responses here
                </Typography>
              </Box>
            )}
          </List>
        </CardContent>
      </StyledCard>
    </Box>
  );

  // Analytics Tab
  const AnalyticsTab = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feedback Trends
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Course-wise feedback analysis and trends over time
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Improvement Areas
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Identify areas for teaching improvement based on student feedback
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  return (
    <Box
      sx={{
        minHeight: '100%',
        background: 'transparent',
        py: 1,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Feedback
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
            <Tab label="Feedback Overview" icon={<FeedbackIcon />} />
            <Tab label="Analytics" icon={<BarChartIcon />} />
          </Tabs>
        </StyledCard>

        {/* Tab Content */}
        {currentTab === 0 && <FeedbackOverviewTab />}
        {currentTab === 1 && <AnalyticsTab />}

        {/* Reply Dialog */}
        <Dialog open={replyDialog} onClose={() => setReplyDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Reply to Feedback</DialogTitle>
          <DialogContent>
            {selectedFeedback && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Original Feedback:
                </Typography>
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{selectedFeedback.message}</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Rating value={selectedFeedback.rating} readOnly size="small" />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      - {selectedFeedback.anonymous ? 'Anonymous' : selectedFeedback.studentName}
                    </Typography>
                  </Box>
                </Paper>
                <TextField
                  label="Your Reply"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Thank you for your feedback..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReplyDialog(false)}>Cancel</Button>
            <Button onClick={sendReply} variant="contained" disabled={loading || !replyText.trim()}>
              Send Reply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Request Feedback Dialog */}
        <Dialog
          open={requestFeedbackDialog}
          onClose={() => setRequestFeedbackDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Request Student Feedback</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={feedbackRequest.courseId}
                    onChange={e =>
                      setFeedbackRequest({ ...feedbackRequest, courseId: e.target.value })
                    }
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
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Subject"
                  value={feedbackRequest.subject}
                  onChange={e =>
                    setFeedbackRequest({ ...feedbackRequest, subject: e.target.value })
                  }
                  fullWidth
                  required
                  placeholder="e.g., Mid-semester Course Feedback"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Message to Students"
                  value={feedbackRequest.message}
                  onChange={e =>
                    setFeedbackRequest({ ...feedbackRequest, message: e.target.value })
                  }
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Dear students, I would appreciate your honest feedback about..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRequestFeedbackDialog(false)}>Cancel</Button>
            <Button onClick={requestFeedback} variant="contained" disabled={loading}>
              Send Request
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

export default FacultyFeedback;
