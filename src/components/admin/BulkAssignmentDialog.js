import React, { useState, useEffect } from 'react';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
const useStyles = makeStyles(theme => ({
  dialogContent: {
    minWidth: 800,
    maxHeight: 600,
  },
  selectionTable: {
    maxHeight: 300,
    overflow: 'auto',
  },
  resultsList: {
    maxHeight: 200,
    overflow: 'auto',
  },
  stepHeader: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
  },
  progressBox: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  statusChip: {
    minWidth: 80,
  },
}));

function BulkAssignmentDialog({
  open,
  onClose,
  courses = [],
  faculty = [],
  onAssign,
  loading = false,
  results = null,
}) {
  const classes = useStyles();
  const [step, setStep] = useState(1); // 1: Selection, 2: Review, 3: Results
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [forceAssign, setForceAssign] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedCourses([]);
      setAssignments({});
      setForceAssign(false);
    }
  }, [open]);

  // Move to results step when results are available
  useEffect(() => {
    if (results && step === 2) {
      setStep(3);
    }
  }, [results, step]);

  const handleCourseSelection = courseId => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleFacultyAssignment = (courseId, facultyId) => {
    setAssignments(prev => ({
      ...prev,
      [courseId]: facultyId,
    }));
  };

  const handleNext = () => {
    const theme = useTheme();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Prepare assignments for API call
      const assignmentData = selectedCourses
        .filter(courseId => assignments[courseId])
        .map(courseId => ({
          courseId,
          facultyId: assignments[courseId],
        }));

      onAssign(assignmentData, forceAssign);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getCourseName = courseId => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.name} (${course.code})` : 'Unknown Course';
  };

  const getFacultyName = facultyId => {
    const facultyMember = faculty.find(f => f.id === facultyId);
    return facultyMember
      ? `${facultyMember.firstName} ${facultyMember.lastName}`
      : 'Unknown Faculty';
  };

  const unassignedCourses = courses.filter(course => !course.facultyId);
  const assignedSelectedCourses = selectedCourses.filter(courseId => assignments[courseId]);

  const canProceed = () => {
    if (step === 1) return selectedCourses.length > 0;
    if (step === 2) return assignedSelectedCourses.length > 0;
    return false;
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Select Courses';
      case 2:
        return 'Assign Faculty';
      case 3:
        return 'Assignment Results';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Bulk Faculty Assignment - {getStepTitle()}</DialogTitle>

      <DialogContent className={classes.dialogContent}>
        {/* Step 1: Course Selection */}
        {step === 1 && (
          <>
            <Box className={classes.stepHeader}>
              <Typography variant="h6">
                Step 1: Select courses that need faculty assignment
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Select from {unassignedCourses.length} unassigned courses
              </Typography>
            </Box>

            <TableContainer component={Paper} className={classes.selectionTable}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedCourses.length > 0 &&
                          selectedCourses.length < unassignedCourses.length
                        }
                        checked={
                          selectedCourses.length === unassignedCourses.length &&
                          unassignedCourses.length > 0
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedCourses(unassignedCourses.map(c => c.id));
                          } else {
                            setSelectedCourses([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Class & Section</TableCell>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Semester</TableCell>
                    <TableCell>Capacity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unassignedCourses.map(course => (
                    <TableRow key={course.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => handleCourseSelection(course.id)}
                        />
                      </TableCell>
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
                      <TableCell>{course.academicYear}</TableCell>
                      <TableCell>{course.semester}</TableCell>
                      <TableCell>{course.maxCapacity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {selectedCourses.length > 0 && (
              <Alert severity="info" style={{ marginTop: 16 }}>
                {selectedCourses.length} course(s) selected for faculty assignment
              </Alert>
            )}
          </>
        )}

        {/* Step 2: Faculty Assignment */}
        {step === 2 && (
          <>
            <Box className={classes.stepHeader}>
              <Typography variant="h6">Step 2: Assign faculty to selected courses</Typography>
              <Typography variant="body2" color="textSecondary">
                Assign faculty to {selectedCourses.length} selected courses
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {selectedCourses.map(courseId => {
                const course = courses.find(c => c.id === courseId);
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={courseId}>
                    <Paper elevation={1} style={{ padding: 16 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {course?.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {course?.code} • {course?.classId}-{course?.section}
                      </Typography>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>Assign Faculty</InputLabel>
                        <Select
                          value={assignments[courseId] || ''}
                          onChange={e => handleFacultyAssignment(courseId, e.target.value)}
                        >
                          {faculty.map(facultyMember => (
                            <MenuItem key={facultyMember.id} value={facultyMember.id}>
                              {facultyMember.firstName} {facultyMember.lastName}
                              <Typography variant="caption" style={{ marginLeft: 8 }}>
                                ({facultyMember.department})
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            {assignedSelectedCourses.length > 0 && (
              <Alert severity="success" style={{ marginTop: 16 }}>
                {assignedSelectedCourses.length} of {selectedCourses.length} courses have faculty
                assigned
              </Alert>
            )}
          </>
        )}

        {/* Step 3: Results */}
        {step === 3 && results && (
          <>
            <Box className={classes.stepHeader}>
              <Typography variant="h6">Assignment Results</Typography>
              <Typography variant="body2" color="textSecondary">
                Bulk assignment operation completed
              </Typography>
            </Box>

            {loading && (
              <Box className={classes.progress}>
                <Typography variant="body2" gutterBottom>
                  Processing assignments...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            <Grid container spacing={3}>
              {' '}
              {/* Successful Assignments */}
              {results.successful && results.successful.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    <SuccessIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Successful ({results.successful.length})
                  </Typography>
                  <Paper className={classes.resultsList}>
                    <List>
                      {results.successful.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <SuccessIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            primary={getCourseName(item.courseId)}
                            secondary={`Assigned to: ${item.facultyName}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}{' '}
              {/* Failed Assignments */}
              {results.failed && results.failed.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="h6" sx={{ color: 'error.main' }} gutterBottom>
                    <ErrorIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Failed ({results.failed.length})
                  </Typography>
                  <Paper className={classes.resultsList}>
                    <List>
                      {results.failed.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            primary={getCourseName(item.courseId)}
                            secondary={item.reason}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}{' '}
              {/* Conflicts */}
              {results.conflicts && results.conflicts.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="h6" style={{ color: '#ff9800' }} gutterBottom>
                    <WarningIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Conflicts ({results.conflicts.length})
                  </Typography>
                  <Paper className={classes.resultsList}>
                    <List>
                      {results.conflicts.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <WarningIcon style={{ color: '#ff9800' }} />
                          </ListItemIcon>
                          <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            primary={getCourseName(item.courseId)}
                            secondary="Schedule conflict detected"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions>
        {step > 1 && step < 3 && <Button onClick={handleBack}>Back</Button>}

        <Button onClick={handleClose}>{step === 3 ? 'Close' : 'Cancel'}</Button>

        {step < 3 && (
          <Button
            onClick={handleNext}
            color="primary"
            variant="contained"
            disabled={!canProceed() || loading}
          >
            {step === 1 ? 'Next' : loading ? 'Assigning...' : 'Assign Faculty'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default BulkAssignmentDialog;
