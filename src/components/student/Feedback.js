import React, { useState } from 'react';
import { Schedule as ScheduleIcon, StarIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
import makeStyles from '../../utils/makeStylesCompat';

import { Avatar, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, InputAdornment, InputLabelItem, Paper, Select, Tab, Tabs, TextField, Typography } from '@mui/material';
  Feedback as FeedbackIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Sort as SortIcon,
  FilterList as FilterListIcon,
  School as CourseIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon} from '@mui/icons-material';

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
  tabsContainer: {
    marginBottom: theme.spacing(3)},
  filterContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      gap: theme.spacing(2)}},
  searchAndFilter: {
    display: 'flex',
    gap: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column'}},
  formControl: {
    minWidth: 200},
  feedbackCard: {
    marginBottom: theme.spacing(3),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)'}},
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2)},
  feedbackInfo: {
    display: 'flex',
    alignItems: 'center'},
  instructorAvatar: {
    backgroundColor: theme.palette.primary.main,
    marginRight: theme.spacing(2)},
  feedbackDate: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
    '& svg': {
      marginRight: theme.spacing(0.5),
      fontSize: '0.9rem'}},
  courseChip: {
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText},
  assignmentChip: {
    backgroundColor: theme.palette.secondary.light,
    color: theme.palette.secondary.contrastText},
  starContainer: {
    display: 'flex',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)},
  star: {
    color: theme.palette.warning.main},
  feedbackActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(2)},
  replyButton: {
    marginLeft: theme.spacing(1)},
  dialogContent: {
    paddingTop: theme.spacing(2)},
  noFeedback: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary},
  highlighted: {
    backgroundColor: theme.palette.primary.light + '30'},
  courseInfoList: {
    marginBottom: theme.spacing(2)},
  listItemRoot: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5)},
  courseListItem: {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.action.hover}},
  courseAvatar: {
    backgroundColor: theme.palette.primary.main},
  courseListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2)}}));

