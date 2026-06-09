import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  IconButton,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Message as MessageIcon,
  VideoCall as VideoCallIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon,
  Attachment as AttachmentIcon,
  EmojiEmotions as EmojiIcon,
  FiberManualRecord as OnlineIcon,
  Notifications as NotificationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const Chat = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openNewChat, setOpenNewChat] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for chat data
    const mockChatList = [
      {
        id: 1,
        name: 'Dr. Sarah Wilson',
        role: 'Mathematics Teacher',
        avatar: '',
        lastMessage: 'Great work on the algebra assignment!',
        timestamp: '2025-06-07 14:30',
        unreadCount: 0,
        online: true,
        type: 'teacher',
      },
      {
        id: 2,
        name: 'Study Group - Physics',
        role: 'Group Chat',
        avatar: '',
        lastMessage: 'Anyone free for study session tomorrow?',
        timestamp: '2025-06-07 13:45',
        unreadCount: 3,
        online: false,
        type: 'group',
        members: ['Alice', 'Bob', 'Charlie', 'You'],
      },
      {
        id: 3,
        name: 'Mr. John Davis',
        role: 'English Literature Teacher',
        avatar: '',
        lastMessage: 'Please submit your essay by Friday',
        timestamp: '2025-06-07 12:15',
        unreadCount: 1,
        online: false,
        type: 'teacher',
      },
      {
        id: 4,
        name: 'Class 10A Discussion',
        role: 'Class Group',
        avatar: '',
        lastMessage: 'Exam schedule has been updated',
        timestamp: '2025-06-07 11:30',
        unreadCount: 5,
        online: false,
        type: 'class',
        members: ['All Class 10A Students'],
      },
      {
        id: 5,
        name: 'Academic Counselor',
        role: 'Ms. Lisa Chen',
        avatar: '',
        lastMessage: 'How are you preparing for finals?',
        timestamp: '2025-06-06 16:20',
        unreadCount: 0,
        online: true,
        type: 'counselor',
      },
    ];

    const mockMessages = {
      1: [
        {
          id: 1,
          senderId: 'teacher_1',
          senderName: 'Dr. Sarah Wilson',
          message: 'Hello! I reviewed your latest assignment.',
          timestamp: '2025-06-07 14:25',
          type: 'received',
        },
        {
          id: 2,
          senderId: 'student_1',
          senderName: 'You',
          message: 'Thank you for the feedback!',
          timestamp: '2025-06-07 14:27',
          type: 'sent',
        },
        {
          id: 3,
          senderId: 'teacher_1',
          senderName: 'Dr. Sarah Wilson',
          message:
            'Great work on the algebra assignment! Your problem-solving approach is improving.',
          timestamp: '2025-06-07 14:30',
          type: 'received',
        },
      ],
      2: [
        {
          id: 1,
          senderId: 'student_2',
          senderName: 'Alice',
          message: 'Hey everyone! Did you understand the optics chapter?',
          timestamp: '2025-06-07 13:30',
          type: 'group',
        },
        {
          id: 2,
          senderId: 'student_3',
          senderName: 'Bob',
          message: 'I found it challenging. Could use some help with lens equations.',
          timestamp: '2025-06-07 13:35',
          type: 'group',
        },
        {
          id: 3,
          senderId: 'student_4',
          senderName: 'Charlie',
          message: 'Anyone free for study session tomorrow?',
          timestamp: '2025-06-07 13:45',
          type: 'group',
        },
      ],
    };

    setTimeout(() => {
      setChatList(mockChatList);
      setMessages(mockMessages);
      setLoading(false);
    }, 1000);
  }, []);

  const handleChatSelect = chat => {
    setSelectedChat(chat);
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedChat) {
      const newMessage = {
        id: Date.now(),
        senderId: 'current_student',
        senderName: 'You',
        message: message,
        timestamp: new Date().toISOString(),
        type: 'sent',
      };

      setMessages(prev => ({
        ...prev,
        [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage],
      }));

      setMessage('');
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChats = chatList.filter(
    chat =>
      chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = type => {
    switch (type) {
      case 'teacher':
        return <SchoolIcon />;
      case 'group':
        return <GroupIcon />;
      case 'class':
        return <GroupIcon />;
      case 'counselor':
        return <PersonIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const getTypeColor = type => {
    switch (type) {
      case 'teacher':
        return 'primary';
      case 'group':
        return 'secondary';
      case 'class':
        return 'warning';
      case 'counselor':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading chat...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Messages & Communication
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewChat(true)}
          sx={{ borderRadius: 2 }}
        >
          New Chat
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ height: '70vh' }}>
        {/* Chat List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
            {/* Search Bar */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: 2 }}
              />
            </Box>

            {/* Chat List */}
            <List sx={{ height: 'calc(100% - 80px)', overflow: 'auto', p: 0 }}>
              {filteredChats.map(chat => (
                <ListItem
                  key={chat.id}
                  button
                  onClick={() => handleChatSelect(chat)}
                  selected={selectedChat?.id === chat.id}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        chat.online ? (
                          <OnlineIcon sx={{ color: 'success.main', fontSize: 12 }} />
                        ) : null
                      }
                    >
                      <Avatar sx={{ bgcolor: `${getTypeColor(chat.type)}.main` }}>
                        {chat.avatar || getTypeIcon(chat.type)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                          {chat.name}
                        </Typography>
                        {chat.unreadCount > 0 && (
                          <Badge badgeContent={chat.unreadCount} color="error" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {chat.role}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {chat.lastMessage}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(chat.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Window */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{
              height: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: `${getTypeColor(selectedChat.type)}.main`, mr: 2 }}>
                        {selectedChat.avatar || getTypeIcon(selectedChat.type)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedChat.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" color="text.secondary">
                            {selectedChat.role}
                          </Typography>
                          {selectedChat.online && (
                            <Chip
                              label="Online"
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<OnlineIcon />}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      {selectedChat.type === 'teacher' && (
                        <>
                          <IconButton color="primary">
                            <VideoCallIcon />
                          </IconButton>
                          <IconButton color="primary">
                            <PhoneIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton>
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                {/* Messages Area */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages[selectedChat.id]?.map(msg => (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.type === 'sent' ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor: msg.type === 'sent' ? 'primary.main' : 'grey.100',
                          color: msg.type === 'sent' ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                        }}
                      >
                        {msg.type === 'group' && (
                          <Typography
                            variant="caption"
                            color="primary"
                            fontWeight="bold"
                            display="block"
                          >
                            {msg.senderName}
                          </Typography>
                        )}
                        <Typography variant="body1">{msg.message}</Typography>
                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}
                        >
                          {formatTimestamp(msg.timestamp)}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton color="primary">
                      <AttachmentIcon />
                    </IconButton>
                    <TextField
                      fullWidth
                      placeholder="Type a message..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      multiline
                      maxRows={3}
                      size="small"
                      sx={{ borderRadius: 3 }}
                    />
                    <IconButton color="primary">
                      <EmojiIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              /* No Chat Selected */
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select a conversation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a chat from the list to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions Alert */}
      <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={<NotificationIcon />}>
        <Typography variant="body2">
          <strong>Communication Guidelines:</strong> Please maintain respectful communication. For
          urgent matters, contact your teacher directly or use the emergency contact system.
        </Typography>
      </Alert>

      {/* New Chat Dialog */}
      <Dialog open={openNewChat} onClose={() => setOpenNewChat(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Conversation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Contact</InputLabel>
            <Select label="Select Contact">
              <MenuItem value="teacher1">Dr. Sarah Wilson - Mathematics</MenuItem>
              <MenuItem value="teacher2">Mr. John Davis - English Literature</MenuItem>
              <MenuItem value="teacher3">Ms. Lisa Chen - Science</MenuItem>
              <MenuItem value="counselor">Academic Counselor</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={3}
            margin="normal"
            placeholder="Type your message here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewChat(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SendIcon />}>
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Chat;
