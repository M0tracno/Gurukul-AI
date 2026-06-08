import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProgressiveLoader } from '../common/LoadingComponents';
import { AdminRoute, FacultyRoute, SecureRoute } from './SecurityMiddleware';

/**
 * Security Routes - Phase 5 Security Enhancement
 * Defines routes for security-related pages and components
 */


// Security middleware

// Lazy load security components for better performance
const SecurityDashboard = React.lazy(() => import('./SecurityDashboard'));
const SecuritySettings = React.lazy(() => import('./SecuritySettings'));
const MFASetupDialog = React.lazy(() => import('./MFASetupDialog'));
const PrivacyConsentManager = React.lazy(() => import('./PrivacyConsentManager'));
const IncidentResponseInterface = React.lazy(() => import('./IncidentResponseInterface'));
const SecurityIntegrationExample = React.lazy(() => import('./SecurityIntegrationExample'));

const SecurityRoutes = () => {
  return (
    <Suspense fallback={<ProgressiveLoader message="Loading security features..." />}>
      <Routes>
        {/* Main security dashboard - accessible to all authenticated users */}
        <Route 
          path="/dashboard" 
          element={
            <SecureRoute allowedRoles={['admin', 'faculty', 'student', 'parent']}>
              <SecurityDashboard />
            </SecureRoute>
          } 
        />
        
        {/* Security settings - accessible to all authenticated users */}
        <Route 
          path="/settings" 
          element={
            <SecureRoute allowedRoles={['admin', 'faculty', 'student', 'parent']}>
              <SecuritySettings />
            </SecureRoute>
          } 
        />
        
        {/* MFA setup - accessible to all authenticated users */}
        <Route 
          path="/mfa-setup" 
          element={
            <SecureRoute allowedRoles={['admin', 'faculty', 'student', 'parent']}>
              <MFASetupDialog open={true} />
            </SecureRoute>
          } 
        />
        
        {/* Privacy consent - accessible to all authenticated users */}
        <Route 
          path="/privacy" 
          element={
            <SecureRoute allowedRoles={['admin', 'faculty', 'student', 'parent']}>
              <PrivacyConsentManager />
            </SecureRoute>
          } 
        />
        
        {/* Incident response - admin and faculty only with high security */}
        <Route 
          path="/incidents" 
          element={
            <SecureRoute 
              allowedRoles={['admin', 'faculty']} 
              requiredSecurityLevel="high"
              requireMFA={true}
            >
              <IncidentResponseInterface />
            </SecureRoute>
          } 
        />
        
        {/* Advanced security management - admin only */}
        <Route 
          path="/admin/*" 
          element={
            <AdminRoute requiredPermissions={['security_management']}>
              <Suspense fallback={<ProgressiveLoader message="Loading admin security..." />}>
                <Routes>
                  <Route path="dashboard" element={<SecurityDashboard compactMode={false} />} />
                  <Route path="incidents" element={<IncidentResponseInterface forensicsMode={true} />} />
                  <Route path="settings" element={<SecuritySettings advancedMode={true} />} />
                </Routes>
              </Suspense>
            </AdminRoute>
          } 
        />
        
        {/* Faculty security routes */}
        <Route 
          path="/faculty/*" 
          element={
            <FacultyRoute>
              <Suspense fallback={<ProgressiveLoader message="Loading faculty security..." />}>
                <Routes>
                  <Route path="dashboard" element={<SecurityDashboard showAlerts={true} />} />
                  <Route path="incidents" element={<IncidentResponseInterface allowEscalation={false} />} />
                </Routes>
              </Suspense>
            </FacultyRoute>
          } 
        />
        
        {/* Security integration example - admin only for testing */}
        <Route 
          path="/example" 
          element={
            <AdminRoute>
              <SecurityIntegrationExample />
            </AdminRoute>
          } 
        />
        
        {/* Default route redirects to dashboard */}
        <Route 
          path="/" 
          element={
            <SecureRoute allowedRoles={['admin', 'faculty', 'student', 'parent']}>
              <SecurityDashboard />
            </SecureRoute>
          } 
        />
      </Routes>
    </Suspense>
  );
};

export default SecurityRoutes;
