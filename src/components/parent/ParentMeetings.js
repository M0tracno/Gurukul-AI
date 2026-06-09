import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Event as EventIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';

const ParentMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMeeting, setNewMeeting] = useState({
    teacherName: '',
    subject: '',
    date: '',
    time: '',
    type: 'video',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    // Simulate API call for meetings
    const mockMeetings = [
      {
        id: 1,
        teacherName: 'Dr. Sarah Wilson',
        subject: 'Mathematics',
        studentName: 'Emma Johnson',
        date: '2025-06-10',
        time: '14:00',
        duration: 30,
        type: 'video',
        status: 'scheduled',
        reason: 'Discuss recent test performance',
        location: 'Zoom Meeting',
        meetingLink: 'https://zoom.us/j/123456789',
        notes: 'Prepare questions about homework strategies',
      },
      {
        id: 2,
        teacherName: 'Mr. John Davis',
        subject: 'English Literature',
        studentName: 'Michael Johnson',
        date: '2025-06-08',
        time: '15:30',
        duration: 45,
        type: 'in-person',
        status: 'completed',
        reason: 'Review writing assignments',
        location: 'Classroom 201',
        notes: 'Discussed improvement strategies for essay writing',
      },
      {
        id: 3,
        teacherName: 'Ms. Lisa Chen',
        subject: 'Science',
        studentName: 'Emma Johnson',
        date: '2025-06-12',
        time: '10:00',
        duration: 30,
        type: 'phone',
        status: 'scheduled',
        reason: 'Science fair project discussion',
        location: 'Phone Call',
        phone: '+1 (555) 123-4567',
        notes: 'Discuss project timeline and requirements',
      },
    ];

    setTimeout(() => {
      setMeetings(mockMeetings);
      setLoading(false);
    }, 1000);
  }, []);

  const handleScheduleMeeting = () => {
    setOpenDialog(true);
    setSelectedMeeting(null);
    setNewMeeting({
      teacherName: '',
      subject: '',
      date: '',
      time: '',
      type: 'video',
      reason: '',
      notes: '',
    });
  };

  const handleEditMeeting = meeting => {
    setSelectedMeeting(meeting);
    setNewMeeting({
      teacherName: meeting.teacherName,
      subject: meeting.subject,
      date: meeting.date,
      time: meeting.time,
      type: meeting.type,
      reason: meeting.reason,
      notes: meeting.notes,
    });
    setOpenDialog(true);
  };

  const handleSaveMeeting = () => {
    console.log('Saving meeting:', newMeeting);
    setOpenDialog(false);
  };

  const handleCancelMeeting = meetingId => {
    console.log('Canceling meeting:', meetingId);
  };

  const handleJoinMeeting = meeting => {
    if (meeting.type === 'video' && meeting.meetingLink) {
      window.open(meeting.meetingLink, '_blank');
    } else if (meeting.type === 'phone' && meeting.phone) {
      window.open(`tel:${meeting.phone}`);
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'in-progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'video':
        return <VideoCallIcon />;
      case 'phone':
        return <PhoneIcon />;
      case 'in-person':
        return <PersonIcon />;
      default:
        return <EventIcon />;
    }
  };

  const isUpcoming = (date, time) => {
    const meetingDateTime = new Date(`${date}T${time}`);
    return meetingDateTime > new Date();
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading meetings...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Parent-Teacher Meetings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleScheduleMeeting}
          sx={{ borderRadius: 2 }}
        >
          Schedule Meeting
        </Button>
      </Box>

      {/* Upcoming Meetings Alert */}
      {meetings.filter(m => m.status === 'scheduled' && isUpcoming(m.date, m.time)).length > 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }} icon={<EventIcon />}>
          You have{' '}
          {meetings.filter(m => m.status === 'scheduled' && isUpcoming(m.date, m.time)).length}{' '}
          upcoming meetings scheduled
        </Alert>
      )}

      <Grid container spacing={3}>
        {meetings.map(meeting => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={meeting.id}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
                border:
                  meeting.status === 'scheduled' && isUpcoming(meeting.date, meeting.time) ? 2 : 0,
                borderColor: 'primary.main',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Meeting Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: `${getStatusColor(meeting.status)}.main`, mr: 2 }}>
                      {getTypeIcon(meeting.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {meeting.teacherName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {meeting.subject}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={meeting.status}
                    color={getStatusColor(meeting.status)}
                    size="small"
                  />
                </Box>

                {/* Student Info */}
                <Box display="flex" alignItems="center" mb={2}>
                  <PersonIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    Student: <strong>{meeting.studentName}</strong>
                  </Typography>
                </Box>

                {/* Date and Time */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      {new Date(meeting.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      {meeting.time} ({meeting.duration} minutes)
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <LocationOnIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2">{meeting.location}</Typography>
                  </Box>
                </Paper>

                {/* Reason */}
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Purpose:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {meeting.reason}
                  </Typography>
                </Box>

                {/* Notes */}
                {meeting.notes && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Notes:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {meeting.notes}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Action Buttons */}
                <Box display="flex" gap={1}>
                  {meeting.status === 'scheduled' && isUpcoming(meeting.date, meeting.time) && (
                    <>
                      {(meeting.type === 'video' && meeting.meetingLink) ||
                      (meeting.type === 'phone' && meeting.phone) ? (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={getTypeIcon(meeting.type)}
                          onClick={() => handleJoinMeeting(meeting)}
                          sx={{ borderRadius: 1 }}
                        >
                          Join
                        </Button>
                      ) : null}
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleCancelMeeting(meeting.id)}
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  )}
                  {meeting.status === 'completed' && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Completed"
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Schedule/Edit Meeting Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={newMeeting.teacherName}
                  onChange={e => setNewMeeting({ ...newMeeting, teacherName: e.target.value })}
                  label="Teacher"
                >
                  <MenuItem value="Dr. Sarah Wilson">Dr. Sarah Wilson - Mathematics</MenuItem>
                  <MenuItem value="Mr. John Davis">Mr. John Davis - English Literature</MenuItem>
                  <MenuItem value="Ms. Lisa Chen">Ms. Lisa Chen - Science</MenuItem>
                  <MenuItem value="Mr. Robert Brown">Mr. Robert Brown - History</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={newMeeting.date}
                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                value={newMeeting.time}
                onChange={e => setNewMeeting({ ...newMeeting, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Meeting Type</InputLabel>
                <Select
                  value={newMeeting.type}
                  onChange={e => setNewMeeting({ ...newMeeting, type: e.target.value })}
                  label="Meeting Type"
                >
                  <MenuItem value="video">Video Call</MenuItem>
                  <MenuItem value="phone">Phone Call</MenuItem>
                  <MenuItem value="in-person">In-Person</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Reason for Meeting"
                value={newMeeting.reason}
                onChange={e => setNewMeeting({ ...newMeeting, reason: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Additional Notes"
                value={newMeeting.notes}
                onChange={e => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                multiline
                rows={3}
                placeholder="Any specific topics or questions you'd like to discuss..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMeeting}
            variant="contained"
            startIcon={selectedMeeting ? <EditIcon /> : <AddIcon />}
          >
            {selectedMeeting ? 'Update' : 'Schedule'} Meeting
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentMeetings;
