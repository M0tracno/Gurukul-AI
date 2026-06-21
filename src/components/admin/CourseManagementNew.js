import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Fab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const CourseManagementNew = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    semester: '',
    department: '',
    instructor: '',
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    // Mock data for now
    setTimeout(() => {
      setCourses([
        {
          id: 1,
          name: 'Computer Science Fundamentals',
          code: 'CS101',
          description: 'Introduction to computer science concepts',
          credits: 3,
          semester: 'Fall 2024',
          department: 'Computer Science',
          instructor: 'Dr. Smith',
          enrolled: 45,
          capacity: 50,
        },
        {
          id: 2,
          name: 'Mathematics for Engineers',
          code: 'MATH201',
          description: 'Advanced mathematics for engineering students',
          credits: 4,
          semester: 'Fall 2024',
          department: 'Mathematics',
          instructor: 'Prof. Johnson',
          enrolled: 38,
          capacity: 40,
        },
        {
          id: 3,
          name: 'Physics Laboratory',
          code: 'PHY101L',
          description: 'Hands-on physics experiments and lab work',
          credits: 2,
          semester: 'Fall 2024',
          department: 'Physics',
          instructor: 'Dr. Wilson',
          enrolled: 25,
          capacity: 30,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleAddCourse = () => {
    // Mock add functionality
    const newId = courses.length + 1;
    const course = {
      ...newCourse,
      id: newId,
      enrolled: 0,
      capacity: 50,
    };
    setCourses([...courses, course]);
    setOpenDialog(false);
    resetForm();
    showNotification('Course created successfully', 'success');
  };

  const handleEditCourse = course => {
    setSelectedCourse(course);
    setNewCourse({
      name: course.name,
      code: course.code,
      description: course.description || '',
      credits: course.credits || '',
      semester: course.semester || '',
      department: course.department || '',
      instructor: course.instructor || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteCourse = courseId => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      setCourses(prev => prev.filter(course => course.id !== courseId));
      showNotification('Course deleted successfully', 'success');
    }
  };

  const handleViewCourse = course => {
    alert(`Course Details:
Name: ${course.name}
Code: ${course.code}
Instructor: ${course.instructor}
Department: ${course.department}
Credits: ${course.credits}
Enrollment: ${course.enrolled}/${course.capacity}`);
  };

  const resetForm = () => {
    setNewCourse({
      name: '',
      code: '',
      description: '',
      credits: '',
      semester: '',
      department: '',
      instructor: '',
    });
    setSelectedCourse(null);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2D3748', mb: 1 }}>
            Course Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage courses, schedules, and enrollments
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #E5484D 0%, #B4282E 100%)',
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          Add New Course
        </Button>
      </Box>

      {/* Course Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #E5484D15 0%, #E5484D05 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#E5484D', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#E5484D' }}>
                {courses.length}
              </Typography>
              <Typography variant="h6">Total Courses</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #B4282E15 0%, #B4282E05 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <PeopleIcon sx={{ fontSize: 48, color: '#B4282E', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#B4282E' }}>
                {courses.reduce((sum, course) => sum + course.enrolled, 0)}
              </Typography>
              <Typography variant="h6">Total Enrolled</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f093fb15 0%, #f093fb05 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <AssignmentIcon sx={{ fontSize: 48, color: '#f093fb', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f093fb' }}>
                {courses.filter(c => c.enrolled / c.capacity > 0.8).length}
              </Typography>
              <Typography variant="h6">Nearly Full</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #4facfe15 0%, #4facfe05 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <ScheduleIcon sx={{ fontSize: 48, color: '#4facfe', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4facfe' }}>
                Fall 2024
              </Typography>
              <Typography variant="h6">Current Semester</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Courses Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Instructor</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Credits</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Enrollment</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No courses found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map(course => (
                    <TableRow key={course.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {course.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {course.department}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {course.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      <TableCell>
                        <Chip label={`${course.credits} Credits`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {course.enrolled}/{course.capacity}
                          </Typography>
                          <Chip
                            label={`${Math.round((course.enrolled / course.capacity) * 100)}%`}
                            color={course.enrolled / course.capacity > 0.8 ? 'warning' : 'success'}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <IconButton
                            size="small"
                            sx={{ color: '#2196f3' }}
                            onClick={() => handleViewCourse(course)}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ color: '#ff9800' }}
                            onClick={() => handleEditCourse(course)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ color: '#f44336' }}
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Course Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add New Course
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Course Name"
                value={newCourse.name}
                onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Course Code"
                value={newCourse.code}
                onChange={e => setNewCourse({ ...newCourse, code: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newCourse.description}
                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Credits"
                type="number"
                value={newCourse.credits}
                onChange={e => setNewCourse({ ...newCourse, credits: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={newCourse.semester}
                  onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })}
                  label="Semester"
                >
                  <MenuItem value="Fall 2024">Fall 2024</MenuItem>
                  <MenuItem value="Spring 2025">Spring 2025</MenuItem>
                  <MenuItem value="Summer 2025">Summer 2025</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Department"
                value={newCourse.department}
                onChange={e => setNewCourse({ ...newCourse, department: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Instructor"
                value={newCourse.instructor}
                onChange={e => setNewCourse({ ...newCourse, instructor: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddCourse}
            variant="contained"
            disabled={!newCourse.name || !newCourse.code}
            sx={{ background: 'linear-gradient(135deg, #E5484D 0%, #B4282E 100%)' }}
          >
            Create Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseManagementNew;
