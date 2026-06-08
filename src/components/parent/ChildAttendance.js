import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useDatabase } from '../../hooks/useDatabase';
import { useAuth } from '../../auth/AuthContext';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  AccessTime as LateIcon
} from '@mui/icons-material';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    padding: theme.spacing(3)
  },
  title: {
    marginBottom: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3)},
  formControl: {
    marginBottom: theme.spacing(3),
    minWidth: 200},
  childSelect: {
    marginRight: theme.spacing(2),
    minWidth: 200},
  courseSelect: {
    minWidth: 200},
  statsCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2)},
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(1)},
  goodAttendance: {
    color: theme.palette.success.main},
  warningAttendance: {
    color: theme.palette.warning.main},
  poorAttendance: {
    color: theme.palette.error.main},
  tableHeader: {
    backgroundColor: theme.palette.primary.light,
    '& .MuiTableCell-head': {
      color: 'white',
      fontWeight: 'bold'}},
  chip: {
    margin: theme.spacing(0.5)},
  present: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark},
  absent: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark},
  late: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark},
  warningAlert: {
    marginBottom: theme.spacing(3)},
  tabPanel: {
    padding: theme.spacing(2, 0)},
  childSelector: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    alignItems: 'center'
  },
  chipPresent: {
    backgroundColor: theme.palette.success.light,
    fontWeight: 'bold',
    color: theme.palette.success.contrastText},
  chipAbsent: {
    backgroundColor: theme.palette.error.light,
    fontWeight: 'bold',
    color: theme.palette.error.contrastText},
  chipExcused: {
    backgroundColor: theme.palette.warning.light,
    fontWeight: 'bold',
    color: theme.palette.warning.contrastText},
  statusIcon: {
    marginRight: theme.spacing(1)},
  attendanceSummary: {
    marginBottom: theme.spacing(3)
  },
  summaryItem: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main
  },
  summaryLabel: {
    color: theme.palette.text.secondary
  },
  courseName: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1)
  },
  attendanceSubtitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    fontWeight: 'bold'
  },
  noData: {
    padding: theme.spacing(4),
    textAlign: 'center'
  }
}));

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={props.className}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ChildAttendance = () => {
  const theme = useTheme();
  const classes = useStyles();
  const {
    loading, error,
    getAllStudents, getStudentCourses, getStudentAttendance, getStudentAttendancePercentage
  } = useDatabase();
  const { currentUser } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch children (students associated with parent)
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        // In real application, fetch from Firestore
        const data = await getAllStudents();
        setChildren(data);
        if (data.length > 0) {
          setSelectedChild(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      }
    };

    fetchChildren();
  }, [getAllStudents]);

  // Fetch courses when selected child changes
  useEffect(() => {
    if (!selectedChild) return;

    const fetchCourses = async () => {
      try {
        // In real application, fetch from Firestore
        const enrollments = await getStudentCourses(selectedChild);

        const courseIds = enrollments.map(enrollment => enrollment.courseId);
        const coursesData = [];

        for (const courseId of courseIds) {
          const courseData = await getStudentCourses(selectedChild);
          if (courseData.length > 0) {
            coursesData.push(courseData[0]);
          }
        }

        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourse(coursesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [selectedChild, getStudentCourses]);

  // Fetch attendance when course or child changes
  useEffect(() => {
    if (!selectedChild || !selectedCourse) return;

    const fetchAttendance = async () => {
      try {
        // In real application, fetch from Firestore
        const attendanceResult = await getStudentAttendance(selectedChild);
        if (attendanceResult.success) {
          // Filter records for selected course
          const filteredRecords = attendanceResult.data
            .filter(record => record.courseId === selectedCourse)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

          setAttendanceRecords(filteredRecords);
          calculateAttendanceSummary(filteredRecords);
        }

        // Get attendance stats
        const statsResult = await getStudentAttendancePercentage(selectedChild, selectedCourse);
        if (statsResult.success) {
          setAttendanceStats(statsResult.data);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendance();
  }, [selectedChild, selectedCourse, getStudentAttendance, getStudentAttendancePercentage]);

  const handleChildChange = (event) => {
    setSelectedChild(event.target.value);
    setSelectedCourse('');
    setAttendanceRecords([]);
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return classes.goodAttendance;
    if (percentage >= 60) return classes.warningAttendance;
    return classes.poorAttendance;
  };

  const getStatusChipClass = (status) => {
    switch (status) {
      case 'present': return classes.present;
      case 'absent': return classes.absent;
      case 'late': return classes.late;
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <PresentIcon />;
      case 'absent': return <AbsentIcon />;
      case 'late': return <LateIcon />;
      default: return null;
    }
  };

  const selectedChildName = selectedChild
    ? children.find(child => child.id === selectedChild)?.firstName + ' ' +
      children.find(child => child.id === selectedChild)?.lastName
    : '';

  const selectedCourseName = selectedCourse
    ? courses.find(course => course.id === selectedCourse)?.name
    : '';

  // Calculate attendance summary statistics
  const calculateAttendanceSummary = (attendanceData) => {
    const present = attendanceData.filter(record => record.status === 'present').length;
    const absent = attendanceData.filter(record => record.status === 'absent').length;
    const excused = attendanceData.filter(record => record.status === 'excused').length;
    const total = attendanceData.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    setAttendanceSummary({
      present,
      absent,
      excused,
      total,
      percentage
    });
  };

  return (
    <div className={classes.root}>
      <Typography variant="h5" className={classes.title}>
        Child Attendance
      </Typography>

      <Box display="flex" flexWrap="wrap">
        <FormControl className={classes.childSelect}>
          <InputLabel id="child-select-label">Select Child</InputLabel>
          <Select
            labelId="child-select-label"
            id="child-select"
            value={selectedChild}
            onChange={handleChildChange}
            disabled={loading || children.length === 0}
          >
            {children.map(child => (
              <MenuItem key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl className={classes.courseSelect}>
          <InputLabel id="course-select-label">Select Course</InputLabel>
          <Select
            labelId="course-select-label"
            id="course-select"
            value={selectedCourse}
            onChange={handleCourseChange}
            disabled={loading || courses.length === 0}
          >
            {courses.map(course => (
              <MenuItem key={course.id} value={course.id}>
                {course.name} ({course.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" padding={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography sx={{ color: "error.main" }} align="center">
          Error loading attendance data: {error}
        </Typography>
      ) : selectedChild && selectedCourse && attendanceStats ? (
        <>
          {attendanceStats.percentage < 75 && (
            <Alert
              severity={attendanceStats.percentage < 60 ? "error" : "warning"}
              icon={<WarningIcon />}
              className={classes.warningAlert}
            >
              {selectedChildName}'s attendance in {selectedCourseName} is below the recommended level ({attendanceStats.percentage}%).
              {attendanceStats.percentage < 60
                ? " This may affect academic performance and course completion. Please contact the faculty."
                : " Regular attendance is important for academic success."}
            </Alert>
          )}

          <Paper className={classes.paper}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="Summary" />
              <Tab label="Detailed Records" />
            </Tabs>

            <TabPanel value={tabValue} index={0} className={classes.tabPanel}>
              <Typography variant="h6" gutterBottom>
                {selectedChildName}'s Attendance Summary for {selectedCourseName}
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{xs:12,sm:6,md:4}}>
                  <Card className={classes.statsCard}>
                    <Typography variant="subtitle1">Attendance Rate</Typography>
                    <Typography
                      className={`${classes.statValue} ${getAttendanceColor(attendanceStats.percentage)}`}
                    >
                      {attendanceStats.percentage}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {attendanceStats.percentage >= 75
                        ? "Good standing"
                        : attendanceStats.percentage >= 60
                          ? "Needs improvement"
                          : "Critical - action required"}
                    </Typography>
                  </Card>
                </Grid>                <Grid size={{xs:12,sm:6,md:8}}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Class Attendance Breakdown
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid size={{xs:4}}>
                          <Box display="flex" flexDirection="column" alignItems="center">
                            <Typography
                              className={classes.statValue}
                              style={{ color: '#4caf50' }}
                            >
                              {attendanceStats.present}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Present
                            </Typography>
                          </Box>                        </Grid>

                        <Grid size={{xs:4}}>
                          <Box display="flex" flexDirection="column" alignItems="center">
                            <Typography
                              className={classes.statValue}
                              style={{ color: '#f44336' }}
                            >
                              {attendanceStats.absent}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Absent
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid size={{xs:4}}>
                          <Box display="flex" flexDirection="column" alignItems="center">
                            <Typography
                              className={classes.statValue}
                              style={{ color: '#ff9800' }}
                            >
                              {attendanceStats.late}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Late
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box mt={2} display="flex" justifyContent="center">
                        <Typography variant="subtitle2">
                          Total Classes: {attendanceStats.totalClasses}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1} className={classes.tabPanel}>
              <Typography variant="h6" gutterBottom>
                Attendance Records for {selectedCourseName}
              </Typography>

              {attendanceRecords.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead className={classes.tableHeader}>
                      <TableRow><TableCell>Date</TableCell>
                        <TableCell>Status</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(record.status)}
                              label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              className={`${classes.chip} ${getStatusChipClass(record.status)}`}
                            />
                          </TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" align="center" style={{ padding: 16 }}>
                  No attendance records found for this course.
                </Typography>
              )}
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Typography variant="body1" align="center" style={{ padding: 24 }}>
          Please select a child and course to view attendance records.
        </Typography>
      )}
    </div>
  );
};

export default ChildAttendance;
