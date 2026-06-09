import React, { useState, useEffect, useCallback } from 'react';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  GroupAdd as AddIcon,
  Book as CourseIcon,
  PeopleAlt as StudentsIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import BulkAssignmentDialog from './BulkAssignmentDialog';
import BulkStudentEnrollmentDialog from './BulkStudentEnrollmentDialog';
import CourseAllocationService from '../../services/courseAllocationService';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
const useStyles = makeStyles(theme => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  header: {
    marginBottom: theme.spacing(4),
  },
  statsCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
    color: 'white',
  },
  statsIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(1),
  },
  statsValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(0.5),
  },
  tabPanel: {
    paddingTop: theme.spacing(3),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
  statusChip: {
    minWidth: 80,
  },
  dialogContent: {
    minWidth: 500,
  },
  bulkActions: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
  },
  conflictWarning: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
    margin: theme.spacing(1, 0),
  },
  successMessage: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    margin: theme.spacing(1, 0),
  },
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box className="tabPanel">{children}</Box>}
    </div>
  );
}

function CourseAllocationDashboard() {
  const classes = useStyles();
  // State management
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [bulkAssignments] = useState([]);
  const [bulkEnrollments] = useState([]);
  // Dialog states
  const [facultyAssignDialog, setFacultyAssignDialog] = useState(false);
  const [studentEnrollDialog, setStudentEnrollDialog] = useState(false);
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);
  const [bulkEnrollDialog, setBulkEnrollDialog] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    academicYear: '',
    semester: '',
    department: '',
    facultyId: '',
  });
  // Result states
  const [conflicts, setConflicts] = useState([]);
  const [assignmentResults, setAssignmentResults] = useState(null);
  const [enrollmentResults, setEnrollmentResults] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await CourseAllocationService.getAllocatedCourses(filters);
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadFaculty = useCallback(async () => {
    try {
      const response = await CourseAllocationService.getAllFaculty();
      setFaculty(response.data || []);
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await CourseAllocationService.getAllocationStats(filters);
      setStats(response.data || {});
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [filters]);

  // Load initial data
  useEffect(() => {
    loadCourses();
    loadFaculty();
    loadStats();
  }, [loadCourses, loadFaculty, loadStats]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAssignFaculty = async () => {
    if (!selectedCourse || !selectedFaculty) {
      showSnackbar('Please select both course and faculty', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await CourseAllocationService.assignFacultyToCourse({
        courseId: selectedCourse.id,
        facultyId: selectedFaculty,
        forceAssign: false,
      });

      if (response.success) {
        showSnackbar('Faculty assigned successfully', 'success');
        loadCourses();
        setFacultyAssignDialog(false);
        setSelectedCourse(null);
        setSelectedFaculty('');
      } else if (response.conflicts) {
        setConflicts(response.conflicts);
        setConflictDialog(true);
      }
    } catch (error) {
      console.error('Error assigning faculty:', error);
      if (error.response?.data?.conflicts) {
        setConflicts(error.response.data.conflicts);
        setConflictDialog(true);
      } else {
        showSnackbar(
          'Error assigning faculty: ' + (error.response?.data?.message || error.message),
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = course => {
    if (!course.faculty) return 'secondary';
    if (course.enrollmentCount >= course.maxCapacity) return 'primary';
    if (course.enrollmentCount === 0) return 'default';
    return 'primary';
  };

  const getStatusLabel = course => {
    if (!course.faculty) return 'No Faculty';
    if (course.enrollmentCount >= course.maxCapacity) return 'Full';
    if (course.enrollmentCount === 0) return 'Empty';
    return 'Active';
  };

  // Handle force assignment when schedule conflicts are detected
  const handleForceAssign = async () => {
    if (!selectedCourse || !selectedFaculty) {
      setConflictDialog(false);
      return;
    }

    setLoading(true);
    try {
      const response = await CourseAllocationService.assignFacultyToCourse({
        courseId: selectedCourse.id,
        facultyId: selectedFaculty,
        forceAssign: true,
      });

      if (response.success) {
        showSnackbar('Faculty force-assigned successfully', 'success');
        loadCourses();
        setConflictDialog(false);
        setFacultyAssignDialog(false);
        setSelectedCourse(null);
        setSelectedFaculty('');
      }
    } catch (error) {
      console.error('Error in force assignment:', error);
      showSnackbar(
        'Error force-assigning faculty: ' + (error.response?.data?.message || error.message),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" className={classes.container}>
      {/* Header */}
      <Box className={classes.header}>
        <Typography variant="h4" component="h1" gutterBottom>
          Course Allocation Management
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Manage faculty assignments and student enrollments
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        {' '}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className={classes.statsCard}>
            <CardContent>
              <CourseIcon className={classes.statsIcon} />
              <Typography className={classes.statsValue}>{stats.courses?.total || 0}</Typography>
              <Typography variant="h6">Total Courses</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className={classes.statsCard}>
            <CardContent>
              <PersonIcon className={classes.statsIcon} />
              <Typography className={classes.statsValue}>{stats.courses?.assigned || 0}</Typography>
              <Typography variant="h6">Assigned Courses</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className={classes.statsCard}>
            <CardContent>
              <StudentsIcon className={classes.statsIcon} />
              <Typography className={classes.statsValue}>
                {stats.enrollments?.total || 0}
              </Typography>
              <Typography variant="h6">Total Enrollments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className={classes.statsCard}>
            <CardContent>
              <TrendingUpIcon className={classes.statsIcon} />
              <Typography className={classes.statsValue}>
                {stats.enrollments?.utilizationRate || 0}%
              </Typography>
              <Typography variant="h6">Utilization Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Course Allocations" />
          <Tab label="Faculty Assignments" />
        </Tabs>

        {/* Course Allocations Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box className={classes.bulkActions}>
            <Grid container spacing={2} alignItems="center">
              <Grid>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<GroupAdd as AddIcon />}
                  onClick={() => setBulkAssignDialog(true)}
                >
                  Bulk Assign Faculty
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SchoolIcon />}
                  onClick={() => setBulkEnrollDialog(true)}
                >
                  Bulk Enroll Students
                </Button>
              </Grid>
              <Grid xs>
                {/* Filters */}
                <Grid container spacing={2}>
                  {' '}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      select
                      label="Academic Year"
                      value={filters.academicYear}
                      onChange={e => setFilters({ ...filters, academicYear: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">All Years</MenuItem>
                      <MenuItem value="2023-2024">2023-2024</MenuItem>
                      <MenuItem value="2024-2025">2024-2025</MenuItem>
                    </TextField>
                  </Grid>{' '}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      select
                      label="Semester"
                      value={filters.semester}
                      onChange={e => setFilters({ ...filters, semester: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">All Semesters</MenuItem>
                      <MenuItem value="Fall">Fall</MenuItem>
                      <MenuItem value="Spring">Spring</MenuItem>
                      <MenuItem value="Summer">Summer</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>

          <TableContainer className={classes.tableContainer}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Class & Section</TableCell>
                  <TableCell>Faculty</TableCell>
                  <TableCell>Enrollments</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{course.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {course.classId} - {course.section}
                    </TableCell>
                    <TableCell>
                      {course.faculty
                        ? `${course.faculty.firstName} ${course.faculty.lastName}`
                        : 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {course.enrollmentCount} / {course.maxCapacity}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {course.availableSlots} slots available
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(course)}
                        color={getStatusColor(course)}
                        size="small"
                        className={classes.statusChip}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Assign Faculty">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedCourse(course);
                            setFacultyAssignDialog(true);
                          }}
                          className={classes.actionButton}
                        >
                          <AssignmentIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enroll Students">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedCourse(course);
                            setStudentEnrollDialog(true);
                          }}
                          className={classes.actionButton}
                        >
                          <PersonIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Faculty Assignments Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Faculty Workload Distribution
          </Typography>
          <Grid container spacing={3}>
            {stats.facultyWorkload?.map((workload, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">
                      {workload.faculty.firstName} {workload.faculty.lastName}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {workload.courseCount}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Courses Assigned
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Faculty Assignment Dialog */}
      <Dialog
        open={facultyAssignDialog}
        onClose={() => setFacultyAssignDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Faculty to Course</DialogTitle>
        <DialogContent className={classes.dialogContent}>
          {selectedCourse && (
            <Box mb={2}>
              <Typography variant="subtitle1">
                Course: {selectedCourse.name} ({selectedCourse.code})
              </Typography>
            </Box>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Faculty</InputLabel>
            <Select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)}>
              {faculty.map(facultyMember => (
                <MenuItem key={facultyMember.id} value={facultyMember.id}>
                  {facultyMember.firstName} {facultyMember.lastName} - {facultyMember.department}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFacultyAssignDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAssignFaculty}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog
        open={conflictDialog}
        onClose={() => setConflictDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Schedule Conflicts Detected</DialogTitle>
        <DialogContent>
          <Alert severity="warning" className={classes.conflictWarning}>
            The following schedule conflicts were detected:
          </Alert>
          <List>
            {conflicts.map((conflict, index) => (
              <ListItem key={index}>
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  primary={`${conflict.courseName} (${conflict.courseCode})`}
                  secondary="Time conflict detected"
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" style={{ marginTop: 16 }}>
            Do you want to force assign despite conflicts?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog(false)}>Cancel</Button>{' '}
          <Button
            onClick={handleForceAssign}
            color="secondary"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Force Assign'}
          </Button>{' '}
        </DialogActions>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <BulkAssignmentDialog
        open={bulkAssignDialog}
        onClose={() => setBulkAssignDialog(false)}
        onComplete={results => {
          setAssignmentResults(results);
          setSnackbar({
            open: true,
            message: `Bulk assignment completed: ${results.summary.successful} successful, ${results.summary.conflicts} conflicts`,
            severity: results.summary.conflicts > 0 ? 'warning' : 'success',
          });
          loadCourses(); // Refresh course data
        }}
      />

      {/* Bulk Student Enrollment Dialog */}
      <BulkStudentEnrollmentDialog
        open={bulkEnrollDialog}
        onClose={() => setBulkEnrollDialog(false)}
        onComplete={results => {
          setEnrollmentResults(results);
          setSnackbar({
            open: true,
            message: `Bulk enrollment completed: ${results.summary.successful} successful, ${results.summary.errors} errors`,
            severity: results.summary.errors > 0 ? 'warning' : 'success',
          });
          loadCourses(); // Refresh course data
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CourseAllocationDashboard;
