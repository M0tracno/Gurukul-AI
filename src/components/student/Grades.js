import React, { useState } from 'react';
import { School as SchoolIcon, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';

import { Box, Button, Card, CardContent, Chip, Container, Divider, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Tab, Table,
  TableBody,
  TableCell,
  TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
  Assessment as AssessmentIcon

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4)},
  paper: {
    padding: theme.spacing(3),
    borderRadius: 10,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)'},
  header: {
    marginBottom: theme.spacing(3)},
  sectionTitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2)},
  statsCard: {
    height: '100%',
    padding: theme.spacing(3)},
  statValue: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    textAlign: 'center',
    marginBottom: theme.spacing(1)},
  statLabel: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    fontSize: '0.9rem'},
  gradeChip: {
    fontWeight: 'bold',
    marginLeft: theme.spacing(2)},
  aGrade: {
    backgroundColor: '#4caf50',
    color: 'white'},
  bGrade: {
    backgroundColor: '#8bc34a',
    color: 'white'},
  cGrade: {
    backgroundColor: '#ffc107',
    color: 'black'},
  dGrade: {
    backgroundColor: '#ff9800',
    color: 'white'},
  fGrade: {
    backgroundColor: '#f44336',
    color: 'white'},
  courseProgress: {
    height: 8,
    borderRadius: 4},
  tableContainer: {
    marginTop: theme.spacing(2)},
  tableHeadCell: {
    fontWeight: 'bold',
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText},
  gradeCell: {
    fontWeight: 'bold'},
  filterContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3)},
  formControl: {
    minWidth: 200,
    marginRight: theme.spacing(2)},
  courseHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2)},
  courseIcon: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    padding: theme.spacing(1),
    borderRadius: '50%',
    marginRight: theme.spacing(2)},
  scoreValuePositive: {
    color: theme.palette.success.main,
    display: 'flex',
    alignItems: 'center'},
  scoreValueNegative: {
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center'},
  tabsContainer: {
    marginBottom: theme.spacing(3)}}));

