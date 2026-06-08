import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, HelpOutline as QuestionIcon, Quiz as QuizIcon, Save as SaveIcon } from '@mui/icons-material';
import makeStyles from '../../utils/makeStylesCompat';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import facultyService from '../../services/facultyService';
import { generateQuizWithAI } from '../../services/aiService';

import { Box, Button, Card, CardContent, Checkbox, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, IconButton, InputLabelItem, Select, Step, StepLabel, Stepper, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
  Save as SaveIcon

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quiz-creation-tabpanel-${index}`}
      aria-labelledby={`quiz-creation-tab-${index}`}
      {...other}
    >
      {value === index && <Box style={{ padding: 24 }}>{children}</Box>}
    </div>
  );
}

const EnhancedQuizCreation = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
    // Quiz Configuration State
  const [quizConfig, setQuizConfig] = useState({
    title: '',
    description: '',
    subject: '',
    class: '',
    category: '',
    difficulty: 'medium',
    duration: 60,
    timeLimit: 60,
    totalPoints: 0,
    passingScore: 60,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    shuffleAnswers: false,
    showCorrectAnswers: true,
    showScoreImmediately: true,
    allowBackNavigation: true,
    requireProctoring: false,
    accessCode: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    instructions: '',
    tags: ''
  });
  // Questions State
  const [questions, setQuestions] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState(new Set());

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // AI Generation State
  const [aiConfig, setAiConfig] = useState({
    topic: '',
    numQuestions: 10,
    difficulty: 'medium',
    questionTypes: ['multiple-choice'],
    includeExplanations: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
    // Dialog States
  const [questionDialog, setQuestionDialog] = useState({ open: false, question: null, index: -1 });
  const [bankDialog, setBankDialog] = useState({ open: false });

  // Form States
  const [questionForm, setQuestionForm] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    points: 1,
    difficulty: 'medium'
  });

  const steps = ['Basic Information', 'Add Questions', 'Configuration', 'Review & Publish'];
  const loadQuestionBank = async () => {
    try {
      const response = await facultyService.getQuestionBank();
      setQuestionBank(response.data || []);
    } catch (error) {
      console.error('Error loading question bank:', error);
    }  };

  const calculateTotalPoints = useCallback(() => {
    const total = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    setQuizConfig(prev => ({ ...prev, totalPoints: total }));
  }, [questions]);

  useEffect(() => {
    loadQuestionBank();
    calculateTotalPoints();
  }, [questions, calculateTotalPoints]);

  // Optimized onChange handlers to prevent input focus loss
  const handleQuizConfigChange = useCallback((field, type = 'string') => (e) => {
    const value = type === 'number' ? parseInt(e.target.value) :
                  type === 'boolean' ? e.target.checked : e.target.value;
    setQuizConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleQuestionFormChange = useCallback((field, type = 'string') => (e) => {
    const value = type === 'number' ? parseInt(e.target.value) :
                  type === 'boolean' ? e.target.checked : e.target.value;
    setQuestionForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleQuestionOptionsChange = useCallback((index, value) => {
    setQuestionForm(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }, []);  const handleAiConfigChange = useCallback((field, type = 'string') => (e) => {
    const value = type === 'number' ? parseInt(e.target.value) :
                  type === 'boolean' ? e.target.checked : e.target.value;
    setAiConfig(prev => ({ ...prev, [field]: value }));
  }, []);
  const handleQuizConfigDateChange = useCallback((field, value) => {
    setQuizConfig(prev => ({ ...prev, [field]: new Date(value) }));
  }, []);
  const handleTrueFalseChange = useCallback((value) => (e) => {
    setQuestionForm(prev => ({
      ...prev,
      correctAnswer: e.target.checked ? value : ''
    }));
  }, []);

  const handleSearchTermChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSubjectFilterChange = useCallback((e) => {
    setSelectedSubject(e.target.value);
  }, []);

  const handleDifficultyFilterChange = useCallback((e) => {
    setSelectedDifficulty(e.target.value);
  }, []);

  const handleTypeFilterChange = useCallback((e) => {
    setSelectedType(e.target.value);  }, []);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  const generateAIQuestions = async () => {
    try {
      setIsGenerating(true);
      const response = await generateQuizWithAI({
        topic: aiConfig.topic,
        numQuestions: aiConfig.numQuestions,
        difficulty: aiConfig.difficulty,
        questionType: aiConfig.questionTypes[0], // Use first question type
        subject: quizConfig.subject
      });
        const generatedQuestions = Array.isArray(response.questions)
        ? response.questions.map((q, index) => ({
            ...q,
            id: `ai_${Date.now()}_${index}`,
            points: 1,
            difficulty: aiConfig.difficulty
          }))
        : [];

      setQuestions(prev => [...prev, ...generatedQuestions]);
    } catch (error) {
      console.error('Error generating AI questions:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  const addQuestionFromBank = () => {
    const selectedQuestions = Array.isArray(questionBank) ? questionBank.filter(q => selectedBankQuestions.has(q.id)) : [];
    setQuestions(prev => [...prev, ...selectedQuestions]);
    setSelectedBankQuestions(new Set());
    setBankDialog({ open: false });
  };

  const addManualQuestion = () => {
    if (questionDialog.index >= 0) {
      // Edit existing question
      const updatedQuestions = [...questions];
      updatedQuestions[questionDialog.index] = {
        ...questionForm,
        id: questions[questionDialog.index].id
      };
      setQuestions(updatedQuestions);
    } else {
      // Add new question
      const newQuestion = {
        ...questionForm,
        id: Date.now()
      };
      setQuestions(prev => [...prev, newQuestion]);
    }

    resetQuestionForm();
    setQuestionDialog({ open: false, question: null, index: -1 });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
      difficulty: 'medium'
    });
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const editQuestion = (question, index) => {
    setQuestionForm(question);
    setQuestionDialog({ open: true, question, index });
  };

  const saveQuiz = async (status = 'draft') => {
    try {
      const quizData = {
        ...quizConfig,
        questions,
        status,
        createdAt: new Date().toISOString()      };

      await facultyService.createQuiz(quizData);
      navigate('/faculty/quiz-management');
    } catch (error) {
      console.error('Error saving quiz:', error);
    }
  };

  const publishQuiz = () => {
    saveQuiz('active');
  };  // Step 1: Basic Information
  const BasicInformationStep = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Typography variant="h6" gutterBottom>
          Quiz Basic Information
        </Typography>
      </Grid>
      <Grid size={{xs:12,md:6}}>
        <TextField
          fullWidth
          label="Quiz Title"
          value={quizConfig.title}
          onChange={handleQuizConfigChange('title')}
          required
        />
      </Grid>
      <Grid size={{xs:12,md:6}}>
        <FormControl fullWidth>
          <InputLabel>Subject</InputLabel><Select
            value={quizConfig.subject}
            onChange={handleQuizConfigChange('subject')}
            label="Subject"
            required
          >
            <MenuItem value="Mathematics">Mathematics</MenuItem>
            <MenuItem value="Science">Science</MenuItem>
            <MenuItem value="English">English</MenuItem>
            <MenuItem value="History">History</MenuItem>
            <MenuItem value="Geography">Geography</MenuItem>
          </Select>        </FormControl>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <FormControl fullWidth>
          <InputLabel>Class</InputLabel>
          <Select            value={quizConfig.class}
            onChange={handleQuizConfigChange('class')}
            label="Class"
            required
          >
            <MenuItem value="Class 1">Class 1</MenuItem>
            <MenuItem value="Class 2">Class 2</MenuItem>
            <MenuItem value="Class 3">Class 3</MenuItem>
            <MenuItem value="Class 4">Class 4</MenuItem>
            <MenuItem value="Class 5">Class 5</MenuItem>
            <MenuItem value="Class 6">Class 6</MenuItem>
            <MenuItem value="Class 7">Class 7</MenuItem>
            <MenuItem value="Class 8">Class 8</MenuItem>
            <MenuItem value="Class 9">Class 9</MenuItem>
            <MenuItem value="Class 10">Class 10</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{xs:12}}>
        <TextField
          fullWidth
          label="Description"
          multiline
          minRows={3}          value={quizConfig.description}
          onChange={handleQuizConfigChange('description')}        />
      </Grid>
        <Grid size={{xs:12,md:4}}>
        <FormControl fullWidth>
          <InputLabel>Difficulty</InputLabel>
          <Select
            value={quizConfig.difficulty}
            onChange={handleQuizConfigChange('difficulty')}
            label="Difficulty"
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{xs:12,md:4}}>
        <TextField
          fullWidth
          label="Duration (minutes)"
          type="number"
          value={quizConfig.duration}
          onChange={handleQuizConfigChange('duration', 'number')}
        />
      </Grid>

      <Grid size={{xs:12,md:4}}>
        <TextField
          fullWidth
          label="Passing Score (%)"
          type="number"
          value={quizConfig.passingScore}
          onChange={handleQuizConfigChange('passingScore', 'number')}
        />
      </Grid>

      <Grid size={{xs:12}}>
        <TextField
          fullWidth
          label="Instructions for Students"
          multiline
          minRows={4}
          value={quizConfig.instructions}
          onChange={handleQuizConfigChange('instructions')}
          placeholder="Enter any special instructions for students taking this quiz..."
        />
      </Grid>
    </Grid>
  );

  // Step 2: Add Questions
  const AddQuestionsStep = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Quiz Questions ({questions.length} questions, {quizConfig.totalPoints} points)
        </Typography>
        <Box>
          <Button            variant="outlined"
            startIcon={<HelpOutline as QuestionIcon />}
            onClick={() => setBankDialog({ open: true })}
            style={{ marginRight: 8 }}
          >
            From Bank
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setQuestionDialog({ open: true, question: null, index: -1 })}
            style={{ marginRight: 8 }}
          >
            Add Manual
          </Button>
          <Button
            variant="contained"
            startIcon={<AIIcon />}
            onClick={() => setTabValue(1)}
          >
            AI Generate
          </Button>
        </Box>
      </Box>      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} style={{ marginBottom: 24 }}>
        <Tab label="Question List" />
        <Tab label="AI Generator" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {questions.length === 0 ? (
          <Card>            <CardContent style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
              <HelpOutline as QuestionIcon style={{ fontSize: 64, color: '#757575', marginBottom: 16 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No questions added yet
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
                Add questions from your question bank, create them manually, or use AI generation
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box>
            {Array.isArray(questions) && questions.map((question, index) => (
              <Card key={question.id} style={{ marginBottom: 16 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography variant="body2" color="textSecondary" style={{ marginRight: 8 }}>
                          Q{index + 1}.
                        </Typography>
                        <Chip
                          label={question.type}
                          size="small"
                          variant="outlined"
                          style={{ marginRight: 8 }}
                        />
                        <Chip
                          label={`${question.points || 1} pts`}
                          size="small"
                          color="primary"
                          style={{ marginRight: 8 }}
                        />
                        <Chip
                          label={question.difficulty}
                          size="small"
                          color={question.difficulty === 'hard' ? 'error' :
                                question.difficulty === 'medium' ? 'warning' : 'success'}
                        />
                      </Box>

                      <Typography variant="h6" gutterBottom>
                        {question.question}
                      </Typography>
                        {question.type === 'multiple-choice' && question.options && (                        <Box style={{ marginLeft: 16 }}>
                          {Array.isArray(question.options) && question.options.map((option, optIndex) => (
                            <Typography
                              key={optIndex}
                              variant="body2"
                              color={option === question.correctAnswer ? 'primary' : 'textSecondary'}
                              style={{ fontWeight: option === question.correctAnswer ? 'bold' : 'normal' }}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {question.explanation && (
                        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, fontStyle: 'italic' }}>
                          Explanation: {question.explanation}
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <IconButton size="small" onClick={() => editQuestion(question, index)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeQuestion(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>            <Typography variant="h6" gutterBottom>
              AI Question Generator
            </Typography>

            <Grid container spacing={3}>              <Grid size={{xs:12,md:6}}>
                <TextField
                  fullWidth
                  label="Topic/Theme"                  value={aiConfig.topic}
                  onChange={handleAiConfigChange('topic')}
                  placeholder="e.g., Photosynthesis, World War II, Algebra..."
                />
              </Grid>
                <Grid size={{xs:12,md:3}}>
                <TextField
                  fullWidth
                  label="Number of Questions"
                  type="number"
                  value={aiConfig.numQuestions}
                  onChange={handleAiConfigChange('numQuestions', 'number')}
                  inputProps={{ min: 1, max: 50 }}
                />
              </Grid>

              <Grid size={{xs:12,md:3}}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={aiConfig.difficulty}
                    onChange={handleAiConfigChange('difficulty')}
                    label="Difficulty"
                  >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12}}>
                <FormControl fullWidth>
                  <InputLabel>Question Types</InputLabel>
                  <Select
                    multiple
                    value={aiConfig.questionTypes}
                    onChange={handleAiConfigChange('questionTypes')}                    label="Question Types"
                    renderValue={(selected) => (
                      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Array.isArray(selected) && selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                    <MenuItem value="true-false">True/False</MenuItem>
                    <MenuItem value="fill-in-blank">Fill in Blank</MenuItem>
                    <MenuItem value="short-answer">Short Answer</MenuItem>
                  </Select>              </FormControl>
              </Grid>

              <Grid size={{xs:12}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={aiConfig.includeExplanations}
                      onChange={handleAiConfigChange('includeExplanations', 'boolean')}
                    />
                  }
                  label="Include explanations for answers"
                />
              </Grid>

              <Grid size={{xs:12}}>
                <Button
                  variant="contained"
                  startIcon={<AIIcon />}
                  onClick={generateAIQuestions}
                  disabled={!aiConfig.topic || isGenerating}
                  fullWidth
                  size="large"
                >
                  {isGenerating ? 'Generating Questions...' : 'Generate Questions with AI'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>  );

  // Step 3: Configuration
  const ConfigurationStep = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Typography variant="h6" gutterBottom>
          Quiz Settings & Configuration
        </Typography>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <TextField
          fullWidth
          label="Time Limit (minutes)"
          type="number"
          value={quizConfig.timeLimit}
          onChange={handleQuizConfigChange('timeLimit', 'number')}
          inputProps={{ min: 1, max: 300 }}
        />
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <TextField
          fullWidth
          label="Maximum Attempts"
          type="number"
          value={quizConfig.maxAttempts}
          onChange={handleQuizConfigChange('maxAttempts', 'number')}
          inputProps={{ min: 1, max: 10 }}
        />
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <TextField
          fullWidth
          label="Access Code (Optional)"
          value={quizConfig.accessCode}
          onChange={handleQuizConfigChange('accessCode')}
          placeholder="Leave empty for no access code"
        />
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <TextField
          fullWidth
          label="Tags (comma separated)"
          value={quizConfig.tags}
          onChange={handleQuizConfigChange('tags')}
          placeholder="e.g., midterm, chapter1, practice"
        />
      </Grid>

      <Grid size={{xs:12}}>
        <Typography variant="subtitle1" gutterBottom>
          Quiz Behavior Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.shuffleQuestions}
                  onChange={handleQuizConfigChange('shuffleQuestions', 'boolean')}
                />
              }
              label="Shuffle Questions"
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.shuffleOptions}
                  onChange={handleQuizConfigChange('shuffleOptions', 'boolean')}
                />
              }
              label="Shuffle Answer Options"
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.allowBackNavigation}
                  onChange={handleQuizConfigChange('allowBackNavigation', 'boolean')}
                />
              }
              label="Allow Back Navigation"
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.showCorrectAnswers}
                  onChange={handleQuizConfigChange('showCorrectAnswers', 'boolean')}
                />
              }
              label="Show Correct Answers"
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.showScoreImmediately}
                  onChange={handleQuizConfigChange('showScoreImmediately', 'boolean')}
                />
              }
              label="Show Score Immediately"
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <FormControlLabel
              control={
                <Switch
                  checked={quizConfig.requireProctoring}
                  onChange={handleQuizConfigChange('requireProctoring', 'boolean')}
                />
              }
              label="Require Proctoring"
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  // Step 4: Review & Publish
  const ReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quiz Review
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Title:</strong> {quizConfig.title || 'Not set'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Subject:</strong> {quizConfig.subject || 'Not set'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Class:</strong> {quizConfig.class || 'Not set'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Difficulty:</strong> {quizConfig.difficulty}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Duration:</strong> {quizConfig.duration} minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12,md:6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Questions Summary
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Total Questions:</strong> {questions.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Total Points:</strong> {quizConfig.totalPoints}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Passing Score:</strong> {quizConfig.passingScore}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Time Limit:</strong> {quizConfig.timeLimit} minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Questions Preview
              </Typography>
              {questions.length === 0 ? (
                <Typography variant="body2" color="error">
                  ⚠️ No questions added to this quiz yet. Please add questions before publishing.
                </Typography>
              ) : (
                <Box>
                  {questions.slice(0, 3).map((question, index) => (
                    <Box key={question.id} mb={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
                      <Typography variant="body1">
                        <strong>Q{index + 1}:</strong> {question.question}
                      </Typography>
                      <Box mt={1}>
                        <Chip label={question.type} size="small" />
                        <Chip label={`${question.points} pts`} size="small" />
                      </Box>
                    </Box>
                  ))}
                  {questions.length > 3 && (
                    <Typography variant="body2" color="textSecondary">
                      ... and {questions.length - 3} more questions
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Question Creation Dialog
  const QuestionDialog = () => (
    <Dialog
      open={questionDialog.open}
      onClose={() => setQuestionDialog({ open: false, question: null, index: -1 })}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {questionDialog.index >= 0 ? 'Edit Question' : 'Add New Question'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} style={{ marginTop: 8 }}>
          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              label="Question"
              multiline
              minRows={3}
              value={questionForm.question}
              onChange={handleQuestionFormChange('question')}
            />
          </Grid>

          <Grid size={{xs:12,md:6}}>
            <FormControl fullWidth>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={questionForm.type}
                onChange={handleQuestionFormChange('type')}
                label="Question Type"
              >
                <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                <MenuItem value="true-false">True/False</MenuItem>
                <MenuItem value="fill-in-blank">Fill in Blank</MenuItem>
                <MenuItem value="short-answer">Short Answer</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12,md:3}}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={questionForm.difficulty}
                onChange={handleQuestionFormChange('difficulty')}
                label="Difficulty"
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12,md:3}}>
            <TextField
              fullWidth
              label="Points"
              type="number"
              value={questionForm.points}
              onChange={handleQuestionFormChange('points', 'number')}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>

          {/* Multiple Choice Options */}
          {questionForm.type === 'multiple-choice' && (
            <Grid size={{xs:12}}>
              <Typography variant="subtitle1" gutterBottom>
                Answer Options
              </Typography>
              {questionForm.options.map((option, index) => (
                <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                  <TextField
                    fullWidth
                    label={`Option ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => handleQuestionOptionsChange(index, e.target.value)}
                  />
                  <Checkbox
                    checked={questionForm.correctAnswer === option}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setQuestionForm(prev => ({ ...prev, correctAnswer: option }));
                      }
                    }}
                    color="primary"
                  />
                  <Typography variant="body2">Correct</Typography>
                </Box>
              ))}
            </Grid>
          )}

          {/* True/False Options */}
          {questionForm.type === 'true-false' && (
            <Grid size={{xs:12}}>
              <Typography variant="subtitle1" gutterBottom>
                Correct Answer
              </Typography>
              <Box display="flex" gap={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={questionForm.correctAnswer === 'true'}
                      onChange={handleTrueFalseChange('true')}
                    />
                  }
                  label="True"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={questionForm.correctAnswer === 'false'}
                      onChange={handleTrueFalseChange('false')}
                    />
                  }
                  label="False"
                />
              </Box>
            </Grid>
          )}

          {/* Other question types */}
          {(questionForm.type === 'fill-in-blank' ||
            questionForm.type === 'short-answer') && (
            <Grid size={{xs:12}}>
              <TextField
                fullWidth
                label="Correct Answer"
                value={questionForm.correctAnswer}
                onChange={handleQuestionFormChange('correctAnswer')}
                placeholder="Enter the correct answer..."
              />
            </Grid>
          )}

          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              label="Explanation (Optional)"
              multiline
              minRows={2}
              value={questionForm.explanation}
              onChange={handleQuestionFormChange('explanation')}
              placeholder="Provide an explanation for the correct answer..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setQuestionDialog({ open: false, question: null, index: -1 })}>
          Cancel
        </Button>
        <Button onClick={addManualQuestion} variant="contained">
          {questionDialog.index >= 0 ? 'Update Question' : 'Add Question'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Question Bank Dialog
  const QuestionBankDialog = () => (
    <Dialog
      open={bankDialog.open}
      onClose={() => setBankDialog({ open: false })}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Select Questions from Bank</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} style={{ marginBottom: 16 }}>
          <Grid size={{xs:12,md:3}}>
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={handleSearchTermChange}
              placeholder="Search questions..."
            />
          </Grid>
          <Grid size={{xs:12,md:3}}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                onChange={handleSubjectFilterChange}
                label="Subject"
              >
                <MenuItem value="">All Subjects</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Science">Science</MenuItem>
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="History">History</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{xs:12,md:3}}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                onChange={handleDifficultyFilterChange}
                label="Difficulty"
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{xs:12,md:3}}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                onChange={handleTypeFilterChange}
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                <MenuItem value="true-false">True/False</MenuItem>
                <MenuItem value="fill-in-blank">Fill in Blank</MenuItem>
                <MenuItem value="short-answer">Short Answer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box maxHeight="400px" overflow="auto">
          {Array.isArray(questionBank) && questionBank
            .filter(q => {
              const matchesSearch = !searchTerm ||
                q.question.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesSubject = !selectedSubject || q.subject === selectedSubject;
              const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
              const matchesType = !selectedType || q.type === selectedType;
              return matchesSearch && matchesSubject && matchesDifficulty && matchesType;
            })
            .map(question => (
              <Card key={question.id} style={{ marginBottom: 8 }}>
                <CardContent style={{ padding: 12 }}>
                  <Box display="flex" alignItems="flex-start">
                    <Checkbox
                      checked={selectedBankQuestions.has(question.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedBankQuestions);
                        if (e.target.checked) {
                          newSelected.add(question.id);
                        } else {
                          newSelected.delete(question.id);
                        }
                        setSelectedBankQuestions(newSelected);
                      }}
                    />
                    <Box flex={1} ml={1}>
                      <Typography variant="body1">
                        {question.question}
                      </Typography>
                      <Box mt={1}>
                        <Chip label={question.type} size="small" style={{ marginRight: 4 }} />
                        <Chip label={question.difficulty} size="small" style={{ marginRight: 4 }} />
                        <Chip label={question.subject} size="small" />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBankDialog({ open: false })}>
          Cancel
        </Button>
        <Button
          onClick={addQuestionFromBank}
          variant="contained"
          disabled={selectedBankQuestions.size === 0}
        >
          Add Selected Questions ({selectedBankQuestions.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
  // Main component render
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box style={{ marginBottom: '32px' }}>
          <Typography variant="h4" gutterBottom>
            Create New Quiz
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Build comprehensive quizzes with AI assistance and question bank integration
          </Typography>
        </Box>

        <Card style={{ marginBottom: '32px' }}>
          <CardContent>
            <Stepper activeStep={activeStep}>
              {Array.isArray(steps) && steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {activeStep === 0 && <BasicInformationStep />}
            {activeStep === 1 && <AddQuestionsStep />}
            {activeStep === 2 && <ConfigurationStep />}
            {activeStep === 3 && <ReviewStep />}

            <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="outlined"
              >
                Back
              </Button>

              <Box>
                <Button
                  onClick={() => saveQuiz('draft')}
                  variant="outlined"
                  style={{ marginRight: '8px' }}
                  startIcon={<SaveIcon />}
                >
                  Save Draft
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    onClick={publishQuiz}
                    variant="contained"
                    startIcon={<QuizIcon />}
                  >
                    Publish Quiz
                  </Button>
                ) : (
                  <Button onClick={handleNext} variant="contained">
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <QuestionDialog />
        <QuestionBankDialog />
      </Container>
    </LocalizationProvider>
  );
};

export default EnhancedQuizCreation;