import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send as SendIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useAuth } from '../../auth/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';
import messagingService from '../../services/messagingService';

import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  title: {
    marginBottom: theme.spacing(3),
    fontWeight: 600,
    background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  conversationContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    minHeight: '70vh'
  },
  contactsList: {
    flex: '0 0 300px',
    marginBottom: theme.spacing(2)
  },
  contactItem: {
    cursor: 'pointer',
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(1),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateX(4px)'
    }
  },
  activeContact: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main
    }
  },
  messageContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  messageHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  messagesList: {
    flex: 1,
    overflow: 'auto',
    maxHeight: '400px',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[50]
  },
  messageItem: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.spacing(1),
    maxWidth: '70%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    animation: '$fadeInUp 0.3s ease'
  },
  sentMessage: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    marginLeft: 'auto',
    marginRight: 0
  },
  receivedMessage: {
    backgroundColor: theme.palette.background.paper,
    marginRight: 'auto',
    marginLeft: 0
  },
  messageInputContainer: {
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'flex-end'
  },
  messageInput: {
    flex: 1
  },
  sendButton: {
    minWidth: 'auto',
    borderRadius: '50%',
    width: 48,
    height: 48
  },
  '@keyframes fadeInUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)'
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4)
  },
  searchField: {
    marginBottom: theme.spacing(2)
  },
  typingIndicator: {
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
    padding: theme.spacing(1),
    opacity: 0.7
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#4caf50',
    display: 'inline-block',
    marginLeft: theme.spacing(1)
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7,
    marginTop: theme.spacing(0.5)
  },
  unreadBadge: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText
  }
}));

// Mock data functions
const getMockChildren = () => [
  { id: 1, name: 'Sarah Johnson', class: '5A', avatar: '/api/placeholder/40/40' },
  { id: 2, name: 'Michael Chen', class: '5B', avatar: '/api/placeholder/40/40' }
];

const getMockTeachers = () => [
  { id: 1, name: 'Mrs. Anderson', subject: 'Mathematics', avatar: '/api/placeholder/40/40' },
  { id: 2, name: 'Mr. Wilson', subject: 'Science', avatar: '/api/placeholder/40/40' }
];

