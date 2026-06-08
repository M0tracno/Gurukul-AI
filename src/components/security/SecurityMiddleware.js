import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Security, Shield as SecurityIcon, Warning, Warning as WarningIcon } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';

import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
/**
 * Security Middleware - Phase 5 Security Enhancement
 * Provides route protection and security checks for the application
 */

/**
 * Enhanced Private Route with security checks
 */
export const SecureRoute = ({ 
  children, 
  allowedRoles, 
  requiredSecurityLevel = 'low',
  requireMFA = false,
  requireCompliance = false
}) => {
  const { currentUser, userRole } = useAuth();
  const {
    securityInitialized,
    securityStatus,
    threatLevel,
    hasSecurityClearance,
    isCompliant,
    isSecurityLoading
  } = useSecurity();
  const location = useLocation();
  
  // Check if user is authenticated
  if (!currentUser) {
    const roleLoginPaths = {
      faculty: '/faculty-login',
      student: '/student-login',
      parent: '/parent-login',
      admin: '/admin-login'
    };
    
    const redirectPath = roleLoginPaths[allowedRoles[0]] || '/faculty-login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }
  
  // Check if user has required role
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Show loading while security is initializing
  if (!securityInitialized || isSecurityLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Verifying security status...
        </Typography>
      </Box>
    );
  }
  
  // Check security clearance
  if (!hasSecurityClearance(requiredSecurityLevel)) {
    return <SecurityClearanceBlock requiredLevel={requiredSecurityLevel} />;
  }
  
  // Check MFA requirement
  if (requireMFA && !securityStatus?.mfaEnabled) {
    return <MFARequiredBlock />;
  }
  
  // Check compliance requirement
  if (requireCompliance && !isCompliant) {
    return <ComplianceRequiredBlock />;
  }
  
  // Check threat level
  if (threatLevel === 'critical') {
    return <HighRiskSecurityBlock />;
  }
  
  // All checks passed
  return children;
};

/**
 * Admin Route with enhanced security
 */
export const AdminRoute = ({ children, requiredPermissions = [] }) => {
  return (
    <SecureRoute
      allowedRoles={['admin']}
      requiredSecurityLevel="high"
      requireMFA={true}
      requireCompliance={true}
    >
      <PermissionCheck requiredPermissions={requiredPermissions}>
        {children}
      </PermissionCheck>
    </SecureRoute>
  );
};

/**
 * Faculty Route with security checks
 */
export const FacultyRoute = ({ children, requireMFA = false }) => {
  return (
    <SecureRoute
      allowedRoles={['faculty']}
      requiredSecurityLevel="medium"
      requireMFA={requireMFA}
      requireCompliance={true}
    >
      {children}
    </SecureRoute>
  );
};

/**
 * Student Route with basic security
 */
export const StudentRoute = ({ children }) => {
  return (
    <SecureRoute
      allowedRoles={['student']}
      requiredSecurityLevel="low"
      requireCompliance={true}
    >
      {children}
    </SecureRoute>
  );
};

/**
 * Parent Route with privacy compliance
 */
export const ParentRoute = ({ children }) => {
  return (
    <SecureRoute
      allowedRoles={['parent']}
      requiredSecurityLevel="low"
      requireCompliance={true}
    >
      {children}
    </SecureRoute>
  );
};

/**
 * Permission Check Component
 */
const PermissionCheck = ({ children, requiredPermissions = [] }) => {
  const { currentUser } = useAuth();
  const { securityStatus } = useSecurity();
  
  if (requiredPermissions.length === 0) {
    return children;
  }
  
  const userPermissions = securityStatus?.permissions || [];
  const hasAllPermissions = requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
  
  if (!hasAllPermissions) {
    return (
      <Box textAlign="center" p={4}>
        <WarningIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Insufficient Permissions
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          You don't have the required permissions to access this feature.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Required: {requiredPermissions.join(', ')}
        </Typography>
      </Box>
    );
  }
  
  return children;
};

/**
 * Security Clearance Block Component
 */
const SecurityClearanceBlock = ({ requiredLevel }) => {
  return (
    <Box textAlign="center" p={4}>
      <SecurityIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Security Clearance Required
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        This area requires {requiredLevel} security clearance.
      </Typography>
      <Button variant="contained" color="primary" href="/security-settings">
        Upgrade Security Level
      </Button>
    </Box>
  );
};

/**
 * MFA Required Block Component
 */
const MFARequiredBlock = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  return (
    <>
      <Box textAlign="center" p={4}>
        <SecurityIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Multi-Factor Authentication Required
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          This area requires additional security verification.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setDialogOpen(true)}
          sx={{ mr: 2 }}
        >
          Setup MFA
        </Button>
        <Button variant="outlined" href="/">
          Go Back
        </Button>
      </Box>
      
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            For security reasons, this area requires multi-factor authentication.
            Would you like to set it up now?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => window.location.href = '/security-settings'}
          >
            Setup Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Compliance Required Block Component
 */
const ComplianceRequiredBlock = () => {
  return (
    <Box textAlign="center" p={4}>
      <WarningIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Privacy Compliance Required
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Please review and accept our privacy policies to continue.
      </Typography>
      <Button variant="contained" color="primary" href="/privacy-settings">
        Review Privacy Settings
      </Button>
    </Box>
  );
};

/**
 * High Risk Security Block Component
 */
const HighRiskSecurityBlock = () => {
  const [acknowledged, setAcknowledged] = React.useState(false);
  
  if (acknowledged) {
    return null; // Allow access after acknowledgment
  }
  
  return (
    <Box textAlign="center" p={4}>
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          High Risk Activity Detected
        </Typography>
        <Typography variant="body2">
          Your account shows signs of suspicious activity. Please review your security settings
          and recent activity before proceeding.
        </Typography>
      </Alert>
      
      <Button 
        variant="contained" 
        color="error" 
        onClick={() => setAcknowledged(true)}
        sx={{ mr: 2 }}
      >
        I Understand, Continue Anyway
      </Button>
      <Button variant="outlined" href="/security-dashboard">
        Review Security
      </Button>
    </Box>
  );
};

/**
 * Security Status Monitor Component
 */
export const SecurityStatusMonitor = ({ children }) => {
  const { securityAlerts, threatLevel, dismissAlert } = useSecurity();
  
  const criticalAlerts = securityAlerts.filter(alert => alert.priority === 'high');
  
  return (
    <>
      {criticalAlerts.map(alert => (
        <Alert
          key={alert.id}
          severity={alert.type}
          sx={{ mb: 2 }}
          onClose={() => dismissAlert(alert.id)}
          action={
            alert.action && (
              <Button color="inherit" size="small">
                {alert.action}
              </Button>
            )
          }
        >
          <Typography variant="subtitle2">{alert.title}</Typography>
          <Typography variant="body2">{alert.message}</Typography>
        </Alert>
      ))}
      
      {threatLevel === 'critical' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Critical Security Alert</Typography>
          <Typography variant="body2">
            Your account security requires immediate attention.
          </Typography>
        </Alert>
      )}
      
      {children}
    </>
  );
};

export default {
  SecureRoute,
  AdminRoute,
  FacultyRoute,
  StudentRoute,
  ParentRoute,
  SecurityStatusMonitor
};

