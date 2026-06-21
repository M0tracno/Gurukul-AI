import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeService from '../../services/RealtimeService';
import { useAuth } from '../../auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PushPin,
  MoreVert,
  People,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  Chat,
  Close,
  Send,
  Delete,
} from '@mui/icons-material';

const RealTimeCollaboration = ({ roomId, roomType = 'study_group', maxParticipants = 10 }) => {
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [notification, setNotification] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (roomId && currentUser) {
      initializeCollaboration();
    }

    return () => {
      if (connected) {
        RealtimeService.leaveRoom(roomId);
      }
    };
  }, [roomId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeCollaboration = async () => {
    try {
      // Join collaboration room
      await RealtimeService.joinRoom(roomId, {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userRole: currentUser.role || 'participant',
        roomType,
      });

      // Set up event listeners
      RealtimeService.on('userJoined', handleUserJoined);
      RealtimeService.on('userLeft', handleUserLeft);
      RealtimeService.on('messageReceived', handleMessageReceived);
      RealtimeService.on('userTyping', handleUserTyping);
      RealtimeService.on('userStoppedTyping', handleUserStoppedTyping);
      RealtimeService.on('messagePinned', handleMessagePinned);
      RealtimeService.on('messageUnpinned', handleMessageUnpinned);
      RealtimeService.on('roomStateChanged', handleRoomStateChanged);

      setConnected(true);
      showNotification('Connected to collaboration room', 'success');
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      showNotification('Failed to connect to collaboration room', 'error');
    }
  };

  const handleUserJoined = user => {
    setParticipants(prev => [...prev.filter(p => p.id !== user.id), user]);
    showNotification(`${user.name} joined the room`, 'info');
  };

  const handleUserLeft = user => {
    setParticipants(prev => prev.filter(p => p.id !== user.id));
    showNotification(`${user.name} left the room`, 'info');
  };

  const handleMessageReceived = message => {
    setMessages(prev => [...prev, message]);

    if (message.userId !== currentUser.uid) {
      showNotification(`New message from ${message.userName}`, 'info');
    }
  };

  const handleUserTyping = user => {
    if (user.id !== currentUser.uid) {
      setTyping(prev => [...prev.filter(u => u.id !== user.id), user]);
    }
  };

  const handleUserStoppedTyping = user => {
    setTyping(prev => prev.filter(u => u.id !== user.id));
  };

  const handleMessagePinned = message => {
    setPinnedMessages(prev => [...prev, message]);
    showNotification('Message pinned', 'info');
  };

  const handleMessageUnpinned = messageId => {
    setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
    showNotification('Message unpinned', 'info');
  };

  const handleRoomStateChanged = state => {
    // Handle room state changes (e.g., recording started, screen sharing)
    console.log('Room state changed:', state);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !connected) return;

    try {
      await RealtimeService.sendMessage(roomId, {
        content: newMessage.trim(),
        type: 'text',
        timestamp: new Date(),
      });

      setNewMessage('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
      showNotification('Failed to send message', 'error');
    }
  };

  const handleTyping = text => {
    setNewMessage(text);

    if (text.trim()) {
      RealtimeService.startTyping(roomId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    } else {
      stopTyping();
    }
  };

  const stopTyping = () => {
    RealtimeService.stopTyping(roomId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const toggleVideo = async () => {
    try {
      if (videoEnabled) {
        await RealtimeService.disableVideo();
      } else {
        await RealtimeService.enableVideo();
      }
      setVideoEnabled(!videoEnabled);
    } catch (error) {
      console.error('Failed to toggle video:', error);
      showNotification('Failed to toggle video', 'error');
    }
  };

  const toggleAudio = async () => {
    try {
      if (audioEnabled) {
        await RealtimeService.disableAudio();
      } else {
        await RealtimeService.enableAudio();
      }
      setAudioEnabled(!audioEnabled);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      showNotification('Failed to toggle audio', 'error');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (screenSharing) {
        await RealtimeService.stopScreenShare();
      } else {
        await RealtimeService.startScreenShare();
      }
      setScreenSharing(!screenSharing);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      showNotification('Failed to toggle screen share', 'error');
    }
  };

  const pinMessage = async message => {
    try {
      await RealtimeService.pinMessage(roomId, message.id);
      setMenuAnchor(null);
    } catch (error) {
      console.error('Failed to pin message:', error);
      showNotification('Failed to pin message', 'error');
    }
  };

  const unpinMessage = async messageId => {
    try {
      await RealtimeService.unpinMessage(roomId, messageId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
      showNotification('Failed to unpin message', 'error');
    }
  };

  const deleteMessage = async messageId => {
    try {
      await RealtimeService.deleteMessage(roomId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMenuAnchor(null);
      showNotification('Message deleted', 'info');
    } catch (error) {
      console.error('Failed to delete message:', error);
      showNotification('Failed to delete message', 'error');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ message, severity });
  };

  const MessageItem = ({ message }) => {
    const isOwnMessage = message.userId === currentUser.uid;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ListItem
          sx={{
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            py: 1,
          }}
        >
          <ListItemAvatar
            sx={{
              minWidth: isOwnMessage ? '56px' : 'auto',
              ml: isOwnMessage ? 1 : 0,
              mr: isOwnMessage ? 0 : 1,
            }}
          >
            <Avatar src={message.userAvatar} sx={{ width: 32, height: 32 }}>
              {message.userName?.charAt(0)}
            </Avatar>
          </ListItemAvatar>

          <Paper
            elevation={1}
            sx={{
              p: 1.5,
              maxWidth: '70%',
              bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              position: 'relative',
            }}
          >
            {!isOwnMessage && (
              <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                {message.userName}
              </Typography>
            )}

            <Typography variant="body2">{message.content}</Typography>

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </Typography>

              {message.pinned && <PushPin fontSize="small" sx={{ opacity: 0.7 }} />}

              <IconButton
                size="small"
                onClick={e => {
                  setSelectedMessage(message);
                  setMenuAnchor(e.currentTarget);
                }}
                sx={{ opacity: 0.7, ml: 1 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        </ListItem>
      </motion.div>
    );
  };

  const TypingIndicator = () => {
    if (typing.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Box sx={{ p: 2, fontStyle: 'italic', color: 'text.secondary' }}>
          <Typography variant="body2">
            {typing.map(user => user.name).join(', ')}
            {typing.length === 1 ? ' is' : ' are'} typing...
          </Typography>
        </Box>
      </motion.div>
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, zIndex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Collaboration Room</Typography>

          <Box display="flex" alignItems="center" gap={1}>
            {/* Connection Status */}
            <Chip
              label={connected ? 'Connected' : 'Disconnected'}
              color={connected ? 'success' : 'error'}
              size="small"
            />

            {/* Participants Count */}
            <Chip icon={<People />} label={participants.length} color="primary" size="small" />

            {/* Media Controls */}
            <Tooltip title={audioEnabled ? 'Mute' : 'Unmute'}>
              <IconButton onClick={toggleAudio} color={audioEnabled ? 'primary' : 'default'}>
                {audioEnabled ? <Mic /> : <MicOff />}
              </IconButton>
            </Tooltip>

            <Tooltip title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton onClick={toggleVideo} color={videoEnabled ? 'primary' : 'default'}>
                {videoEnabled ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>

            <Tooltip title={screenSharing ? 'Stop sharing' : 'Share screen'}>
              <IconButton onClick={toggleScreenShare} color={screenSharing ? 'primary' : 'default'}>
                <ScreenShare />
              </IconButton>
            </Tooltip>

            {/* Chat Toggle */}
            <Tooltip title="Toggle chat">
              <IconButton onClick={() => setChatOpen(!chatOpen)}>
                <Badge badgeContent={messages.length} color="error">
                  <Chat />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video/Content Area */}
        <Box sx={{ flex: 1, p: 2 }}>
          <Paper
            sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="h6" color="textSecondary">
              Video/Screen Share Area
            </Typography>
          </Paper>
        </Box>

        {/* Chat Sidebar */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={chatOpen}
          sx={{
            width: 400,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 400,
              position: 'relative',
              height: '100%',
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Chat
            </Typography>
            <IconButton onClick={() => setChatOpen(false)}>
              <Close />
            </IconButton>
          </Toolbar>

          <Divider />

          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
            <Box sx={{ p: 1, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" gutterBottom>
                Pinned Messages
              </Typography>
              {pinnedMessages.map(message => (
                <Card key={message.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2">{message.content}</Typography>
                  </CardContent>
                  <CardActions sx={{ py: 0.5 }}>
                    <Button size="small" onClick={() => unpinMessage(message.id)}>
                      Unpin
                    </Button>
                  </CardActions>
                </Card>
              ))}
              <Divider />
            </Box>
          )}

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List sx={{ py: 0 }}>
              <AnimatePresence>
                {messages.map(message => (
                  <MessageItem key={message.id} message={message} />
                ))}
              </AnimatePresence>
            </List>

            <AnimatePresence>
              <TypingIndicator />
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => handleTyping(e.target.value)}
                onKeyPress={e =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
                }
                multiline
                maxRows={3}
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={!newMessage.trim() || !connected}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                <Send />
              </Button>
            </Box>
          </Box>
        </Drawer>
      </Box>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {selectedMessage && !selectedMessage.pinned && (
          <MenuItem onClick={() => pinMessage(selectedMessage)}>
            <PushPin sx={{ mr: 1 }} />
            Pin Message
          </MenuItem>
        )}

        {selectedMessage?.userId === currentUser.uid && (
          <MenuItem onClick={() => deleteMessage(selectedMessage.id)}>
            <Delete sx={{ mr: 1 }} />
            Delete Message
          </MenuItem>
        )}
      </Menu>

      {/* Notification Snackbar */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {notification && (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default RealTimeCollaboration;
