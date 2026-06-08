import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import securityOperationsService from '../../services/security/securityOperationsService';
import securityCoordinator from '../../services/security/securityCoordinator';

/**
 * Security Operations Hook - Phase 5 Security Enhancement
 * Provides React hooks for security monitoring, incident management, and threat detection
 */


export const useSecurityOperations = () => {
  const { user } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [threats, setThreats] = useState([]);
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // Load security data on user change
  useEffect(() => {
    if (user) {
      loadSecurityData();
      
      // Setup real-time updates
      if (realTimeUpdates) {
        const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
      }
    }
  }, [user, realTimeUpdates]);

  const loadSecurityData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [
        userIncidents,
        activeThreats,
        metrics,
        userVulnerabilities,
        userDevices
      ] = await Promise.all([
        securityOperationsService.getUserIncidents(user.uid),
        securityOperationsService.getActiveThreats(),
        securityOperationsService.getSecurityMetrics(user.uid),
        securityOperationsService.getUserVulnerabilities(user.uid),
        securityOperationsService.getUserDevices(user.uid)
      ]);
      
      setIncidents(userIncidents);
      setThreats(activeThreats);
      setSecurityMetrics(metrics);
      setVulnerabilities(userVulnerabilities);
      setDevices(userDevices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createIncident = useCallback(async (incidentData) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const incident = await securityOperationsService.createIncident({
        ...incidentData,
        reportedBy: user.uid,
        timestamp: new Date()
      });
      
      await loadSecurityData();
      return incident;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const updateIncident = useCallback(async (incidentId, updates) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await securityOperationsService.updateIncident(incidentId, {
        ...updates,
        lastModifiedBy: user.uid,
        lastModified: new Date()
      });
      
      await loadSecurityData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const escalateIncident = useCallback(async (incidentId, escalationLevel, reason) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await securityOperationsService.escalateIncident(incidentId, escalationLevel, {
        escalatedBy: user.uid,
        reason,
        timestamp: new Date()
      });
      
      await loadSecurityData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const acknowledgeIncident = useCallback(async (incidentId) => {
    if (!user) return false;
    
    try {
      await securityOperationsService.acknowledgeIncident(incidentId, user.uid);
      await loadSecurityData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user, loadSecurityData]);

  const runVulnerabilityAssessment = useCallback(async (scope = 'user') => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const assessment = await securityOperationsService.runVulnerabilityAssessment(
        scope === 'user' ? user.uid : null,
        scope
      );
      
      await loadSecurityData();
      return assessment;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const blockDevice = useCallback(async (deviceId, reason) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await securityOperationsService.blockDevice(deviceId, {
        blockedBy: user.uid,
        reason,
        timestamp: new Date()
      });
      
      await loadSecurityData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const unblockDevice = useCallback(async (deviceId, reason) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await securityOperationsService.unblockDevice(deviceId, {
        unblockedBy: user.uid,
        reason,
        timestamp: new Date()
      });
      
      await loadSecurityData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadSecurityData]);

  const getSecurityScore = useCallback(() => {
    if (!securityMetrics) return 0;
    
    const {
      incidentCount = 0,
      vulnerabilityCount = 0,
      mfaEnabled = false,
      passwordStrength = 0,
      lastSecurityUpdate = null
    } = securityMetrics;
    
    let score = 100;
    
    // Deduct points for incidents
    score -= Math.min(incidentCount * 5, 30);
    
    // Deduct points for vulnerabilities
    score -= Math.min(vulnerabilityCount * 10, 40);
    
    // Add points for MFA
    if (mfaEnabled) score += 10;
    
    // Add points for password strength
    score += Math.min(passwordStrength * 2, 20);
    
    // Deduct points for outdated security
    if (lastSecurityUpdate) {
      const daysSinceUpdate = (new Date() - new Date(lastSecurityUpdate)) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 30) score -= 10;
    }
    
    return Math.max(Math.round(score), 0);
  }, [securityMetrics]);

  const getIncidentsByStatus = useCallback((status) => {
    return incidents.filter(incident => incident.status === status);
  }, [incidents]);

  const getActiveThreats = useCallback(() => {
    return threats.filter(threat => threat.status === 'active');
  }, [threats]);

  const getCriticalVulnerabilities = useCallback(() => {
    return vulnerabilities.filter(vuln => vuln.severity === 'critical');
  }, [vulnerabilities]);

  const getBlockedDevices = useCallback(() => {
    return devices.filter(device => device.status === 'blocked');
  }, [devices]);

  const toggleRealTimeUpdates = useCallback(() => {
    setRealTimeUpdates(prev => !prev);
  }, []);

  return {
    incidents,
    threats,
    securityMetrics,
    vulnerabilities,
    devices,
    loading,
    error,
    realTimeUpdates,
    createIncident,
    updateIncident,
    escalateIncident,
    acknowledgeIncident,
    runVulnerabilityAssessment,
    blockDevice,
    unblockDevice,
    loadSecurityData,
    getSecurityScore,
    getIncidentsByStatus,
    getActiveThreats,
    getCriticalVulnerabilities,
    getBlockedDevices,
    toggleRealTimeUpdates,
    
    // Computed properties
    securityScore: getSecurityScore(),
    hasActiveIncidents: incidents.some(inc => inc.status === 'open' || inc.status === 'investigating'),
    hasCriticalThreats: threats.some(threat => threat.severity === 'critical' && threat.status === 'active'),
    hasCriticalVulnerabilities: vulnerabilities.some(vuln => vuln.severity === 'critical'),
    openIncidentsCount: getIncidentsByStatus('open').length,
    activeThreatsCount: getActiveThreats().length,
    criticalVulnerabilitiesCount: getCriticalVulnerabilities().length,
    blockedDevicesCount: getBlockedDevices().length
  };
};

export default useSecurityOperations;
