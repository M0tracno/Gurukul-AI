import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import privacyService from '../../services/security/privacyService';

/**
 * Privacy Management Hook - Phase 5 Security Enhancement
 * Provides React hooks for privacy compliance and consent management
 */


export const usePrivacy = () => {
  const { user } = useContext(AuthContext);
  const [consents, setConsents] = useState([]);
  const [dataCategories, setDataCategories] = useState([]);
  const [privacySettings, setPrivacySettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);

  // Load privacy data on user change
  useEffect(() => {
    if (user) {
      loadPrivacyData();
    }
  }, [user]);

  const loadPrivacyData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [userConsents, categories, settings, compliance] = await Promise.all([
        privacyService.getUserConsents(user.uid),
        privacyService.getDataCategories(),
        privacyService.getPrivacySettings(user.uid),
        privacyService.getComplianceStatus(user.uid)
      ]);
      
      setConsents(userConsents);
      setDataCategories(categories);
      setPrivacySettings(settings);
      setComplianceStatus(compliance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateConsent = useCallback(async (categoryId, granted, purpose = null) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await privacyService.updateConsent(user.uid, categoryId, granted, purpose);
      await loadPrivacyData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadPrivacyData]);

  const bulkUpdateConsents = useCallback(async (consentUpdates) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await privacyService.bulkUpdateConsents(user.uid, consentUpdates);
      await loadPrivacyData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadPrivacyData]);

  const requestDataExport = useCallback(async (format = 'json', categories = null) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const exportResult = await privacyService.exportUserData(user.uid, format, categories);
      return exportResult;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const requestDataDeletion = useCallback(async (categories = null, retentionOverride = false) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await privacyService.deleteUserData(user.uid, categories, retentionOverride);
      if (result.success) {
        await loadPrivacyData();
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, loadPrivacyData]);

  const updatePrivacySettings = useCallback(async (newSettings) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await privacyService.updatePrivacySettings(user.uid, newSettings);
      setPrivacySettings({ ...privacySettings, ...newSettings });
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, privacySettings]);

  const getDataRetention = useCallback(async (categoryId) => {
    if (!user) return null;
    
    try {
      return await privacyService.getDataRetentionInfo(user.uid, categoryId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const requestDataPortability = useCallback(async (targetSystem, categories = null) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await privacyService.initiateDataPortability(user.uid, targetSystem, categories);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getConsentHistory = useCallback(async (categoryId = null) => {
    if (!user) return [];
    
    try {
      return await privacyService.getConsentHistory(user.uid, categoryId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const checkComplianceRequirements = useCallback(async () => {
    if (!user) return null;
    
    try {
      return await privacyService.checkComplianceRequirements(user.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const getActiveConsents = useCallback(() => {
    return consents.filter(consent => consent.granted && consent.isActive);
  }, [consents]);

  const getConsentByCategory = useCallback((categoryId) => {
    return consents.find(consent => consent.categoryId === categoryId);
  }, [consents]);

  const isConsentRequired = useCallback((categoryId) => {
    const category = dataCategories.find(cat => cat.id === categoryId);
    return category?.requiresConsent || false;
  }, [dataCategories]);

  const getPrivacyScore = useCallback(() => {
    if (!complianceStatus) return 0;
    
    const totalCategories = dataCategories.length;
    const compliantCategories = complianceStatus.compliantCategories?.length || 0;
    
    return totalCategories > 0 ? Math.round((compliantCategories / totalCategories) * 100) : 0;
  }, [complianceStatus, dataCategories]);

  return {
    consents,
    dataCategories,
    privacySettings,
    complianceStatus,
    loading,
    error,
    updateConsent,
    bulkUpdateConsents,
    requestDataExport,
    requestDataDeletion,
    updatePrivacySettings,
    getDataRetention,
    requestDataPortability,
    getConsentHistory,
    checkComplianceRequirements,
    loadPrivacyData,
    getActiveConsents,
    getConsentByCategory,
    isConsentRequired,
    getPrivacyScore,
    hasRequiredConsents: complianceStatus?.hasRequiredConsents || false,
    needsConsentUpdate: complianceStatus?.needsUpdate || false,
    isGDPRCompliant: complianceStatus?.gdprCompliant || false,
    isFERPACompliant: complianceStatus?.ferpaCompliant || false,
    isCOPPACompliant: complianceStatus?.coppaCompliant || false
  };
};

export default usePrivacy;
