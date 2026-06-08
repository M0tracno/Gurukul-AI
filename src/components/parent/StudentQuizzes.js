import React, { useState } from 'react';
import makeStyles from '../../utils/makeStylesCompat';
import { InlineMath, BlockMath } from 'react-katex';

import { Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabelItem, Paper, Select, Typography } from '@mui/material';
// Helper function to safely render math expressions (same as in QuizCreation.js)
const renderMathExpression = (text) => {
  const theme = useTheme();
  const originalTheme = useTheme();
  if (!text) return '';
  
  // Regular expression to match LaTeX expressions wrapped in \( ... \) or $ ... $ or [ ... \]
  const mathRegex = /(\\\(|\$|\\[)(.*?)(\\\)|\$|\\\])/g;
  
  // Check if the text contains math expressions
  if (!mathRegex.test(text)) {
    return <span>{text}</span>;
  }
  
  // Split the text into parts and render math expressions
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Reset the regex to start from the beginning
  mathRegex.lastIndex = 0;
  
  while ((match = mathRegex.exec(text)) !== null) {
    const [fullMatch, openDelim, mathExpression, closeDelim] = match;
    
    // Add the text before the math expression
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    
    // Add the math expression
    try {
      const isBlock = openDelim === '\[' || (openDelim === '$' && closeDelim === '$' && mathExpression.includes('\\'));
      parts.push(
        isBlock ? (
          <BlockMath key={`math-${match.index}`} math={mathExpression} />
        ) : (
          <InlineMath key={`math-${match.index}`} math={mathExpression} />
        )
      );
    } catch (error) {
      console.error('Error rendering math:', error);
      parts.push(<span key={`math-error-${match.index}`}>{fullMatch}</span>);
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add the remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }
  
  return <>{parts}</>;
};

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    },
  },
  cardContent: {
    flexGrow: 1,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  upcomingChip: {
    backgroundColor: theme.palette.info.light,
  },
  pendingChip: {
    backgroundColor: theme.palette.warning.light,
  },
  completedChip: {
    backgroundColor: theme.palette.success.light,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  formControl: {
    minWidth: 200,
    marginBottom: theme.spacing(3),
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  scoreCircle: {
    position: 'relative',
    display: 'inline-flex',
    margin: theme.spacing(2),
  },
  circleText: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  scoreValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  statsGrid: {
    marginBottom: theme.spacing(3),
  },
  statPaper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    height: '100%',
  },
  questionPaper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  correctAnswer: {
    backgroundColor: theme.palette.success.light,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  wrongAnswer: {
    backgroundColor: theme.palette.error.light,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
}));

// Mock data for children
const mockChildren = [
  {
    id: 'student-1',
    name: 'Alex Johnson',
    grade: '10th',
    school: 'Lincoln High School'
  },
  {
    id: 'student-2',
    name: 'Emma Johnson',
    grade: '8th',
    school: 'Washington Middle School'
  }
];

// Mock quiz data (would typically come from database)
const mockQuizzes = [
  {
    id: 'quiz-1',
    studentId: 'student-1',
    title: 'Calculus: Limits and Derivatives',
    subject: 'Mathematics',
    topic: 'Calculus',
    description: 'Test understanding of limits and derivatives in calculus.',
    timeLimit: 30, // minutes
    numQuestions: 5,
    difficulty: 'medium',
    dueDate: '2023-06-25',
    courseId: 'course-1',
    courseName: 'Advanced Mathematics',
    status: 'completed',
    score: 80,
    completedDate: '2023-06-20',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the value of $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$?',
        options: ['$0$', '$1$', '$\\infty$', 'Undefined'],
        correctAnswer: '$1$',
        studentAnswer: '$1$',
        explanation: 'As $x$ approaches 0, the ratio $\\frac{\\sin(x)}{x}$ approaches 1. This is a fundamental limit in calculus.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: 'What is the derivative of $f(x) = x^2 + 3x + 2$?',
        options: ['$f\'(x) = 2x + 3$', '$f\'(x) = x^2 + 3$', '$f\'(x) = 2x^2 + 3$', '$f\'(x) = 2x$'],
        correctAnswer: '$f\'(x) = 2x + 3$',
        studentAnswer: '$f\'(x) = 2x + 3$',
        explanation: 'Using the power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$ and the sum rule of derivatives.'
      },
      {
        id: 3,
        type: 'multiple_choice',
        question: 'What is the derivative of $\\sin(x)$?',
        options: ['$\\cos(x)$', '$-\\sin(x)$', '$-\\cos(x)$', '$\\tan(x)$'],
        correctAnswer: '$\\cos(x)$',
        studentAnswer: '$-\\sin(x)$',
        explanation: 'The derivative of $\\sin(x)$ is $\\cos(x)$.'
      },
      {
        id: 4,
        type: 'fill_blank',
        question: 'The derivative of $e^x$ is $________$.',
        correctAnswer: '$e^x$',
        studentAnswer: '$e^x$',
        explanation: 'The exponential function $e^x$ is its own derivative.'
      },
      {
        id: 5,
        type: 'true_false',
        question: 'The product rule states: If $h(x) = f(x) \\cdot g(x)$, then $h\'(x) = f\'(x) \\cdot g\'(x)$.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        studentAnswer: 'True',
        explanation: 'The correct formula is $h\'(x) = f\'(x) \\cdot g(x) + f(x) \\cdot g\'(x)$.'
      }
    ]
  },
  {
    id: 'quiz-2',
    studentId: 'student-1',
    title: 'Physics: Mechanics',
    subject: 'Physics',
    topic: 'Mechanics',
    description: 'Test knowledge of basic mechanics concepts in physics.',
    timeLimit: 30,
    numQuestions: 3,
    difficulty: 'easy',
    dueDate: '2023-06-15',
    courseId: 'course-2',
    courseName: 'Physics 101',
    status: 'completed',
    score: 67,
    completedDate: '2023-06-14',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the SI unit of force?',
        options: ['Watt', 'Newton', 'Joule', 'Pascal'],
        correctAnswer: 'Newton',
        studentAnswer: 'Newton',
        explanation: 'The newton (N) is the SI unit of force, equal to the force needed to accelerate a mass of one kilogram by one meter per second squared.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: 'Which of the following equations represents Newton\'s Second Law?',
        options: ['$F = ma$', '$F = \\frac{Gm_1m_2}{r^2}$', '$E = mc^2$', '$p = mv$'],
        correctAnswer: '$F = ma$',
        studentAnswer: '$F = ma$',
        explanation: 'Newton\'s Second Law states that the force acting on an object is equal to its mass multiplied by its acceleration.'
      },
      {
        id: 3,
        type: 'short_answer',
        question: 'Explain the principle of conservation of energy in your own words.',
        correctAnswer: 'Energy cannot be created or destroyed, only transformed from one form to another.',
        studentAnswer: 'Energy stays the same in a closed system.',
        explanation: 'The total energy of an isolated system remains constant; it can only change form.'
      }
    ]
  },
  {
    id: 'quiz-3',
    studentId: 'student-2',
    title: 'Literature: The Giver',
    subject: 'English',
    topic: 'Literature',
    description: 'Test understanding of the novel "The Giver" by Lois Lowry.',
    timeLimit: 45,
    numQuestions: 4,
    difficulty: 'medium',
    dueDate: '2023-06-10',
    courseId: 'course-3',
    courseName: 'English Literature',
    status: 'completed',
    score: 75,
    completedDate: '2023-06-08',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the main theme of "The Giver"?',
        options: ['Freedom', 'Equality', 'Identity', 'Technology'],
        correctAnswer: 'Freedom',
        studentAnswer: 'Identity',
        explanation: 'While identity is a theme in the novel, the primary theme explores the tension between freedom and security/control.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: 'What happens to Jonas at the end of the novel?',
        options: ['He returns to the community', 'He reaches Elsewhere', 'He dies', 'He becomes the new Giver'],
        correctAnswer: 'He reaches Elsewhere',
        studentAnswer: 'He reaches Elsewhere',
        explanation: 'The ending is ambiguous, but most interpretations suggest Jonas reaches Elsewhere with Gabriel.'
      },
      {
        id: 3,
        type: 'short_answer',
        question: 'Explain what "release" means in the context of the novel.',
        correctAnswer: 'Release is a euphemism for euthanasia or killing members of the community.',
        studentAnswer: 'Release means killing people who break rules or are too old.',
        explanation: 'Release is presented as an honor but is actually a form of euthanasia performed on the elderly, infants who fail to thrive, and rule-breakers.'
      },
      {
        id: 4,
        type: 'multiple_choice',
        question: 'What is Jonas\'s assignment in the community?',
        options: ['Nurturer', 'Receiver of Memory', 'Elder', 'Birthmother'],
        correctAnswer: 'Receiver of Memory',
        studentAnswer: 'Receiver of Memory',
        explanation: 'Jonas is selected to be the new Receiver of Memory, trained by the current Receiver (who becomes "The Giver").'
      }
    ]
  }
];

