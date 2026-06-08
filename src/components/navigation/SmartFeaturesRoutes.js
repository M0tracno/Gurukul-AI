import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProgressiveLoader } from '../common/LoadingComponents';
import AIInsightsDashboard from '../dashboard/AIInsightsDashboard';
import RealTimeCollaboration from '../collaboration/RealTimeCollaboration';
import AdvancedAnalyticsDashboard from '../analytics/AdvancedAnalyticsDashboard';
import SmartNotificationPanel from '../notifications/SmartNotificationPanel';
import { Box, Container, Typography } from '@mui/material';

// Smart Features Routes for Phase 2 Integration

// Phase 2 Smart Components

// Smart Features Hub Component
const SmartFeaturesHub = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Smart Features Hub
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Access AI-powered insights, real-time collaboration, advanced analytics, and smart notifications.
      </Typography>
      
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {/* Quick Access Cards */}
          <Box sx={{ 
            p: 3, 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText', 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.dark' }
          }}>
            <Typography variant="h6">AI Insights</Typography>
            <Typography variant="body2">
              Personalized learning analytics and AI-powered recommendations
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3, 
            bgcolor: 'secondary.main', 
            color: 'secondary.contrastText', 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'secondary.dark' }
          }}>
            <Typography variant="h6">Live Collaboration</Typography>
            <Typography variant="body2">
              Real-time communication and collaborative learning spaces
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3, 
            bgcolor: 'success.main', 
            color: 'success.contrastText', 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'success.dark' }
          }}>
            <Typography variant="h6">Advanced Analytics</Typography>
            <Typography variant="body2">
              Comprehensive performance tracking and predictive insights
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3, 
            bgcolor: 'info.main', 
            color: 'info.contrastText', 
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'info.dark' }
          }}>
            <Typography variant="h6">Smart Notifications</Typography>
            <Typography variant="body2">
              Intelligent notification management and preferences
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

// Loading component for smart features
const SmartFeaturesLoader = ({ message = "Loading smart features..." }) => (
  <ProgressiveLoader message={message} />
);

// Main Smart Features Routes Component
const SmartFeaturesRoutes = () => {
  return (
    <Suspense fallback={<SmartFeaturesLoader />}>
      <Routes>
        {/* Smart Features Hub */}
        <Route path="/" element={<SmartFeaturesHub />} />
        
        {/* AI Insights Dashboard */}
        <Route 
          path="/ai-insights" 
          element={
            <Suspense fallback={<SmartFeaturesLoader message="Loading AI insights..." />}>
              <AIInsightsDashboard />
            </Suspense>
          } 
        />
        
        {/* Real-time Collaboration */}
        <Route 
          path="/collaboration" 
          element={
            <Suspense fallback={<SmartFeaturesLoader message="Loading collaboration tools..." />}>
              <RealTimeCollaboration />
            </Suspense>
          } 
        />
        
        {/* Advanced Analytics */}
        <Route 
          path="/analytics" 
          element={
            <Suspense fallback={<SmartFeaturesLoader message="Loading analytics dashboard..." />}>
              <AdvancedAnalyticsDashboard />
            </Suspense>
          } 
        />
        
        {/* Smart Notifications */}
        <Route 
          path="/notifications" 
          element={
            <Suspense fallback={<SmartFeaturesLoader message="Loading notification panel..." />}>
              <SmartNotificationPanel />
            </Suspense>
          } 
        />
        
        {/* Nested collaboration routes */}
        <Route path="/collaboration/:roomId" element={
          <Suspense fallback={<SmartFeaturesLoader message="Joining collaboration room..." />}>
            <RealTimeCollaboration />
          </Suspense>
        } />
      </Routes>
    </Suspense>
  );
};

export default SmartFeaturesRoutes;
