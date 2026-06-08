import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  School,
  TrendingUp,
  Refresh,
  Psychology,
  AutoAwesome,
  Timeline,
  Speed,
  Lightbulb,
  Assignment,
  QuestionAnswer,
  Star,
  PersonalVideo,
  Analytics,
  ExpandMore
} from '@mui/icons-material';
import EnhancedAIService from '../../services/EnhancedAIService';
import AdvancedAnalyticsService from '../../services/AdvancedAnalyticsService';
import SmartNotificationService from '../../services/SmartNotificationService';

const AIInsightsDashboard = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [learningPath, setLearningPath] = useState(null);
  const [analytics, setAnalytics] = useState({});

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demo - replace with actual API calls when services are ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      setInsights({
        learningScore: 85,
        learningTrend: 5.2,
        engagementLevel: 'High',
        engagementTrend: 12.3,
        progressRate: 78,
        progressTrend: -2.1,
        completionRate: 92,
        completionTrend: 8.7
      });

      setRecommendations([
        {
          id: 1,
          title: 'Advanced Mathematics',
          description: 'Continue with calculus practice',
          type: 'content',
          subject: 'Mathematics',
          estimatedTime: 30,
          priority: 'high',
          relevanceScore: 4
        }
      ]);

      setLearningPath({
        title: 'Science Track - Advanced Level',
        completionPercentage: 65,
        nextSteps: [
          { title: 'Complete Physics Lab', estimatedTime: '2 hours', completed: false }
        ]
      });

      setAnalytics({
        performanceMetrics: { averageScore: 87, timeSpent: 245, streak: 12 },
        learningPatterns: { 
          optimalTimes: ['9:00 AM', '2:00 PM'], 
          preferredStyle: 'Visual',
          strengths: ['Problem Solving', 'Critical Thinking']
        },
        suggestions: [
          { title: 'Improve Focus Time', description: 'Try studying in 25-minute sessions' }
        ]
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const AnimatedCard = ({ children, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
        {children}
      </Card>
    </motion.div>
  );

  const InsightCard = ({ title, value, trend, icon: Icon, color = 'primary' }) => (
    <AnimatedCard>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" color={color}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            <Icon fontSize="large" />
          </Avatar>
        </Box>
      </CardContent>
    </AnimatedCard>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading AI Insights...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadDashboardData}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Insights Dashboard
        </Typography>
        <IconButton onClick={handleRefresh} disabled={refreshing} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <InsightCard
            title="Learning Score"
            value={insights?.learningScore || 85}
            icon={Psychology}
            color="primary"
          />
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <InsightCard
            title="Engagement Level"
            value={insights?.engagementLevel || 'High'}
            icon={AutoAwesome}
            color="secondary"
          />
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <InsightCard
            title="Progress Rate"
            value={`${insights?.progressRate || 78}%`}
            icon={Timeline}
            color="success"
          />
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <InsightCard
            title="Completion Rate"
            value={`${insights?.completionRate || 92}%`}
            icon={Speed}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{xs:12,md:6}}>
          <AnimatedCard delay={0.1}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Lightbulb color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">AI Recommendations</Typography>
              </Box>
              <List>
                {recommendations.map((rec) => (
                  <ListItem key={rec.id} sx={{ borderRadius: 1, mb: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <School />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={rec.title} secondary={rec.description} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </AnimatedCard>
        </Grid>

        <Grid size={{xs:12,md:6}}>
          <AnimatedCard delay={0.2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonalVideo color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Learning Path</Typography>
              </Box>
              {learningPath && (
                <Box>
                  <Typography variant="body1" fontWeight="medium" mb={2}>
                    {learningPath.title}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={learningPath.completionPercentage} 
                    sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {learningPath.completionPercentage}% Complete
                  </Typography>
                </Box>
                            )}
            </CardContent>
          </AnimatedCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsightsDashboard;
