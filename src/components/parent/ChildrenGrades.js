import React, { useState, useEffect } from 'react';
import { Grade as GradeIcon } from '@mui/icons-material';
import makeStyles from '../../utils/makeStylesCompat';
import { useAuth } from '../../auth/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';

import {
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  title: {
    marginBottom: theme.spacing(3)
  },
  tableContainer: {
    marginBottom: theme.spacing(4)
  },
  gradeChip: {
    fontWeight: 'bold'
  },
  excellentGrade: {
    backgroundColor: '#4caf50',
    color: 'white'
  },
  goodGrade: {
    backgroundColor: '#8bc34a',
    color: 'white'
  },
  averageGrade: {
    backgroundColor: '#ffeb3b'
  },
  belowAverageGrade: {
    backgroundColor: '#ff9800',
    color: 'white'
  },
  failingGrade: {
    backgroundColor: '#f44336',
    color: 'white'
  },
  childCard: {
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
  }
}));

function ChildrenGrades() {
  const classes = useStyles();
  const { currentUser } = useAuth();
  const { getCollection } = useDatabase();
  const [gradesData, setGradesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        // TODO: Replace with actual API call to fetch grades
        // const data = await getCollection('grades', {
        //   where: ['parentId', '==', currentUser.uid]
        // });
        // setGradesData(data);

        // For now, set empty array until API is implemented
        setGradesData([]);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [currentUser, getCollection]);

  // Helper function to get grade color class
  const getGradeColorClass = (grade) => {
    if (grade >= 90) return classes.excellentGrade;
    if (grade >= 80) return classes.goodGrade;
    if (grade >= 70) return classes.averageGrade;
    if (grade >= 60) return classes.belowAverageGrade;
    return classes.failingGrade;
  };

  // Calculate average grade for a subject
  const calculateAverage = (grades) => {
    if (!grades || grades.length === 0) return 0;
    const sum = grades.reduce((total, grade) => total + grade.score, 0);
    return Math.round(sum / grades.length);
  };

  if (loading) {
    return <Typography>Loading grades data...</Typography>;
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Children's Academic Performance
      </Typography>

      {gradesData.length === 0 ? (
        <Paper className={classes.paper} elevation={2}>
          <Typography variant="h6" align="center">
            No grades data available yet.
          </Typography>
        </Paper>
      ) : (
        gradesData.map((child) => (
          <Card key={child.childId} className={classes.childCard}>
            <CardContent>
              <div className={classes.childTitle}>
                <GradeIcon className={classes.childIcon} />
                <Typography variant="h5">
                  {child.childName} - {child.grade}
                </Typography>
              </div>

              <Divider style={{ marginBottom: '20px' }} />

              <Grid container spacing={3}>
                {child.subjects.map((subject) => (
                  <Grid size={{xs:12,md:4}} key={subject.name}>
                    <Typography variant="h6" gutterBottom>
                      {subject.name}
                      <Chip
                        label={`${calculateAverage(subject.grades)}%`}
                        className={`${classes.gradeChip} ${getGradeColorClass(
                          calculateAverage(subject.grades)
                        )}`}
                        style={{ marginLeft: '10px' }}
                      />
                    </Typography>

                    <TableContainer component={Paper} className={classes.tableContainer}>
                      <Table size="small">
                        <TableHead>
                          <TableRow><TableCell>Assessment</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="right">Date</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                          {subject.grades.map((grade, index) => (
                            <TableRow key={index}>
                              <TableCell component="th" scope="row">
                                {grade.assessment}
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${grade.score}%`}
                                  className={`${classes.gradeChip} ${getGradeColorClass(
                                    grade.score
                                  )}`}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {new Date(grade.date).toLocaleDateString()}
                              </TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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

export default ChildrenGrades;
