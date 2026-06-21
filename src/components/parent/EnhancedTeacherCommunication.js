import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useAuth } from '../../contexts/AuthContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import messagingService from '../../services/messagingService';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  ListItem,
  ListItemAvatar,
  ListItemTextItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Template as TemplateIcon,
  Analytics as AnalyticsIcon,
  Schedule as ScheduleIcon,
  Priority as PriorityIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh,
  Message as MessageIcon,
} from '@mui/icons-material';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
  },
  title: {
    marginBottom: theme.spacing(3),
    fontWeight: 600,
    background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  mainContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    minHeight: '70vh',
  },
  sidebar: {
    flex: '0 0 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  sidebarCard: {
    padding: theme.spacing(2),
  },
  contactsList: {
    maxHeight: 400,
    overflow: 'auto',
  },
  contactItem: {
    cursor: 'pointer',
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(1),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateX(4px)',
    },
  },
  activeContact: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  conversationArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  messageContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '500px',
  },
  messageHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[50],
  },
  messageItem: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.spacing(1),
    maxWidth: '75%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    animation: '$fadeInUp 0.3s ease',
  },
  sentMessage: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    marginLeft: 'auto',
    marginRight: 0,
  },
  receivedMessage: {
    backgroundColor: theme.palette.background.paper,
    marginRight: 'auto',
    marginLeft: 0,
    border: `1px solid ${theme.palette.divider}`,
  },
  messageInputArea: {
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  messageInputContainer: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'flex-end',
    marginTop: theme.spacing(1),
  },
  messageInput: {
    flex: 1,
  },
  sendButton: {
    minWidth: 'auto',
    borderRadius: '50%',
    width: 48,
    height: 48,
  },
  templateDialog: {
    minWidth: 500,
  },
  templateItem: {
    cursor: 'pointer',
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
  },
  priorityChip: {
    marginLeft: theme.spacing(1),
  },
  '@keyframes fadeInUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  analyticsCard: {
    marginBottom: theme.spacing(2),
  },
  statItem: {
    textAlign: 'center',
    padding: theme.spacing(1),
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7,
    marginTop: theme.spacing(0.5),
  },
  typingIndicator: {
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
    padding: theme.spacing(1),
    opacity: 0.7,
  },
  toolbar: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  attachmentPreview: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    marginTop: theme.spacing(1),
  },
  attachmentImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: '4px',
    objectFit: 'cover',
  },
  attachmentIcon: {
    color: theme.palette.text.secondary,
  },
  uploadProgress: {
    marginTop: theme.spacing(1),
  },
  messageAttachment: {
    backgroundColor: theme.palette.grey[100],
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(0.5),
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  downloadButton: {
    padding: theme.spacing(0.5),
    fontSize: '0.75rem',
  },
}));