function TeacherCommunication() {
  const classes = useStyles();
  const { currentUser } = useAuth();
  useDatabase();
  // State management
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Additional state for child/teacher selection
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');  const [children, setChildren] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Generate conversation ID
  const generateConversationId = useCallback((teacherId = selectedContact?.id, studentId = selectedStudent) => {
    if (!teacherId || !studentId || !currentUser?.uid) return null;
    return `parent_${currentUser.uid}_teacher_${teacherId}_student_${studentId}`;
  }, [selectedContact?.id, selectedStudent, currentUser?.uid]);

  // Initialize messaging service and load data
  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        setLoading(true);

        // Initialize Socket.IO connection
        const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (authToken) {
          await messagingService.initializeSocket(authToken);
        }        // Load contacts and students
        await Promise.all([
          loadContacts(),
          loadStudents()
        ]);

        // Initialize mock data for children and teachers
        setChildren(getMockChildren());
        setTeachers(getMockTeachers());

      } catch (error) {
        console.error('Error initializing messaging:', error);
        console.error('Failed to initialize messaging system');
        alert('Failed to initialize messaging system');
      } finally {
        setLoading(false);
      }
    };

    initializeMessaging();

    // Cleanup on unmount
    return () => {
      messagingService.disconnect();
    };
  }, [currentUser]);

  // Set up message listeners
  useEffect(() => {    const handleMessage = (event, data) => {
      switch (event) {
        case 'new_message':
          if (selectedContact && data.conversationId === generateConversationId()) {
            setMessages(prev => [...prev, data]);
            scrollToBottom();
          }
          break;
        case 'message_delivered':
          setMessages(prev => prev.map(msg =>
            msg._id === data.messageId ? { ...msg, delivered: true } : msg
          ));
          break;
        case 'message_read':
          setMessages(prev => prev.map(msg =>
            msg._id === data.messageId ? { ...msg, read: true } : msg
          ));
          break;
        case 'typing_start':
          if (data.conversationId === generateConversationId()) {
            setIsTyping(true);
          }
          break;
        case 'typing_stop':
          if (data.conversationId === generateConversationId()) {
            setIsTyping(false);
          }
          break;
        default:
          // Handle unknown message types
          break;
      }
    };

    const handleConnection = (event, data) => {
      switch (event) {
        case 'connected':
          break;
        case 'disconnected':
          break;
        case 'error':
          console.error('Connection error occurred:', data);
          break;
        default:
          // Handle unknown connection events
          break;
      }
    };

    messagingService.addMessageListener(handleMessage);
    messagingService.addConnectionListener(handleConnection);

    return () => {
      messagingService.removeMessageListener(handleMessage);
      messagingService.removeConnectionListener(handleConnection);
    };
  }, [selectedContact, selectedStudent, generateConversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  // Load available contacts (teachers)
  const loadContacts = async () => {
    try {
      const result = await messagingService.getAvailableContacts();
      if (result.success) {
        setTeachers(result.data.filter(contact => contact.type === 'teacher'));
      } else {
        console.error('Failed to load teachers');
        alert('Failed to load teachers');
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      console.error('Error loading teachers');
    }
  };

  // Load user's children/students
  const loadStudents = async () => {
    try {
      // This would typically come from a parent service
      // For now, using mock data
      setStudents([
        { id: 'student1', name: 'Emma Johnson', grade: 'Grade 10', class: '10A' },
        { id: 'student2', name: 'Ethan Johnson', grade: 'Grade 8', class: '8B' }
      ]);
    } catch (error) {
      console.error('Error loading students:', error);
      console.error('Error loading student information');
    }
  };

  // Load conversation between parent and selected teacher about selected student
  const loadConversation = async (teacherId, studentId) => {
    if (!teacherId || !studentId) return;

    try {
      // setConversationLoading(true);
      const result = await messagingService.getConversation(teacherId, studentId);

      if (result.success) {
        setMessages(result.data.reverse()); // Reverse to show oldest first

        // Join conversation room for real-time updates
        const conversationId = generateConversationId(teacherId, studentId);
        messagingService.joinConversation(conversationId);

        // Mark messages as read
        const unreadMessages = result.data.filter(msg =>
          !msg.isRead && msg.recipientId === currentUser?.uid
        );

        for (const message of unreadMessages) {
          await messagingService.markAsRead(message._id);
        }
      } else {
        console.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      console.error('Error loading conversation');
    } finally {
      // setConversationLoading(false);
    }
  };

  // Handle child selection
  const handleChildChange = (event) => {
    const childId = event.target.value;
    setSelectedChild(childId);
    setSelectedStudent(childId); // Sync with selectedStudent
    if (selectedTeacher) {
      loadConversation(selectedTeacher, childId);
    }
  };

  // Handle teacher selection
  const handleTeacherChange = (event) => {
    const teacherId = event.target.value;
    setSelectedTeacher(teacherId);
    setSelectedContact(teachers.find(t => t.id === teacherId));
    if (selectedChild) {
      loadConversation(teacherId, selectedChild);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !selectedStudent || sending) return;

    try {
      setSending(true);

      const student = students.find(s => s.id === selectedStudent);
      const messageData = {
        recipientId: selectedContact.id,
        recipientType: 'teacher',
        studentId: selectedStudent,
        subject: `Message about ${student?.name}`,
        content: newMessage.trim(),
        messageType: 'general',
        priority: 'normal'
      };

      const result = await messagingService.sendMessage(messageData);

      if (result.success) {
        setNewMessage('');
        console.log('Message sent successfully');

        // The message will appear in real-time via Socket.IO
        // But we can also add it locally for immediate feedback
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
          readBy: []
        };

        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();
      } else {
        console.error(result.error || 'Failed to send message');
        alert(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicators
  const handleTypingStart = () => {
  const theme = useTheme();
    if (!isTyping && selectedContact && selectedStudent) {
      setIsTyping(true);
      const conversationId = generateConversationId();
      messagingService.sendTyping(conversationId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping && selectedContact && selectedStudent) {
      setIsTyping(false);
      const conversationId = generateConversationId();
      messagingService.sendTyping(conversationId, false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Handle message input change
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);

    if (e.target.value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className={classes.loadingContainer}>
        <CircularProgress />
        <Typography variant="body1" style={{ marginLeft: 16 }}>
          Loading messaging system...
        </Typography>
      </div>
    );
  }

  if (loading) {
    return <Typography>Loading communication data...</Typography>;
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Teacher Communication
      </Typography>

      <Paper className={classes.messageInputContainer}>
        <Typography variant="h6" gutterBottom>
          New Message
        </Typography>

        <div className={classes.inputRow}>
          <FormControl variant="outlined" className={classes.formControl}>
            <InputLabel>Select Child</InputLabel>
            <Select
              value={selectedChild}
              onChange={handleChildChange}
              label="Select Child"
            >
              <MenuItem value="">
                <em>Select a child</em>
              </MenuItem>
              {children.map((child) => (
                <MenuItem key={child.id} value={child.id}>
                  {child.name} - {child.grade}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" className={classes.formControl}>
            <InputLabel>Select Teacher</InputLabel>
            <Select
              value={selectedTeacher}
              onChange={handleTeacherChange}
              label="Select Teacher"
              disabled={!selectedChild}
            >
              <MenuItem value="">
                <em>Select a teacher</em>
              </MenuItem>
              {teachers
                .filter(teacher => {
                  // Filter teachers based on selected child's grade
                  if (!selectedChild) return true;
                  const childInfo = children.find(c => c.id === selectedChild);
                  return childInfo && teacher.grade === childInfo.grade;
                })
                .map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.subject}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </div>

        <TextField
          className={classes.messageInput}
          label="Message"
          variant="outlined"
          fullWidth
          multiline
          minRows={3}
          value={newMessage}
          onChange={handleMessageChange}
          placeholder="Type your message here..."
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          className={classes.sendButton}
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !selectedTeacher || !selectedChild}
        >
          Send Message
        </Button>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Message History
      </Typography>

      {messages.length === 0 ? (
        <Paper className={classes.noMessages}>
          <Typography variant="body1">
            No message history yet. Start a conversation with a teacher above.
          </Typography>
        </Paper>
      ) : (
        <List className={classes.messageList}>
          {messages.map((message) => {
            const isFromParent = message.senderRole === 'parent';

            return (
              <ListItem
                key={message.id}
                className={`${classes.messageItem} ${
                  isFromParent ? classes.sentMessage : classes.receivedMessage
                }`}
              >
                <Grid container>
                  <Grid size={{xs:12}}>
                    <div className={classes.messageHeader}>
                      <Box display="flex" alignItems="center">
                        <ListItemAvatar>
                          <Avatar
                            className={isFromParent ? classes.parentAvatar : classes.teacherAvatar}
                          >
                            {isFromParent ? 'P' : 'T'}
                          </Avatar>
                        </ListItemAvatar>
                        <div>
                          <Typography variant="subtitle1">
                            {isFromParent ? 'You' : message.senderName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Re: {message.childName}
                          </Typography>
                        </div>
                      </Box>
                      <Typography variant="caption" className={classes.messageTime}>
                        {formatTime(message.timestamp)}
                      </Typography>
                    </div>
                  </Grid>
                  <Grid size={{xs:12}}>
                    <ListItemText primaryTypographyProps={{ component: "div" }} primary={
                        <Typography
                          variant="body1"
                          style={{ whiteSpace: 'pre-wrap', paddingLeft: '56px' }}
                        >
                          {message.message}
                        </Typography>
                      }
                    />
                  </Grid>
                </Grid>
              </ListItem>
            );
          })}
        </List>
      )}
    </div>
  );
}

export default TeacherCommunication;
