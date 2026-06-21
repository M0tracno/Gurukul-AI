import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import advancedAuthService from '../../services/security/advancedAuthService';

/**
 * Multi-Factor Authentication Hook - Phase 5 Security Enhancement
 * Provides React hooks for MFA setup and verification
 */

export const useMFA = () => {
  const { user } = useContext(AuthContext);
  const [mfaMethods, setMfaMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupStep, setSetupStep] = useState('method-selection');
  const [verificationPending, setVerificationPending] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);

  // Load existing MFA methods
  useEffect(() => {
    if (user) {
      loadMfaMethods();
    }
  }, [user]);

  const loadMfaMethods = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const methods = await advancedAuthService.getUserMfaMethods(user.uid);
      setMfaMethods(methods);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setupTOTP = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const setup = await advancedAuthService.setupMultiFactorAuth(user.uid, 'totp');
      setSetupStep('totp-verification');
      return setup;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setupSMS = useCallback(
    async phoneNumber => {
      if (!user) return null;

      setLoading(true);
      setError(null);

      try {
        const setup = await advancedAuthService.setupMultiFactorAuth(user.uid, 'sms', phoneNumber);
        setSetupStep('sms-verification');
        setVerificationPending(true);
        return setup;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const setupEmail = useCallback(
    async email => {
      if (!user) return null;

      setLoading(true);
      setError(null);

      try {
        const setup = await advancedAuthService.setupMultiFactorAuth(
          user.uid,
          'email',
          null,
          email
        );
        setSetupStep('email-verification');
        setVerificationPending(true);
        return setup;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const setupBiometric = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const isSupported = await advancedAuthService.isBiometricSupported();
      if (!isSupported) {
        throw new Error('Biometric authentication is not supported on this device');
      }

      const setup = await advancedAuthService.setupBiometricAuth(user.uid);
      setSetupStep('biometric-verification');
      return setup;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const verifyMFASetup = useCallback(
    async (method, verificationCode, setupData = null) => {
      if (!user) return false;

      setLoading(true);
      setError(null);

      try {
        const result = await advancedAuthService.verifyMfaSetup(
          user.uid,
          method,
          verificationCode,
          setupData
        );

        if (result.success) {
          await loadMfaMethods();
          setSetupStep('method-selection');
          setVerificationPending(false);

          // Generate backup codes for first MFA setup
          if (mfaMethods.length === 0) {
            const codes = await advancedAuthService.generateBackupCodes(user.uid);
            setBackupCodes(codes);
            setSetupStep('backup-codes');
          }
        }

        return result.success;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, mfaMethods.length, loadMfaMethods]
  );

  const verifyMFA = useCallback(
    async (method, code) => {
      if (!user) return false;

      setLoading(true);
      setError(null);

      try {
        const result = await advancedAuthService.verifyMfa(user.uid, method, code);
        return result.success;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const removeMFAMethod = useCallback(
    async methodId => {
      if (!user) return false;

      setLoading(true);
      setError(null);

      try {
        await advancedAuthService.removeMfaMethod(user.uid, methodId);
        await loadMfaMethods();
        return true;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, loadMfaMethods]
  );

  const generateNewBackupCodes = useCallback(async () => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const codes = await advancedAuthService.generateBackupCodes(user.uid);
      setBackupCodes(codes);
      return codes;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const resetSetup = useCallback(() => {
    setSetupStep('method-selection');
    setVerificationPending(false);
    setError(null);
    setBackupCodes([]);
  }, []);

  return {
    mfaMethods,
    loading,
    error,
    setupStep,
    verificationPending,
    backupCodes,
    setupTOTP,
    setupSMS,
    setupEmail,
    setupBiometric,
    verifyMFASetup,
    verifyMFA,
    removeMFAMethod,
    generateNewBackupCodes,
    resetSetup,
    loadMfaMethods,
    hasMFA: mfaMethods.length > 0,
    availableMethods: ['totp', 'sms', 'email', 'biometric'],
    isSetupComplete:
      setupStep === 'backup-codes' || (mfaMethods.length > 0 && setupStep === 'method-selection'),
  };
};

export default useMFA;
