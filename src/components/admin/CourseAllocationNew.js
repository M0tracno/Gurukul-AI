import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';

const CourseAllocationNew = () => {
  const [allocations, setAllocations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAllocation, setNewAllocation] = useState({
    courseId: '',
    facultyId: '',
    studentIds: [],
    semester: 'Fall 2024',
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Mock data
    setTimeout(() => {
      setCourses([
        { id: 1, name: 'Computer Science Fundamentals', code: 'CS101', credits: 3 },
        { id: 2, name: 'Mathematics for Engineers', code: 'MATH201', credits: 4 },
        { id: 3, name: 'Physics Laboratory', code: 'PHY101L', credits: 2 },
        { id: 4, name: 'Data Structures', code: 'CS201', credits: 3 },
        { id: 5, name: 'Database Systems', code: 'CS301', credits: 3 },
      ]);

      setFaculty([
        { id: 1, name: 'Dr. Sarah Smith', department: 'Computer Science', employeeId: 'FAC001' },
        { id: 2, name: 'Prof. John Johnson', department: 'Mathematics', employeeId: 'FAC002' },
        { id: 3, name: 'Dr. Emily Wilson', department: 'Physics', employeeId: 'FAC003' },
        { id: 4, name: 'Dr. Michael Brown', department: 'Computer Science', employeeId: 'FAC004' },
        { id: 5, name: 'Prof. Lisa Davis', department: 'Mathematics', employeeId: 'FAC005' },
      ]);

      setStudents([
        { id: 1, name: 'Alice Johnson', studentId: 'STU001', grade: '10th' },
        { id: 2, name: 'Bob Smith', studentId: 'STU002', grade: '11th' },
        { id: 3, name: 'Charlie Brown', studentId: 'STU003', grade: '12th' },
        { id: 4, name: 'Diana Wilson', studentId: 'STU004', grade: '10th' },
        { id: 5, name: 'Eve Davis', studentId: 'STU005', grade: '11th' },
        { id: 6, name: 'Frank Miller', studentId: 'STU006', grade: '12th' },
        { id: 7, name: 'Grace Taylor', studentId: 'STU007', grade: '10th' },
        { id: 8, name: 'Henry Anderson', studentId: 'STU008', grade: '11th' },
      ]);      setAllocations([
        {
          id: 1,
          courseId: 1,
          courseName: 'Computer Science Fundamentals',
          courseCode: 'CS101',
          facultyId: 1,
          facultyName: 'Dr. Sarah Smith',
          studentCount: 45,
          semester: 'Fall 2024',
          status: 'Active',
          students: [
            { id: 1, name: 'Alice Johnson', studentId: 'STU001' },
            { id: 2, name: 'Bob Smith', studentId: 'STU002' },
            { id: 3, name: 'Charlie Brown', studentId: 'STU003' },
          ]
        },
        {
          id: 2,
          courseId: 2,
          courseName: 'Mathematics for Engineers',
          courseCode: 'MATH201',
          facultyId: 2,
          facultyName: 'Prof. John Johnson',
          studentCount: 38,
          semester: 'Fall 2024',
          status: 'Active',
          students: [
            { id: 4, name: 'Diana Wilson', studentId: 'STU004' },
            { id: 5, name: 'Eve Davis', studentId: 'STU005' },
          ]
        },
      ]);

      setLoading(false);
    }, 1000);
  };

  const handleCreateAllocation = () => {
    if (!newAllocation.courseId || !newAllocation.facultyId) {
      showNotification('Please select both course and faculty', 'error');
      return;
    }

    const course = courses.find(c => c.id === parseInt(newAllocation.courseId));
    const facultyMember = faculty.find(f => f.id === parseInt(newAllocation.facultyId));
    
    const allocation = {
      id: allocations.length + 1,
      courseId: newAllocation.courseId,
      courseName: course.name,
      courseCode: course.code,
      facultyId: newAllocation.facultyId,
      facultyName: facultyMember.name,
      studentCount: newAllocation.studentIds.length,
      semester: newAllocation.semester,
      status: 'Active'
    };

    setAllocations([...allocations, allocation]);
    setOpenDialog(false);
    resetForm();
    showNotification('Course allocation created successfully', 'success');
  };

  const handleEditAllocation = (allocation) => {
    setNewAllocation({
      courseId: allocation.courseId,
      facultyId: allocation.facultyId,
      studentIds: [], // Would need to load actual student IDs
      semester: allocation.semester,
    });
    setOpenDialog(true);
  };

  const handleDeleteAllocation = (allocationId) => {
    if (window.confirm('Are you sure you want to delete this allocation?')) {
      setAllocations(prev => prev.filter(allocation => allocation.id !== allocationId));
      showNotification('Allocation deleted successfully', 'success');
    }
  };

  const resetForm = () => {
    setNewAllocation({
      courseId: '',
      facultyId: '',
      studentIds: [],
      semester: 'Fall 2024',
    });
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
            Course Allocation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Assign courses to faculty and enroll students
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          Create Allocation
        </Button>
      </Box>

      {/* Allocation Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #667eea15 0%, #667eea05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <AssignmentIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                {allocations.length}
              </Typography>
              <Typography variant="h6">Active Allocations</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #764ba215 0%, #764ba205 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#764ba2', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#764ba2' }}>
                {courses.length}
              </Typography>
              <Typography variant="h6">Available Courses</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f093fb15 0%, #f093fb05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <PersonIcon sx={{ fontSize: 48, color: '#f093fb', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f093fb' }}>
                {faculty.length}
              </Typography>
              <Typography variant="h6">Faculty Members</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #4facfe15 0%, #4facfe05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <GroupIcon sx={{ fontSize: 48, color: '#4facfe', mb: 2 }} />              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4facfe' }}>
                {allocations.reduce((sum, allocation) => sum + (allocation.studentCount || 0), 0)}
              </Typography>
              <Typography variant="h6">Total Enrolled</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Allocations Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Faculty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Enrolled Students</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Semester</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell></TableRow>
                ) : allocations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No course allocations found</Typography>
                    </TableCell></TableRow>
                ) : (                  allocations.map((allocation) => (
                    <TableRow key={allocation.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {allocation.courseName || 'Unknown Course'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {allocation.courseCode || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: '#764ba2', width: 32, height: 32 }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {allocation.facultyName || 'Unknown Faculty'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Faculty ID: {allocation.facultyId || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip 
                            label={`${allocation.studentCount || 0} Students`} 
                            color="primary" 
                            size="small" 
                            sx={{ mb: 1 }}
                          />
                          <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                            {allocation.students && allocation.students.length > 0 ? (
                              <>
                                {allocation.students.slice(0, 3).map((student, index) => (
                                  <Typography key={student?.id || index} variant="caption" display="block" color="text.secondary">
                                    {student?.name || 'Unknown'} ({student?.studentId || 'N/A'})
                                  </Typography>
                                ))}
                                {allocation.students.length > 3 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{allocation.students.length - 3} more...
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No students enrolled yet
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={allocation.semester} variant="outlined" size="small" />
                      </TableCell>                      <TableCell align="center">
                        <Box>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#ff9800' }}
                            onClick={() => handleEditAllocation(allocation)}
                            title="Edit Allocation"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#f44336' }}
                            onClick={() => handleDeleteAllocation(allocation.id)}
                            title="Delete Allocation"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell></TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Allocation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create Course Allocation
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{xs:12,sm:6}}>
              <FormControl fullWidth required>
                <InputLabel>Select Course</InputLabel>
                <Select
                  value={newAllocation.courseId}
                  onChange={(e) => setNewAllocation({ ...newAllocation, courseId: e.target.value })}
                  label="Select Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{xs:12,sm:6}}>
              <FormControl fullWidth required>
                <InputLabel>Select Faculty</InputLabel>
                <Select
                  value={newAllocation.facultyId}
                  onChange={(e) => setNewAllocation({ ...newAllocation, facultyId: e.target.value })}
                  label="Select Faculty"
                >
                  {faculty.map((facultyMember) => (
                    <MenuItem key={facultyMember.id} value={facultyMember.id}>
                      {facultyMember.name} - {facultyMember.department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{xs:12,sm:6}}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={newAllocation.semester}
                  onChange={(e) => setNewAllocation({ ...newAllocation, semester: e.target.value })}
                  label="Semester"
                >
                  <MenuItem value="Fall 2024">Fall 2024</MenuItem>
                  <MenuItem value="Spring 2025">Spring 2025</MenuItem>
                  <MenuItem value="Summer 2025">Summer 2025</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{xs:12}}>
              <FormControl fullWidth>
                <InputLabel>Select Students</InputLabel>
                <Select
                  multiple
                  value={newAllocation.studentIds}
                  onChange={(e) => setNewAllocation({ ...newAllocation, studentIds: e.target.value })}
                  label="Select Students"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const student = students.find(s => s.id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={student ? student.name : value} 
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId}) - Grade {student.grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {newAllocation.studentIds.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Selected Students ({newAllocation.studentIds.length}):
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f8f9fa', borderRadius: 1 }}>
                {newAllocation.studentIds.map((studentId) => {
                  const student = students.find(s => s.id === studentId);
                  return (
                    <ListItem key={studentId}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#4facfe', width: 32, height: 32 }}>
                          <AccountCircleIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={student?.name}
                        secondary={`${student?.studentId} - Grade ${student?.grade}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAllocation} 
            variant="contained"
            disabled={!newAllocation.courseId || !newAllocation.facultyId}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Create Allocation
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

export default CourseAllocationNew;