import React, { useState } from 'react';
import { Check as CheckIcon, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { InlineMath, BlockMath } from 'react-katex';
import { generateQuizWithAI } from '../../services/aiService';
import { accessibilityHelpers, useAccessibility } from '../../utils/accessibilityHelpers';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
// Mock AI service - would be replaced with actual Gemini API integration

const useStyles = makeStyles(theme => ({
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(4),
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 45px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 35px 65px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.15)',
    },
  },
  title: {
    background: 'linear-gradient(135deg, #3a86ff 0%, #8338ec 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 700,
    marginBottom: theme.spacing(3),
    textAlign: 'center',
  },
  formSection: {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    border: '1px solid rgba(58, 134, 255, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.9)',
      transform: 'translateY(-1px)',
      boxShadow: '0 8px 24px rgba(58, 134, 255, 0.1)',
    },
  },
  formControl: {
    minWidth: '100%',
    '& .MuiOutlinedInput-root': {
      borderRadius: 12,
      background: 'rgba(255, 255, 255, 0.9)',
      transition: 'all 0.3s ease',
      '&:hover': {
        background: 'rgba(255, 255, 255, 1)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#3a86ff',
        },
      },
      '&.Mui-focused': {
        background: 'rgba(255, 255, 255, 1)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#3a86ff',
          borderWidth: 2,
        },
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 500,
    },
  },
  submitButton: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(1.5, 4),
    borderRadius: 12,
    background: 'linear-gradient(135deg, #3a86ff 0%, #8338ec 100%)',
    boxShadow: '0 10px 25px rgba(58, 134, 255, 0.3)',
    transition: 'all 0.3s ease',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
    '&:hover': {
      background: 'linear-gradient(135deg, #2e75e6 0%, #7029d3 100%)',
      boxShadow: '0 15px 35px rgba(58, 134, 255, 0.4)',
      transform: 'translateY(-2px)',
    },
    '&:disabled': {
      background: 'linear-gradient(135deg, #bbb 0%, #999 100%)',
      boxShadow: 'none',
      transform: 'none',
    },
  },
  topicChips: {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: theme.spacing(2),
    gap: theme.spacing(1),
    '& .MuiChip-root': {
      borderRadius: 20,
      background:
        'linear-gradient(135deg, rgba(58, 134, 255, 0.1) 0%, rgba(131, 56, 236, 0.1) 100%)',
      border: '1px solid rgba(58, 134, 255, 0.2)',
      transition: 'all 0.3s ease',
      '&:hover': {
        background:
          'linear-gradient(135deg, rgba(58, 134, 255, 0.2) 0%, rgba(131, 56, 236, 0.2) 100%)',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(58, 134, 255, 0.2)',
      },
    },
  },
  generatedQuizSection: {
    marginTop: theme.spacing(4),
  },
  sectionTitle: {
    background: 'linear-gradient(135deg, #3a86ff 0%, #8338ec 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 600,
    marginBottom: theme.spacing(3),
  },
  questionPaper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderRadius: 16,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(58, 134, 255, 0.1)',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 24px rgba(58, 134, 255, 0.1)',
      background: 'rgba(255, 255, 255, 0.95)',
    },
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    '& .MuiTypography-root': {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  },
  previewOption: {
    margin: theme.spacing(1, 0),
    padding: theme.spacing(1),
    borderRadius: 8,
    background: 'rgba(248, 250, 252, 0.8)',
    border: '1px solid rgba(226, 232, 240, 0.5)',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(241, 245, 249, 0.9)',
      transform: 'translateX(4px)',
    },
  },
  previewAnswer: {
    fontWeight: 'bold',
    color: theme.palette.success.main,
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: 10,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  previewExplanation: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    fontStyle: 'italic',
    borderRadius: 10,
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    color: theme.palette.text.secondary,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
    '& .MuiButton-root': {
      borderRadius: 10,
      textTransform: 'none',
      fontWeight: 500,
      padding: theme.spacing(1, 3),
      transition: 'all 0.3s ease',
    },
  },
  actionButton: {
    borderRadius: 10,
    textTransform: 'none',
    fontWeight: 500,
    padding: theme.spacing(1, 3),
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.1)',
    },
  },
  aiButton: {
    background: 'linear-gradient(135deg, #a142f4 0%, #8b5cf6 100%)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
      boxShadow: '0 10px 20px rgba(161, 66, 244, 0.3)',
    },
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  loadingText: {
    color: 'white',
    fontWeight: 500,
  },
  // Screen reader only class for accessibility
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
}));

