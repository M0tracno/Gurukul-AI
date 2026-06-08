import React, { useState, useEffect } from 'react';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Quiz as QuizIcon, Save as SaveIcon } from '@mui/icons-material';
import {
import IntelligentAssessmentService from '../../services/IntelligentAssessmentService';

import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Fab, FormControl, FormControlLabel, Grid, IconButton, InputLabel, LinearProgress, List, ListItem, ListItemTextItem, Paper, Select, Switch, Tab, Tabs, TextField, Tooltip, Typography, toString } from '@mui/material';
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AutoAwesome as AIIcon,
  Quiz as QuizIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon

const AdvancedAssessmentCreator = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [assessment, setAssessment] = useState({
    title: '',
    description: '',
    subject: '',
    gradeLevel: '',
    difficulty: 'medium',
    duration: 60,
    questions: [],
    tags: [],
    settings: {
      shuffleQuestions: true,
      showResults: true,
      allowRetake: false,
      adaptiveDifficulty: true,
      realTimeFeedback: true,
      aiAssisted: true
    }
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    difficulty: 'medium',
    tags: [],
    points: 1,
    timeLimit: null
  });

  const [aiGenerationSettings, setAiGenerationSettings] = useState({
    topic: '',
    questionCount: 5,
    difficulty: 'medium',
    questionTypes: ['multiple-choice'],
    includeExplanations: true,
    adaptiveGeneration: true
  });

  const [previewDialog, setPreviewDialog] = useState(false);
  const [aiDialog, setAiDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  // Available options
  const subjects = [
    'Mathematics', 'Science', 'English', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art'
  ];

  const gradeLevels = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12'
  ];

  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice', icon: '📝' },
    { value: 'true-false', label: 'True/False', icon: '✓' },
    { value: 'short-answer', label: 'Short Answer', icon: '📋' },
    { value: 'essay', label: 'Essay', icon: '📄' },
    { value: 'fill-blank', label: 'Fill in the Blank', icon: '📝' },
    { value: 'matching', label: 'Matching', icon: '🔗' }
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Easy', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'hard', label: 'Hard', color: '#f44336' }
  ];

  // Initialize service
  useEffect(() => {
    IntelligentAssessmentService.initialize();
  }, []);

  // Handlers
  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }

    setAssessment(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion, id: Date.now() }]
    }));

    // Reset current question
    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      difficulty: 'medium',
      tags: [],
      points: 1,
      timeLimit: null
    });
  };

  const handleDeleteQuestion = (questionId) => {
    setAssessment(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleQuestionTypeChange = (type) => {
    setCurrentQuestion(prev => {
      const newQuestion = { ...prev, type };

      switch (type) {
        case 'multiple-choice':
          return { ...newQuestion, options: ['', '', '', ''], correctAnswer: '' };
        case 'true-false':
          return { ...newQuestion, options: ['True', 'False'], correctAnswer: '' };
        case 'short-answer':
        case 'essay':
        case 'fill-blank':
          return { ...newQuestion, options: [], correctAnswer: '' };
        default:
          return newQuestion;
      }
    });
  };

  const handleAIGeneration = async () => {
    if (!aiGenerationSettings.topic.trim()) {
      alert('Please enter a topic for AI generation');
      return;
    }

    setIsGenerating(true);
    try {
      const questions = await IntelligentAssessmentService.generateQuestions({
        topic: aiGenerationSettings.topic,
        difficulty: aiGenerationSettings.difficulty,
        count: aiGenerationSettings.questionCount,
        types: aiGenerationSettings.questionTypes,
        includeExplanations: aiGenerationSettings.includeExplanations
      });

      setGeneratedQuestions(questions);
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportGeneratedQuestions = (questionsToImport) => {
    const importedQuestions = questionsToImport.map(q => ({
      ...q,
      id: Date.now() + Math.random()
    }));

    setAssessment(prev => ({
      ...prev,
      questions: [...prev.questions, ...importedQuestions]
    }));

    setAiDialog(false);
    setGeneratedQuestions([]);
  };

  const handleSaveAssessment = async () => {
    if (!assessment.title.trim() || assessment.questions.length === 0) {
      alert('Please provide a title and at least one question');
      return;
    }

    setSaveStatus('saving');
    try {
      const assessmentId = await IntelligentAssessmentService.createAssessment({
        ...assessment,
        createdAt: new Date(),
        id: Date.now().toString()
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const renderQuestionForm = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QuizIcon />
          Add New Question
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{xs:12,md:6}}>
            <FormControl fullWidth>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={currentQuestion.type}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                label="Question Type"
              >
                {questionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{type.icon}</span>
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12,md:6}}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={currentQuestion.difficulty}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, difficulty: e.target.value }))}
                label="Difficulty"
              >
                {difficultyLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: level.color
                        }}
                      />
                      {level.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Question"
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter your question here..."
            />
          </Grid>

          {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && (
            <Grid size={{xs:12}}>
              <Typography variant="subtitle2" gutterBottom>Options</Typography>
              {currentQuestion.options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...currentQuestion.options];
                      newOptions[index] = e.target.value;
                      setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                    }}
                    disabled={currentQuestion.type === 'true-false'}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentQuestion.correctAnswer === option}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCurrentQuestion(prev => ({ ...prev, correctAnswer: option }));
                          }
                        }}
                      />
                    }
                    label="Correct"
                  />
                </Box>
              ))}
            </Grid>
          )}

          {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'essay') && (
            <Grid size={{xs:12}}>
              <TextField
                fullWidth
                label="Sample Answer / Keywords"
                value={currentQuestion.correctAnswer}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                placeholder="Enter sample answer or keywords for evaluation..."
              />
            </Grid>
          )}

          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Explanation (Optional)"
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Provide an explanation for the correct answer..."
            />
          </Grid>

          <Grid size={{xs:6}}>
            <TextField
              fullWidth
              type="number"
              label="Points"
              value={currentQuestion.points}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>

          <Grid size={{xs:6}}>
            <TextField
              fullWidth
              type="number"
              label="Time Limit (seconds, optional)"
              value={currentQuestion.timeLimit || ''}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, timeLimit: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Leave empty for no limit"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            sx={{ flexGrow: 1 }}
          >
            Add Question
          </Button>
          <Button
            variant="outlined"
            startIcon={<AIIcon />}
            onClick={() => setAiDialog(true)}
            color="secondary"
          >
            AI Generate
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderQuestionsList = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          Questions ({assessment.questions.length})
        </Typography>

        {assessment.questions.length === 0 ? (
          <Alert severity="info">No questions added yet. Use the form above to add questions.</Alert>
        ) : (
          <List>
            {assessment.questions.map((question, index) => (
              <React.Fragment key={question.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          Q{index + 1}: {question.question.substring(0, 100)}
                          {question.question.length > 100 && '...'}
                        </Typography>
                        <Chip
                          size="small"
                          label={question.type}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={question.difficulty}
                          sx={{
                            backgroundColor: difficultyLevels.find(d => d.value === question.difficulty)?.color,
                            color: 'white'
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Points: {question.points} |
                          {question.timeLimit ? ` Time: ${question.timeLimit}s` : ' No time limit'}
                        </Typography>
                        {question.options.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Options: {question.options.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit Question">
                      <IconButton edge="end" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Question">
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteQuestion(question.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < assessment.questions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  const renderAssessmentSettings = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Assessment Settings</Typography>

        <Grid container spacing={3}>
          <Grid size={{xs:12,md:6}}>
            <TextField
              fullWidth
              label="Assessment Title"
              value={assessment.title}
              onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter assessment title..."
            />
          </Grid>

          <Grid size={{xs:12,md:6}}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={assessment.subject}
                onChange={(e) => setAssessment(prev => ({ ...prev, subject: e.target.value }))}
                label="Subject"
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12,md:6}}>
            <FormControl fullWidth>
              <InputLabel>Grade Level</InputLabel>
              <Select
                value={assessment.gradeLevel}
                onChange={(e) => setAssessment(prev => ({ ...prev, gradeLevel: e.target.value }))}
                label="Grade Level"
              >
                {gradeLevels.map((grade) => (
                  <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12,md:6}}>
            <TextField
              fullWidth
              type="number"
              label="Duration (minutes)"
              value={assessment.duration}
              onChange={(e) => setAssessment(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              inputProps={{ min: 5, max: 180 }}
            />
          </Grid>

          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={assessment.description}
              onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this assessment covers..."
            />
          </Grid>

          <Grid size={{xs:12}}>
            <Typography variant="subtitle2" gutterBottom>Advanced Settings</Typography>

            <Grid container spacing={2}>
              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.shuffleQuestions}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, shuffleQuestions: e.target.checked }
                      }))}
                    />
                  }
                  label="Shuffle Questions"
                />
              </Grid>

              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.showResults}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, showResults: e.target.checked }
                      }))}
                    />
                  }
                  label="Show Results"
                />
              </Grid>

              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.allowRetake}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowRetake: e.target.checked }
                      }))}
                    />
                  }
                  label="Allow Retake"
                />
              </Grid>

              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.adaptiveDifficulty}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, adaptiveDifficulty: e.target.checked }
                      }))}
                    />
                  }
                  label="Adaptive Difficulty"
                />
              </Grid>

              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.realTimeFeedback}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, realTimeFeedback: e.target.checked }
                      }))}
                    />
                  }
                  label="Real-time Feedback"
                />
              </Grid>

              <Grid size={{xs:12,sm:6}}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assessment.settings.aiAssisted}
                      onChange={(e) => setAssessment(prev => ({
                        ...prev,
                        settings: { ...prev.settings, aiAssisted: e.target.checked }
                      }))}
                    />
                  }
                  label="AI Assistance"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderAIDialog = () => (
    <Dialog open={aiDialog} onClose={() => setAiDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon />
        AI Question Generation
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{xs:12}}>
            <TextField
              fullWidth
              label="Topic"
              value={aiGenerationSettings.topic}
              onChange={(e) => setAiGenerationSettings(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Quadratic Equations, World War II, Photosynthesis..."
            />
          </Grid>

          <Grid size={{xs:6}}>
            <TextField
              fullWidth
              type="number"
              label="Number of Questions"
              value={aiGenerationSettings.questionCount}
              onChange={(e) => setAiGenerationSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 5 }))}
              inputProps={{ min: 1, max: 20 }}
            />
          </Grid>

          <Grid size={{xs:6}}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={aiGenerationSettings.difficulty}
                onChange={(e) => setAiGenerationSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                label="Difficulty"
              >
                {difficultyLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12}}>
            <FormControl fullWidth>
              <InputLabel>Question Types</InputLabel>
              <Select
                multiple
                value={aiGenerationSettings.questionTypes}
                onChange={(e) => setAiGenerationSettings(prev => ({ ...prev, questionTypes: e.target.value }))}
                label="Question Types"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={questionTypes.find(t => t.value === value)?.label} size="small" />
                    ))}
                  </Box>
                )}
              >
                {questionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <span style={{ marginRight: 8 }}>{type.icon}</span>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{xs:12}}>
            <FormControlLabel
              control={
                <Switch
                  checked={aiGenerationSettings.includeExplanations}
                  onChange={(e) => setAiGenerationSettings(prev => ({ ...prev, includeExplanations: e.target.checked }))}
                />
              }
              label="Include Explanations"
            />
          </Grid>
        </Grid>

        {isGenerating && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>Generating questions with AI...</Typography>
            <LinearProgress />
          </Box>
        )}

        {generatedQuestions.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Generated Questions</Typography>
            <List>
              {generatedQuestions.map((question, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Q${index + 1}: ${question.question}`}
                    secondary={
                      <Box>
                        <Typography variant="body2">Type: {question.type}</Typography>
                        {question.options && (
                          <Typography variant="body2">
                            Options: {question.options.join(', ')}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          Correct: {question.correctAnswer}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAiDialog(false)}>Cancel</Button>
        <Button
          onClick={handleAIGeneration}
          disabled={isGenerating || !aiGenerationSettings.topic.trim()}
          startIcon={<PsychologyIcon />}
        >
          Generate Questions
        </Button>
        {generatedQuestions.length > 0 && (
          <Button
            variant="contained"
            onClick={() => handleImportGeneratedQuestions(generatedQuestions)}
            startIcon={<AddIcon />}
          >
            Import All ({generatedQuestions.length})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const tabLabels = ['Settings', 'Add Questions', 'Question Bank'];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ mb: 3, p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40 }} />
          Advanced Assessment Creator
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Tooltip title="Preview Assessment">
              <IconButton onClick={() => setPreviewDialog(true)} color="primary">
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save Assessment">
              <IconButton onClick={handleSaveAssessment} color="primary">
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share Assessment">
              <IconButton color="primary">
                <ShareIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create intelligent, AI-powered assessments with adaptive difficulty and real-time feedback
        </Typography>

        {saveStatus && (
          <Alert
            severity={saveStatus === 'saved' ? 'success' : saveStatus === 'saving' ? 'info' : 'error'}
            sx={{ mt: 2 }}
          >
            {saveStatus === 'saved' && 'Assessment saved successfully!'}
            {saveStatus === 'saving' && 'Saving assessment...'}
            {saveStatus === 'error' && 'Failed to save assessment. Please try again.'}
          </Alert>
        )}
      </Paper>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
        variant="fullWidth"
      >
        {tabLabels.map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>

      {activeTab === 0 && renderAssessmentSettings()}
      {activeTab === 1 && renderQuestionForm()}
      {activeTab === 2 && renderQuestionsList()}

      {renderAIDialog()}

      {/* AI Generation FAB */}
      <Fab
        color="secondary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setAiDialog(true)}
      >
        <AIIcon />
      </Fab>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Assessment Preview</DialogTitle>
        <DialogContent>
          <Typography variant="h5" gutterBottom>{assessment.title}</Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {assessment.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip label={`Subject: ${assessment.subject}`} />
            <Chip label={`Grade: ${assessment.gradeLevel}`} />
            <Chip label={`Duration: ${assessment.duration} min`} />
            <Chip label={`Questions: ${assessment.questions.length}`} />
          </Box>

          {assessment.questions.map((question, index) => (
            <Paper key={question.id} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Question {index + 1}: {question.question}
              </Typography>
              {question.options.map((option, optIndex) => (
                <Typography key={optIndex} variant="body2" sx={{ ml: 2 }}>
                  {String.fromCharCode(65 + optIndex)}. {option}
                  {option === question.correctAnswer && ' ✓'}
                </Typography>
              ))}
              {question.explanation && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Explanation: {question.explanation}
                </Typography>
              )}
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedAssessmentCreator;