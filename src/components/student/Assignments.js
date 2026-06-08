import React, { useState } from 'react';
import { AssignmentIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
import makeStyles from '../../utils/makeStylesCompat';

import { Box, Button, Card, CardContent, Chip, Container, Divider, FormControl, Grid, InputAdornment, InputLabel, LinearProgressItem, Paper, Select, Tab, Tabs, TextField, Typography } from '@mui/material';
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  LibraryBooks as CourseIcon,
  AccessTime as TimeIcon,
  CheckCircle as CompleteIcon,
  Warning as PendingIcon,  Info as InfoIcon

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)},
  paper: {
    padding: theme.spacing(3),
    borderRadius: 10,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)'},
  header: {
    marginBottom: theme.spacing(3)},
  tabsContainer: {
    marginBottom: theme.spacing(3)},
  filterContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3)},
  formControl: {
    minWidth: 200},
  assignmentCard: {
    marginBottom: theme.spacing(2),
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)'}},
  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1)},
  chipContainer: {
    display: 'flex',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)},
  pendingChip: {
    backgroundColor: theme.palette.warning.light},
  completedChip: {
    backgroundColor: theme.palette.success.light},
  upcomingChip: {
    backgroundColor: theme.palette.info.light},
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    '& svg': {
      marginRight: theme.spacing(1),
      color: theme.palette.primary.main}},
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    '& svg': {
      marginRight: theme.spacing(1),
      color: theme.palette.text.secondary}},
  progressContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1)},
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5)},
  actionsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)},
  noAssignments: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary}}));