const StudentGrades = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [selectedTerm, setSelectedTerm] = useState('Spring 2023');
  const [tabValue, setTabValue] = useState(0);

  // Mock data for grades
  const terms = ['Fall 2022', 'Spring 2023'];

  const courses = [
    {
      id: 1,
      code: 'CS101',
      name: 'Introduction to Computer Science',
      instructor: 'Dr. Smith',
      credits: 3,
      grade: 'A',
      percentage: 92,
      term: 'Spring 2023',
      assignments: [
        { id: 1, name: 'Programming Assignment 1', score: 95, outOf: 100, weight: 10, submitted: true },
        { id: 2, name: 'Quiz 1', score: 88, outOf: 100, weight: 5, submitted: true },
        { id: 3, name: 'Midterm Exam', score: 92, outOf: 100, weight: 25, submitted: true },
        { id: 4, name: 'Programming Project', score: 94, outOf: 100, weight: 20, submitted: true },
        { id: 5, name: 'Final Exam', score: 90, outOf: 100, weight: 40, submitted: true },
      ]},
    {
      id: 2,
      code: 'MATH201',
      name: 'Calculus I',
      instructor: 'Dr. Williams',
      credits: 4,
      grade: 'B+',
      percentage: 87,
      term: 'Spring 2023',
      assignments: [
        { id: 1, name: 'Homework 1', score: 92, outOf: 100, weight: 5, submitted: true },
        { id: 2, name: 'Homework 2', score: 85, outOf: 100, weight: 5, submitted: true },
        { id: 3, name: 'Quiz 1', score: 78, outOf: 100, weight: 10, submitted: true },
        { id: 4, name: 'Midterm Exam', score: 88, outOf: 100, weight: 30, submitted: true },
        { id: 5, name: 'Homework 3', score: 95, outOf: 100, weight: 5, submitted: true },
        { id: 6, name: 'Final Exam', score: 86, outOf: 100, weight: 45, submitted: true },
      ]},
    {
      id: 3,
      code: 'HIST101',
      name: 'World History',
      instructor: 'Prof. Johnson',
      credits: 3,
      grade: 'A-',
      percentage: 91,
      term: 'Spring 2023',
      assignments: [
        { id: 1, name: 'Research Paper', score: 94, outOf: 100, weight: 25, submitted: true },
        { id: 2, name: 'Quiz 1', score: 85, outOf: 100, weight: 5, submitted: true },
        { id: 3, name: 'Midterm Exam', score: 92, outOf: 100, weight: 30, submitted: true },
        { id: 4, name: 'Quiz 2', score: 88, outOf: 100, weight: 5, submitted: true },
        { id: 5, name: 'Final Exam', score: 91, outOf: 100, weight: 35, submitted: true },
      ]},
    {
      id: 4,
      code: 'ENG105',
      name: 'Academic Writing',
      instructor: 'Prof. Martinez',
      credits: 3,
      grade: 'A',
      percentage: 95,
      term: 'Fall 2022',
      assignments: [
        { id: 1, name: 'Essay 1', score: 92, outOf: 100, weight: 15, submitted: true },
        { id: 2, name: 'Essay 2', score: 94, outOf: 100, weight: 15, submitted: true },
        { id: 3, name: 'Presentation', score: 98, outOf: 100, weight: 20, submitted: true },
        { id: 4, name: 'Research Paper Outline', score: 97, outOf: 100, weight: 10, submitted: true },
        { id: 5, name: 'Final Research Paper', score: 95, outOf: 100, weight: 40, submitted: true },
      ]},
    {
      id: 5,
      code: 'PHYS101',
      name: 'Introduction to Physics',
      instructor: 'Dr. Chen',
      credits: 4,
      grade: 'B',
      percentage: 83,
      term: 'Fall 2022',
      assignments: [
        { id: 1, name: 'Lab Report 1', score: 88, outOf: 100, weight: 10, submitted: true },
        { id: 2, name: 'Homework 1', score: 75, outOf: 100, weight: 5, submitted: true },
        { id: 3, name: 'Quiz 1', score: 70, outOf: 100, weight: 5, submitted: true },
        { id: 4, name: 'Midterm Exam', score: 85, outOf: 100, weight: 30, submitted: true },
        { id: 5, name: 'Lab Report 2', score: 92, outOf: 100, weight: 10, submitted: true },
        { id: 6, name: 'Final Exam', score: 84, outOf: 100, weight: 40, submitted: true },
      ]},
  ];

  const handleTermChange = (event) => {
    setSelectedTerm(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  // Filter courses by selected term with array safety
  const filteredCourses = Array.isArray(courses) ? courses.filter((course) => course.term === selectedTerm) : [];

  // Calculate GPA for the selected term
  const calculateGPA = (courses) => {
    const gradePoints = {
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.3,
      'B': 3.0,
      'B-': 2.7,
      'C+': 2.3,
      'C': 2.0,
      'C-': 1.7,
      'D+': 1.3,
      'D': 1.0,
      'F': 0.0};

    if (courses.length === 0) return 0;

    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach((course) => {
      const points = gradePoints[course.grade] * course.credits;
      totalPoints += points;
      totalCredits += course.credits;
    });

    return (totalPoints / totalCredits).toFixed(2);
  };

  // Get grade chip class based on grade
  const getGradeChipClass = (grade) => {
    if (grade.startsWith('A')) return classes.aGrade;
    if (grade.startsWith('B')) return classes.bGrade;
    if (grade.startsWith('C')) return classes.cGrade;
    if (grade.startsWith('D')) return classes.dGrade;
    return classes.fGrade;
  };

  // Calculate average score for a course
  const calculateAverageScore = (assignments) => {
    if (assignments.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    assignments.forEach((assignment) => {
      if (assignment.submitted) {
        const weightedScore = (assignment.score / assignment.outOf) * assignment.weight;
        totalWeightedScore += weightedScore;
        totalWeight += assignment.weight;
      }
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  };

  return (
    <Container className={classes.container}>
      <Paper className={classes.paper}>
        <Typography variant="h5" className={classes.header}>
          My Grades
        </Typography>
        <Divider />

        <Box className={classes.filterContainer}>
          <FormControl variant="outlined" className={classes.formControl}>
            <InputLabel id="term-select-label">Academic Term</InputLabel>
            <Select
              labelId="term-select-label"
              id="term-select"
              value={selectedTerm}
              onChange={handleTermChange}
              label="Academic Term"
            >
              {terms.map((term) => (
                <MenuItem key={term} value={term}>{term}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssessmentIcon />}
            >
              Generate Report
            </Button>
          </Box>
        </Box>

        {/* Term Stats */}
        <Grid container spacing={3}>
          <Grid size={{xs:12,md:4}}>
            <Card className={classes.statsCard}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <SchoolIcon color="primary" fontSize="large" />
                </Box>
                <Typography className={classes.statValue}>
                  {calculateGPA(filteredCourses)}
                </Typography>
                <Typography className={classes.statLabel}>
                  Term GPA
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <Card className={classes.statsCard}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <TimelineIcon color="primary" fontSize="large" />
                </Box>
                <Typography className={classes.statValue}>
                  {filteredCourses.length}
                </Typography>
                <Typography className={classes.statLabel}>
                  Courses Enrolled
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <Card className={classes.statsCard}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <AssessmentIcon color="primary" fontSize="large" />
                </Box>
                <Typography className={classes.statValue}>
                  {filteredCourses.reduce((total, course) => total + course.credits, 0)}
                </Typography>
                <Typography className={classes.statLabel}>
                  Credit Hours
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box className={classes.tabsContainer} mt={4}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Overview" />
            <Tab label="Detailed Grades" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {filteredCourses.map((course) => (
              <Grid size={{xs:12}} key={course.id}>
                <Card>
                  <CardContent>
                    <Box className={classes.courseHeader}>
                      <Box className={classes.courseIcon}>
                        <SchoolIcon />
                      </Box>
                      <Box>
                        <Typography variant="h6">
                          {course.code}: {course.name}
                          <Chip
                            label={course.grade}
                            className={`${classes.gradeChip} ${getGradeChipClass(course.grade)}`}
                            size="small"
                          />
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.instructor} • {course.credits} Credits
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" style={{ minWidth: '60px' }}>
                        {course.percentage}%
                      </Typography>
                      <Box width="100%" mr={1}>
                        <LinearProgress
                          variant="determinate"
                          value={course.percentage}
                          className={classes.courseProgress}
                        />
                      </Box>
                    </Box>

                    <Box display="flex" justifyContent="space-between" mt={2}>
                      <Typography variant="body2" color="textSecondary">
                        {course.assignments.filter(a => a.submitted).length} of {course.assignments.length} assignments completed
                      </Typography>
                      <Button color="primary" size="small">
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Detailed Grades Tab */}
        {tabValue === 1 && filteredCourses.map((course) => (
          <Box key={course.id} mb={4}>
            <Typography variant="h6" className={classes.sectionTitle}>
              {course.code}: {course.name}
              <Chip
                label={course.grade}
                className={`${classes.gradeChip} ${getGradeChipClass(course.grade)}`}
                size="small"
              />
            </Typography>

            <TableContainer component={Paper} className={classes.tableContainer}>
              <Table aria-label={`Grades for ${course.code}`}>
                <TableHead>
                  <TableRow><TableCell className={classes.tableHeadCell}>Assignment</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Score</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Out Of</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Percentage</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Weight</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Weighted Score</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {course.assignments.map((assignment) => {
                    const percentage = ((assignment.score / assignment.outOf) * 100).toFixed(1);
                    const weightedScore = ((assignment.score / assignment.outOf) * assignment.weight).toFixed(1);
                    const averageForAssignment = 85; // Mock value - would be calculated from class average
                    const difference = (percentage - averageForAssignment).toFixed(1);

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell component="th" scope="row">
                          {assignment.name}
                        </TableCell>
                        <TableCell align="right">{assignment.score}</TableCell>
                        <TableCell align="right">{assignment.outOf}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {percentage}%
                            {difference > 0 ? (
                              <Box className={classes.scoreValuePositive} ml={1}>
                                <TrendingUpIcon fontSize="small" />
                                <Typography variant="caption">{difference}%</Typography>
                              </Box>
                            ) : difference < 0 ? (
                              <Box className={classes.scoreValueNegative} ml={1}>
                                <TrendingDownIcon fontSize="small" />
                                <Typography variant="caption">{Math.abs(difference)}%</Typography>
                              </Box>
                            ) : null}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{assignment.weight}%</TableCell>
                        <TableCell align="right" className={classes.gradeCell}>{weightedScore}%</TableCell></TableRow>
                    );
                  })}
                  <TableRow><TableCell colSpan={3} />
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>100%</TableCell>
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>
                      {calculateAverageScore(course.assignments).toFixed(1)}%
                    </TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Paper>
    </Container>
  );
};

export default StudentGrades;
