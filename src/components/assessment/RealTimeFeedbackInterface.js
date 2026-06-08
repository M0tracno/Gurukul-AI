import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ExpandMore, Warning } from '@mui/icons-material';

import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Fade, IconButton, LinearProgress, Paper, Slide, Snackbar, Typography, Zoom, toString } from '@mui/material';
// Phase 3C: Real-time Feedback Interface Component

const RealTimeFeedbackInterface = ({
  const theme = useTheme();
  const originalTheme = useTheme();
  sessionId,
  currentQuestion,
  onHintRequest,
  onFeedbackDismiss,
  showEncouragement = true,
  adaptiveHints = true,
  realTimeValidation = true
}) => {const [feedback, setFeedback] = useState(null);
  const [hints, setHints] = useState([]);
  const [showHints, setShowHints] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [progress, setProgress] = useState({ correct: 0, total: 0 });
  const [timeSpent, setTimeSpent] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [streak, setStreak] = useState(0);
  const [performance, setPerformance] = useState('neutral');
  const timeRef = useRef(Date.now());

  // Timer for tracking time spent on current question
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Date.now() - timeRef.current);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Reset timer when question changes
  useEffect(() => {
    timeRef.current = Date.now();
    setTimeSpent(0);
    setFeedback(null);
    setHints([]);
    setShowHints(false);
    setHintsUsed(0);
  }, [currentQuestion?.id]);

  // Performance tracking
  useEffect(() => {
    if (progress.total > 0) {
      const accuracy = progress.correct / progress.total;
      if (accuracy >= 0.8) {
        setPerformance('excellent');
      } else if (accuracy >= 0.6) {
        setPerformance('good');
      } else if (accuracy >= 0.4) {
        setPerformance('fair');
      } else {
        setPerformance('needs_improvement');
      }
    }
  }, [progress]);

  const displayFeedback = (feedbackData) => {
    setFeedback(feedbackData);
    setIsValidating(false);
    
    // Update progress
    setProgress(prev => ({
      correct: prev.correct + (feedbackData.type === 'correct' ? 1 : 0),
      total: prev.total + 1
    }));

    // Update streak
    if (feedbackData.type === 'correct') {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Show encouragement if enabled
    if (showEncouragement && feedbackData.encouragement) {
      setEncouragementMessage(feedbackData.encouragement);
      setTimeout(() => setEncouragementMessage(''), 5000);
    }

    // Auto-dismiss feedback after 8 seconds
    setTimeout(() => {
      setFeedback(null);
    }, 8000);
  };

  const requestHint = async () => {
    if (!adaptiveHints || !currentQuestion) return;

    try {
      const hintData = await onHintRequest(currentQuestion.id, hintsUsed);
      const newHint = {
        id: `hint_${hintsUsed}`,
        text: hintData.text,
        type: hintData.type || 'general',
        timestamp: new Date()
      };

      setHints(prev => [...prev, newHint]);
      setHintsUsed(prev => prev + 1);
      setShowHints(true);
    } catch (error) {
      console.error('Failed to get hint:', error);
    }
  };

  const getPerformanceColor = () => {
    switch (performance) {
      case 'excellent': return theme.palette.success.main;
      case 'good': return theme.palette.info.main;
      case 'fair': return theme.palette.warning.main;
      case 'needs_improvement': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const getPerformanceIcon = () => {
    switch (performance) {
      case 'excellent': return <EmojiEvents sx={{ color: 'gold' }} />;
      case 'good': return <ThumbUp color="primary" />;
      case 'fair': return <Speed color="warning" />;
      case 'needs_improvement': return <Warning color="error" />;
      default: return <Psychology color="action" />;
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStreakMessage = () => {
    if (streak >= 5) return 'Amazing streak! You\'re on fire! 🔥';
    if (streak >= 3) return 'Great streak! Keep it up! ⭐';
    if (streak >= 2) return 'Nice work! Two in a row! 💪';
    return '';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {/* Progress and Performance Header */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          background: `linear-gradient(135deg, ${getPerformanceColor()}20, ${theme.palette.background.paper})`,
          border: `1px solid ${getPerformanceColor()}30`
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center">
            {getPerformanceIcon()}
            <Typography variant="h6" sx={{ ml: 1 }}>
              Performance: {performance.replace('_', ' ').toUpperCase()}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Timer sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatTime(timeSpent)}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Progress: {progress.correct}/{progress.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.total > 0 ? (progress.correct / progress.total) * 100 : 0}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: getPerformanceColor(),
                borderRadius: 4
              }
            }}
          />
        </Box>

        {/* Streak Display */}
        {streak > 1 && (
          <Fade in={true}>
            <Box display="flex" alignItems="center" mt={1}>
              <Chip
                icon={<Star />}
                label={`${streak} in a row!`}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Typography variant="caption" sx={{ ml: 1, fontStyle: 'italic' }}>
                {getStreakMessage()}
              </Typography>
            </Box>
          </Fade>
        )}
      </Paper>

      {/* Real-time Feedback Display */}
      {feedback && (
        <Zoom in={Boolean(feedback)}>
          <Card
            sx={{
              mb: 2,
              border: `2px solid ${feedback.type === 'correct' ? theme.palette.success.main : theme.palette.error.main}`,
              backgroundColor: feedback.type === 'correct' 
                ? theme.palette.success.light + '20' 
                : theme.palette.error.light + '20'
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="flex-start" mb={2}>
                {feedback.type === 'correct' ? (
                  <CheckCircle color="success" sx={{ mr: 2, mt: 0.5 }} />
                ) : (
                  <Cancel color="error" sx={{ mr: 2, mt: 0.5 }} />
                )}
                <Box flex={1}>
                  <Typography 
                    variant="h6" 
                    color={feedback.type === 'correct' ? 'success.main' : 'error.main'}
                    gutterBottom
                  >
                    {feedback.type === 'correct' ? 'Correct!' : 'Not Quite Right'}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {feedback.message}
                  </Typography>
                </Box>
              </Box>

              {/* Explanation for correct answers */}
              {feedback.type === 'correct' && feedback.explanation && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Explanation:</strong> {feedback.explanation}
                  </Typography>
                </Alert>
              )}

              {/* Hints for incorrect answers */}
              {feedback.type === 'incorrect' && feedback.hints && feedback.hints.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Hints to help you:</strong>
                  </Typography>
                  {feedback.hints.map((hint, index) => (
                    <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                      • {hint}
                    </Typography>
                  ))}
                </Alert>
              )}

              {/* Action buttons */}
              <Box display="flex" justifyContent="flex-end" gap={1}>
                {feedback.type === 'incorrect' && (
                  <Button
                    size="small"
                    startIcon={<Lightbulb />}
                    onClick={requestHint}
                    disabled={hintsUsed >= 3}
                  >
                    Get Hint ({hintsUsed}/3)
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => onFeedbackDismiss && onFeedbackDismiss()}
                >
                  Dismiss
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* Hints Section */}
      {hints.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="space-between"
              sx={{ cursor: 'pointer' }}
              onClick={() => setShowHints(!showHints)}
            >
              <Box display="flex" alignItems="center">
                <Lightbulb color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Hints ({hints.length})
                </Typography>
              </Box>
              <IconButton size="small">
                {showHints ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={showHints}>
              <Box mt={2}>
                {hints.map((hint, index) => (
                  <Slide key={hint.id} direction="left" in={true}>
                    <Alert 
                      severity="info" 
                      sx={{ mb: 1, '&:last-child': { mb: 0 } }}
                      icon={<Help />}
                    >
                      <Typography variant="body2">
                        <strong>Hint {index + 1}:</strong> {hint.text}
                      </Typography>
                    </Alert>
                  </Slide>
                ))}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Encouragement Messages */}
      <Snackbar
        open={Boolean(encouragementMessage)}
        message={encouragementMessage}
        autoHideDuration={5000}
        onClose={() => setEncouragementMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          icon={<EmojiEvents />}
          onClose={() => setEncouragementMessage('')}
        >
          {encouragementMessage}
        </Alert>
      </Snackbar>

      {/* Validation Loading State */}
      {isValidating && (
        <Fade in={isValidating}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              backgroundColor: theme.palette.primary.light + '10',
              border: `1px solid ${theme.palette.primary.main}30`
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" color="primary">
              Evaluating your answer...
            </Typography>
          </Paper>
        </Fade>
      )}

      {/* Quick Stats */}
      {progress.total > 0 && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            mt: 2,
            backgroundColor: theme.palette.background.default 
          }}
        >
          <Typography variant="h6" gutterBottom>
            Session Statistics
          </Typography>
          <Box display="flex" justifyContent="space-around" flexWrap="wrap" gap={2}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {progress.correct}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Correct
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="error">
                {progress.total - progress.correct}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Incorrect
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {hintsUsed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hints Used
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {streak}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Best Streak
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

// Wrapper component for easier integration
const RealTimeFeedbackProvider = ({ children, ...props }) => {
  return (
    <Box position="relative">
      {children}
      <RealTimeFeedbackInterface {...props} />
    </Box>
  );
};

export default RealTimeFeedbackInterface;
export { RealTimeFeedbackProvider };