const StudentFeedback = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [openReplyDialog, setOpenReplyDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Mock data for feedback
  const feedbackItems = [
    {
      id: 1,
      course: 'CS101',
      courseName: 'Introduction to Computer Science',
      assignment: 'Programming Assignment 1',
      instructor: 'Dr. Smith',
      date: '2023-06-10',
      feedback: 'Excellent work on this assignment! Your implementation of the binary search tree was well-structured and efficient. Your code was clean, well-commented, and followed good programming practices. The time complexity analysis was thorough and accurate. For future assignments, consider exploring more edge cases in your testing.',
      rating: 5,
      isHighlighted: true,
      hasReplied: false},
    {
      id: 2,
      course: 'MATH201',
      courseName: 'Calculus I',
      assignment: 'Integration Homework',
      instructor: 'Dr. Williams',
      date: '2023-06-08',
      feedback: 'Good effort on the integration problems. You demonstrated a solid understanding of basic techniques. However, there were some errors in problems 3 and 7 related to the use of substitution. Review the chain rule and its application in integration. Your work on improper integrals was particularly strong.',
      rating: 4,
      isHighlighted: false,
      hasReplied: true},
    {
      id: 3,
      course: 'HIST101',
      courseName: 'World History',
      assignment: 'Essay on Renaissance',
      instructor: 'Prof. Johnson',
      date: '2023-06-05',
      feedback: 'Your essay demonstrates a good understanding of the Renaissance period. Your analysis of the cultural and artistic developments was insightful. However, the economic factors could have been explored in more depth. Your writing is clear and well-structured, but be careful with citation format – several of your citations did not follow the required style guide.',
      rating: 4,
      isHighlighted: false,
      hasReplied: false},
    {
      id: 4,
      course: 'CS101',
      courseName: 'Introduction to Computer Science',
      assignment: 'Algorithm Quiz',
      instructor: 'Dr. Smith',
      date: '2023-05-28',
      feedback: 'You performed well on the algorithm complexity questions and showed good understanding of sorting algorithms. The question on dynamic programming seemed challenging for you. I recommend reviewing the bottom-up approach to DP problems. Feel free to visit during office hours if you need additional help with this topic.',
      rating: 3,
      isHighlighted: false,
      hasReplied: false},
    {
      id: 5,
      course: 'ENG105',
      courseName: 'Academic Writing',
      assignment: 'Research Paper Outline',
      instructor: 'Prof. Martinez',
      date: '2023-05-25',
      feedback: 'Your research paper outline is well-organized and your thesis statement is clear and focused. The main arguments are logically structured and support your thesis effectively. Your preliminary sources are appropriate, but I suggest incorporating more peer-reviewed academic articles. Consider narrowing your third main point to maintain a more cohesive argument throughout the paper.',
      rating: 5,
      isHighlighted: true,
      hasReplied: true},
  ];

  // Get unique courses for filter dropdown
  const courses = [...new Set(feedbackItems.map(item => item.course))].map(code => {
    const courseName = feedbackItems.find(item => item.course === code)?.courseName;
    return { code, name: courseName };
  });

  // Filter and sort feedback items
  const getFilteredFeedback = () => {
    let filtered = [...feedbackItems];

    // Filter by tab
    if (tabValue === 1) {
      filtered = filtered.filter(item => item.isHighlighted);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.feedback.toLowerCase().includes(query) ||
        item.assignment.toLowerCase().includes(query) ||
        item.instructor.toLowerCase().includes(query) ||
        item.courseName.toLowerCase().includes(query)
      );
    }

    // Filter by course
    if (courseFilter !== 'all') {
      filtered = filtered.filter(item => item.course === courseFilter);
    }

    // Sort items
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date); // Most recent first
      } else if (sortBy === 'rating') {
        return b.rating - a.rating; // Highest rating first
      } else if (sortBy === 'course') {
        return a.course.localeCompare(b.course); // Alphabetically by course
      }
      return 0;
    });

    return filtered;
  };

  const filteredFeedback = getFilteredFeedback();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleCourseFilterChange = (event) => {
    setCourseFilter(event.target.value);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const handleReplyOpen = (feedback) => {
    setSelectedFeedback(feedback);
    setOpenReplyDialog(true);
  };

  const handleReplyClose = () => {
    setOpenReplyDialog(false);
  };

  const handleReplySubmit = () => {
    // In a real app, this would send the reply to the backend
    setOpenReplyDialog(false);
    setReplyText('');
  };

  // Format date string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Render stars based on rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<StarIcon key={i} className={classes.star} />);
      } else {
        stars.push(<StarBorderIcon key={i} className={classes.star} />);
      }
    }
    return stars;
  };

  return (
    <Container className={classes.container}>
      <Paper className={classes.paper}>
        <Typography variant="h5" className={classes.header}>
          Instructor Feedback
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
            <Tab label="All Feedback" />
            <Tab label="Highlighted Feedback" />
          </Tabs>
        </Box>

        <Box className={classes.filterContainer}>
          <Box className={classes.searchAndFilter}>
            <TextField
              placeholder="Search feedback..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )}}
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

          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              labelId="sort-by-label"
              id="sort-by"
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
              startAdornment={<SortIcon style={{ marginRight: 8 }} />}
            >
              <MenuItem value="date">Most Recent</MenuItem>
              <MenuItem value="rating">Highest Rating</MenuItem>
              <MenuItem value="course">Course</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredFeedback.length === 0 ? (
          <Paper className={classes.noFeedback}>
            <FeedbackIcon style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }} />
            <Typography variant="body1">
              No feedback found matching your filters.
            </Typography>
          </Paper>
        ) : (
          <>
            {filteredFeedback.map((item) => (
              <Card
                key={item.id}
                className={`${classes.feedbackCard} ${item.isHighlighted ? classes.highlighted : ''}`}
              >
                <CardContent>
                  <Box className={classes.feedbackHeader}>
                    <Box>
                      <Box className={classes.feedbackInfo}>
                        <Avatar className={classes.instructorAvatar}>
                          {item.instructor.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {item.instructor}
                          </Typography>
                          <Box mt={0.5}>
                            <Chip
                              icon={<CourseIcon />}
                              label={`${item.course}: ${item.courseName}`}
                              size="small"
                              className={classes.courseChip}
                            />
                            <Chip
                              label={item.assignment}
                              size="small"
                              className={classes.assignmentChip}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Box className={classes.feedbackDate}>
                        <ScheduleIcon />
                        <Typography variant="body2">
                          {formatDate(item.date)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className={classes.starContainer}>
                      {renderStars(item.rating)}
                    </Box>
                  </Box>

                  <Typography variant="body1" paragraph>
                    {item.feedback}
                  </Typography>

                  <Box className={classes.feedbackActions}>
                    {item.hasReplied && (
                      <Chip
                        size="small"
                        label="You replied"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    <Button
                      size="small"
                      color="primary"
                      className={classes.replyButton}
                      startIcon={<ReplyIcon />}
                      onClick={() => handleReplyOpen(item)}
                    >
                      {item.hasReplied ? 'View Reply' : 'Reply'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Reply Dialog */}
        <Dialog
          open={openReplyDialog}
          onClose={handleReplyClose}
          aria-labelledby="reply-dialog-title"
          fullWidth
          maxWidth="md"
        >
          <DialogTitle id="reply-dialog-title">
            Reply to {selectedFeedback?.instructor}'s Feedback
          </DialogTitle>
          <DialogContent className={classes.dialogContent}>
            <DialogContentText>
              <Typography variant="subtitle2">
                {selectedFeedback?.course}: {selectedFeedback?.assignment}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {formatDate(selectedFeedback?.date)}
              </Typography>
              <Box p={2} bgcolor="background.default" borderRadius={4} mb={3}>
                <Typography variant="body1">
                  {selectedFeedback?.feedback}
                </Typography>
              </Box>
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="reply"
              label="Your Reply"
              type="text"
              fullWidth
              multiline
              minRows={4}
              variant="outlined"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReplyClose} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleReplySubmit}
              color="primary"
              variant="contained"
              disabled={!replyText.trim()}
            >
              Send Reply
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default StudentFeedback;