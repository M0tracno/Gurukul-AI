import React, { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as QuestionIcon,
  Category as CategoryIcon,
  School as SubjectIcon,
  Quiz as QuizIcon,
  CloudUpload as ImportIcon,
  Download as ExportIcon,
} from '@mui/icons-material';
import facultyService from '../../services/facultyService';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabelItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`question-tabpanel-${index}`}
      aria-labelledby={`question-tab-${index}`}
      {...other}
    >
      {value === index && <Box style={{ padding: 24 }}>{children}</Box>}
    </div>
  );
}

const QuestionBank = () => {
  const [tabValue, setTabValue] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Dialog states
  const [questionDialog, setQuestionDialog] = useState({
    open: false,
    question: null,
    mode: 'create',
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, question: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false });
  const [importDialog, setImportDialog] = useState({ open: false });

  // Selection states
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    subject: '',
    category: '',
    difficulty: 'medium',
    tags: '',
    points: 1,
  });

  useEffect(() => {
    loadQuestions();
    loadCategories();
    loadSubjects();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, selectedSubject, selectedCategory, selectedDifficulty, selectedType]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getQuestionBank();
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await facultyService.getQuestionCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await facultyService.getSubjects();
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };
  const filterQuestions = () => {
    // Ensure questions is an array before filtering
    if (!Array.isArray(questions)) {
      setFilteredQuestions([]);
      return;
    }

    let filtered = [...questions];

    if (searchTerm) {
      filtered = filtered.filter(
        q =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.tags?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    if (selectedType) {
      filtered = filtered.filter(q => q.type === selectedType);
    }

    setFilteredQuestions(filtered);
  };

  const handleSaveQuestion = async () => {
    try {
      if (questionDialog.mode === 'create') {
        await facultyService.createQuestion(questionForm);
      } else {
        await facultyService.updateQuestion(questionDialog.question.id, questionForm);
      }
      setQuestionDialog({ open: false, question: null, mode: 'create' });
      resetQuestionForm();
      loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const handleDeleteQuestion = async () => {
    try {
      await facultyService.deleteQuestion(deleteDialog.question.id);
      setDeleteDialog({ open: false, question: null });
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleBulkAction = async () => {
    try {
      const questionIds = Array.from(selectedQuestions);

      switch (bulkAction) {
        case 'delete':
          await facultyService.bulkDeleteQuestions(questionIds);
          break;
        case 'export':
          await facultyService.exportQuestions(questionIds);
          break;
        case 'category':
          // Handle bulk category change
          break;
        default:
          return;
      }

      setSelectedQuestions(new Set());
      setBulkAction('');
      loadQuestions();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      subject: '',
      category: '',
      difficulty: 'medium',
      tags: '',
      points: 1,
    });
  };

  const openEditDialog = question => {
    setQuestionForm({
      question: question.question,
      type: question.type,
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      subject: question.subject,
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags || '',
      points: question.points || 1,
    });
    setQuestionDialog({ open: true, question, mode: 'edit' });
  };

  const getDifficultyColor = difficulty => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'multiple-choice':
        return '◉';
      case 'true-false':
        return '✓/✗';
      case 'fill-in-blank':
        return '___';
      case 'short-answer':
        return '📝';
      case 'essay':
        return '📄';
      default:
        return '?';
    }
  };

  const QuestionCard = ({ question }) => (
    <Card style={{ marginBottom: 16 }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Box display="flex" alignItems="center" mb={1}>
              <Checkbox
                checked={selectedQuestions.has(question.id)}
                onChange={e => {
                  const newSelected = new Set(selectedQuestions);
                  if (e.target.checked) {
                    newSelected.add(question.id);
                  } else {
                    newSelected.delete(question.id);
                  }
                  setSelectedQuestions(newSelected);
                }}
              />{' '}
              <Typography variant="body2" color="textSecondary" style={{ marginRight: 8 }}>
                {getTypeIcon(question.type)}
              </Typography>
              <Chip
                label={question.difficulty}
                size="small"
                color={getDifficultyColor(question.difficulty)}
                style={{ marginRight: 8 }}
              />
              <Chip
                label={question.subject}
                size="small"
                variant="outlined"
                style={{ marginRight: 8 }}
              />
              {question.category && (
                <Chip label={question.category} size="small" variant="outlined" />
              )}
            </Box>
            <Typography variant="h6" gutterBottom>
              {question.question}
            </Typography>{' '}
            {question.type === 'multiple-choice' && question.options && (
              <Box style={{ marginLeft: 16, marginBottom: 16 }}>
                {Array.isArray(question.options) &&
                  question.options.map((option, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      color={option === question.correctAnswer ? 'primary' : 'textSecondary'}
                      style={{ fontWeight: option === question.correctAnswer ? 'bold' : 'normal' }}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </Typography>
                  ))}
              </Box>
            )}
            {question.explanation && (
              <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic' }}>
                Explanation: {question.explanation}
              </Typography>
            )}
            <Box display="flex" alignItems="center" mt={1}>
              <Typography variant="caption" color="textSecondary">
                Points: {question.points || 1} | Used in {question.usageCount || 0} quizzes |
                Created: {new Date(question.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Box>
            <IconButton size="small" onClick={() => openEditDialog(question)}>
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteDialog({ open: true, question })}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const FilterPanel = () => (
    <Card style={{ marginBottom: 24 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Filters & Search
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Search Questions"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon style={{ marginRight: 8, color: '#757575' }} />,
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                label="Subject"
              >
                <MenuItem value="">All Subjects</MenuItem>
                {Array.isArray(subjects) &&
                  subjects.map(subject => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {Array.isArray(categories) &&
                  categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>{' '}
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                label="Difficulty"
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                <MenuItem value="true-false">True/False</MenuItem>
                <MenuItem value="fill-in-blank">Fill in Blank</MenuItem>
                <MenuItem value="short-answer">Short Answer</MenuItem>
                <MenuItem value="essay">Essay</MenuItem>
              </Select>
            </FormControl>{' '}
          </Grid>

          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('');
                setSelectedCategory('');
                setSelectedDifficulty('');
                setSelectedType('');
              }}
              style={{ height: '56px' }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
  return (
    <Container maxWidth="lg">
      <Box style={{ marginBottom: 32 }}>
        <Typography variant="h4" gutterBottom>
          Question Bank
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your question library for quiz creation
        </Typography>
      </Box>
      <FilterPanel />
      {/* Bulk Actions */}
      {selectedQuestions.size > 0 && (
        <Alert
          severity="info"
          action={
            <Box display="flex" gap={1}>
              {' '}
              <FormControl size="small" style={{ minWidth: 120 }}>
                <Select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Select Action</MenuItem>
                  <MenuItem value="delete">Delete Selected</MenuItem>
                  <MenuItem value="export">Export Selected</MenuItem>
                  <MenuItem value="category">Change Category</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                onClick={handleBulkAction}
                disabled={!bulkAction}
              >
                Apply{' '}
              </Button>
            </Box>
          }
          style={{ marginBottom: '16px' }}
        >
          {selectedQuestions.size} question(s) selected
        </Alert>
      )}{' '}
      {/* Question List */}
      <Box>
        {Array.isArray(filteredQuestions) &&
          filteredQuestions.map(question => <QuestionCard key={question.id} question={question} />)}
        {(!Array.isArray(filteredQuestions) || filteredQuestions.length === 0) && !loading && (
          <Card>
            <CardContent style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
              <QuestionIcon style={{ fontSize: 64, color: '#757575', marginBottom: 16 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No questions found
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
                {searchTerm || selectedSubject || selectedCategory
                  ? 'Try adjusting your filters or search terms'
                  : 'Start building your question bank by adding your first question'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setQuestionDialog({ open: true, question: null, mode: 'create' })}
              >
                Add First Question
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>{' '}
      {/* Floating Action Buttons */}
      <Box style={{ position: 'fixed', bottom: 16, right: 16 }}>
        <Fab
          color="primary"
          aria-label="add question"
          onClick={() => setQuestionDialog({ open: true, question: null, mode: 'create' })}
          style={{ marginRight: 8 }}
        >
          <AddIcon />
        </Fab>
        <Fab
          color="secondary"
          aria-label="import questions"
          onClick={() => setImportDialog({ open: true })}
        >
          <ImportIcon />
        </Fab>
      </Box>
      {/* Question Creation/Edit Dialog */}
      <Dialog
        open={questionDialog.open}
        onClose={() => setQuestionDialog({ open: false, question: null, mode: 'create' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {questionDialog.mode === 'create' ? 'Add New Question' : 'Edit Question'}
        </DialogTitle>{' '}
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid size={{ xs: 12 }}>
              {' '}
              <TextField
                fullWidth
                label="Question"
                multiline
                minRows={3}
                value={questionForm.question}
                onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={questionForm.type}
                  onChange={e => setQuestionForm({ ...questionForm, type: e.target.value })}
                  label="Question Type"
                >
                  <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                  <MenuItem value="true-false">True/False</MenuItem>
                  <MenuItem value="fill-in-blank">Fill in Blank</MenuItem>
                  <MenuItem value="short-answer">Short Answer</MenuItem>
                  <MenuItem value="essay">Essay</MenuItem>
                </Select>
              </FormControl>
            </Grid>{' '}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={questionForm.subject}
                  onChange={e => setQuestionForm({ ...questionForm, subject: e.target.value })}
                  label="Subject"
                >
                  {Array.isArray(subjects) &&
                    subjects.map(subject => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={questionForm.category}
                  onChange={e => setQuestionForm({ ...questionForm, category: e.target.value })}
                  label="Category"
                >
                  {Array.isArray(categories) &&
                    categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>{' '}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={questionForm.difficulty}
                  onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                  label="Difficulty"
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Points"
                type="number"
                value={questionForm.points}
                onChange={e =>
                  setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })
                }
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>{' '}
            {/* Options for Multiple Choice and True/False */}
            {(questionForm.type === 'multiple-choice' || questionForm.type === 'true-false') && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Answer Options{' '}
                </Typography>
                {questionForm.type === 'multiple-choice' ? (
                  Array.isArray(questionForm.options) &&
                  questionForm.options.map((option, index) => (
                    <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                      <TextField
                        fullWidth
                        label={`Option ${String.fromCharCode(65 + index)}`}
                        value={option}
                        onChange={e => {
                          const newOptions = [...questionForm.options];
                          newOptions[index] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOptions });
                        }}
                      />
                      <Checkbox
                        checked={questionForm.correctAnswer === option}
                        onChange={e => {
                          if (e.target.checked) {
                            setQuestionForm({ ...questionForm, correctAnswer: option });
                          }
                        }}
                        color="primary"
                      />
                      <Typography variant="body2">Correct</Typography>
                    </Box>
                  ))
                ) : (
                  <Box>
                    <FormControl component="fieldset">
                      <Box display="flex" gap={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={questionForm.correctAnswer === 'true'}
                              onChange={e =>
                                setQuestionForm({
                                  ...questionForm,
                                  correctAnswer: e.target.checked ? 'true' : '',
                                })
                              }
                            />
                          }
                          label="True"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={questionForm.correctAnswer === 'false'}
                              onChange={e =>
                                setQuestionForm({
                                  ...questionForm,
                                  correctAnswer: e.target.checked ? 'false' : '',
                                })
                              }
                            />
                          }
                          label="False"
                        />
                      </Box>
                    </FormControl>
                  </Box>
                )}
              </Grid>
            )}{' '}
            {/* Correct Answer for other types */}
            {(questionForm.type === 'fill-in-blank' ||
              questionForm.type === 'short-answer' ||
              questionForm.type === 'essay') && (
              <Grid size={{ xs: 12 }}>
                {' '}
                <TextField
                  fullWidth
                  label="Correct Answer / Sample Answer"
                  value={questionForm.correctAnswer}
                  onChange={e =>
                    setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                  }
                  placeholder="Enter the correct answer or sample answer..."
                  multiline={questionForm.type === 'essay'}
                  minRows={questionForm.type === 'essay' ? 3 : 1}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              {' '}
              <TextField
                fullWidth
                label="Explanation (Optional)"
                multiline
                minRows={2}
                value={questionForm.explanation}
                onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Provide an explanation for the correct answer..."
              />{' '}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tags (Optional)"
                value={questionForm.tags}
                onChange={e => setQuestionForm({ ...questionForm, tags: e.target.value })}
                placeholder="Enter tags separated by commas (e.g., algebra, equations, math)"
                helperText="Tags help organize and search for questions"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setQuestionDialog({ open: false, question: null, mode: 'create' })}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveQuestion} variant="contained">
            {questionDialog.mode === 'create' ? 'Add Question' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, question: null })}
      >
        <DialogTitle>Delete Question</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this question? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, question: null })}>Cancel</Button>
          <Button onClick={handleDeleteQuestion} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuestionBank;