function EnhancedTeacherCommunication() {
  const classes = useStyles();
  const { currentUser } = useAuth();
  const { getAllFaculty } = useDatabase();

  // State management
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  // Enhanced features state
  const [templates, setTemplates] = useState([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [messageType, setMessageType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [messageStats, setMessageStats] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize messaging service and load data
  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        setLoading(true);

        // Initialize Socket.IO connection
        const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (authToken) {
          await messagingService.initializeSocket(authToken);
        }

        // Load data
        await Promise.all([loadContacts(), loadStudents(), loadTemplates(), loadMessageStats()]);
      } catch (error) {
        console.error('Error initializing messaging:', error);
        setError('Failed to initialize messaging system');
      } finally {
        setLoading(false);
      }
    };

    initializeMessaging();

    return () => {
      messagingService.disconnect();
    };
  }, [currentUser]);

  // Load available contacts (teachers)
  const loadContacts = async () => {
    try {
      const result = await messagingService.getAvailableContacts();
      if (result.success) {
        setContacts(result.data.filter(contact => contact.type === 'teacher'));
      } else {
        setError('Failed to load teachers');
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Error loading teachers');
    }
  };

  // Load user's children/students
  const loadStudents = async () => {
    try {
      // Mock data for now - would come from parent service
      setStudents([
        { id: 'student1', name: 'Emma Johnson', grade: 'Grade 10', class: '10A' },
        { id: 'student2', name: 'Ethan Johnson', grade: 'Grade 8', class: '8B' },
      ]);
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Error loading student information');
    }
  };

  // Load message templates
  const loadTemplates = async () => {
    try {
      const result = await messagingService.getMessageTemplates();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Load message statistics
  const loadMessageStats = async () => {
    try {
      const result = await messagingService.getMessageStats(30);
      if (result.success) {
        setMessageStats(result.data);
      }
    } catch (error) {
      console.error('Error loading message stats:', error);
    }
  };

  // Load conversation
  const loadConversation = async (teacherId, studentId) => {
    if (!teacherId || !studentId) return;

    try {
      setConversationLoading(true);
      const result = await messagingService.getConversation(teacherId, studentId);

      if (result.success) {
        setMessages(result.data.reverse());

        const conversationId = generateConversationId(teacherId, studentId);
        messagingService.joinConversation(conversationId);

        // Mark messages as read
        const unreadMessages = result.data.filter(
          msg => !msg.isRead && msg.recipientId === currentUser?.uid
        );

        for (const message of unreadMessages) {
          await messagingService.markAsRead(message._id);
        }
      } else {
        setError('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Error loading conversation');
    } finally {
      setConversationLoading(false);
    }
  };

  // Generate conversation ID
  const generateConversationId = (teacherId = selectedContact?.id, studentId = selectedStudent) => {
    if (!teacherId || !studentId || !currentUser?.uid) return null;
    return `parent_${currentUser.uid}_teacher_${teacherId}_student_${studentId}`;
  };

  // Handle contact selection
  const handleContactSelect = contact => {
    setSelectedContact(contact);
    if (selectedStudent) {
      loadConversation(contact.id, selectedStudent);
    }
  };

  // Handle student selection
  const handleStudentSelect = studentId => {
    setSelectedStudent(studentId);
    if (selectedContact) {
      loadConversation(selectedContact.id, studentId);
    }
  };
  // File attachment handlers
  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (file) {
      const validation = messagingService.validateFile(file);
      if (!validation.isValid) {
        setError(validation.error);
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
          setAttachmentPreview({
            type: 'image',
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview({
          type: 'file',
          name: file.name,
          size: file.size,
        });
      }
    }
  };

  const handleRemoveAttachment = () => {
    const theme = useTheme();
    setSelectedFile(null);
    setAttachmentPreview(null);
    setUploadProgress(0);
  };

  const handleDownloadAttachment = async (message, attachmentIndex) => {
    try {
      await messagingService.downloadAttachment(message._id, attachmentIndex);
      setSuccess('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download attachment');
    }
  };

  // Send message (updated to handle file attachments)
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedContact || !selectedStudent || sending)
      return;

    try {
      setSending(true);
      setUploadProgress(0);

      const student = students.find(s => s.id === selectedStudent);
      const messageData = {
        recipientId: selectedContact.id,
        recipientType: 'teacher',
        studentId: selectedStudent,
        subject: `Message about ${student?.name}`,
        content: newMessage.trim(),
        messageType,
        priority,
      };

      let result;
      if (selectedFile) {
        // Send message with attachment
        result = await messagingService.sendMessageWithAttachment(
          messageData,
          selectedFile,
          progress => {
            setUploadProgress(progress);
          }
        );
      } else {
        // Send regular message
        result = await messagingService.sendMessage(messageData);
      }

      if (result.success) {
        setNewMessage('');
        handleRemoveAttachment();
        setSuccess('Message sent successfully');

        // Refresh stats
        loadMessageStats();

        // Add message locally for immediate feedback
        const tempMessage = {
          _id: `temp_${Date.now()}`,
          content: newMessage.trim(),
          senderId: currentUser?.uid,
          senderName: currentUser?.displayName || 'You',
          senderModel: 'Parent',
          recipientId: selectedContact.id,
          recipientName: selectedContact.name,
          studentId: selectedStudent,
          studentName: student?.name,
          createdAt: new Date().toISOString(),
          isRead: false,
          messageType,
          priority,
          attachments: selectedFile
            ? [{ originalName: selectedFile.name, size: selectedFile.size }]
            : undefined,
        };

        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  // Handle template selection
  const handleTemplateSelect = template => {
    const student = students.find(s => s.id === selectedStudent);
    const variables = {
      teacherName: selectedContact?.name || '{teacherName}',
      parentName: currentUser?.displayName || '{parentName}',
      studentName: student?.name || '{studentName}',
      subject: selectedContact?.department || '{subject}',
      specific_area: '{specific_area}',
      topic: '{topic}',
      date: '{date}',
      reason: '{reason}',
      availability: '{availability}',
      progress_details: '{progress_details}',
      specific_feedback: '{specific_feedback}',
      incident_description: '{incident_description}',
      positive_achievement: '{positive_achievement}',
      assignment_type: '{assignment_type}',
      due_date: '{due_date}',
    };

    const processedContent = messagingService.processTemplate(template.template, variables);
    setNewMessage(processedContent);
    setMessageType(template.category);
    setTemplateDialogOpen(false);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Format timestamp
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Get priority color
  const getPriorityColor = priority => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return (
      <div className={classes.loadingContainer}>
        <CircularProgress />
        <Typography variant="body1" style={{ marginLeft: 16 }}>
          Loading enhanced messaging system...
        </Typography>
      </div>
    );
  }

  return (
    <Container maxWidth="xl" className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Enhanced Teacher Communication
      </Typography>

      {/* Analytics Card */}
      {messageStats && (
        <Card className={classes.analyticsCard}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Communication Overview (Last 30 Days)</Typography>
              <IconButton onClick={() => setAnalyticsOpen(!analyticsOpen)}>
                <AnalyticsIcon />
              </IconButton>{' '}
            </Box>{' '}
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                <div className={classes.statItem}>
                  <Typography variant="h5" color="primary">
                    {messageStats.totalMessages}
                  </Typography>
                  <Typography variant="body2">Total Messages</Typography>
                </div>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <div className={classes.statItem}>
                  <Typography variant="h5" color="secondary">
                    {messageStats.unreadMessages}
                  </Typography>
                  <Typography variant="body2">Unread</Typography>
                </div>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <div className={classes.statItem}>
                  <Typography variant="h5" style={{ color: '#ff9800' }}>
                    {messageStats.urgentMessages}
                  </Typography>
                  <Typography variant="body2">Urgent</Typography>
                </div>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <div className={classes.statItem}>
                  <Typography variant="h5" style={{ color: '#4caf50' }}>
                    {messageStats.sentMessages}
                  </Typography>
                  <Typography variant="body2">Sent</Typography>
                </div>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <div className={classes.mainContainer}>
        {/* Sidebar */}
        <div className={classes.sidebar}>
          {/* Student Selection */}
          <Card className={classes.sidebarCard}>
            <Typography variant="h6" gutterBottom>
              Select Student
            </Typography>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Student</InputLabel>
              <Select
                value={selectedStudent}
                onChange={e => handleStudentSelect(e.target.value)}
                label="Student"
              >
                <MenuItem value="">
                  <em>Select a student</em>
                </MenuItem>
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.name} - {student.grade}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Card>

          {/* Teachers List */}
          <Card className={classes.sidebarCard}>
            <Typography variant="h6" gutterBottom>
              Teachers
            </Typography>
            <div className={classes.contactsList}>
              {contacts.map(contact => (
                <ListItem
                  key={contact.id}
                  className={`${classes.contactItem} ${
                    selectedContact?.id === contact.id ? classes.activeContact : ''
                  }`}
                  onClick={() => handleContactSelect(contact)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <SchoolIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primaryTypographyProps={{ component: 'div' }}
                    primary={contact.name}
                    secondary={contact.department || 'Teacher'}
                  />
                </ListItem>
              ))}
            </div>
          </Card>
        </div>

        {/* Conversation Area */}
        <div className={classes.conversationArea}>
          {selectedContact && selectedStudent ? (
            <Paper className={classes.messageContainer}>
              {/* Message Header */}
              <div className={classes.messageHeader}>
                <Box display="flex" alignItems="center">
                  <Avatar style={{ marginRight: 16 }}>
                    <SchoolIcon />
                  </Avatar>
                  <div>
                    <Typography variant="h6">{selectedContact.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      About: {students.find(s => s.id === selectedStudent)?.name}
                    </Typography>
                  </div>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Badge color="secondary" variant="dot" invisible={isConnected}>
                    <Chip
                      label={isConnected ? 'Connected' : 'Disconnected'}
                      size="small"
                      color={isConnected ? 'primary' : 'default'}
                    />
                  </Badge>
                  <IconButton onClick={() => loadConversation(selectedContact.id, selectedStudent)}>
                    <Refresh />
                  </IconButton>
                </Box>
              </div>

              {/* Messages List */}
              <div className={classes.messagesList}>
                {conversationLoading ? (
                  <div className={classes.loadingContainer}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" style={{ marginLeft: 8 }}>
                      Loading conversation...
                    </Typography>
                  </div>
                ) : messages.length === 0 ? (
                  <div className={classes.emptyState}>
                    <MessageIcon style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
                    <Typography variant="body1">
                      No messages yet. Start the conversation!
                    </Typography>
                  </div>
                ) : (
                  messages.map(message => {
                    const isFromParent = message.senderModel === 'Parent';
                    return (
                      <div
                        key={message._id}
                        className={`${classes.messageItem} ${
                          isFromParent ? classes.sentMessage : classes.receivedMessage
                        }`}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          mb={1}
                        >
                          <Typography variant="subtitle2">
                            {isFromParent ? 'You' : message.senderName}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {message.priority && message.priority !== 'normal' && (
                              <Chip
                                label={message.priority}
                                size="small"
                                color={getPriorityColor(message.priority)}
                                className={classes.priorityChip}
                              />
                            )}
                            <Typography variant="caption" className={classes.messageTime}>
                              {formatTime(message.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Typography>

                        {/* Attachments Display */}
                        {message.attachments && message.attachments.length > 0 && (
                          <Box mt={2}>
                            {message.attachments.map((attachment, index) => (
                              <Box
                                key={index}
                                display="flex"
                                alignItems="center"
                                gap={1}
                                p={1}
                                border={1}
                                borderColor="divider"
                                borderRadius={1}
                                mb={1}
                                bgcolor="background.paper"
                              >
                                <AttachFileIcon fontSize="small" />
                                <Box flex={1}>
                                  <Typography variant="body2" noWrap>
                                    {attachment.originalName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </Typography>
                                </Box>{' '}
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadAttachment(message, index)}
                                  title="Download"
                                >
                                  <GetApp fontSize="small" />
                                </IconButton>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {message.messageType && message.messageType !== 'general' && (
                          <Box mt={1}>
                            <Chip label={message.messageType} size="small" variant="outlined" />
                          </Box>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Area */}
              <div className={classes.messageInputArea}>
                <div className={classes.toolbar}>
                  <FormControl size="small" style={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={messageType}
                      onChange={e => setMessageType(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="academic">Academic</MenuItem>
                      <MenuItem value="behavioral">Behavioral</MenuItem>
                      <MenuItem value="attendance">Attendance</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" style={{ minWidth: 120 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Use Template">
                    <IconButton
                      onClick={() => setTemplateDialogOpen(true)}
                      disabled={!selectedContact || !selectedStudent}
                    >
                      <TemplateIcon />
                    </IconButton>
                  </Tooltip>{' '}
                  <Tooltip title="Attach File">
                    <span>
                      <input
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        style={{ display: 'none' }}
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="file-upload">
                        <IconButton
                          component="span"
                          disabled={!selectedContact || !selectedStudent}
                        >
                          <AttachFileIcon />
                        </IconButton>
                      </label>
                    </span>
                  </Tooltip>{' '}
                </div>

                {/* Attachment Preview */}
                {attachmentPreview && (
                  <Box
                    mt={2}
                    p={2}
                    border={1}
                    borderColor="divider"
                    borderRadius={1}
                    bgcolor="background.paper"
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">Attachment Preview</Typography>
                      <IconButton size="small" onClick={handleRemoveAttachment}>
                        <CloseIcon />
                      </IconButton>
                    </Box>

                    {attachmentPreview.type === 'image' ? (
                      <Box>
                        <img
                          src={attachmentPreview.url}
                          alt={attachmentPreview.name}
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                          }}
                        />
                        <Typography variant="caption" display="block" mt={1}>
                          {attachmentPreview.name}
                        </Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={1}>
                        <AttachFileIcon />
                        <Box>
                          <Typography variant="body2">{attachmentPreview.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(attachmentPreview.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <Box mt={2}>
                        <Typography variant="caption">Uploading: {uploadProgress}%</Typography>
                        <Box width="100%" bgcolor="grey.200" borderRadius={1} mt={1}>
                          <Box
                            width={`${uploadProgress}%`}
                            bgcolor="primary.main"
                            height={4}
                            borderRadius={1}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                <div className={classes.messageInputContainer}>
                  <TextField
                    className={classes.messageInput}
                    label="Type your message..."
                    variant="outlined"
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Tooltip title="Send Message">
                    <span>
                      <IconButton
                        className={classes.sendButton}
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || sending}
                        color="primary"
                      >
                        {sending ? <CircularProgress size={24} /> : <SendIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </div>
            </Paper>
          ) : (
            <Paper className={classes.emptyState}>
              <SchoolIcon style={{ fontSize: 64, opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>
                Select a student and teacher to start messaging
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Choose a student from the dropdown and then select a teacher to begin the
                conversation.
              </Typography>
            </Paper>
          )}
        </div>
      </div>

      {/* Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        className={classes.templateDialog}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Message Templates
            <IconButton onClick={() => setTemplateDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map(template => (
              <Grid size={{ xs: 12, sm: 6 }} key={template.id}>
                <div
                  className={classes.templateItem}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                      {template.title}
                    </Typography>
                    <Chip label={template.category} size="small" color="primary" />
                  </Box>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ fontSize: '0.875rem' }}
                  >
                    {template.template.substring(0, 150)}...
                  </Typography>
                </div>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default EnhancedTeacherCommunication;