const StudentAssignments = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // Mock data for assignments
  const allAssignments = [
    {
      id: 1,
      title: 'Programming Assignment: Data Structures',
      course: 'CS101',
      courseName: 'Introduction to Computer Science',
      dueDate: '2023-06-25',
      assignedDate: '2023-06-10',
      status: 'in-progress',
      description: 'Implement a binary search tree with insertion, deletion, and traversal methods. Write a report explaining your implementation and its time complexity.',
      progress: 60,
      points: 100,
      attachments: 2},
    {
      id: 2,
      title: 'Calculus Homework: Integration',
      course: 'MATH201',
      courseName: 'Calculus I',
      dueDate: '2023-06-22',
      assignedDate: '2023-06-12',
      status: 'pending',
      description: 'Complete problems 1-10 on page 245 of the textbook on integration techniques.',
      progress: 20,
      points: 50,
      attachments: 1},
    {
      id: 3,
      title: 'World War II Essay',
      course: 'HIST101',
      courseName: 'World History',
      dueDate: '2023-06-28',
      assignedDate: '2023-06-05',
      status: 'pending',
      description: 'Write a 1000-word essay on the major causes and global impact of World War II.',
      progress: 0,
      points: 75,
      attachments: 3},
    {
      id: 4,
      title: 'Physics Lab Report: Motion',
      course: 'PHYS101',
      courseName: 'Introduction to Physics',
      dueDate: '2023-06-15',
      assignedDate: '2023-06-08',
      status: 'completed',
      description: 'Submit a lab report on the experiment conducted about projectile motion, including all measurements, calculations, and error analysis.',
      progress: 100,
      points: 80,
      score: 72,
      attachments: 4},
    {
      id: 5,
      title: 'Research Paper Outline',
      course: 'ENG105',
      courseName: 'Academic Writing',
      dueDate: '2023-06-18',
      assignedDate: '2023-06-07',
      status: 'completed',
      description: 'Create a detailed outline for your research paper, including thesis statement, main arguments, and preliminary sources.',
      progress: 100,
      points: 30,
      score: 28,
      attachments: 1},
  ];

  // Filter assignments
  const filteredAssignments = allAssignments.filter((assignment) => {
    // Filter by search query
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by course
    const matchesCourse = courseFilter === 'all' || assignment.course === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Filter assignments by status based on selected tab
  const pendingAssignments = filteredAssignments.filter(a => a.status === 'pending' || a.status === 'in-progress');
  const completedAssignments = filteredAssignments.filter(a => a.status === 'completed');

  const displayedAssignments = tabValue === 0 ? pendingAssignments : completedAssignments;

  // Get unique courses for filter dropdown
  const courses = [...new Set(allAssignments.map(a => a.course))].map(code => {
    const courseName = allAssignments.find(a => a.course === code)?.courseName;
    return { code, name: courseName };
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleCourseFilterChange = (event) => {
    setCourseFilter(event.target.value);
  };

  // Format date string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <Container className={classes.container}>
      <Paper className={classes.paper}>
        <Typography variant="h5" className={classes.header}>
          My Assignments
        </Typography>
        <Divider />

        <Box className={classes.tabsContainer}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label={`Pending Assignments (${pendingAssignments.length})`} />
            <Tab label={`Completed Assignments (${completedAssignments.length})`} />
          </Tabs>
        </Box>

        <Box className={classes.filterContainer}>
          <TextField
            placeholder="Search assignments..."
            variant="outlined"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )}}
            value={searchQuery}
            onChange={handleSearchChange}
          />

          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel id="course-filter-label">Filter by Course</InputLabel>
            <Select
              labelId="course-filter-label"
              id="course-filter"
              value={courseFilter}
              onChange={handleCourseFilterChange}
              label="Filter by Course"
            >
              <MenuItem value="all">All Courses</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.code} value={course.code}>
                  {course.code} - {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {displayedAssignments.length === 0 ? (
          <Paper className={classes.noAssignments}>
            <Typography variant="body1">
              No assignments found matching your filters.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {displayedAssignments.map((assignment) => (
              <Grid size={{xs:12}} key={assignment.id}>
                <Card className={classes.assignmentCard}>
                  <CardContent>
                    <Box className={classes.assignmentHeader}>
                      <Typography variant="h6">{assignment.title}</Typography>
                      <Box className={classes.chipContainer}>
                        {assignment.status === 'pending' && (
                          <Chip
                            icon={<PendingIcon />}
                            label="Not Started"
                            className={classes.pendingChip}
                            size="small"
                          />
                        )}
                        {assignment.status === 'in-progress' && (
                          <Chip
                            icon={<InfoIcon />}
                            label="In Progress"
                            className={classes.upcomingChip}
                            size="small"
                          />
                        )}
                        {assignment.status === 'completed' && (
                          <Chip
                            icon={<CompleteIcon />}
                            label="Completed"
                            className={classes.completedChip}
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box className={classes.courseInfo}>
                      <CourseIcon />
                      <Typography variant="body2">
                        {assignment.course} - {assignment.courseName}
                      </Typography>
                    </Box>

                    <Box className={classes.timeInfo}>
                      <TimeIcon />
                      <Typography variant="body2">
                        Due: {formatDate(assignment.dueDate)} | Assigned: {formatDate(assignment.assignedDate)}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      {assignment.description}
                    </Typography>

                    {assignment.status !== 'completed' && (
                      <Box className={classes.progressContainer}>
                        <Box className={classes.progressLabel}>
                          <Typography variant="body2">Progress</Typography>
                          <Typography variant="body2">{assignment.progress}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={assignment.progress}
                          color="primary"
                        />
                      </Box>
                    )}

                    {assignment.status === 'completed' && (
                      <Box mt={2}>
                        <Typography variant="body2">
                          <strong>Score:</strong> {assignment.score} / {assignment.points} points
                        </Typography>
                      </Box>
                    )}

                    <Box className={classes.actionsContainer}>
                      {assignment.status !== 'completed' && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AssignmentIcon />}
                        >
                          {assignment.progress > 0 ? 'Continue' : 'Start Assignment'}
                        </Button>
                      )}
                      {assignment.status === 'completed' && (
                        <Button
                          variant="outlined"
                          color="primary"
                        >
                          View Feedback
                        </Button>
                      )}
                      <Button variant="outlined">
                        {assignment.attachments} {assignment.attachments === 1 ? 'Attachment' : 'Attachments'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default StudentAssignments;