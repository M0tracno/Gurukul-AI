import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useDatabase } from '../../hooks/useDatabase';

import { Box, Chip, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Table,
  TableBody,
  TableCell,
  TableContainer, TableHead, TableRow, Typography } from '@mui/material';
  Timer as LateIcon

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    padding: theme.spacing(1),
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  courseCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    },
  },
  percentageValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  goodAttendance: {
    color: theme.palette.success.main,
  },
  warningAttendance: {
    color: theme.palette.warning.main,
  },
  poorAttendance: {
    color: theme.palette.error.main,
  },
  courseSelect: {
    minWidth: 200,
    marginBottom: theme.spacing(3),
  },
  tableHeader: {
    backgroundColor: theme.palette.primary.light,
    '& .MuiTableCell-head': {
      color: 'white',
      fontWeight: 'bold',
    },
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  present: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
  },
  absent: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
  },
  late: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark,
  },
  legend: {
    display: 'flex',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  summaryBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(3),
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
}));

const StudentAttendance = () => {
  const theme = useTheme();
  const classes = useStyles();
  const { loading, error, getStudentCourses, getStudentAttendance, getStudentAttendancePercentage } = useDatabase();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);

  // Fetch student's courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const result = await getStudentCourses();
        if (result.success) {
          setCourses(result.data);
          if (result.data.length > 0) {
            setSelectedCourse(result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [getStudentCourses]);

  // Fetch attendance records when course changes
  useEffect(() => {
    if (!selectedCourse) return;

    const fetchAttendance = async () => {
      try {
        // Get attendance records
        const attendanceResult = await getStudentAttendance();
        if (attendanceResult.success) {
          // Filter records for selected course
          const filteredRecords = attendanceResult.data
            .filter(record => record.courseId === selectedCourse)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

          setAttendanceRecords(filteredRecords);
        }

        // Get attendance stats
        const statsResult = await getStudentAttendancePercentage(null, selectedCourse);
        if (statsResult.success) {
          setAttendanceStats(statsResult.data);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendance();
  }, [selectedCourse, getStudentAttendance, getStudentAttendancePercentage]);

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
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

  return (
    <div className={classes.root}>
      <Typography variant="h5" className={classes.title}>
        My Attendance
      </Typography>

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

      {loading ? (
        <Box display="flex" justifyContent="center" padding={4}>
          <CircularProgress />
        </Box>
      ) : error ? (        <Typography style={{ color: '#f44336' }} align="center">
          Error loading attendance data: {error}
        </Typography>
      ) : (        <>
          {selectedCourse && attendanceStats && (
            <Grid container spacing={3}>
              <Grid size={{xs:12}}>
                <Paper className={classes.paper}>
                  <Typography variant="h6" gutterBottom>
                    Attendance Summary
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid size={{xs:12,md:4}}>
                      <Box className={classes.summary}>
                        <Typography variant="subtitle1">
                          Attendance Percentage
                        </Typography>
                        <Typography
                          className={`${classes.statValue} ${getAttendanceColor(attendanceStats.percentage)}`}
                        >
                          {attendanceStats.percentage}%
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{xs:4,md:2}}>
                      <Box className={classes.summary}>
                        <Typography variant="subtitle2">
                          Present
                        </Typography>
                        <Typography className={classes.statValue} style={{ color: '#4caf50' }}>
                          {attendanceStats.present}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{xs:4,md:2}}>
                      <Box className={classes.summary}>
                        <Typography variant="subtitle2">
                          Absent
                        </Typography>
                        <Typography className={classes.statValue} style={{ color: '#f44336' }}>
                          {attendanceStats.absent}
                        </Typography>
                      </Box>                    </Grid>

                    <Grid size={{xs:4,md:2}}>
                      <Box className={classes.summary}>
                        <Typography variant="subtitle2">
                          Late
                        </Typography>
                        <Typography className={classes.statValue} style={{ color: '#ff9800' }}>
                          {attendanceStats.late}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{xs:12,md:2}}>
                      <Box className={classes.summary}>
                        <Typography variant="subtitle2">
                          Total Classes
                        </Typography>
                        <Typography className={classes.statValue}>
                          {attendanceStats.totalClasses}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box className={classes.legend}>
                    <div className={classes.legendItem}>
                      <PresentIcon style={{ color: '#4caf50', marginRight: 4 }} />
                      <span>Present</span>
                    </div>
                    <div className={classes.legendItem}>
                      <AbsentIcon style={{ color: '#f44336', marginRight: 4 }} />
                      <span>Absent</span>
                    </div>
                    <div className={classes.legendItem}>
                      <LateIcon style={{ color: '#ff9800', marginRight: 4 }} />
                      <span>Late</span>
                    </div>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{xs:12}}>
                <Paper className={classes.paper}>
                  <Typography variant="h6" gutterBottom>
                    Attendance Records
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
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </div>
  );
};

export default StudentAttendance;
