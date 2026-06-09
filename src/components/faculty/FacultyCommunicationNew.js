import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
  Chip,
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
  Badge,
  IconButton,
  Tooltip,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Drafts as DraftsIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Attach as AttachIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
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

const MessageItem = styled(ListItem)(({ theme, read }) => ({
  borderRadius: 12,
  marginBottom: theme.spacing(1),
  backgroundColor: read ? 'transparent' : 'rgba(25, 118, 210, 0.05)',
  border: `1px solid ${read ? 'transparent' : 'rgba(25, 118, 210, 0.1)'}`,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

const FacultyCommunication = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [composeDialog, setComposeDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [viewMessageDialog, setViewMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    message: '',
    courseId: '',
    recipientType: 'individual', // individual, course, all
    priority: 'normal',
    sendCopy: false,
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

      // Load students
      const studentsResult = await EnhancedFacultyService.getStudents();
      if (studentsResult.success) {
        setStudents(studentsResult.data);
      }

      // Load messages
      const messagesResult = await EnhancedFacultyService.getMessages();
      if (messagesResult.success) {
        setMessages(messagesResult.data);
      }

      showSnackbar('Communication data loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading communication data:', error);
      showSnackbar('Error loading communication data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSendMessage = async () => {
    if (!newMessage.subject || !newMessage.message) {
      showSnackbar('Please fill in required fields', 'error');
      return;
    }

    if (newMessage.recipientType === 'individual' && !newMessage.to) {
      showSnackbar('Please select a recipient', 'error');
      return;
    }

    if (newMessage.recipientType === 'course' && !newMessage.courseId) {
      showSnackbar('Please select a course', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.sendMessage(newMessage);
      if (result.success) {
        showSnackbar('Message sent successfully', 'success');
        setComposeDialog(false);
        setNewMessage({
          to: '',
          subject: '',
          message: '',
          courseId: '',
          recipientType: 'individual',
          priority: 'normal',
          sendCopy: false,
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Error sending message', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = message => {
    setSelectedMessage(message);
    setViewMessageDialog(true);
    // Mark as read if it's unread
    if (!message.read) {
      markAsRead(message.id);
    }
  };

  const markAsRead = async messageId => {
    try {
      await EnhancedFacultyService.markMessageAsRead(messageId);
      setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, read: true } : msg)));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleDeleteMessage = async messageId => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      await EnhancedFacultyService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      showSnackbar('Message deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showSnackbar('Error deleting message', 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getRecipientOptions = () => {
    switch (newMessage.recipientType) {
      case 'individual':
        return students.map(student => ({
          value: student.id,
          label: `${student.name} (${student.studentId})`,
        }));
      case 'course':
        return courses.map(course => ({
          value: course.id,
          label: `${course.code} - ${course.name}`,
        }));
      default:
        return [];
    }
  };

  const getMessageStats = () => {
    const total = messages.length;
    const unread = messages.filter(m => !m.read).length;
    const fromStudents = messages.filter(m => m.from === 'student').length;
    const fromAdmin = messages.filter(m => m.from === 'admin').length;

    return { total, unread, fromStudents, fromAdmin };
  };

  const stats = getMessageStats();

  // Inbox Tab
  const InboxTab = () => (
    <StyledCard>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold">
            📧 Inbox ({stats.unread} unread)
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
              onClick={() => setComposeDialog(true)}
            >
              Compose
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <List>
          {messages.length > 0 ? (
            messages.map(message => (
              <MessageItem
                key={message.id}
                read={message.read}
                button
                onClick={() => handleViewMessage(message)}
              >
                <ListItemAvatar>
                  <Badge color="primary" variant="dot" invisible={message.read}>
                    <Avatar
                      sx={{
                        bgcolor:
                          message.from === 'student'
                            ? '#4CAF50'
                            : message.from === 'admin'
                              ? '#FF9800'
                              : '#2196F3',
                      }}
                    >
                      {message.from === 'student' ? (
                        <PersonIcon />
                      ) : message.from === 'admin' ? (
                        <NotificationIcon />
                      ) : (
                        <EmailIcon />
                      )}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={message.read ? 'normal' : 'bold'}>
                        {message.sender}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={message.course || 'General'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={message.read ? 'normal' : 'bold'}
                        sx={{ mb: 0.5 }}
                      >
                        {message.subject}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message.message}
                      </Typography>
                    </Box>
                  }
                />
                <Box>
                  <Tooltip title="Delete message">
                    <IconButton
                      color="error"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteMessage(message.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </MessageItem>
            ))
          ) : (
            <Box textAlign="center" py={4}>
              <InboxIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No messages in your inbox
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Messages from students and administration will appear here
              </Typography>
            </Box>
          )}
        </List>
      </CardContent>
    </StyledCard>
  );

  // Announcements Tab
  const AnnouncementsTab = () => (
    <StyledCard>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold">
            📢 Course Announcements
          </Typography>
          <Button
            variant="contained"
            startIcon={<NotificationIcon />}
            onClick={() => {
              setNewMessage({
                ...newMessage,
                recipientType: 'course',
                subject: 'Course Announcement: ',
              });
              setComposeDialog(true);
            }}
          >
            Create Announcement
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary">
          Send announcements to entire courses or specific student groups
        </Typography>
      </CardContent>
    </StyledCard>
  );

  // Statistics Tab
  const StatisticsTab = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 3 }}>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#667eea' }}>
              <EmailIcon />
            </Avatar>
            <Typography variant="h4" fontWeight="bold" color="#667eea">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Messages
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#F44336' }}>
              <InboxIcon />
            </Avatar>
            <Typography variant="h4" fontWeight="bold" color="#F44336">
              {stats.unread}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Unread Messages
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#4CAF50' }}>
              <PersonIcon />
            </Avatar>
            <Typography variant="h4" fontWeight="bold" color="#4CAF50">
              {stats.fromStudents}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              From Students
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#FF9800' }}>
              <NotificationIcon />
            </Avatar>
            <Typography variant="h4" fontWeight="bold" color="#FF9800">
              {stats.fromAdmin}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              From Administration
            </Typography>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
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
            💬 Faculty Communication Center
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
            <Tab
              label={
                <Badge badgeContent={stats.unread} color="error">
                  Inbox
                </Badge>
              }
              icon={<InboxIcon />}
            />
            <Tab label="Announcements" icon={<NotificationIcon />} />
            <Tab label="Statistics" icon={<EmailIcon />} />
          </Tabs>
        </StyledCard>

        {/* Tab Content */}
        {currentTab === 0 && <InboxTab />}
        {currentTab === 1 && <AnnouncementsTab />}
        {currentTab === 2 && <StatisticsTab />}

        {/* Compose Message Dialog */}
        <Dialog
          open={composeDialog}
          onClose={() => setComposeDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Compose Message</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Recipient Type</InputLabel>
                  <Select
                    value={newMessage.recipientType}
                    onChange={e =>
                      setNewMessage({
                        ...newMessage,
                        recipientType: e.target.value,
                        to: '',
                        courseId: '',
                      })
                    }
                    label="Recipient Type"
                  >
                    <MenuItem value="individual">Individual Student</MenuItem>
                    <MenuItem value="course">Entire Course</MenuItem>
                    <MenuItem value="all">All Students</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={newMessage.priority}
                    onChange={e => setNewMessage({ ...newMessage, priority: e.target.value })}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {newMessage.recipientType !== 'all' && (
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth required>
                    <InputLabel>
                      {newMessage.recipientType === 'individual' ? 'Student' : 'Course'}
                    </InputLabel>
                    <Select
                      value={
                        newMessage.recipientType === 'individual'
                          ? newMessage.to
                          : newMessage.courseId
                      }
                      onChange={e =>
                        setNewMessage({
                          ...newMessage,
                          [newMessage.recipientType === 'individual' ? 'to' : 'courseId']:
                            e.target.value,
                        })
                      }
                      label={newMessage.recipientType === 'individual' ? 'Student' : 'Course'}
                    >
                      {getRecipientOptions().map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Subject"
                  value={newMessage.subject}
                  onChange={e => setNewMessage({ ...newMessage, subject: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Message"
                  value={newMessage.message}
                  onChange={e => setNewMessage({ ...newMessage, message: e.target.value })}
                  fullWidth
                  multiline
                  rows={6}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newMessage.sendCopy}
                      onChange={e => setNewMessage({ ...newMessage, sendCopy: e.target.checked })}
                    />
                  }
                  label="Send a copy to my email"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setComposeDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSendMessage}
              variant="contained"
              disabled={loading}
              startIcon={<SendIcon />}
            >
              Send Message
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Message Dialog */}
        <Dialog
          open={viewMessageDialog}
          onClose={() => setViewMessageDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          <DialogContent>
            {selectedMessage && (
              <Box>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2 }}>{selectedMessage.sender?.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedMessage.sender}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(selectedMessage.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.message}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<ReplyIcon />}
              onClick={() => {
                setViewMessageDialog(false);
                setNewMessage({
                  ...newMessage,
                  to: selectedMessage?.from === 'student' ? selectedMessage.sender : '',
                  subject: `Re: ${selectedMessage?.subject}`,
                  recipientType: 'individual',
                });
                setComposeDialog(true);
              }}
            >
              Reply
            </Button>
            <Button onClick={() => setViewMessageDialog(false)}>Close</Button>
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

export default FacultyCommunication;
