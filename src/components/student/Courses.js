import React, { useState } from 'react';
import {
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  MenuBook as MenuBookIcon,
  Person as InstructorIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';

import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(3),
    borderRadius: 10,
    marginBottom: theme.spacing(3),
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  tabsContainer: {
    marginBottom: theme.spacing(3),
  },
  searchField: {
    marginBottom: theme.spacing(3),
  },
  courseCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    },
  },
  courseHeader: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
  },
  courseContent: {
    flexGrow: 1,
  },
  courseDetails: {
    marginTop: theme.spacing(1),
  },
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  infoIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  infoText: {
    color: theme.palette.text.secondary,
  },
  chipContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    '& > *': {
      margin: theme.spacing(0.5),
    },
    marginBottom: theme.spacing(2),
  },
  courseList: {
    width: '100%',
  },
  courseListItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  courseAvatar: {
    backgroundColor: theme.palette.primary.main,
  },
  courseListContent: {
    paddingRight: theme.spacing(2),
  },
  courseMeta: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    '& > *': {
      marginRight: theme.spacing(2),
      display: 'flex',
      alignItems: 'center',
    },
    '& svg': {
      marginRight: theme.spacing(0.5),
      fontSize: '0.9rem',
    },
  },
  courseGrade: {
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
}));

const StudentCourses = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for courses
  const allCourses = [
    {
      id: 1,
      code: 'CS101',
      name: 'Introduction to Computer Science',
      instructor: 'Dr. Smith',
      schedule: 'Mon, Wed 10:00-11:30 AM',
      credits: 3,
      description:
        'This course provides an introduction to computer science and programming. Topics include algorithm development, data types, control structures, functions, arrays, and basic problem-solving techniques.',
      grade: 'A',
      materials: 7,
      assignments: 5,
      tags: ['Programming', 'Computer Science', 'Beginner'],
      progress: 65,
    },
    {
      id: 2,
      code: 'MATH201',
      name: 'Calculus I',
      instructor: 'Dr. Williams',
      schedule: 'Tue, Thu 1:00-2:30 PM',
      credits: 4,
      description:
        'Introduction to differential and integral calculus of functions of one variable. Topics include limits, derivatives, applications of differentiation, and integration.',
      grade: 'B+',
      materials: 12,
      assignments: 8,
      tags: ['Mathematics', 'Calculus', 'Required'],
      progress: 78,
    },
    {
      id: 3,
      code: 'HIST101',
      name: 'World History',
      instructor: 'Prof. Johnson',
      schedule: 'Mon, Wed, Fri 2:00-3:00 PM',
      credits: 3,
      description:
        'Survey of world history from ancient civilizations to the modern era. Examines major developments, events, and interactions among cultures around the world.',
      grade: 'A-',
      materials: 9,
      assignments: 4,
      tags: ['History', 'Humanities', 'General Education'],
      progress: 90,
    },
    {
      id: 4,
      code: 'PHYS101',
      name: 'Introduction to Physics',
      instructor: 'Dr. Chen',
      schedule: 'Tue, Thu 9:00-10:30 AM',
      credits: 4,
      description:
        "Introduction to classical mechanics, including kinematics, Newton's laws, energy, momentum, and rotation. Includes laboratory component with hands-on experiments.",
      grade: 'B',
      materials: 11,
      assignments: 6,
      tags: ['Physics', 'Science', 'Lab'],
      progress: 72,
    },
    {
      id: 5,
      code: 'ENG105',
      name: 'Academic Writing',
      instructor: 'Prof. Martinez',
      schedule: 'Mon, Wed 3:30-5:00 PM',
      credits: 3,
      description:
        'Develops skills in critical reading, analytical thinking, and clear, effective writing. Emphasis on composing academic essays with proper documentation and research methods.',
      grade: 'A',
      materials: 5,
      assignments: 7,
      tags: ['Writing', 'English', 'Communication'],
      progress: 85,
    },
  ];

  // Filter courses based on search query
  const filteredCourses = allCourses.filter(course => {
    if (searchQuery === '') return true;
    return (
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Get active courses based on current tab
  const currentCourses = tabValue === 0 ? filteredCourses : [];
  const archivedCourses = tabValue === 1 ? filteredCourses : [];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  };

  return (
    <Container className={classes.root}>
      <Paper className={classes.paper}>
        <Typography variant="h5" className={classes.header}>
          My Courses
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
            <Tab label="Active Courses" />
            <Tab label="Archived Courses" />
          </Tabs>
        </Box>

        <TextField
          className={classes.searchField}
          fullWidth
          variant="outlined"
          placeholder="Search courses by name, code, or instructor..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          onChange={handleSearchChange}
          value={searchQuery}
        />

        {tabValue === 0 && (
          <>
            <List className={classes.courseList}>
              {currentCourses.map(course => (
                <ListItem key={course.id} className={classes.courseListItem} component="button">
                  <ListItemAvatar>
                    <Avatar className={classes.courseAvatar}>{course.code.substring(0, 2)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    className={classes.courseListContent}
                    primary={
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="h6">{course.name}</Typography>
                        <Typography className={classes.courseGrade} color="primary">
                          {course.grade}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="subtitle2" color="textSecondary">
                          {course.code}
                        </Typography>
                        <Box className={classes.courseMeta}>
                          <span>
                            <InstructorIcon /> {course.instructor}
                          </span>
                          <span>
                            <ScheduleIcon /> {course.schedule}
                          </span>
                          <span>
                            <AssignmentIcon /> {course.assignments} assignments
                          </span>
                        </Box>
                      </>
                    }
                  />
                  <Button color="primary" variant="contained">
                    View
                  </Button>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {tabValue === 1 && (
          <List className={classes.courseList}>
            {archivedCourses.map(course => (
              <ListItem key={course.id} className={classes.courseListItem} component="button">
                <ListItemAvatar>
                  <Avatar className={classes.courseAvatar}>{course.code.substring(0, 2)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  primary={course.name}
                  secondary={`${course.code} | ${course.instructor} | Final Grade: ${course.grade}`}
                />
                <Button color="primary">View</Button>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default StudentCourses;
