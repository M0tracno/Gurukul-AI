import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import advancedAuthService from '../../services/security/advancedAuthService';
import securityCoordinator from '../../services/security/securityCoordinator';

/**
 * Authentication Hook - Phase 5 Security Enhancement
 * Provides React hooks for advanced authentication features
 */


export const useAuth = () => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [riskScore, setRiskScore] = useState(0);

  // Initialize security monitoring
  useEffect(() => {
    if (user) {
      const updateSessionInfo = async () => {
        try {
          const session = await advancedAuthService.getCurrentSession(user.uid);
          const risk = await advancedAuthService.calculateRiskScore(user.uid);
          setSessionInfo(session);
          setRiskScore(risk);
        } catch (err) {
          console.error('Error updating session info:', err);
        }
      };

      updateSessionInfo();
      const interval = setInterval(updateSessionInfo, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await advancedAuthService.authenticate(credentials);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await advancedAuthService.logout();
      setUser(null);
      setSessionInfo(null);
      setRiskScore(0);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const extendSession = useCallback(async () => {
    if (!user) return;
    
    try {
      await advancedAuthService.extendSession(user.uid);
      const session = await advancedAuthService.getCurrentSession(user.uid);
      setSessionInfo(session);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const checkSecurityStatus = useCallback(async () => {
    if (!user) return null;
    
    try {
      return await securityCoordinator.getSecurityStatus(user.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    sessionInfo,
    riskScore,
    login,
    logout,
    extendSession,
    checkSecurityStatus,
    isAuthenticated: !!user,
    isSessionExpiring: sessionInfo?.expiresAt && new Date(sessionInfo.expiresAt) - new Date() < 300000, // 5 minutes
    isHighRisk: riskScore > 70
  };
};

export default useAuth;
