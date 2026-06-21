import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  SmartToy,
  VideoCall,
  Analytics,
  Notifications,
  AutoAwesome,
  Psychology,
  Group,
  Timeline,
  TrendingUp,
} from '@mui/icons-material';

// Smart Features Integration for Existing Dashboards

// Smart Features Quick Access Card
const SmartFeaturesCard = ({ role = 'admin' }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'Personalized analytics and recommendations',
      icon: <SmartToy />,
      color: theme.palette.primary.main,
      path: '/smart-features/ai-insights',
      roles: ['admin', 'faculty', 'student', 'parent'],
    },
    {
      id: 'collaboration',
      title: 'Live Collaboration',
      description: 'Real-time communication and teamwork',
      icon: <VideoCall />,
      color: theme.palette.secondary.main,
      path: '/smart-features/collaboration',
      roles: ['admin', 'faculty', 'student'],
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Comprehensive performance tracking',
      icon: <Analytics />,
      color: theme.palette.success.main,
      path: '/smart-features/analytics',
      roles: ['admin', 'faculty', 'parent'],
    },
    {
      id: 'notifications',
      title: 'Smart Notifications',
      description: 'Intelligent alert management',
      icon: <Notifications />,
      color: theme.palette.info.main,
      path: '/smart-features/notifications',
      roles: ['admin', 'faculty', 'student', 'parent'],
    },
  ];

  const availableFeatures = features.filter(feature => feature.roles.includes(role));

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 100,
          height: 100,
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoAwesome sx={{ color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h6" component="h2">
            Smart Features
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Access AI-powered tools and advanced capabilities to enhance your experience.
        </Typography>

        <Grid container spacing={1}>
          {availableFeatures.map(feature => (
            <Grid size={{ xs: 6 }} key={feature.id}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => navigate(feature.path)}
                  sx={{
                    borderColor: alpha(feature.color, 0.3),
                    color: feature.color,
                    '&:hover': {
                      borderColor: feature.color,
                      backgroundColor: alpha(feature.color, 0.1),
                    },
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    px: 1,
                  }}
                  startIcon={feature.icon}
                >
                  {feature.title}
                </Button>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/smart-features')}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              textTransform: 'none',
            }}
          >
            Explore All Features
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

// Smart Features Statistics Widget
const SmartFeaturesStats = ({ role = 'admin' }) => {
  const theme = useTheme();
  const stats = [
    {
      label: 'AI Insights Generated',
      value: '24',
      icon: <Psychology />,
      color: theme.palette.primary.main,
      trend: '+12%',
    },
    {
      label: 'Active Collaborations',
      value: '8',
      icon: <Group />,
      color: theme.palette.secondary.main,
      trend: '+5%',
    },
    {
      label: 'Analytics Reports',
      value: '16',
      icon: <Timeline />,
      color: theme.palette.success.main,
      trend: '+8%',
    },
    {
      label: 'Smart Notifications',
      value: '142',
      icon: <Notifications />,
      color: theme.palette.info.main,
      trend: '-3%',
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Smart Features Activity
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 6, md: 3 }} key={index}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                background: alpha(stat.color, 0.05),
                border: `1px solid ${alpha(stat.color, 0.1)}`,
              }}
            >
              <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
              <Typography variant="h4" component="div" sx={{ color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: stat.trend.startsWith('+')
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mt: 0.5,
                }}
              >
                <TrendingUp sx={{ fontSize: 14, mr: 0.5 }} />
                {stat.trend}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Smart Features Integration Component for Dashboard Sidebars
const SmartFeaturesIntegration = ({
  role = 'admin',
  variant = 'card', // 'card', 'stats', 'minimal'
  ...props
}) => {
  switch (variant) {
    case 'stats':
      return <SmartFeaturesStats role={role} {...props} />;

    case 'minimal':
      return (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AutoAwesome />}
            onClick={() => window.open('/smart-features', '_blank')}
            sx={{ textTransform: 'none' }}
          >
            Smart Features
          </Button>
        </Box>
      );

    case 'card':
    default:
      return <SmartFeaturesCard role={role} {...props} />;
  }
};

export default SmartFeaturesIntegration;
export { SmartFeaturesCard, SmartFeaturesStats };
