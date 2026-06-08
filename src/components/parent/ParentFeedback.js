import React, { useState, useEffect } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputLabelItem, Paper, Rating, Select, TextField, Typography } from '@mui/material';
import {
  Reply as ReplyIcon,
  Add as AddIcon,
  Feedback as FeedbackIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Today as TodayIcon,
  Send as SendIcon
} from '@mui/icons-material';

const ParentFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newFeedback, setNewFeedback] = useState({
    teacherName: '',
    subject: '',
    studentName: '',
    category: 'general',
    rating: 0,
    title: '',
    message: '',
    anonymous: false
  });

  useEffect(() => {
    // Simulate API call for feedback data
    const mockFeedbacks = [
      {
        id: 1,
        teacherName: 'Dr. Sarah Wilson',
        subject: 'Mathematics',
        studentName: 'Emma Johnson',
        category: 'teaching-method',
        rating: 5,
        title: 'Excellent Teaching Approach',
        message: 'Dr. Wilson has been incredibly helpful in explaining complex mathematical concepts. Emma has shown significant improvement since the beginning of the semester.',
        date: '2025-06-05',
        status: 'submitted',
        response: 'Thank you for the positive feedback! I am glad to see Emma\'s progress and will continue to support her learning journey.',
        responseDate: '2025-06-06',
        anonymous: false
      },
      {
        id: 2,
        teacherName: 'Mr. John Davis',
        subject: 'English Literature',
        studentName: 'Michael Johnson',
        category: 'homework-load',
        rating: 3,
        title: 'Homework Workload Concern',
        message: 'While I appreciate the comprehensive assignments, I feel the homework load might be a bit heavy for Michael. Could we discuss balancing the workload?',
        date: '2025-06-03',
        status: 'responded',
        response: 'Thank you for bringing this to my attention. I would be happy to discuss Michael\'s homework schedule and find ways to optimize his learning experience.',
        responseDate: '2025-06-04',
        anonymous: false
      },
      {
        id: 3,
        teacherName: 'Ms. Lisa Chen',
        subject: 'Science',
        studentName: 'Emma Johnson',
        category: 'classroom-environment',
        rating: 4,
        title: 'Great Science Lab Activities',
        message: 'Emma really enjoys the hands-on science experiments. The interactive approach has sparked her interest in STEM subjects.',
        date: '2025-06-01',
        status: 'submitted',
        anonymous: false
      }
    ];

    setTimeout(() => {
      setFeedbacks(mockFeedbacks);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSubmitFeedback = () => {
    setOpenDialog(true);
    setSelectedFeedback(null);
    setNewFeedback({
      teacherName: '',
      subject: '',
      studentName: '',
      category: 'general',
      rating: 0,
      title: '',
      message: '',
      anonymous: false
    });
  };

  const handleEditFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setNewFeedback({
      teacherName: feedback.teacherName,
      subject: feedback.subject,
      studentName: feedback.studentName,
      category: feedback.category,
      rating: feedback.rating,
      title: feedback.title,
      message: feedback.message,
      anonymous: feedback.anonymous
    });
    setOpenDialog(true);
  };

  const handleSaveFeedback = () => {
    console.log('Saving feedback:', newFeedback);
    setOpenDialog(false);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'teaching-method': return 'primary';
      case 'homework-load': return 'warning';
      case 'classroom-environment': return 'success';
      case 'communication': return 'info';
      case 'general': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'primary';
      case 'responded': return 'success';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'teaching-method': return 'Teaching Method';
      case 'homework-load': return 'Homework Load';
      case 'classroom-environment': return 'Classroom Environment';
      case 'communication': return 'Communication';
      case 'general': return 'General';
      default: return category;
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading feedback...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Teacher Feedback
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleSubmitFeedback}
          sx={{ borderRadius: 2 }}
        >
          Submit Feedback
        </Button>
      </Box>

      {/* Feedback Guidelines */}
      <Alert
        severity="info"
        sx={{ mb: 3, borderRadius: 2 }}
        icon={<FeedbackIcon />}
      >
        Your feedback helps us improve the learning experience. All feedback is reviewed by teachers and administration.
      </Alert>

      <Grid container spacing={3}>
        {feedbacks.map((feedback) => (
          <Grid size={{xs:12}} key={feedback.id}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Feedback Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <FeedbackIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {feedback.title}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          To: {feedback.teacherName} ({feedback.subject})
                        </Typography>
                        <Chip
                          label={feedback.studentName}
                          size="small"
                          variant="outlined"
                          icon={<PersonIcon />}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={getCategoryLabel(feedback.category)}
                      color={getCategoryColor(feedback.category)}
                      size="small"
                    />
                    <Chip
                      label={feedback.status}
                      color={getStatusColor(feedback.status)}
                      size="small"
                    />
                    {feedback.status === 'submitted' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditFeedback(feedback)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Rating */}
                <Box display="flex" alignItems="center" mb={2}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Rating:
                  </Typography>
                  <Rating value={feedback.rating} readOnly size="small" />
                  <Typography variant="body2" sx={{ ml: 1 }} color="text.secondary">
                    ({feedback.rating}/5)
                  </Typography>
                </Box>

                {/* Feedback Message */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body1">
                    {feedback.message}
                  </Typography>
                </Paper>

                {/* Feedback Meta */}
                <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box display="flex" alignItems="center">
                      <TodayIcon color="action" sx={{ mr: 0.5, fontSize: '1rem' }} />
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {new Date(feedback.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    {feedback.anonymous && (
                      <Chip label="Anonymous" size="small" variant="outlined" />
                    )}
                  </Box>
                </Box>

                {/* Teacher Response */}
                {feedback.response && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <ReplyIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                          Teacher Response
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          {new Date(feedback.responseDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Paper sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                        <Typography variant="body2">
                          {feedback.response}
                        </Typography>
                      </Paper>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Submit/Edit Feedback Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedFeedback ? 'Edit Feedback' : 'Submit New Feedback'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{xs:12,md:6}}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={newFeedback.teacherName}
                  onChange={(e) => setNewFeedback({...newFeedback, teacherName: e.target.value})}
                  label="Teacher"
                >
                  <MenuItem value="Dr. Sarah Wilson">Dr. Sarah Wilson - Mathematics</MenuItem>
                  <MenuItem value="Mr. John Davis">Mr. John Davis - English Literature</MenuItem>
                  <MenuItem value="Ms. Lisa Chen">Ms. Lisa Chen - Science</MenuItem>
                  <MenuItem value="Mr. Robert Brown">Mr. Robert Brown - History</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs:12,md:6}}>
              <FormControl fullWidth>
                <InputLabel>Student</InputLabel>
                <Select
                  value={newFeedback.studentName}
                  onChange={(e) => setNewFeedback({...newFeedback, studentName: e.target.value})}
                  label="Student"
                >
                  <MenuItem value="Emma Johnson">Emma Johnson</MenuItem>
                  <MenuItem value="Michael Johnson">Michael Johnson</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs:12,md:6}}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newFeedback.category}
                  onChange={(e) => setNewFeedback({...newFeedback, category: e.target.value})}
                  label="Category"
                >
                  <MenuItem value="teaching-method">Teaching Method</MenuItem>
                  <MenuItem value="homework-load">Homework Load</MenuItem>
                  <MenuItem value="classroom-environment">Classroom Environment</MenuItem>
                  <MenuItem value="communication">Communication</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs:12,md:6}}>
              <Box>
                <Typography component="legend" variant="body2" gutterBottom>
                  Overall Rating
                </Typography>
                <Rating
                  value={newFeedback.rating}
                  onChange={(event, newValue) => {
                    setNewFeedback({...newFeedback, rating: newValue});
                  }}
                />
              </Box>
            </Grid>

            <Grid size={{xs:12}}>
              <TextField
                fullWidth
                label="Feedback Title"
                value={newFeedback.title}
                onChange={(e) => setNewFeedback({...newFeedback, title: e.target.value})}
                placeholder="Brief title for your feedback"
              />
            </Grid>

            <Grid size={{xs:12}}>
              <TextField
                fullWidth
                label="Your Feedback"
                value={newFeedback.message}
                onChange={(e) => setNewFeedback({...newFeedback, message: e.target.value})}
                multiline
                rows={4}
                placeholder="Please provide detailed feedback about your experience..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveFeedback}
            variant="contained"
            startIcon={<SendIcon />}
          >
            {selectedFeedback ? 'Update' : 'Submit'} Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentFeedback;
