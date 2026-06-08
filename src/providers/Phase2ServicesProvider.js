import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import SmartNotificationService from '../services/SmartNotificationService';
import EnhancedAIService from '../services/EnhancedAIService';
import RealtimeService from '../services/RealtimeService';
import AdvancedAnalyticsService from '../services/AdvancedAnalyticsService';

// Phase 2 Services Integration and Context Provider

// Create context for Phase 2 services
const Phase2ServicesContext = createContext(null);

// Phase 2 Services Provider
export const Phase2ServicesProvider = ({ children }) => {
  const [services, setServices] = useState({
    notifications: null,
    ai: null,
    realtime: null,
    analytics: null
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    notifications: 'disconnected',
    ai: 'disconnected',
    realtime: 'disconnected',
    analytics: 'disconnected'
  });

  // Initialize all Phase 2 services
  const initializeServices = useCallback(async () => {
    try {
      console.log('Initializing Phase 2 services...');
      
      // Initialize Smart Notification Service
      const notificationService = new SmartNotificationService();
      await notificationService.initialize();
      
      // Initialize Enhanced AI Service
      const aiService = new EnhancedAIService();
      await aiService.initialize();
      
      // Initialize Realtime Service
      const realtimeService = new RealtimeService();
      await realtimeService.initialize();
      
      // Initialize Advanced Analytics Service
      const analyticsService = new AdvancedAnalyticsService();
      await analyticsService.initialize();
      
      // Update services state
      setServices({
        notifications: notificationService,
        ai: aiService,
        realtime: realtimeService,
        analytics: analyticsService
      });
      
      // Update connection status
      setConnectionStatus({
        notifications: 'connected',
        ai: 'connected',
        realtime: realtimeService.isConnected() ? 'connected' : 'connecting',
        analytics: 'connected'
      });
      
      setIsInitialized(true);
      console.log('Phase 2 services initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Phase 2 services:', error);
      setInitializationError(error);
    }
  }, []);

  // Cleanup services
  const cleanupServices = useCallback(() => {
    console.log('Cleaning up Phase 2 services...');
    
    Object.values(services).forEach(service => {
      if (service && typeof service.cleanup === 'function') {
        try {
          service.cleanup();
        } catch (error) {
          console.error('Error cleaning up service:', error);
        }
      }
    });
    
    setServices({
      notifications: null,
      ai: null,
      realtime: null,
      analytics: null
    });
    
    setConnectionStatus({
      notifications: 'disconnected',
      ai: 'disconnected',
      realtime: 'disconnected',
      analytics: 'disconnected'
    });
    
    setIsInitialized(false);
  }, [services]);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();
    
    return () => {
      cleanupServices();
    };
  }, []);

  // Monitor realtime connection status
  useEffect(() => {
    if (services.realtime) {
      const handleConnectionChange = (status) => {
        setConnectionStatus(prev => ({
          ...prev,
          realtime: status
        }));
      };

      services.realtime.on('connectionStatusChanged', handleConnectionChange);
      
      return () => {
        services.realtime.off('connectionStatusChanged', handleConnectionChange);
      };
    }
  }, [services.realtime]);

  // Service helper methods
  const getService = useCallback((serviceName) => {
    return services[serviceName];
  }, [services]);

  const isServiceReady = useCallback((serviceName) => {
    return services[serviceName] !== null && connectionStatus[serviceName] === 'connected';
  }, [services, connectionStatus]);

  const getAllServices = useCallback(() => {
    return services;
  }, [services]);

  const getConnectionStatus = useCallback(() => {
    return connectionStatus;
  }, [connectionStatus]);

  // Cross-service integration methods
  const integrateServices = useCallback(async () => {
    if (!isInitialized) return;

    try {
      // Connect AI service with analytics for enhanced insights
      if (services.ai && services.analytics) {
        services.ai.setAnalyticsProvider(services.analytics);
        console.log('AI service connected with analytics');
      }

      // Connect notifications with realtime for live updates
      if (services.notifications && services.realtime) {
        services.notifications.setRealtimeProvider(services.realtime);
        console.log('Notifications connected with realtime service');
      }

      // Connect analytics with realtime for live data updates
      if (services.analytics && services.realtime) {
        services.analytics.setRealtimeProvider(services.realtime);
        console.log('Analytics connected with realtime service');
      }

      // Setup cross-service event handling
      if (services.ai && services.notifications) {
        services.ai.on('insightGenerated', (insight) => {
          services.notifications.createNotification({
            type: 'ai_insight',
            title: 'New AI Insight Available',
            content: insight.summary,
            priority: 'medium',
            metadata: { insight }
          });
        });
      }

    } catch (error) {
      console.error('Error integrating services:', error);
    }
  }, [isInitialized, services]);

  // Run service integration when all services are ready
  useEffect(() => {
    if (isInitialized && Object.values(services).every(service => service !== null)) {
      integrateServices();
    }
  }, [isInitialized, services, integrateServices]);

  // Context value
  const contextValue = {
    // Services
    services,
    getService,
    getAllServices,
    
    // Status
    isInitialized,
    initializationError,
    connectionStatus,
    getConnectionStatus,
    isServiceReady,
    
    // Control methods
    initializeServices,
    cleanupServices,
    integrateServices
  };

  return (
    <Phase2ServicesContext.Provider value={contextValue}>
      {children}
    </Phase2ServicesContext.Provider>
  );
};

// Hook to use Phase 2 services
export const usePhase2Services = () => {
  const context = useContext(Phase2ServicesContext);
  
  if (!context) {
    throw new Error('usePhase2Services must be used within a Phase2ServicesProvider');
  }
  
  return context;
};

// Individual service hooks for convenience
export const useSmartNotifications = () => {
  const { getService, isServiceReady } = usePhase2Services();
  
  return {
    service: getService('notifications'),
    isReady: isServiceReady('notifications')
  };
};

export const useEnhancedAI = () => {
  const { getService, isServiceReady } = usePhase2Services();
  
  return {
    service: getService('ai'),
    isReady: isServiceReady('ai')
  };
};

export const useRealtimeService = () => {
  const { getService, isServiceReady } = usePhase2Services();
  
  return {
    service: getService('realtime'),
    isReady: isServiceReady('realtime')
  };
};

export const useAdvancedAnalytics = () => {
  const { getService, isServiceReady } = usePhase2Services();
  
  return {
    service: getService('analytics'),
    isReady: isServiceReady('analytics')
  };
};

// Service status component for debugging
export const Phase2ServicesStatus = () => {
  const { connectionStatus, isInitialized, initializationError } = usePhase2Services();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      left: 10, 
      zIndex: 9999, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div>Phase 2 Services Status:</div>
      <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
      {initializationError && (
        <div style={{ color: 'red' }}>Error: {initializationError.message}</div>
      )}
      {Object.entries(connectionStatus).map(([service, status]) => (
        <div key={service}>
          {service}: {status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'} {status}
        </div>
      ))}
    </div>
  );
};

export default Phase2ServicesProvider;
