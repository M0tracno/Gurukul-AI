import React, { useState, useEffect } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { Assignment, Check as CheckIcon, Close as CloseIcon, School, Timer } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';

import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, FormControlLabel, Grid, LinearProgress, Paper, Radio, Snackbar, Tab, Tabs, TextField, Typography, toString } from '@mui/material';
// Helper function to safely render math expressions (same as in QuizCreation.js)
const renderMathExpression = (text) => {
  const theme = useTheme();
  const originalTheme = useTheme();
  if (!text) return '';
    // Regular expression to match LaTeX expressions wrapped in \( ... \) or $ ... $ or [ ... \]
  const mathRegex = /(\\\(|\$|\\\[)(.*?)(\\\)|\$|\\\])/g;
  
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
    padding: theme.spacing(3)},
  title: {
    marginBottom: theme.spacing(3)},
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)'}},
  cardContent: {
    flexGrow: 1},
  chip: {
    margin: theme.spacing(0.5)},
  upcomingChip: {
    backgroundColor: theme.palette.info.light},
  pendingChip: {
    backgroundColor: theme.palette.warning.light},
  completedChip: {
    backgroundColor: theme.palette.success.light},
  divider: {
    margin: theme.spacing(2, 0)},
  quizContainer: {
    marginTop: theme.spacing(3)},
  questionPaper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2)},
  submitButton: {
    marginTop: theme.spacing(3)},
  optionLabel: {
    width: '100%',
    marginBottom: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover}},
  selectedOption: {
    backgroundColor: theme.palette.primary.light,
    '&:hover': {
      backgroundColor: theme.palette.primary.light}},
  timer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText},
  timerIcon: {
    marginRight: theme.spacing(1)},
  resultSummary: {
    marginBottom: theme.spacing(3)},
  scoreCircle: {
    position: 'relative',
    display: 'inline-flex',
    margin: theme.spacing(2)},
  circleText: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'},
  scoreValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold'},
  scoreLabel: {
    fontSize: '0.875rem'},
  correctAnswer: {
    backgroundColor: theme.palette.success.light,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius},
  wrongAnswer: {
    backgroundColor: theme.palette.error.light,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius},
  tabs: {
    marginBottom: theme.spacing(3)},
  question: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`},
  questionNumber: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1)},
  timerSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3)},
  radioGroup: {
    marginTop: theme.spacing(2)},
  textField: {
    marginTop: theme.spacing(2),
    width: '100%'},
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3)},
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3)},
  progressSection: {
    marginTop: theme.spacing(2),
    width: '100%'},
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 0),
    borderBottom: `1px solid ${theme.palette.divider}`},
  correct: {
    color: theme.palette.success.main},
  incorrect: {
    color: theme.palette.error.main},
  explanation: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius}
}));

function StudentQuizzes() {
  const classes = useStyles();
  const [quizzes, setQuizzes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'});

  // Mock quizzes data - in a real app, this would come from an API
  useEffect(() => {
    // Simulating API call to fetch quizzes
    const mockQuizzes = [
      {
        id: 'quiz-1',
        title: 'Calculus: Limits and Derivatives',
        subject: 'Mathematics',
        topic: 'Calculus',
        description: 'Test your understanding of limits and derivatives in calculus.',
        timeLimit: 30, // minutes
        numQuestions: 5,
        difficulty: 'medium',
        dueDate: '2023-06-25',
        courseId: 'course-1',
        courseName: 'Advanced Mathematics',
        status: 'upcoming',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is the value of $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$?',
            options: ['$0$', '$1$', '$\\infty$', 'Undefined'],
            correctAnswer: '$1$',
            explanation: 'As $x$ approaches 0, the ratio $\\frac{\\sin(x)}{x}$ approaches 1. This is a fundamental limit in calculus.'
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: 'What is the derivative of $f(x) = x^2 + 3x + 2$?',
            options: ['$f\'(x) = 2x + 3$', '$f\'(x) = x^2 + 3$', '$f\'(x) = 2x^2 + 3$', '$f\'(x) = 2x$'],
            correctAnswer: '$f\'(x) = 2x + 3$',
            explanation: 'Using the power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$ and the sum rule of derivatives.'
          },
          {
            id: 3,
            type: 'multiple_choice',
            question: 'What is the derivative of $\\sin(x)$?',
            options: ['$\\cos(x)$', '$-\\sin(x)$', '$-\\cos(x)$', '$\\tan(x)$'],
            correctAnswer: '$\\cos(x)$',
            explanation: 'The derivative of $\\sin(x)$ is $\\cos(x)$.'
          },
          {
            id: 4,
            type: 'fill_blank',
            question: 'The derivative of $e^x$ is $________$.',
            correctAnswer: '$e^x$',
            explanation: 'The exponential function $e^x$ is its own derivative.'
          },
          {
            id: 5,
            type: 'true_false',
            question: 'The product rule states: If $h(x) = f(x) \\cdot g(x)$, then $h\'(x) = f\'(x) \\cdot g\'(x)$.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'The correct formula is $h\'(x) = f\'(x) \\cdot g(x) + f(x) \\cdot g\'(x)$.'
          }
        ]
      },
      {
        id: 'quiz-2',
        title: 'Physics: Mechanics',
        subject: 'Physics',
        topic: 'Mechanics',
        description: 'Test your knowledge of basic mechanics concepts in physics.',
        timeLimit: 30,
        numQuestions: 3,
        difficulty: 'easy',
        dueDate: '2023-06-15',
        courseId: 'course-2',
        courseName: 'Physics 101',
        status: 'pending',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is the SI unit of force?',
            options: ['Watt', 'Newton', 'Joule', 'Pascal'],
            correctAnswer: 'Newton',
            explanation: 'The newton (N) is the SI unit of force, equal to the force needed to accelerate a mass of one kilogram by one meter per second squared.'
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: 'Which of the following equations represents Newton\'s Second Law?',
            options: ['$F = ma$', '$F = \\frac{Gm_1m_2}{r^2}$', '$E = mc^2$', '$p = mv$'],
            correctAnswer: '$F = ma$',
            explanation: 'Newton\'s Second Law states that the force acting on an object is equal to its mass multiplied by its acceleration.'
          },
          {
            id: 3,
            type: 'short_answer',
            question: 'Explain the principle of conservation of energy in your own words.',
            correctAnswer: 'Energy cannot be created or destroyed, only transformed from one form to another.',
            explanation: 'The total energy of an isolated system remains constant; it can only change form.'
          }
        ]
      },
      {
        id: 'quiz-3',
        title: 'Literature: The Giver',
        subject: 'English',
        topic: 'Literature',
        description: 'Test your understanding of the novel "The Giver" by Lois Lowry.',
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

    setQuizzes(mockQuizzes);
  }, []);

  // Filter quizzes by status  // Filter quizzes by status with array safety
  const upcomingQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => quiz.status === 'upcoming') : [];
  const pendingQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => quiz.status === 'pending') : [];
  const completedQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => quiz.status === 'completed') : [];

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Start quiz handler
  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers({});
    setRemainingTime(quiz.timeLimit * 60); // Convert minutes to seconds
    setQuizSubmitted(false);
    setQuizDialogOpen(true);

    // Start the timer
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Store the timer ID to clear it when the quiz is closed or submitted
    window.quizTimer = timer;
  };

  // Handle quiz dialog close
  const handleCloseQuiz = () => {
    if (!quizSubmitted) {
      setConfirmDialogOpen(true);
    } else {
      cleanupQuiz();
    }
  };

  // Clean up quiz state
  const cleanupQuiz = () => {
    if (window.quizTimer) {
      clearInterval(window.quizTimer);
    }
    setQuizDialogOpen(false);
    setConfirmDialogOpen(false);
  };

  // Confirm dialog handlers
  const handleConfirmClose = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmExit = () => {
    cleanupQuiz();
  };

  // Answer change handler
  const handleAnswerChange = (value) => {
    setAnswers(prev => ({
      ...prev,
      [selectedQuiz.questions[currentQuestion].id]: value
    }));
  };

  // Navigation handlers
  const handleNextQuestion = () => {
    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Submit quiz handler
  const handleSubmitQuiz = () => {
    // Clear the timer
    if (window.quizTimer) {
      clearInterval(window.quizTimer);
    }

    // Calculate score
    let correct = 0;
    const questions = selectedQuiz.questions;

    questions.forEach(question => {
      const studentAnswer = answers[question.id] || '';
      if (compareAnswers(studentAnswer, question.correctAnswer, question.type)) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    setQuizScore(score);
    setCorrectAnswers(correct);
    setQuizSubmitted(true);

    // Update quiz status to completed in the local state
    setQuizzes(prev => 
      prev.map(quiz => 
        quiz.id === selectedQuiz.id 
          ? { 
              ...quiz, 
              status: 'completed', 
              score, 
              completedDate: new Date().toISOString().split('T')[0],              questions: Array.isArray(quiz.questions) ? quiz.questions.map(q => ({
                ...q,
                studentAnswer: answers[q.id] || ''
              })) : []
            } 
          : quiz
      )
    );

    // Show success message
    setSnackbar({
      open: true,
      message: 'Quiz submitted successfully!',
      severity: 'success'});
  };

  // Helper to compare answers (handles different question types)
  const compareAnswers = (studentAnswer, correctAnswer, type) => {
    if (!studentAnswer) return false;

    if (type === 'multiple_choice' || type === 'true_false') {
      return studentAnswer === correctAnswer;
    } else if (type === 'fill_blank') {
      // For fill in the blank, remove spaces and convert to lowercase for comparison
      return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    } else if (type === 'short_answer' || type === 'long_answer') {
      // For short/long answer, consider it correct if it includes key phrases
      // In a real app, this would likely be teacher-graded or use more sophisticated comparison
      const keyPhrases = correctAnswer.toLowerCase().split(' ');
      const studentText = studentAnswer.toLowerCase();
      return keyPhrases.some(phrase => studentText.includes(phrase));
    }
    
    return false;
  };

  // Format time for display (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render current question
  const renderQuestion = () => {
    if (!selectedQuiz || currentQuestion >= selectedQuiz.questions.length) {
      return null;
    }

    const question = selectedQuiz.questions[currentQuestion];
    const answer = answers[question.id] || '';

    return (
      <div className={classes.question}>
        <Typography variant="subtitle1" className={classes.questionNumber}>
          Question {currentQuestion + 1} of {selectedQuiz.questions.length}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          {renderMathExpression(question.question)}
        </Typography>
        
        {/* Different inputs based on question type */}
        {question.type === 'multiple_choice' && (
          <FormControl component="fieldset" className={classes.radioGroup}>
            <RadioGroup value={answer} onChange={(e) => handleAnswerChange(e.target.value)}>              {Array.isArray(question.options) && question.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={renderMathExpression(option)}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
        
        {question.type === 'true_false' && (
          <FormControl component="fieldset" className={classes.radioGroup}>
            <RadioGroup value={answer} onChange={(e) => handleAnswerChange(e.target.value)}>
              <FormControlLabel value="True" control={<Radio />} label="True" />
              <FormControlLabel value="False" control={<Radio />} label="False" />
            </RadioGroup>
          </FormControl>
        )}
        
        {question.type === 'fill_blank' && (
          <TextField
            label="Your answer"
            variant="outlined"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className={classes.textField}
          />
        )}
        
        {question.type === 'short_answer' && (
          <TextField
            label="Your answer"
            variant="outlined"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            multiline
            minRows={2}
            className={classes.textField}
          />
        )}
        
        {question.type === 'long_answer' && (
          <TextField
            label="Your answer"
            variant="outlined"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            multiline
            minRows={6}
            className={classes.textField}
          />
        )}
        
        <div className={classes.navigationButtons}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePrevQuestion}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion < selectedQuiz.questions.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNextQuestion}
              disabled={!answer}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSubmitQuiz}
              disabled={Object.keys(answers).length !== selectedQuiz?.questions.length}
            >
              Submit Quiz
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render quiz results
  const renderResults = () => {
    if (!selectedQuiz || !quizSubmitted) {
      return null;
    }

    return (
      <div>
        <div className={classes.scoreContainer}>
          <Typography variant="h5" gutterBottom>
            Quiz Results
          </Typography>
          
          <div className={classes.scoreCircle}>
            <CircularProgress 
              variant="determinate" 
              value={quizScore} 
              size={150}
              thickness={5}
              color={quizScore >= 70 ? "primary" : "secondary"}
            />
            <div className={classes.circleText}>
              <Typography variant="h4" className={classes.scoreValue}>
                {quizScore}%
              </Typography>
              <Typography variant="body1" className={classes.scoreLabel}>
                Score
              </Typography>
            </div>
          </div>
          
          <Typography variant="h6" gutterBottom>
            You answered {correctAnswers} out of {selectedQuiz.questions.length} questions correctly
          </Typography>
          
          <div className={classes.progressSection}>
            <Grid container spacing={2}>
              <Grid size={{xs:12}}>
                <Box display="flex" alignItems="center">
                  <Box width="100%" mr={1}>
                    <LinearProgress 
                      variant="determinate" 
                      value={quizScore} 
                      color={quizScore >= 70 ? "primary" : "secondary"}
                    />
                  </Box>
                  <Box minWidth={35}>
                    <Typography variant="body2" color="textSecondary">
                      {quizScore}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </div>
        </div>
        
        <Divider className={classes.divider} />
        
        <Typography variant="h6" gutterBottom>
          Question Review
        </Typography>
        
        {Array.isArray(selectedQuiz.questions) && selectedQuiz.questions.map((question, index) => {
          const studentAnswer = answers[question.id] || '';
          const isCorrect = compareAnswers(studentAnswer, question.correctAnswer, question.type);
          
          return (
            <Paper key={question.id} className={classes.question} elevation={1}>
              <Typography variant="subtitle1" gutterBottom>
                Question {index + 1}: {renderMathExpression(question.question)}
              </Typography>
              
              <div className={classes.resultItem}>
                <Typography variant="body1">
                  Your answer: {studentAnswer ? renderMathExpression(studentAnswer) : '(No answer)'}
                </Typography>
                {isCorrect ? (
                  <CheckIcon className={classes.correct} />
                ) : (
                  <CloseIcon className={classes.incorrect} />
                )}
              </div>
              
              {!isCorrect && (
                <Typography variant="body1" gutterBottom>
                  Correct answer: {renderMathExpression(question.correctAnswer)}
                </Typography>
              )}
              
              <div className={classes.explanation}>
                <Typography variant="subtitle2" gutterBottom>
                  Explanation:
                </Typography>
                <Typography variant="body2">
                  {renderMathExpression(question.explanation)}
                </Typography>
              </div>
            </Paper>
          );
        })}
      </div>
    );
  };

  // Renders the quiz card
  const renderQuizCard = (quiz) => {
    const isCompleted = quiz.status === 'completed';

    return (
      <Grid size={{xs:12,sm:6,md:4}} key={quiz.id}>
        <Card className={classes.card}>
          <CardContent className={classes.cardContent}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h6" gutterBottom>
                {quiz.title}
              </Typography>
              <Chip
                label={quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                size="small"
                className={`${classes.chip} ${
                  quiz.status === 'upcoming' ? classes.upcomingChip :
                  quiz.status === 'pending' ? classes.pendingChip : classes.completedChip
                }`}
              />
            </Box>
            
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {quiz.courseName}
            </Typography>
            
            <Typography variant="body2" paragraph>
              {quiz.description}
            </Typography>
            
            <Grid container spacing={1}>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Subject:</strong> {quiz.subject}
                </Typography>
              </Grid>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Topic:</strong> {quiz.topic}
                </Typography>
              </Grid>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Questions:</strong> {quiz.numQuestions}
                </Typography>
              </Grid>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Time:</strong> {quiz.timeLimit} min
                </Typography>
              </Grid>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Difficulty:</strong> {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                </Typography>
              </Grid>
              <Grid size={{xs:6}}>
                <Typography variant="body2">
                  <strong>Due:</strong> {quiz.dueDate}
                </Typography>
              </Grid>
              
              {isCompleted && (
                <Grid size={{xs:12}}>
                  <Box mt={1} display="flex" alignItems="center">
                    <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                      Score: {quiz.score}%
                    </Typography>
                    <Box ml={1}>
                      <Chip
                        label={quiz.score >= 70 ? 'Passed' : 'Failed'}
                        size="small"
                        color={quiz.score >= 70 ? 'primary' : 'secondary'}
                      />
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
          <CardActions>
            {isCompleted ? (
              <Button
                color="primary"
                variant="contained"
                fullWidth
                onClick={() => handleStartQuiz(quiz)}
              >
                Review Quiz
              </Button>
            ) : (
              <Button
                color="primary"
                variant="contained"
                fullWidth
                onClick={() => handleStartQuiz(quiz)}
                disabled={quiz.status === 'upcoming'}
              >
                {quiz.status === 'upcoming' ? 'Not Available Yet' : 'Start Quiz'}
              </Button>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  };

  // Render empty state when no quizzes are available
  const renderEmptyState = () => {
    return (
      <Box textAlign="center" mt={4} mb={4}>
        <Typography variant="h6" gutterBottom>
          No quizzes available in this category
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Check back later for new quizzes
        </Typography>
      </Box>
    );
  };

  return (
    <Container className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Quizzes
      </Typography>
      
      {/* Quiz filter tabs */}
      <Paper className={classes.tabs}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label={`Pending (${pendingQuizzes.length})`} />
          <Tab label={`Upcoming (${upcomingQuizzes.length})`} />
          <Tab label={`Completed (${completedQuizzes.length})`} />
        </Tabs>
      </Paper>
      
      {/* Quiz cards */}
      <Grid container spacing={3}>
        {tabValue === 0 && (
          pendingQuizzes.length > 0 
            ? pendingQuizzes.map(renderQuizCard) 
            : renderEmptyState()
        )}
        
        {tabValue === 1 && (
          upcomingQuizzes.length > 0 
            ? upcomingQuizzes.map(renderQuizCard) 
            : renderEmptyState()
        )}
        
        {tabValue === 2 && (
          completedQuizzes.length > 0 
            ? completedQuizzes.map(renderQuizCard) 
            : renderEmptyState()
        )}
      </Grid>
      
      {/* Quiz taking dialog */}
      <Dialog
        open={quizDialogOpen}
        onClose={handleCloseQuiz}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {selectedQuiz && selectedQuiz.title}
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedQuiz && !quizSubmitted && (
            <div className={classes.timerSection}>
              <Box className={classes.timer}>
                <TimerIcon className={classes.timerIcon} />
                <Typography variant="subtitle1">
                  Time Remaining: {formatTime(remainingTime)}
                </Typography>
              </Box>
            </div>
          )}
          
          {quizSubmitted ? renderResults() : renderQuestion()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseQuiz} color="primary">
            {quizSubmitted ? 'Close' : 'Exit Quiz'}
          </Button>
          
          {!quizSubmitted && currentQuestion === selectedQuiz?.questions.length - 1 && (
            <Button
              onClick={handleSubmitQuiz}
              color="primary"
              variant="contained"
              disabled={Object.keys(answers).length !== selectedQuiz?.questions.length}
            >
              Submit Quiz
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Confirm exit dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleConfirmClose}
      >
        <DialogTitle>
          Exit Quiz?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to exit? Your progress will not be saved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmExit} color="secondary">
            Exit Quiz
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}        </Alert>
      </Snackbar>
    </Container>
  );
}

export default StudentQuizzes;





