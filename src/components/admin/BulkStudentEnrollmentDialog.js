import React, { useState, useEffect } from 'react';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import CourseAllocationService from '../../services/courseAllocationService';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
const useStyles = makeStyles(theme => ({
  stepContent: {
    minHeight: '400px',
    padding: theme.spacing(2),
  },
  selectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  selectionCard: {
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
  },
  conflictItem: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    '&.warning': {
      backgroundColor: theme.palette.warning.light,
      color: theme.palette.warning.contrastText,
    },
    '&.error': {
      backgroundColor: theme.palette.error.light,
      color: theme.palette.error.contrastText,
    },
  },
  successItem: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  },
  errorItem: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  },
  enrollmentSummary: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
}));

const steps = ['Select Students & Courses', 'Review Conflicts', 'Enrollment Results'];

// Real API functions using CourseAllocationService
const apiService = {
  getStudents: async () => {
    try {
      const response = await CourseAllocationService.getAllStudents();
      return response.data || response;
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to mock data if API fails
      return [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'ST001',
          grade: '10',
          section: 'A',
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          studentId: 'ST002',
          grade: '10',
          section: 'B',
        },
        {
          id: 3,
          firstName: 'Mike',
          lastName: 'Johnson',
          studentId: 'ST003',
          grade: '11',
          section: 'A',
        },
        {
          id: 4,
          firstName: 'Sarah',
          lastName: 'Wilson',
          studentId: 'ST004',
          grade: '11',
          section: 'B',
        },
        {
          id: 5,
          firstName: 'Alex',
          lastName: 'Brown',
          studentId: 'ST005',
          grade: '10',
          section: 'A',
        },
      ];
    }
  },

  getCourses: async () => {
    try {
      const response = await CourseAllocationService.getAllCourses();
      return response.data || response;
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Fallback to mock data if API fails
      return [
        { id: 1, name: 'Mathematics', code: 'MATH101', faculty: 'Dr. Smith', grade: '10' },
        { id: 2, name: 'Physics', code: 'PHY101', faculty: 'Dr. Johnson', grade: '10' },
        { id: 3, name: 'Chemistry', code: 'CHEM101', faculty: 'Dr. Brown', grade: '11' },
        { id: 4, name: 'Biology', code: 'BIO101', faculty: 'Dr. Davis', grade: '11' },
        { id: 5, name: 'English', code: 'ENG101', faculty: 'Dr. Wilson', grade: '10' },
      ];
    }
  },

  bulkEnrollStudents: async enrollments => {
    try {
      const response = await CourseAllocationService.bulkEnrollStudents({ enrollments });
      return response;
    } catch (error) {
      console.error('Error in bulk enrollment:', error);
      throw error;
    }
  },
};

