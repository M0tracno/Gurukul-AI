import React, { useState, useEffect } from 'react';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useAuth } from '../../auth/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';

import { Box, Button, Card, CardContent, Chip, Divider, Grid, Paper, Typography } from '@mui/material';
  Today as DueDateIcon

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  title: {
    marginBottom: theme.spacing(3)
  },
  card: {
    marginBottom: theme.spacing(3)
  },
  childTitle: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2)
  },
  childIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main
  },
  assignmentItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2)
  },
  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1)
  },
  dueDateChip: {
    marginRight: theme.spacing(1)
  },
  statusChip: {
    fontWeight: 'bold'
  },
  completedChip: {
    backgroundColor: '#4caf50',
    color: 'white'
  },
  pendingChip: {
    backgroundColor: '#ff9800',
    color: 'white'
  },
  missingChip: {
    backgroundColor: '#f44336',
    color: 'white'
  },
  viewButton: {
    marginTop: theme.spacing(1)
  },
  subjectName: {
    fontWeight: 'bold',
    marginTop: theme.spacing(1)
  }
}));

function ChildAssignments() {
  const classes = useStyles();
  const { currentUser } = useAuth();
  const { getCollection } = useDatabase();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        // In a real application, you would fetch from Firestore
        const data = await getCollection('assignments', {
          where: ['parentId', '==', currentUser.uid]
        });
        setAssignments(data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [currentUser, getCollection]);

  // Mock data generator for demo mode
  const getMockAssignmentsData = () => {
  const theme = useTheme();
    return [
      {
        childId: 'child1',
        childName: 'Emma Johnson',
        grade: '6th Grade',
        assignments: [
          {
            id: 'assign1',
            title: 'Fractions and Decimals Worksheet',
            subject: 'Mathematics',
            description: 'Complete problems 1-20 on fractions to decimal conversions',
            dueDate: '2023-05-25',
            status: 'completed',
            grade: 95,
            teacherFeedback: 'Excellent work! Very accurate conversions.'
          },
          {
            id: 'assign2',
            title: 'Plant Cell Diagram',
            subject: 'Science',
            description: 'Create a detailed diagram of a plant cell with all organelles labeled',
            dueDate: '2023-05-28',
            status: 'pending',
            grade: null,
            teacherFeedback: null
          },
          {
            id: 'assign3',
            title: 'Book Report - Charlotte\'s Web',
            subject: 'English',
            description: 'Write a 2-page report on the main themes and characters',
            dueDate: '2023-05-20',
            status: 'missing',
            grade: 0,
            teacherFeedback: 'Assignment not submitted by due date'
          },
          {
            id: 'assign4',
            title: 'State Capitals Quiz',
            subject: 'Social Studies',
            description: 'Study all 50 state capitals for Friday\'s quiz',
            dueDate: '2023-05-30',
            status: 'pending',
            grade: null,
            teacherFeedback: null
          }
        ]
      },
      {
        childId: 'child2',
        childName: 'Ethan Johnson',
        grade: '4th Grade',
        assignments: [
          {
            id: 'assign5',
            title: 'Addition and Subtraction Practice',
            subject: 'Mathematics',
            description: 'Complete workbook pages 45-47',
            dueDate: '2023-05-26',
            status: 'completed',
            grade: 88,
            teacherFeedback: 'Good work, but remember to show all your steps'
          },
          {
            id: 'assign6',
            title: 'Weather Tracking Project',
            subject: 'Science',
            description: 'Track and record daily weather patterns for one week',
            dueDate: '2023-05-29',
            status: 'pending',
            grade: null,
            teacherFeedback: null
          },
          {
            id: 'assign7',
            title: 'Spelling List #15',
            subject: 'English',
            description: 'Practice spelling words and complete worksheet',
            dueDate: '2023-05-27',
            status: 'completed',
            grade: 92,
            teacherFeedback: 'Great improvement on your spelling!'
          }
        ]
      }
    ];
  };

  // Helper function to render status chip
  const renderStatusChip = (status) => {
    if (status === 'completed') {
      return (
        <Chip
          icon={<CompletedIcon />}
          label="Completed"
          className={`${classes.statusChip} ${classes.completedChip}`}
          size="small"
        />
      );
    } else if (status === 'pending') {
      return (
        <Chip
          icon={<PendingIcon />}
          label="Pending"
          className={`${classes.statusChip} ${classes.pendingChip}`}
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<MissingIcon />}
          label="Missing"
          className={`${classes.statusChip} ${classes.missingChip}`}
          size="small"
        />
      );
    }
  };

  // Format date to display in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if a date is past due
  const isPastDue = (dateString) => {
    const dueDate = new Date(dateString);
    const today = new Date();
    return dueDate < today && !isSameDay(dueDate, today);
  };

  // Helper to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  if (loading) {
    return <Typography>Loading assignments data...</Typography>;
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Children's Assignments
      </Typography>

      {assignments.length === 0 ? (
        <Paper className={classes.paper} elevation={2}>
          <Typography variant="h6" align="center">
            No assignments data available yet.
          </Typography>
        </Paper>
      ) : (
        assignments.map((child) => (
          <Card key={child.childId} className={classes.card}>
            <CardContent>
              <div className={classes.childTitle}>
                <AssignmentIcon className={classes.childIcon} />
                <Typography variant="h5">
                  {child.childName} - {child.grade}
                </Typography>
              </div>

              <Divider style={{ marginBottom: '20px' }} />

              <Grid container spacing={2}>
                {child.assignments.map((assignment) => (
                  <Grid size={{xs:12,md:6}} key={assignment.id}>
                    <Paper className={classes.assignmentItem} elevation={1}>
                      <div className={classes.assignmentHeader}>
                        <Typography variant="h6">{assignment.title}</Typography>
                        {renderStatusChip(assignment.status)}
                      </div>

                      <Typography variant="body2" className={classes.subjectName}>
                        {assignment.subject}
                      </Typography>

                      <Typography variant="body2" color="textSecondary" paragraph>
                        {assignment.description}
                      </Typography>

                      <Box display="flex" alignItems="center" marginBottom={1}>
                        <Chip
                          icon={<DueDateIcon />}
                          label={`Due: ${formatDate(assignment.dueDate)}`}
                          className={classes.dueDateChip}
                          color={isPastDue(assignment.dueDate) ? 'secondary' : 'default'}
                          size="small"
                        />

                        {assignment.grade !== null && (
                          <Chip
                            label={`Grade: ${assignment.grade}%`}
                            size="small"
                          />
                        )}
                      </Box>

                      {assignment.teacherFeedback && (
                        <Typography variant="body2" color="textSecondary">
                          <strong>Feedback:</strong> {assignment.teacherFeedback}
                        </Typography>
                      )}

                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        className={classes.viewButton}
                      >
                        View Details
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default ChildAssignments;