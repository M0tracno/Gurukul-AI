import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  ErrorOutline as ExcusedIcon,
  Event as EventIcon,
  School as CourseIcon,
} from '@mui/icons-material';
import makeStyles from '../../utils/makeStylesCompat';
import { useAuth } from '../../auth/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  formControl: {
    minWidth: 200,
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  tableContainer: {
    marginTop: theme.spacing(3),
  },
  chipPresent: {
    backgroundColor: theme.palette.success.light,
    fontWeight: 'bold',
    color: theme.palette.success.contrastText,
  },
  chipAbsent: {
    backgroundColor: theme.palette.error.light,
    fontWeight: 'bold',
    color: theme.palette.error.contrastText,
  },
  chipExcused: {
    backgroundColor: theme.palette.warning.light,
    fontWeight: 'bold',
    color: theme.palette.warning.contrastText,
  },
  attendanceSummary: {
    marginBottom: theme.spacing(3),
  },
  summaryItem: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  summaryLabel: {
    color: theme.palette.text.secondary,
  },
  courseCard: {
    marginBottom: theme.spacing(2),
    transition: 'transform 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
  },
  selectedCourseCard: {
    borderLeft: `5px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.background.default,
  },
  courseCardContent: {
    display: 'flex',
    alignItems: 'center',
  },
  courseIcon: {
    marginRight: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  courseName: {
    fontWeight: 'bold',
  },
  noData: {
    padding: theme.spacing(4),
    textAlign: 'center',
  },
  attendanceProgress: {
    position: 'relative',
    display: 'inline-flex',
    marginRight: theme.spacing(2),
  },
  circularProgressLabel: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
}));

function StudentAttendance() {
  const classes = useStyles();
  const theme = useTheme();
  const originalTheme = useTheme();
  const { currentUser } = useAuth();
  const { getStudentCourses, getStudentAttendance, loading: dbLoading } = useDatabase();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    absent: 0,
    excused: 0,
    total: 0,
    percentage: 0,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAttendance();
    }
  }, [selectedCourse]);

  // Fetch the courses the student is enrolled in
  const fetchCourses = async () => {
    setLoading(true);
    try {
      // Use the proper method from useDatabase
      const result = await getStudentCourses();
      if (result.success) {
        const coursesData = Array.isArray(result.data) ? result.data : [];
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourse(coursesData[0].id);
        }
      } else {
        console.error('Error fetching courses:', result.error);
        setCourses([]); // Ensure courses is always an array
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]); // Ensure courses is always an array
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for the selected course
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Use the proper method from useDatabase
      const result = await getStudentAttendance();
      if (result.success) {
        // Filter by selected course if needed
        const filteredData = result.data
          ? result.data.filter(record => record.courseId === selectedCourse)
          : [];
        setAttendance(filteredData);
        calculateAttendanceSummary(filteredData);
      } else {
        console.error('Error fetching attendance:', result.error);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance summary statistics
  const calculateAttendanceSummary = attendanceData => {
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
      percentage,
    });
  };

  // Handle course selection change
  const handleCourseChange = courseId => {
    setSelectedCourse(courseId);
  };

  // Render attendance status chip
  const renderStatusChip = status => {
    if (status === 'present') {
      return (
        <Chip icon={<PresentIcon />} label="Present" className={classes.chipPresent} size="small" />
      );
    } else if (status === 'absent') {
      return (
        <Chip icon={<AbsentIcon />} label="Absent" className={classes.chipAbsent} size="small" />
      );
    } else {
      return (
        <Chip icon={<ExcusedIcon />} label="Excused" className={classes.chipExcused} size="small" />
      );
    }
  };

  // Format date string
  const formatDate = dateString => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Mock data generators
  const getMockCourses = () => {
    return [
      {
        id: 'course1',
        name: 'Introduction to Computer Science',
        code: 'CS101',
        semester: 'Fall',
        academicYear: '2023-2024',
      },
      {
        id: 'course2',
        name: 'Mathematics',
        code: 'MATH101',
        semester: 'Fall',
        academicYear: '2023-2024',
      },
      {
        id: 'course3',
        name: 'English Literature',
        code: 'ENG101',
        semester: 'Fall',
        academicYear: '2023-2024',
      },
    ];
  };

  const getMockAttendance = (studentId, courseId) => {
    // Generate 20 days of mock attendance
    const mockData = [];
    const statusOptions = [
      'present',
      'present',
      'present',
      'present',
      'present',
      'absent',
      'excused',
    ];

    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      mockData.push({
        id: `attendance_${i}`,
        studentId: studentId,
        courseId: courseId,
        date: date.toISOString().split('T')[0],
        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
        timestamp: date.toISOString(),
      });
    }

    return mockData;
  };

  if (loading && courses.length === 0) {
    return <Typography>Loading attendance data...</Typography>;
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        My Attendance
      </Typography>

      {courses.length === 0 ? (
        <Paper className={classes.paper}>
          <Typography variant="h6" align="center">
            You are not enrolled in any courses.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Course selection sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper className={classes.paper}>
              <Typography variant="h6" gutterBottom>
                My Courses{' '}
              </Typography>
              <Divider style={{ marginBottom: theme.spacing(2) }} />

              {Array.isArray(courses) &&
                courses.map(course => (
                  <Card
                    key={course.id}
                    className={`${classes.courseCard} ${selectedCourse === course.id ? classes.selectedCourseCard : ''}`}
                    onClick={() => handleCourseChange(course.id)}
                  >
                    <CardContent className={classes.courseCardContent}>
                      <CourseIcon className={classes.courseIcon} />
                      <div>
                        <Typography variant="subtitle1" className={classes.courseName}>
                          {course.code}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {course.semester} {course.academicYear}
                        </Typography>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </Paper>
          </Grid>

          {/* Attendance details */}
          <Grid size={{ xs: 12, md: 8 }}>
            {selectedCourse ? (
              <Paper className={classes.paper}>
                <Box display="flex" alignItems="center" marginBottom={2}>
                  {' '}
                  <Typography variant="h6">
                    Attendance for{' '}
                    {Array.isArray(courses)
                      ? courses.find(c => c.id === selectedCourse)?.name
                      : 'Unknown Course'}
                  </Typography>
                </Box>

                <Grid container className={classes.attendanceSummary}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper className={classes.summaryItem} elevation={1}>
                      <div className={classes.attendanceProgress}>
                        <CircularProgress
                          variant="determinate"
                          value={attendanceSummary.percentage}
                          size={60}
                          thickness={5}
                          color="primary"
                        />
                        <div className={classes.circularProgressLabel}>
                          {attendanceSummary.percentage}%
                        </div>
                      </div>
                      <Typography variant="body2" className={classes.summaryLabel}>
                        Attendance Rate
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper className={classes.summaryItem} elevation={1}>
                      <Typography
                        variant="h5"
                        className={classes.summaryValue}
                        style={{ color: '#4caf50' }}
                      >
                        {attendanceSummary.present}
                      </Typography>
                      <Typography variant="body2" className={classes.summaryLabel}>
                        Days Present
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper className={classes.summaryItem} elevation={1}>
                      <Typography
                        variant="h5"
                        className={classes.summaryValue}
                        style={{ color: '#f44336' }}
                      >
                        {attendanceSummary.absent}
                      </Typography>
                      <Typography variant="body2" className={classes.summaryLabel}>
                        Days Absent
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper className={classes.summaryItem} elevation={1}>
                      <Typography
                        variant="h5"
                        className={classes.summaryValue}
                        style={{ color: '#ff9800' }}
                      >
                        {attendanceSummary.excused}
                      </Typography>
                      <Typography variant="body2" className={classes.summaryLabel}>
                        Days Excused
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {attendance.length > 0 ? (
                  <TableContainer className={classes.tableContainer}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width="40%">Date</TableCell>
                          <TableCell width="30%">Day</TableCell>
                          <TableCell width="30%">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {' '}
                        {Array.isArray(attendance) &&
                          attendance.map(record => (
                            <TableRow key={record.id}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>
                                {new Date(record.date).toLocaleDateString(undefined, {
                                  weekday: 'long',
                                })}
                              </TableCell>
                              <TableCell>{renderStatusChip(record.status)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" align="center">
                    No attendance records found for this course.
                  </Typography>
                )}
              </Paper>
            ) : (
              <Paper className={classes.noData}>
                <Typography variant="h6" color="textSecondary">
                  Please select a course to view attendance records.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </div>
  );
}

export default StudentAttendance;