function StudentQuizzes() {
  const classes = useStyles();
  const [selectedChild, setSelectedChild] = useState(mockChildren[0].id);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

  // Get quizzes for selected child
  const childQuizzes = mockQuizzes.filter(quiz => quiz.studentId === selectedChild);
  
  // Get selected child info
  const childInfo = mockChildren.find(child => child.id === selectedChild);

  // Calculate stats
  const calculateStats = () => {
    if (childQuizzes.length === 0) {
      return {
        averageScore: 0,
        totalQuizzes: 0,
        highestScore: 0,
        lowestScore: 0
      };
    }

    const scores = Array.isArray(childQuizzes) ? childQuizzes.map(quiz => quiz.score) : [];
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    return {
      averageScore: Math.round(totalScore / scores.length),
      totalQuizzes: childQuizzes.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores)
    };
  };

  const stats = calculateStats();

  // Handle child selection
  const handleChildChange = (event) => {
    setSelectedChild(event.target.value);
  };

  // View quiz details
  const handleViewQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setQuizDialogOpen(true);
  };

  // Close quiz dialog
  const handleCloseQuiz = () => {
    setQuizDialogOpen(false);
  };

  return (
    <Container className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Student Quiz Results
      </Typography>

      {/* Child Selection */}
      <FormControl variant="outlined" className={classes.formControl}>
        <InputLabel>Select Child</InputLabel>
        <Select
          value={selectedChild}
          onChange={handleChildChange}
          label="Select Child"
        >
          {Array.isArray(mockChildren) && mockChildren.map((child) => (
            <MenuItem key={child.id} value={child.id}>
              {child.name} - {child.grade}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Child Info and Stats */}
      {childInfo && (
        <>
          <Typography variant="h6" gutterBottom>
            {childInfo.name}'s Quiz Performance
          </Typography>          {/* Performance Stats */}
          <Grid container spacing={3} className={classes.statsGrid}>
            <Grid size={{xs:12,sm:6,md:3}}>
              <Paper className={classes.stat}>
                <Typography variant="body2" color="textSecondary">
                  Average Score
                </Typography>
                <Typography variant="h4">
                  {stats.averageScore}%
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <Paper className={classes.stat}>
                <Typography variant="body2" color="textSecondary">
                  Total Quizzes
                </Typography>
                <Typography variant="h4">
                  {stats.totalQuizzes}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <Paper className={classes.stat}>
                <Typography variant="body2" color="textSecondary">
                  Highest Score
                </Typography>
                <Typography variant="h4">
                  {stats.highestScore}%
                </Typography>
              </Paper>            </Grid>
            <Grid size={{xs:12,sm:6,md:3}}>
              <Paper className={classes.stat}>
                <Typography variant="body2" color="textSecondary">
                  Lowest Score
                </Typography>
                <Typography variant="h4">
                  {stats.lowestScore}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Quiz List */}
          <Typography variant="h6" gutterBottom>
            Completed Quizzes
          </Typography>
          
          {!Array.isArray(childQuizzes) || childQuizzes.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No completed quizzes available.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {Array.isArray(childQuizzes) && childQuizzes.map((quiz) => (
                <Grid size={{xs:12,sm:6,md:4}} key={quiz.id}>
                  <Card className={classes.card}>
                    <CardContent className={classes.cardContent}>
                      <Typography variant="h6" component="h2">
                        {quiz.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {quiz.courseName}
                      </Typography>
                      <Chip
                        label={`Score: ${quiz.score}%`}
                        className={classes.chip}
                        size="small"
                        color={quiz.score >= 70 ? "primary" : "secondary"}
                      />
                      <Typography variant="body2" component="p" paragraph>
                        {quiz.description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Subject:</strong> {quiz.subject}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Questions:</strong> {quiz.numQuestions}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Difficulty:</strong> {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Completed:</strong> {quiz.completedDate}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        color="primary"
                        variant="contained"
                        fullWidth
                        onClick={() => handleViewQuiz(quiz)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Quiz Details Dialog */}
      {selectedQuiz && (
        <Dialog
          open={quizDialogOpen}
          onClose={handleCloseQuiz}
          aria-labelledby="quiz-details-dialog-title"
          maxWidth="md"
          fullWidth
        >
          <DialogTitle id="quiz-details-dialog-title">
            {selectedQuiz.title} - Results
          </DialogTitle>
          <DialogContent dividers>
            <Box className={classes.scoreContainer}>
              <div className={classes.scoreCircle}>
                <CircularProgress 
                  variant="determinate" 
                  value={selectedQuiz.score} 
                  size={100}
                  thickness={5}
                  color={selectedQuiz.score >= 70 ? "primary" : "secondary"}
                />
                <div className={classes.circleText}>
                  <Typography variant="h5" className={classes.scoreValue}>
                    {selectedQuiz.score}%
                  </Typography>
                </div>
              </div>
            </Box>

            <Typography variant="h6" gutterBottom>
              Question Review
            </Typography>

            {Array.isArray(selectedQuiz?.questions) && selectedQuiz.questions.map((question, index) => {
              const isCorrect = question.studentAnswer === question.correctAnswer;

              return (
                <Paper key={question.id} className={classes.question}>
                  <Typography variant="h6" gutterBottom>
                    Question {index + 1} of {selectedQuiz.questions.length}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {renderMathExpression(question.question)}
                  </Typography>

                  {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                    <div>
                      <Typography variant="body2">
                        <strong>Options:</strong>
                      </Typography>
                      {Array.isArray(question.options) && question.options.map((option, optIndex) => (
                        <Typography 
                          key={optIndex} 
                          variant="body2" 
                          className={
                            option === question.correctAnswer ? classes.correctAnswer :
                            (question.studentAnswer === option && question.studentAnswer !== question.correctAnswer) ? classes.wrongAnswer :
                            ''
                          }
                        >
                          {optIndex + 1}. {renderMathExpression(option)}
                          {option === question.correctAnswer && ' ✓'}
                        </Typography>
                      ))}
                    </div>
                  )}

                  {(question.type === 'fill_blank' || question.type === 'short_answer') && (
                    <div>
                      <Typography variant="body2">
                        <strong>Student's Answer:</strong> {renderMathExpression(question.studentAnswer)}
                      </Typography>
                      <Typography variant="body2" className={classes.correctAnswer}>
                        <strong>Correct Answer:</strong> {renderMathExpression(question.correctAnswer)}
                      </Typography>
                    </div>
                  )}

                  <Box mt={2}>
                    <Typography variant="body2">
                      <strong>Explanation:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {renderMathExpression(question.explanation)}
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <Chip 
                      label={isCorrect ? "Correct" : "Incorrect"} 
                      color={isCorrect ? "primary" : "secondary"}
                      size="small"
                    />
                  </Box>
                </Paper>
              );
            })}

            <Typography variant="h6" gutterBottom>
              Teacher Feedback
            </Typography>
            <Paper className={classes.question}>
              <Typography variant="body1">
                {selectedQuiz.score >= 90 
                  ? `${childInfo.name} demonstrated excellent understanding of the material. They answered most questions correctly and showed strong conceptual knowledge.`
                  : selectedQuiz.score >= 70
                  ? `${childInfo.name} shows good understanding of the core concepts, but could benefit from additional practice on some topics.`
                  : `${childInfo.name} needs additional support and practice with this material. Consider reviewing the concepts together at home.`
                }
              </Typography>
              {selectedQuiz.score < 80 && (
                <Box mt={2}>
                  <Typography variant="body2">
                    <strong>Suggested Practice:</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Review the explanations for incorrect answers
                    <br />
                    • Practice similar problems in the textbook
                    <br />
                    • Consider scheduling time with the teacher for additional help
                  </Typography>
                </Box>
              )}
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseQuiz} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

export default StudentQuizzes;