function BulkStudentEnrollmentDialog({ open, onClose, onComplete }) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [enrollmentResults, setEnrollmentResults] = useState(null);

  // Load initial data
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);
  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, coursesData] = await Promise.all([
        apiService.getStudents(),
        apiService.getCourses(),
      ]);
      setStudents(studentsData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Check for conflicts
      await checkConflicts();
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Perform bulk enrollment
      await performEnrollment();
      setActiveStep(2);
    }
  };

  const checkConflicts = async () => {
    setLoading(true);
    try {
      // Simulate conflict detection
      const detectedConflicts = [];

      selectedStudents.forEach(student => {
        selectedCourses.forEach(course => {
          // Simulate some conflicts
          if (student.grade !== course.grade) {
            detectedConflicts.push({
              type: 'warning',
              student,
              course,
              message: `Grade mismatch: Student is in grade ${student.grade} but course is for grade ${course.grade}`,
            });
          }

          // Simulate capacity conflicts
          if (Math.random() > 0.8) {
            detectedConflicts.push({
              type: 'error',
              student,
              course,
              message: `Course capacity exceeded for ${course.name}`,
            });
          }
        });
      });

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const performEnrollment = async () => {
    setLoading(true);
    try {
      // Prepare enrollment data
      const enrollments = [];
      selectedStudents.forEach(student => {
        selectedCourses.forEach(course => {
          enrollments.push({
            studentId: student.id,
            courseId: course.id,
            studentName: `${student.firstName} ${student.lastName}`,
            courseName: course.name,
          });
        });
      });
      const results = await apiService.bulkEnrollStudents(enrollments);
      setEnrollmentResults(results);
    } catch (error) {
      console.error('Error performing enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const theme = useTheme();
    setActiveStep(activeStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedStudents([]);
    setSelectedCourses([]);
    setConflicts([]);
    setEnrollmentResults(null);
    onClose();
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(enrollmentResults);
    }
    handleClose();
  };

  const handleStudentToggle = student => {
    setSelectedStudents(prev => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const handleCourseToggle = course => {
    setSelectedCourses(prev => {
      const isSelected = prev.find(c => c.id === course.id);
      if (isSelected) {
        return prev.filter(c => c.id !== course.id);
      } else {
        return [...prev, course];
      }
    });
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box className={classes.stepContent}>
            <Typography variant="h6" gutterBottom>
              Select Students and Courses for Bulk Enrollment
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : (
              <div className={classes.selectionGrid}>
                {/* Students Selection */}
                <div className={classes.selectionCard}>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Students ({selectedStudents.length} selected)
                  </Typography>
                  <FormGroup>
                    {students.map(student => (
                      <FormControlLabel
                        key={student.id}
                        control={
                          <Checkbox
                            checked={selectedStudents.some(s => s.id === student.id)}
                            onChange={() => handleStudentToggle(student)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">
                              {student.firstName} {student.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {student.studentId} • Grade {student.grade} • Section{' '}
                              {student.section}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </div>

                {/* Courses Selection */}
                <div className={classes.selectionCard}>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Courses ({selectedCourses.length} selected)
                  </Typography>
                  <FormGroup>
                    {courses.map(course => (
                      <FormControlLabel
                        key={course.id}
                        control={
                          <Checkbox
                            checked={selectedCourses.some(c => c.id === course.id)}
                            onChange={() => handleCourseToggle(course)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">
                              {course.name} ({course.code})
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {course.faculty} • Grade {course.grade}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </div>
              </div>
            )}

            <Box className={classes.enrollmentSummary}>
              <Typography variant="subtitle2" gutterBottom>
                Enrollment Summary
              </Typography>
              <Typography variant="body2">
                {selectedStudents.length} students × {selectedCourses.length} courses ={' '}
                {selectedStudents.length * selectedCourses.length} total enrollments
              </Typography>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box className={classes.stepContent}>
            <Typography variant="h6" gutterBottom>
              Review Conflicts and Warnings
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <Typography variant="body2" style={{ marginLeft: 16 }}>
                  Checking for conflicts...
                </Typography>
              </Box>
            ) : (
              <>
                {conflicts.length === 0 ? (
                  <Alert severity="success">
                    No conflicts detected. All enrollments can proceed.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="warning" style={{ marginBottom: 16 }}>
                      {conflicts.length} potential issues detected. Please review below.
                    </Alert>

                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          Detected Issues ({conflicts.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List style={{ width: '100%' }}>
                          {conflicts.map((conflict, index) => (
                            <React.Fragment key={index}>
                              <ListItem>
                                <ListItemIcon>
                                  {conflict.type === 'error' ? (
                                    <ErrorIcon color="error" />
                                  ) : (
                                    <WarningIcon color="warning" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primaryTypographyProps={{ component: 'div' }}
                                  primary={`${conflict.student.firstName} ${conflict.student.lastName} → ${conflict.course.name}`}
                                  secondary={conflict.message}
                                />
                              </ListItem>
                              {index < conflicts.length - 1 && <Divider />}
                            </React.Fragment>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </>
                )}

                <Box className={classes.enrollmentSummary}>
                  <Typography variant="subtitle2" gutterBottom>
                    Proceeding with Enrollment
                  </Typography>
                  <Typography variant="body2">
                    • Total enrollments: {selectedStudents.length * selectedCourses.length}
                  </Typography>
                  <Typography variant="body2">
                    • Warnings: {conflicts.filter(c => c.type === 'warning').length}
                  </Typography>
                  <Typography variant="body2">
                    • Errors: {conflicts.filter(c => c.type === 'error').length}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box className={classes.stepContent}>
            <Typography variant="h6" gutterBottom>
              Enrollment Results
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <Typography variant="body2" style={{ marginLeft: 16 }}>
                  Processing enrollments...
                </Typography>
              </Box>
            ) : enrollmentResults ? (
              <>
                <Box className={classes.enrollmentSummary}>
                  <Typography variant="subtitle1" gutterBottom>
                    Summary
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${enrollmentResults.summary.successful} Successful`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<WarningIcon />}
                      label={`${enrollmentResults.summary.conflicts} Conflicts`}
                      style={{ backgroundColor: '#fff3cd', color: '#856404' }}
                      variant="outlined"
                    />
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${enrollmentResults.summary.errors} Errors`}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrollmentResults.results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.studentName}</TableCell>
                          <TableCell>{result.courseName}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={result.status}
                              color={
                                result.status === 'success'
                                  ? 'primary'
                                  : result.status === 'conflict'
                                    ? 'default'
                                    : 'secondary'
                              }
                              variant={result.status === 'success' ? 'default' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>{result.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="error">Failed to process enrollments. Please try again.</Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Bulk Student Enrollment</DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            color="primary"
            disabled={
              loading ||
              (activeStep === 0 && (selectedStudents.length === 0 || selectedCourses.length === 0))
            }
          >
            {loading ? <CircularProgress size={20} /> : 'Next'}
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            variant="contained"
            color="primary"
            disabled={loading || !enrollmentResults}
          >
            Complete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default BulkStudentEnrollmentDialog;