// Helper function to safely render math expressions
const renderMathExpression = text => {
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
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }

    // Add the math expression
    try {
      const isBlock =
        openDelim === '\[' ||
        (openDelim === '$' && closeDelim === '$' && mathExpression.includes('\\'));
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

function QuizCreation() {
  const classes = useStyles();
  const theme = useTheme();
  const { announceToScreenReader, generateAriaProps } = useAccessibility();
  const [quizTitle, setQuizTitle] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [quizType, setQuizType] = useState('multiple_choice');
  const [difficultyLevel, setDifficultyLevel] = useState('medium');
  const [timeLimit, setTimeLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAddTopic = () => {
    if (topicInput.trim() !== '' && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleDeleteTopic = topicToDelete => {
    setTopics(topics.filter(topic => topic !== topicToDelete));
  };

  const handleGenerateQuiz = async () => {
    // Validation
    if (quizTitle.trim() === '') {
      setError('Please provide a quiz title');
      announceToScreenReader('Error: Please provide a quiz title');
      return;
    }

    if (topics.length === 0) {
      setError('Please add at least one topic');
      announceToScreenReader('Error: Please add at least one topic');
      return;
    }

    setLoading(true);
    setError('');
    announceToScreenReader('Generating quiz with AI, please wait...');

    try {
      // This would be replaced with an actual API call to Gemini
      const generatedQuizData = await generateQuizWithAI({
        title: quizTitle,
        subject: quizTitle.split(' ')[0], // Use first word of title as subject
        topics: topics,
        numQuestions: questionCount,
        questionType: quizType,
        difficulty: difficultyLevel,
      });

      setGeneratedQuiz(generatedQuizData);
      setSuccess(true);
      announceToScreenReader(
        `Quiz generated successfully with ${generatedQuizData.questions.length} questions`
      );
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError('Failed to generate quiz. Please try again.');
      announceToScreenReader('Error: Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = () => {
    // Save quiz to database logic would go here
    setSuccess(true);
  };

  const renderQuestion = (question, index) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            {question.options?.map((option, i) => (
              <Typography key={i} variant="body2" className={classes.previewOption}>
                {String.fromCharCode(65 + i)}. {renderMathExpression(option)}
              </Typography>
            ))}
            <Typography variant="body2" className={classes.previewAnswer}>
              Correct Answer: {renderMathExpression(question.correctAnswer)}
            </Typography>
            <Typography variant="body2" className={classes.previewExplanation}>
              Explanation: {renderMathExpression(question.explanation)}
            </Typography>
          </div>
        );
      case 'fill_blank':
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            <Typography variant="body2" className={classes.previewAnswer}>
              Correct Answer: {renderMathExpression(question.correctAnswer)}
            </Typography>
            <Typography variant="body2" className={classes.previewExplanation}>
              Explanation: {renderMathExpression(question.explanation)}
            </Typography>
          </div>
        );
      case 'short_answer':
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            <Typography variant="body2" className={classes.previewAnswer}>
              Sample Answer: {renderMathExpression(question.correctAnswer)}
            </Typography>
            <Typography variant="body2" className={classes.previewExplanation}>
              Explanation: {renderMathExpression(question.explanation)}
            </Typography>
          </div>
        );
      case 'long_answer':
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            <Typography variant="body2" className={classes.previewExplanation}>
              Grading Rubric: {renderMathExpression(question.explanation)}
            </Typography>
          </div>
        );
      case 'true_false':
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            <Typography variant="body2" className={classes.previewAnswer}>
              Correct Answer: {renderMathExpression(question.correctAnswer)}
            </Typography>
            <Typography variant="body2" className={classes.previewExplanation}>
              Explanation: {renderMathExpression(question.explanation)}
            </Typography>
          </div>
        );
      default:
        return (
          <div>
            <Typography variant="body1">
              {index + 1}. {renderMathExpression(question.question)}
            </Typography>
            <Typography variant="body2" className={classes.previewAnswer}>
              Answer: {renderMathExpression(question.correctAnswer)}
            </Typography>
          </div>
        );
    }
  };

  return (
    <Container className={classes.container}>
      <Paper className={classes.paper}>
        <Typography variant="h4" className={classes.title}>
          Create AI-Generated Quiz ✨
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          paragraph
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          Leverage AI to automatically generate quizzes based on topics and preferences
        </Typography>

        {/* Quiz Details Section */}
        <div className={classes.formSection}>
          <Typography variant="h6" className={classes.sectionTitle} gutterBottom>
            Quiz Details
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Quiz Title"
                variant="outlined"
                fullWidth
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
                required
                className={classes.formControl}
                {...generateAriaProps('textbox', 'Enter quiz title', {
                  'aria-labelledby': 'quiz-title-label',
                  'aria-describedby': 'quiz-title-help',
                  'aria-required': true,
                  'aria-invalid': error && quizTitle.trim() === '',
                })}
                error={error && quizTitle.trim() === ''}
                helperText={error && quizTitle.trim() === '' ? 'Quiz title is required' : ''}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Add Topics"
                variant="outlined"
                fullWidth
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                helperText="Press Enter to add multiple topics"
                className={classes.formControl}
                {...generateAriaProps('textbox', 'Enter topic and press Enter to add', {
                  'aria-labelledby': 'topics-label',
                  'aria-describedby': 'topics-help topics-chips',
                })}
              />
              {topics.length > 0 && (
                <div
                  className={classes.topicChips}
                  id="topics-chips"
                  role="group"
                  aria-label={`Selected topics: ${topics.join(', ')}`}
                >
                  {topics.map((topic, index) => (
                    <Chip
                      key={topic}
                      label={topic}
                      onDelete={() => handleDeleteTopic(topic)}
                      color="primary"
                      variant="outlined"
                      aria-label={`Topic: ${topic}. Press Delete to remove`}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          handleDeleteTopic(topic);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </Grid>
          </Grid>
        </div>

        {/* Quiz Configuration Section */}
        <div className={classes.formSection}>
          <Typography variant="h6" className={classes.sectionTitle} gutterBottom>
            Quiz Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel
                  id="quiz-type-label"
                  {...generateAriaProps('label', 'Quiz Type selection', {
                    'aria-required': true,
                  })}
                >
                  Quiz Type
                </InputLabel>
                <Select
                  value={quizType}
                  onChange={e => setQuizType(e.target.value)}
                  label="Quiz Type"
                  labelId="quiz-type-label"
                  aria-describedby="quiz-type-help"
                  required
                >
                  <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  <MenuItem value="fill_blank">Fill in the Blanks</MenuItem>
                  <MenuItem value="true_false">True / False</MenuItem>
                  <MenuItem value="short_answer">Short Answer</MenuItem>
                  <MenuItem value="long_answer">Long Answer/Essay</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel
                  id="difficulty-level-label"
                  {...generateAriaProps('label', 'Difficulty Level selection', {
                    'aria-required': true,
                  })}
                >
                  Difficulty Level
                </InputLabel>
                <Select
                  value={difficultyLevel}
                  onChange={e => setDifficultyLevel(e.target.value)}
                  label="Difficulty Level"
                  labelId="difficulty-level-label"
                  aria-describedby="difficulty-help"
                  required
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel
                  id="question-count-label"
                  {...generateAriaProps('label', 'Number of Questions selection', {
                    'aria-required': true,
                  })}
                >
                  Number of Questions
                </InputLabel>
                <Select
                  value={questionCount}
                  onChange={e => setQuestionCount(e.target.value)}
                  label="Number of Questions"
                  labelId="question-count-label"
                  aria-describedby="question-count-help"
                  required
                >
                  {[5, 10, 15, 20, 25, 30].map(num => (
                    <MenuItem key={num} value={num}>
                      {num}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel
                  id="time-limit-label"
                  {...generateAriaProps('label', 'Time Limit selection', {
                    'aria-required': true,
                  })}
                >
                  Time Limit (minutes)
                </InputLabel>
                <Select
                  value={timeLimit}
                  onChange={e => setTimeLimit(e.target.value)}
                  label="Time Limit (minutes)"
                  labelId="time-limit-label"
                  aria-describedby="time-limit-help"
                  required
                >
                  {[15, 30, 45, 60, 90, 120].map(num => (
                    <MenuItem key={num} value={num}>
                      {num}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText id="time-limit-help">
                  Time allowed for quiz completion
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </div>

        {/* Generate Quiz Button Section */}
        <div className={classes.formSection}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleGenerateQuiz}
                disabled={loading}
                className={`${classes.submitButton} ${classes.aiButton}`}
                {...generateAriaProps(
                  'button',
                  loading ? 'Generating quiz, please wait' : 'Generate quiz with AI',
                  {
                    'aria-labelledby': 'generate-quiz-label',
                    'aria-describedby': 'generate-quiz-status',
                    'aria-disabled': loading,
                  }
                )}
                aria-label={loading ? 'Generating quiz, please wait' : 'Generate quiz with AI'}
              >
                {loading ? (
                  <div className={classes.loadingContainer}>
                    <CircularProgress size={24} color="inherit" aria-hidden="true" />
                    <Typography className={classes.loadingText}>Generating AI Quiz...</Typography>
                  </div>
                ) : (
                  'GENERATE QUIZ WITH AI ✨'
                )}
              </Button>
              <div
                id="generate-quiz-status"
                className={classes.srOnly}
                role="status"
                aria-live="polite"
              >
                {loading ? 'Quiz generation in progress' : ''}
              </div>
            </Grid>
          </Grid>
        </div>

        {/* Display Generated Quiz */}
        {generatedQuiz && (
          <div
            className={classes.generatedQuizSection}
            role="region"
            aria-labelledby="quiz-preview-heading"
          >
            <Divider style={{ margin: '2rem 0' }} />
            <Box mt={2} mb={2}>
              <Typography
                variant="h5"
                className={classes.sectionTitle}
                gutterBottom
                id="quiz-preview-heading"
              >
                Preview: {generatedQuiz.title}
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                style={{ textAlign: 'center' }}
                aria-label={`Quiz contains ${generatedQuiz.questions.length} questions, ${difficultyLevel} difficulty level, ${timeLimit} minutes time limit`}
              >
                {generatedQuiz.questions.length} questions · {difficultyLevel} difficulty ·{' '}
                {timeLimit} minutes
              </Typography>
            </Box>

            <div role="list" aria-label="Quiz questions">
              {generatedQuiz.questions.map((question, index) => (
                <Paper
                  key={index}
                  className={classes.question}
                  role="listitem"
                  aria-labelledby={`question-${index}-heading`}
                >
                  <div className={classes.questionHeader} id={`question-${index}-heading`}>
                    {renderQuestion(question, index)}
                  </div>
                </Paper>
              ))}
            </div>

            <div className={classes.buttonGroup} role="group" aria-label="Quiz actions">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveQuiz}
                startIcon={<CheckIcon />}
                className={classes.actionButton}
                {...generateAriaProps('button', 'Save generated quiz to database', {
                  'aria-describedby': 'save-quiz-help',
                })}
                aria-label="Save generated quiz to database"
              >
                Save Quiz
              </Button>
              <Button
                variant="outlined"
                onClick={() => setGeneratedQuiz(null)}
                className={classes.actionButton}
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Notifications */}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert onClose={() => setError('')} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar open={success} autoHideDuration={6000} onClose={() => setSuccess(false)}>
          <Alert onClose={() => setSuccess(false)} severity="success">
            {generatedQuiz ? 'Quiz generated successfully!' : 'Quiz saved successfully!'}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
}

export default QuizCreation;
