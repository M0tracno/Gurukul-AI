import React, { useState, useEffect } from 'react';
import {
  Announcement,
  Assignment,
  Close,
  Delete,
  Email,
  ExpandMore,
  Grade,
  MarkEmailRead,
  Message,
  Notifications,
  NotificationsActive,
  Phone,
  Schedule,
  Settings,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import SmartNotificationService from '../../services/SmartNotificationService';
import { useAuth } from '../../auth/AuthContext';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
const SmartNotificationPanel = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    priority: 'medium',
    channels: ['push', 'in-app'],
    quietHours: { start: '22:00', end: '07:00' },
    subjectFilters: ['assignments', 'grades', 'announcements'],
    frequency: 'immediate',
    smartGrouping: true,
    adaptiveTiming: true,
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadPreferences();
    }
  }, [open]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const history = await SmartNotificationService.getNotificationHistory(currentUser.uid, 50);
      setNotifications(history);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showSnackbar('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      // In a real implementation, load from backend
      const userPrefs = preferences; // Mock data
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await SmartNotificationService.updateUserPreferences(currentUser.uid, preferences);
      showSnackbar('Preferences saved successfully', 'success');
      setSettingsOpen(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      showSnackbar('Failed to save preferences', 'error');
    }
  };

  const markAsRead = async notificationId => {
    try {
      // Update local state immediately
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));

      // Call backend API
      // await notificationAPI.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async notificationId => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // await notificationAPI.delete(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // await notificationAPI.markAllAsRead(currentUser.uid);
      showSnackbar('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const testNotification = async () => {
    try {
      await SmartNotificationService.sendNotification({
        userId: currentUser.uid,
        title: 'Test Notification',
        message: 'This is a test notification to verify your settings.',
        type: 'test',
        priority: 'medium',
      });
      showSnackbar('Test notification sent', 'success');
    } catch (error) {
      console.error('Error sending test notification:', error);
      showSnackbar('Failed to send test notification', 'error');
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChannelToggle = channel => {
    const updatedChannels = preferences.channels.includes(channel)
      ? preferences.channels.filter(c => c !== channel)
      : [...preferences.channels, channel];

    handlePreferenceChange('channels', updatedChannels);
  };

  const handleSubjectFilterToggle = subject => {
    const updatedFilters = preferences.subjectFilters.includes(subject)
      ? preferences.subjectFilters.filter(s => s !== subject)
      : [...preferences.subjectFilters, subject];

    handlePreferenceChange('subjectFilters', updatedFilters);
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const getNotificationIcon = type => {
    switch (type) {
      case 'assignment':
        return <Assignment />;
      case 'grade':
        return <Grade />;
      case 'announcement':
        return <Announcement />;
      case 'reminder':
        return <Schedule />;
      default:
        return <Notifications />;
    }
  };

  const getPriorityColor = priority => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'priority')
      return notification.priority === 'high' || notification.priority === 'urgent';
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationItem = ({ notification }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <ListItem
        sx={{
          bgcolor: notification.read ? 'transparent' : 'action.hover',
          borderRadius: 1,
          mb: 0.5,
          '&:hover': { bgcolor: 'action.selected' },
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: `${getPriorityColor(notification.priority)}.main` }}>
            {getNotificationIcon(notification.type)}
          </Avatar>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
              >
                {notification.title}
              </Typography>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Chip
                  label={notification.priority}
                  size="small"
                  color={getPriorityColor(notification.priority)}
                  variant="outlined"
                />
                <Typography variant="caption" color="textSecondary">
                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </Typography>
              </Box>
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="textSecondary">
                {notification.message}
              </Typography>
              {notification.subject && (
                <Chip
                  label={notification.subject}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          }
        />

        <Box display="flex" flexDirection="column" gap={0.5}>
          {!notification.read && (
            <IconButton
              size="small"
              onClick={() => markAsRead(notification.id)}
              title="Mark as read"
            >
              <MarkEmailRead fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => deleteNotification(notification.id)}
            title="Delete"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>
    </motion.div>
  );

  const SettingsDialog = () => (
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Notification Settings</DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Priority Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Priority & Filtering</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Minimum Priority</InputLabel>
                    <Select
                      value={preferences.priority}
                      onChange={e => handlePreferenceChange('priority', e.target.value)}
                      label="Minimum Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent Only</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Subject Filters
                </Typography>
                {['assignments', 'grades', 'announcements', 'reminders', 'messages'].map(
                  subject => (
                    <FormControlLabel
                      key={subject}
                      control={
                        <Switch
                          checked={preferences.subjectFilters.includes(subject)}
                          onChange={() => handleSubjectFilterToggle(subject)}
                        />
                      }
                      label={subject.charAt(0).toUpperCase() + subject.slice(1)}
                    />
                  )
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Delivery Channels */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Delivery Channels</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {[
                  { key: 'push', label: 'Push Notifications', icon: <NotificationsActive /> },
                  { key: 'email', label: 'Email', icon: <Email /> },
                  { key: 'sms', label: 'SMS', icon: <Phone /> },
                  { key: 'in-app', label: 'In-App', icon: <Message /> },
                ].map(channel => (
                  <FormControlLabel
                    key={channel.key}
                    control={
                      <Switch
                        checked={preferences.channels.includes(channel.key)}
                        onChange={() => handleChannelToggle(channel.key)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        {channel.icon}
                        {channel.label}
                      </Box>
                    }
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Timing Settings */}
          <Grid size={{ xs: 12 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Timing & Schedule</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Quiet Hours Start"
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={e =>
                        handlePreferenceChange('quietHours', {
                          ...preferences.quietHours,
                          start: e.target.value,
                        })
                      }
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Quiet Hours End"
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={e =>
                        handlePreferenceChange('quietHours', {
                          ...preferences.quietHours,
                          end: e.target.value,
                        })
                      }
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Delivery Frequency</InputLabel>
                      <Select
                        value={preferences.frequency}
                        onChange={e => handlePreferenceChange('frequency', e.target.value)}
                        label="Delivery Frequency"
                      >
                        <MenuItem value="immediate">Immediate</MenuItem>
                        <MenuItem value="batched">Batched (hourly)</MenuItem>
                        <MenuItem value="digest">Daily Digest</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Smart Features */}
          <Grid size={{ xs: 12 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Smart Features</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.smartGrouping}
                      onChange={e => handlePreferenceChange('smartGrouping', e.target.checked)}
                    />
                  }
                  label="Smart Grouping - Group similar notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.adaptiveTiming}
                      onChange={e => handlePreferenceChange('adaptiveTiming', e.target.checked)}
                    />
                  }
                  label="Adaptive Timing - Learn optimal delivery times"
                />
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={testNotification} variant="outlined">
          Send Test
        </Button>
        <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
        <Button onClick={savePreferences} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Badge badgeContent={unreadCount} color="error">
                <Notifications />
              </Badge>
              <Typography variant="h6">Notifications</Typography>
            </Box>

            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={() => setSettingsOpen(true)} title="Settings">
                <Settings />
              </IconButton>
              <IconButton size="small" onClick={onClose} title="Close">
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Filter Controls */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select value={filter} onChange={e => setFilter(e.target.value)} displayEmpty>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="unread">Unread</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="assignment">Assignments</MenuItem>
                <MenuItem value="grade">Grades</MenuItem>
                <MenuItem value="announcement">Announcements</MenuItem>
              </Select>
            </FormControl>

            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead} variant="outlined">
                Mark All Read
              </Button>
            )}
          </Box>
        </Paper>

        {/* Notifications List */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>Loading notifications...</Typography>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" p={3}>
              <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="textSecondary">
                No notifications
              </Typography>
              <Typography variant="body2" color="textSecondary" textAlign="center">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : "You'll see notifications here when you receive them."}
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              <AnimatePresence>
                {filteredNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </AnimatePresence>
            </List>
          )}
        </Box>
      </Box>

      {/* Settings Dialog */}
      <SettingsDialog />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SmartNotificationPanel;
