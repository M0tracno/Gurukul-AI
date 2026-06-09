import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdaptiveLearningService from '../../services/AdaptiveLearningService';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Fab,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import {
  VolumeUp,
  Settings,
  Info,
  WbIncandescent,
  Psychology,
  AccessTime,
  TrendingUp,
  BarChart,
  Visibility,
  Warning,
  AutoFixHigh,
  Lightbulb,
  TouchApp,
  MenuBook,
  Speed,
  PlayArrow,
  Help,
  CheckCircle,
} from '@mui/icons-material';

// Phase 3B: Personalized Content Adapter
// Real-time content adaptation based on learning profile

const PersonalizedContentAdapter = ({
  studentId,
  contentId,
  initialContent,
  onContentChange,
  onInteractionData,
}) => {
  // State management
  const [adaptiveService, setAdaptiveService] = useState(null);
  const [adaptedContent, setAdaptedContent] = useState(initialContent);
  const [adaptationEnabled, setAdaptationEnabled] = useState(true);
  const [currentDifficulty, setCurrentDifficulty] = useState('intermediate');
  const [contentFormat, setContentFormat] = useState('mixed');
  const [isAdapting, setIsAdapting] = useState(false);
  const [learningProfile, setLearningProfile] = useState(null);
  const [adaptationHistory, setAdaptationHistory] = useState([]);
  const [interactionData, setInteractionData] = useState({
    startTime: Date.now(),
    interactions: [],
    timeSpent: 0,
    progress: 0,
    retryCount: 0,
    helpRequests: 0,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [adaptationInsights, setAdaptationInsights] = useState([]);

  // Refs for tracking interactions
  const interactionTimer = useRef(null);
  const contentRef = useRef(null);

  const initializeService = useCallback(async () => {
    try {
      const service = new AdaptiveLearningService();
      if (!service.isInitialized) {
        await service.initialize();
      }
      setAdaptiveService(service);
    } catch (error) {
      console.error('Failed to initialize adaptive service:', error);
    }
  }, []);

  const loadLearningProfile = useCallback(async () => {
    if (!adaptiveService || !studentId) return;

    try {
      await adaptiveService.loadLearningProfile(studentId);
      // Profile loaded, continue with adaptation
    } catch (error) {
      console.error('Failed to load learning profile:', error);
    }
  }, [adaptiveService, studentId]);

  useEffect(() => {
    initializeService();
    startInteractionTracking();

    return () => {
      if (interactionTimer.current) {
        clearInterval(interactionTimer.current);
      }
    };
  }, [initializeService]);
  useEffect(() => {
    if (adaptiveService && studentId) {
      loadLearningProfile();
    }
  }, [loadLearningProfile]);

  const startInteractionTracking = () => {
    // Track time spent and interactions
    interactionTimer.current = setInterval(() => {
      setInteractionData(prev => ({
        ...prev,
        timeSpent: Date.now() - prev.startTime,
      }));
    }, 1000);
  };

  const handleContentAdapted = data => {
    if (data.studentId === studentId && data.contentId === contentId) {
      setAdaptedContent(data.adaptedContent);
      setAdaptationHistory(prev => [
        ...prev,
        {
          timestamp: new Date(),
          adaptations: data.adaptationNeeds,
          result: data.adaptedContent,
        },
      ]);

      // Generate insights
      generateAdaptationInsights(data.adaptationNeeds);
    }
  };

  const handleProfileUpdated = data => {
    if (data.studentId === studentId) {
      setLearningProfile(data.profile);
    }
  };

  const trackInteraction = (interactionType, data = {}) => {
    const interaction = {
      type: interactionType,
      timestamp: Date.now(),
      data,
      elementId: data.elementId || null,
    };

    setInteractionData(prev => ({
      ...prev,
      interactions: [...prev.interactions, interaction],
      retryCount: interactionType === 'retry' ? prev.retryCount + 1 : prev.retryCount,
      helpRequests: interactionType === 'help' ? prev.helpRequests + 1 : prev.helpRequests,
    }));

    // Send interaction data to parent component
    if (onInteractionData) {
      onInteractionData({
        ...interactionData,
        latestInteraction: interaction,
      });
    }

    // Trigger adaptive content changes if enabled
    if (adaptationEnabled && adaptiveService) {
      triggerContentAdaptation();
    }
  };

  const triggerContentAdaptation = async () => {
    if (!adaptiveService || isAdapting) return;

    try {
      setIsAdapting(true);

      const adaptedContent = await adaptiveService.adaptContent(
        studentId,
        contentId,
        interactionData
      );

      if (adaptedContent && onContentChange) {
        onContentChange(adaptedContent);
      }
    } catch (error) {
      console.error('Content adaptation failed:', error);
    } finally {
      setIsAdapting(false);
    }
  };

  const updateProgress = progress => {
    setInteractionData(prev => ({
      ...prev,
      progress: Math.max(prev.progress, progress),
    }));
    trackInteraction('progress_update', { progress });
  };

  const changeDifficulty = async newDifficulty => {
    if (!adaptiveService) return;

    try {
      setCurrentDifficulty(newDifficulty);

      // Update learning profile
      await adaptiveService.updateLearningProfile(studentId, {
        currentLevel: newDifficulty,
      });

      trackInteraction('difficulty_change', {
        oldDifficulty: currentDifficulty,
        newDifficulty,
      });
    } catch (error) {
      console.error('Failed to change difficulty:', error);
    }
  };

  const changeContentFormat = async newFormat => {
    if (!adaptiveService) return;

    try {
      setContentFormat(newFormat);

      // Update learning profile
      await adaptiveService.updateLearningProfile(studentId, {
        learningStyle: newFormat,
      });

      trackInteraction('format_change', {
        oldFormat: contentFormat,
        newFormat,
      });
    } catch (error) {
      console.error('Failed to change content format:', error);
    }
  };

  const generateAdaptationInsights = adaptationNeeds => {
    const insights = adaptationNeeds.map(need => {
      switch (need.type) {
        case 'difficulty_reduction':
          return {
            type: 'warning',
            icon: <Warning />,
            message: 'Content difficulty reduced due to struggle indicators',
            suggestion: 'Take your time and ask for help if needed',
          };
        case 'engagement_boost':
          return {
            type: 'info',
            icon: <TrendingUp />,
            message: 'Content format adapted to boost engagement',
            suggestion: need.suggestion,
          };
        case 'format_adaptation':
          return {
            type: 'success',
            icon: <AutoFixHigh />,
            message: `Content adapted to ${need.preferredStyle} learning style`,
            suggestion: 'Content format optimized for your learning preference',
          };
        default:
          return {
            type: 'info',
            icon: <Lightbulb />,
            message: 'Content adapted based on your learning pattern',
            suggestion: 'Keep engaging with the material',
          };
      }
    });

    setAdaptationInsights(insights);

    // Auto-hide insights after 5 seconds
    setTimeout(() => {
      setAdaptationInsights([]);
    }, 5000);
  };

  const getLearningStyleIcon = style => {
    const icons = {
      visual: <Visibility />,
      auditory: <VolumeUp />,
      kinesthetic: <TouchApp />,
      reading: <MenuBook />,
      mixed: <AutoFixHigh />,
    };
    return icons[style] || <AutoFixHigh />;
  };

  const getDifficultyColor = difficulty => {
    const colors = {
      beginner: 'success',
      intermediate: 'warning',
      advanced: 'error',
      expert: 'secondary',
    };
    return colors[difficulty] || 'primary';
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Adaptation Status Bar */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: adaptationEnabled ? 'primary.50' : 'grey.50',
          border: adaptationEnabled ? '1px solid' : 'none',
          borderColor: 'primary.200',
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={adaptationEnabled}
                  onChange={e => setAdaptationEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center">
                  <AutoFixHigh sx={{ mr: 1 }} />
                  Adaptive Learning
                </Box>
              }
            />
          </Grid>

          <Grid item>
            <Chip
              icon={getLearningStyleIcon(contentFormat)}
              label={`${contentFormat.charAt(0).toUpperCase() + contentFormat.slice(1)} Style`}
              variant="outlined"
              color="primary"
            />
          </Grid>

          <Grid item>
            <Chip
              icon={<Speed />}
              label={`${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)} Level`}
              color={getDifficultyColor(currentDifficulty)}
              variant="outlined"
            />
          </Grid>

          <Grid item>
            <Box display="flex" alignItems="center">
              <Typography variant="caption" sx={{ mr: 1 }}>
                Progress:
              </Typography>
              <Box sx={{ width: 100, mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={interactionData.progress * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              <Typography variant="caption">
                {Math.round(interactionData.progress * 100)}%
              </Typography>
            </Box>
          </Grid>

          <Grid sx={{ ml: 'auto' }}>
            <IconButton
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              color={showSettings ? 'primary' : 'default'}
            >
              <Settings />
            </IconButton>
          </Grid>
        </Grid>

        {/* Adaptation Settings */}
        <Collapse in={showSettings}>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                Learning Style
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {['visual', 'auditory', 'kinesthetic', 'reading', 'mixed'].map(style => (
                  <Chip
                    key={style}
                    icon={getLearningStyleIcon(style)}
                    label={style.charAt(0).toUpperCase() + style.slice(1)}
                    clickable
                    color={contentFormat === style ? 'primary' : 'default'}
                    variant={contentFormat === style ? 'filled' : 'outlined'}
                    onClick={() => changeContentFormat(style)}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                Difficulty Level
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {['beginner', 'intermediate', 'advanced', 'expert'].map(difficulty => (
                  <Chip
                    key={difficulty}
                    label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    clickable
                    color={
                      currentDifficulty === difficulty ? getDifficultyColor(difficulty) : 'default'
                    }
                    variant={currentDifficulty === difficulty ? 'filled' : 'outlined'}
                    onClick={() => changeDifficulty(difficulty)}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Adaptation Insights */}
      {adaptationInsights.length > 0 && (
        <Box mb={2}>
          {adaptationInsights.map((insight, index) => (
            <Alert key={index} severity={insight.type} icon={insight.icon} sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {insight.message}
              </Typography>
              <Typography variant="caption" display="block">
                {insight.suggestion}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}

      {/* Content Container with Interaction Tracking */}
      <Card
        ref={contentRef}
        onClick={() => trackInteraction('content_click')}
        onMouseEnter={() => trackInteraction('content_hover')}
        sx={{ position: 'relative' }}
      >
        <CardContent>
          {/* Content Header */}
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Adaptive Learning Content</Typography>
            {isAdapting && (
              <Chip
                icon={<AutoFixHigh />}
                label="Adapting..."
                color="primary"
                size="small"
                sx={{ animation: 'pulse 1.5s infinite' }}
              />
            )}
          </Box>

          {/* Adaptive Content Display */}
          <Box sx={{ minHeight: 200, position: 'relative' }}>
            {adaptedContent || initialContent ? (
              <Box>
                {/* Example adaptive content based on learning style */}
                {contentFormat === 'visual' && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Content optimized for visual learning
                    </Alert>
                    <Typography paragraph>
                      This content includes diagrams, charts, and visual representations to match
                      your visual learning preference.
                    </Typography>
                    {/* Visual content would be rendered here */}
                  </Box>
                )}

                {contentFormat === 'auditory' && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Content optimized for auditory learning
                    </Alert>
                    <Typography paragraph>
                      This content includes audio explanations and verbal instructions to match your
                      auditory learning preference.
                    </Typography>
                    {/* Audio content controls would be here */}
                  </Box>
                )}

                {contentFormat === 'kinesthetic' && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Content optimized for kinesthetic learning
                    </Alert>
                    <Typography paragraph>
                      This content includes interactive exercises and hands-on activities to match
                      your kinesthetic learning preference.
                    </Typography>
                    {/* Interactive content would be here */}
                  </Box>
                )}

                {contentFormat === 'reading' && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Content optimized for reading/writing learning
                    </Alert>
                    <Typography paragraph>
                      This content includes detailed text, articles, and written exercises to match
                      your reading learning preference.
                    </Typography>
                    {/* Text-heavy content would be here */}
                  </Box>
                )}

                {/* Sample content */}
                <Typography paragraph>
                  {adaptedContent?.text ||
                    initialContent?.text ||
                    'This is sample adaptive content that changes based on your learning profile and real-time interactions.'}
                </Typography>

                {/* Interaction Elements */}
                <Box display="flex" gap={2} mt={3}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => trackInteraction('start_exercise')}
                  >
                    Start Exercise
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Help />}
                    onClick={() => trackInteraction('help')}
                  >
                    Get Help
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      updateProgress(1.0);
                      trackInteraction('complete');
                    }}
                  >
                    Mark Complete
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography color="textSecondary">No content available for adaptation</Typography>
            )}
          </Box>
        </CardContent>

        {/* Learning Analytics Overlay */}
        {adaptationEnabled && (
          <Fab
            size="small"
            color="primary"
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              opacity: 0.7,
              '&:hover': { opacity: 1 },
            }}
            onClick={() => trackInteraction('analytics_view')}
          >
            <Psychology />
          </Fab>
        )}
      </Card>

      {/* Interaction Summary */}
      <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Session Analytics
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 3 }}>
            <Typography variant="caption" color="textSecondary">
              Time Spent
            </Typography>
            <Typography variant="body2">
              {Math.round(interactionData.timeSpent / 1000 / 60)} min
            </Typography>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Typography variant="caption" color="textSecondary">
              Interactions
            </Typography>
            <Typography variant="body2">{interactionData.interactions.length}</Typography>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Typography variant="caption" color="textSecondary">
              Retries
            </Typography>
            <Typography variant="body2">{interactionData.retryCount}</Typography>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Typography variant="caption" color="textSecondary">
              Help Requests
            </Typography>
            <Typography variant="body2">{interactionData.helpRequests}</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PersonalizedContentAdapter;
