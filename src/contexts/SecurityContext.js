import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import securityCoordinator from '../services/security/securityCoordinator';
import { useAuth } from '../auth/AuthContext';
import { monitoring } from '../utils/security';

/**
 * Security Context - Phase 5 Security Enhancement
 * Provides centralized security state management for the application
 */


// Create Security Context
const SecurityContext = createContext();

// Custom hook to use Security Context
export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// Security Provider Component
export const SecurityProvider = ({ children }) => {
  // Get current user from AuthContext
  const { currentUser, userRole } = useAuth();
  
  // Security state
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const [sessionSecurity, setSessionSecurity] = useState(null);
  const [threatLevel, setThreatLevel] = useState('low');
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  
  // Initialize security services
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        setIsSecurityLoading(true);
        
        // Initialize security coordinator
        await securityCoordinator.initialize();
        
        // Generate device fingerprint
        const fingerprint = monitoring.generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
        
        setSecurityInitialized(true);
      } catch (error) {
        console.error('❌ Security initialization failed:', error);
        setSecurityError(error.message);
      } finally {
        setIsSecurityLoading(false);
      }
    };
    
    initializeSecurity();
  }, []);
  
  // Update security status when user changes
  useEffect(() => {
    if (securityInitialized && currentUser) {
      updateSecurityStatus();
      startSecurityMonitoring();
    }
  }, [securityInitialized, currentUser]);
  
  // Update security status
  const updateSecurityStatus = useCallback(async () => {
    if (!currentUser || !securityInitialized) return;
    
    try {
      setIsSecurityLoading(true);
      
      // Get comprehensive security status
      const status = await securityCoordinator.getSecurityStatus(currentUser.uid);
      setSecurityStatus(status);
      
      // Update session security info
      const sessionInfo = await securityCoordinator.getSessionSecurity(currentUser.uid);
      setSessionSecurity(sessionInfo);
      
      // Get compliance status
      const compliance = await securityCoordinator.getComplianceStatus(currentUser.uid);
      setComplianceStatus(compliance);
      
      // Determine threat level
      const riskScore = status?.riskScore || 0;
      let level = 'low';
      if (riskScore > 70) level = 'critical';
      else if (riskScore > 50) level = 'high';
      else if (riskScore > 30) level = 'medium';
      setThreatLevel(level);
      
      // Check for security alerts
      const alerts = await checkSecurityAlerts(status);
      setSecurityAlerts(alerts);
      
    } catch (error) {
      console.error('Error updating security status:', error);
      setSecurityError(error.message);
    } finally {
      setIsSecurityLoading(false);
    }
  }, [currentUser, securityInitialized]);
  
  // Start real-time security monitoring
  const startSecurityMonitoring = useCallback(() => {
    if (!currentUser) return;
    
    // Update security status every 30 seconds
    const securityInterval = setInterval(() => {
      updateSecurityStatus();
    }, 30000);
    
    // Log security event for user activity
    logSecurityEvent('session_activity', {
      userId: currentUser.uid,
      userRole: userRole,
      timestamp: new Date(),
      deviceFingerprint: deviceFingerprint?.fingerprint
    });
    
    return () => {
      clearInterval(securityInterval);
    };
  }, [currentUser, userRole, deviceFingerprint, updateSecurityStatus]);
  
  // Check for security alerts
  const checkSecurityAlerts = async (status) => {
    const alerts = [];
    
    if (!status) return alerts;
    
    // Check for high risk score
    if (status.riskScore > 70) {
      alerts.push({
        id: 'high-risk',
        type: 'error',
        title: 'High Risk Activity Detected',
        message: 'Your account shows signs of suspicious activity',
        action: 'Review Security Settings',
        priority: 'high'
      });
    }
    
    // Check for MFA requirement
    if (!status.mfaEnabled && ['admin', 'faculty'].includes(userRole)) {
      alerts.push({
        id: 'mfa-required',
        type: 'warning',
        title: 'Multi-Factor Authentication Required',
        message: 'Your role requires additional security measures',
        action: 'Setup MFA',
        priority: 'medium'
      });
    }
    
    // Check for privacy compliance
    if (!status.privacyCompliant) {
      alerts.push({
        id: 'privacy-compliance',
        type: 'warning',
        title: 'Privacy Settings Need Update',
        message: 'Please review and update your privacy preferences',
        action: 'Update Privacy Settings',
        priority: 'medium'
      });
    }
    
    // Check for session expiry
    if (status.sessionExpiring) {
      alerts.push({
        id: 'session-expiring',
        type: 'info',
        title: 'Session Expiring Soon',
        message: 'Your session will expire in 5 minutes',
        action: 'Extend Session',
        priority: 'low'
      });
    }
    
    return alerts;
  };
  
  // Log security events
  const logSecurityEvent = useCallback(async (eventType, eventData) => {
    if (!securityInitialized) return;
    
    try {
      await securityCoordinator.logSecurityEvent({
        type: eventType,
        data: eventData,
        timestamp: new Date(),
        source: 'security_context'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [securityInitialized]);
  
  // Report security incident
  const reportIncident = useCallback(async (incidentData) => {
    if (!currentUser || !securityInitialized) return null;
    
    try {
      const incident = await securityCoordinator.createIncident({
        ...incidentData,
        reportedBy: currentUser.uid,
        timestamp: new Date()
      });
      
      // Refresh security status after incident
      await updateSecurityStatus();
      
      return incident;
    } catch (error) {
      console.error('Error reporting security incident:', error);
      throw error;
    }
  }, [currentUser, securityInitialized, updateSecurityStatus]);
  
  // Dismiss security alert
  const dismissAlert = useCallback((alertId) => {
    setSecurityAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);
  
  // Refresh security status manually
  const refreshSecurityStatus = useCallback(async () => {
    await updateSecurityStatus();
  }, [updateSecurityStatus]);
  
  // Check if user has security clearance for action
  const hasSecurityClearance = useCallback((requiredLevel) => {
    if (!securityStatus) return false;
    
    const clearanceLevels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    
    const userLevel = clearanceLevels[securityStatus.clearanceLevel] || 1;
    const requiredLevelNum = clearanceLevels[requiredLevel] || 1;
    
    return userLevel >= requiredLevelNum;
  }, [securityStatus]);
  
  // Get security recommendations
  const getSecurityRecommendations = useCallback(() => {
    const recommendations = [];
    
    if (!securityStatus) return recommendations;
    
    if (!securityStatus.mfaEnabled) {
      recommendations.push({
        type: 'mfa',
        title: 'Enable Multi-Factor Authentication',
        description: 'Add an extra layer of security to your account',
        priority: 'high'
      });
    }
    
    if (securityStatus.passwordAge > 90) {
      recommendations.push({
        type: 'password',
        title: 'Update Password',
        description: 'Your password is over 90 days old',
        priority: 'medium'
      });
    }
    
    if (securityStatus.unusedPermissions?.length > 0) {
      recommendations.push({
        type: 'permissions',
        title: 'Review Permissions',
        description: 'Remove unused permissions to reduce attack surface',
        priority: 'low'
      });
    }
    
    return recommendations;
  }, [securityStatus]);
  
  // Security context value
  const value = {
    // State
    securityInitialized,
    securityStatus,
    deviceFingerprint,
    sessionSecurity,
    threatLevel,
    securityAlerts,
    complianceStatus,
    isSecurityLoading,
    securityError,
    
    // Actions
    updateSecurityStatus,
    logSecurityEvent,
    reportIncident,
    dismissAlert,
    refreshSecurityStatus,
    hasSecurityClearance,
    getSecurityRecommendations,
    
    // Computed values
    isHighRisk: threatLevel === 'critical' || threatLevel === 'high',
    hasActiveAlerts: securityAlerts.length > 0,
    securityScore: securityStatus?.securityScore || 0,
    needsAttention: securityAlerts.some(alert => alert.priority === 'high'),
    isCompliant: complianceStatus?.isCompliant || false
  };
  
  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityContext;

