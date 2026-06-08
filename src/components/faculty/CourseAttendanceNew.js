import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  CheckCircle,
  Cancel,
  Warning,
  Refresh
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

const AttendanceCheckbox = styled(Checkbox)(({ theme, status }) => ({
  '&.Mui-checked': {
    color: status === 'present' ? '#4CAF50' : 
          status === 'absent' ? '#F44336' : '#FF9800',
  },
}));

const CourseAttendance = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    semester: '',
    academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString()
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadStudents();
      loadAttendance();
    }
  }, [selectedCourse, selectedDate]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const result = await EnhancedFacultyService.getCourses();
      if (result.success) {
        setCourses(result.data);
      }
      showSnackbar('Courses loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading courses:', error);
      showSnackbar('Error loading courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const result = await EnhancedFacultyService.getStudents();
      if (result.success) {
        // Filter students for the selected course
        const courseStudents = result.data.filter(student => 
          student.courses && student.courses.includes(selectedCourse)
        );
        setStudents(courseStudents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      showSnackbar('Error loading students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const result = await EnhancedFacultyService.getAttendanceRecords(selectedCourse, selectedDate);
      if (result.success) {
        setAttendance(result.data);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      showSnackbar('Error loading attendance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    setViewingHistory(false);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    setViewingHistory(false);
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prevAttendance => {
      const existingIndex = prevAttendance.findIndex(record => record.studentId === studentId);
      
      if (existingIndex >= 0) {
        const updatedAttendance = [...prevAttendance];
        updatedAttendance[existingIndex] = {
          ...updatedAttendance[existingIndex],
          status
        };
        return updatedAttendance;
      } else {
        return [
          ...prevAttendance,
          {
            id: `attendance_${Date.now()}_${studentId}`,
            courseId: selectedCourse,
            studentId,
            date: selectedDate,
            status,
            timestamp: new Date().toISOString()
          }
        ];
      }
    });
  };

  const saveAttendance = async () => {
    if (!selectedCourse || !selectedDate) {
      showSnackbar('Please select a course and date', 'error');
      return;
    }

    if (attendance.length === 0) {
      showSnackbar('No attendance records to save', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.recordAttendance({
        courseId: selectedCourse,
        date: selectedDate,
        records: attendance
      });
      
      if (result.success) {
        showSnackbar('Attendance saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showSnackbar('Error saving attendance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewAttendanceHistory = async () => {
    if (!selectedCourse) {
      showSnackbar('Please select a course', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await EnhancedFacultyService.getAttendanceHistory(selectedCourse);
      if (result.success) {
        setAttendanceHistory(result.data);
        setViewingHistory(true);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      showSnackbar('Error fetching attendance history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatus = (studentId) => {
    const record = attendance.find(a => a.studentId === studentId);
    return record ? record.status : 'absent';
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      showSnackbar('Course name and code are required', 'error');
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would save to the database
      showSnackbar('Course added successfully', 'success');
      setAddCourseDialogOpen(false);
      setNewCourse({
        name: '',
        code: '',
        semester: '',
        academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString()
      });
      await loadCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      showSnackbar('Error adding course', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    if (attendance.length === 0) return null;
    
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const total = students.length;
    
    return { present, absent, excused, total };
  };

  const stats = getAttendanceStats();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            📊 Course Attendance Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddCourseDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Add Course
          </Button>
        </Box>

        {/* Course Selection and Controls */}
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{xs:12,md:4}}>
                <FormControl fullWidth>
                  <InputLabel>Select Course</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={handleCourseChange}
                    label="Select Course"
                  >
                    <MenuItem value="">
                      <em>Choose a course</em>
                    </MenuItem>
                    {courses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedCourse && !viewingHistory && (
                <Grid size={{xs:12,md:3}}>
                  <TextField
                    label="Select Date"
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}

              {selectedCourse && (
                <Grid size={{xs:12,md:5}}>
                  <Box display="flex" gap={2}>
                    {viewingHistory ? (
                      <Button
                        variant="outlined"
                        startIcon={<CalendarIcon />}
                        onClick={() => setViewingHistory(false)}
                      >
                        Back to Attendance
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={saveAttendance}
                          disabled={loading}
                        >
                          Save Attendance
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<HistoryIcon />}
                          onClick={viewAttendanceHistory}
                          disabled={loading}
                        >
                          View History
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={loadAttendance}
                          disabled={loading}
                        >
                          Refresh
                        </Button>
                      </>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>

            {loading && <LinearProgress sx={{ mt: 2 }} />}

            {/* Stats */}
            {stats && !viewingHistory && (
              <Box mt={3}>
                <Grid container spacing={2}>
                  <Grid size={{xs:3}}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E8F5E8' }}>
                      <Typography variant="h6" color="#4CAF50">{stats.present}</Typography>
                      <Typography variant="body2">Present</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{xs:3}}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#FFEBEE' }}>
                      <Typography variant="h6" color="#F44336">{stats.absent}</Typography>
                      <Typography variant="body2">Absent</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{xs:3}}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#FFF3E0' }}>
                      <Typography variant="h6" color="#FF9800">{stats.excused}</Typography>
                      <Typography variant="body2">Excused</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{xs:3}}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E3F2FD' }}>
                      <Typography variant="h6" color="#2196F3">{stats.total}</Typography>
                      <Typography variant="body2">Total</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </StyledCard>

        {/* Content */}
        {selectedCourse ? (
          viewingHistory ? (
            // History View
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Attendance History - {courses.find(c => c.id === selectedCourse)?.name}
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow><TableCell>Date</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Status</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceHistory.length > 0 ? (
                        attendanceHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>{getStudentName(record.studentId)}</TableCell>
                            <TableCell>
                              <Chip
                                icon={
                                  record.status === 'present' ? <CheckCircle /> :
                                  record.status === 'excused' ? <Warning /> : <Cancel />
                                }
                                label={record.status.toUpperCase()}
                                color={
                                  record.status === 'present' ? 'success' :
                                  record.status === 'excused' ? 'warning' : 'error'
                                }
                                size="small"
                              />
                            </TableCell></TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={3} align="center">
                            <Typography color="textSecondary">
                              No attendance history found
                            </Typography>
                          </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </StyledCard>
          ) : (
            // Attendance Taking View
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Mark Attendance - {selectedDate}
                </Typography>
                {students.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow><TableCell>Student ID</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell align="center">Present</TableCell>
                          <TableCell align="center">Absent</TableCell>
                          <TableCell align="center">Excused</TableCell></TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Typography variant="subtitle2">
                                {student.studentId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                  {student.name.charAt(0)}
                                </Avatar>
                                <Typography variant="body1">
                                  {student.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <AttendanceCheckbox
                                checked={getAttendanceStatus(student.id) === 'present'}
                                onChange={() => handleAttendanceChange(student.id, 'present')}
                                status="present"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <AttendanceCheckbox
                                checked={getAttendanceStatus(student.id) === 'absent'}
                                onChange={() => handleAttendanceChange(student.id, 'absent')}
                                status="absent"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <AttendanceCheckbox
                                checked={getAttendanceStatus(student.id) === 'excused'}
                                onChange={() => handleAttendanceChange(student.id, 'excused')}
                                status="excused"
                              />
                            </TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box textAlign="center" py={4}>
                    <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                    <Typography variant="h6" color="textSecondary">
                      No students enrolled in this course
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          )
        ) : (
          // No Course Selected
          <StyledCard>
            <CardContent>
              <Box textAlign="center" py={8}>
                <CalendarIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  Select a Course to Get Started
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Choose a course from the dropdown above to manage attendance
                </Typography>
              </Box>
            </CardContent>
          </StyledCard>
        )}

        {/* Add Course Dialog */}
        <Dialog
          open={addCourseDialogOpen}
          onClose={() => setAddCourseDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add New Course</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{xs:12}}>
                <TextField
                  label="Course Name"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{xs:12}}>
                <TextField
                  label="Course Code"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{xs:6}}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                    label="Semester"
                  >
                    <MenuItem value="Fall">Fall</MenuItem>
                    <MenuItem value="Spring">Spring</MenuItem>
                    <MenuItem value="Summer">Summer</MenuItem>
                    <MenuItem value="Winter">Winter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{xs:6}}>
                <TextField
                  label="Academic Year"
                  value={newCourse.academicYear}
                  onChange={(e) => setNewCourse({ ...newCourse, academicYear: e.target.value })}
                  fullWidth
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCourse}
              variant="contained"
              disabled={loading}
            >
              Add Course
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
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CourseAttendance;