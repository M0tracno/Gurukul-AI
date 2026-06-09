import env from '../config/env';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

import { constructor } from '@mui/material';
// Optimized Phase 2 Services Provider with Lazy Initialization
// Improves startup performance by initializing services on-demand

// Services are imported dynamically in ServiceRegistry to avoid unused variable warnings

// Mock services for development mode
const createMockService = serviceName => ({
  initialize: async () => {
    console.log(`Mock ${serviceName} initialized`);
    return Promise.resolve();
  },
  cleanup: () => {
    console.log(`Mock ${serviceName} cleaned up`);
  },
  isConnected: () => true,
  // Add common mock methods
  on: () => {},
  off: () => {},
  emit: () => {},
});

// Create context for Phase 2 services
const Phase2ServicesContext = createContext(null);

// Service registry for lazy initialization
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.initializationPromises = new Map();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.useMockServices = this.isDevelopment && !env.USE_MOCK_SERVICES;
  }

  async getService(serviceName) {
    // Return existing service if already initialized
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    // Return existing initialization promise if in progress
    if (this.initializationPromises.has(serviceName)) {
      return this.initializationPromises.get(serviceName);
    }

    // Start new initialization
    const initPromise = this.initializeService(serviceName);
    this.initializationPromises.set(serviceName, initPromise);

    try {
      const service = await initPromise;
      this.services.set(serviceName, service);
      this.initializationPromises.delete(serviceName);
      return service;
    } catch (error) {
      this.initializationPromises.delete(serviceName);
      throw error;
    }
  }

  async initializeService(serviceName) {
    console.log(`Initializing ${serviceName} service...`);

    if (this.useMockServices) {
      return createMockService(serviceName);
    }

    try {
      let ServiceClass;

      switch (serviceName) {
        case 'notifications':
          ServiceClass = (await import('../services/SmartNotificationService')).default;
          break;
        case 'ai':
          ServiceClass = (await import('../services/EnhancedAIService')).default;
          break;
        case 'realtime':
          ServiceClass = (await import('../services/RealtimeService')).default;
          break;
        case 'analytics':
          ServiceClass = (await import('../services/AdvancedAnalyticsService')).default;
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      // Create service instance
      const service = ServiceClass instanceof Function ? new ServiceClass() : ServiceClass;

      // Initialize with timeout for better error handling
      await Promise.race([
        service.initialize ? service.initialize() : Promise.resolve(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Service ${serviceName} initialization timeout`)),
            10000
          )
        ),
      ]);

      console.log(`${serviceName} service initialized successfully`);
      return service;
    } catch (error) {
      console.error(`Failed to initialize ${serviceName} service:`, error);
      // Return mock service as fallback
      return createMockService(serviceName);
    }
  }

  async initializeAllServices() {
    const serviceNames = ['notifications', 'ai', 'realtime', 'analytics'];

    // Initialize services in parallel for better performance
    const initPromises = serviceNames.map(async serviceName => {
      try {
        const service = await this.getService(serviceName);
        return { serviceName, service, status: 'success' };
      } catch (error) {
        console.error(`Failed to initialize ${serviceName}:`, error);
        return { serviceName, service: createMockService(serviceName), status: 'fallback' };
      }
    });

    const results = await Promise.allSettled(initPromises);

    const services = {};
    const connectionStatus = {};

    results.forEach((result, index) => {
      const serviceName = serviceNames[index];
      if (result.status === 'fulfilled') {
        services[serviceName] = result.value.service;
        connectionStatus[serviceName] = result.value.status === 'success' ? 'connected' : 'mock';
      } else {
        services[serviceName] = createMockService(serviceName);
        connectionStatus[serviceName] = 'disconnected';
      }
    });

    return { services, connectionStatus };
  }

  cleanup() {
    this.services.forEach((service, serviceName) => {
      try {
        if (service && typeof service.cleanup === 'function') {
          service.cleanup();
        }
      } catch (error) {
        console.error(`Error cleaning up ${serviceName}:`, error);
      }
    });

    this.services.clear();
    this.initializationPromises.clear();
  }
}

// Optimized Phase 2 Services Provider
export const OptimizedPhase2ServicesProvider = ({ children }) => {
  const [services, setServices] = useState({
    notifications: null,
    ai: null,
    realtime: null,
    analytics: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    notifications: 'disconnected',
    ai: 'disconnected',
    realtime: 'disconnected',
    analytics: 'disconnected',
  });

  const serviceRegistry = useRef(new ServiceRegistry());
  const initializationTimeoutRef = useRef(null);

  // Background initialization with debouncing
  const initializeServicesInBackground = useCallback(async () => {
    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Debounce initialization to avoid multiple calls
    initializationTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Starting background service initialization...');
        const { services: initializedServices, connectionStatus: status } =
          await serviceRegistry.current.initializeAllServices();

        setServices(initializedServices);
        setConnectionStatus(status);
        setIsInitialized(true);
        setInitializationError(null);

        console.log('Background service initialization completed');
      } catch (error) {
        console.error('Background service initialization failed:', error);
        setInitializationError(error);
      }
    }, 100); // Small delay to avoid blocking startup
  }, []);

  // Lazy service getter
  const getService = useCallback(
    async serviceName => {
      try {
        const service = await serviceRegistry.current.getService(serviceName);

        // Update state if service was just initialized
        if (!services[serviceName]) {
          setServices(prev => ({
            ...prev,
            [serviceName]: service,
          }));

          setConnectionStatus(prev => ({
            ...prev,
            [serviceName]: 'connected',
          }));
        }

        return service;
      } catch (error) {
        console.error(`Failed to get ${serviceName} service:`, error);
        return createMockService(serviceName);
      }
    },
    [services]
  );
  // Initialize services on mount (non-blocking)
  useEffect(() => {
    // Don't block component mounting - initialize in background
    initializeServicesInBackground();

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      // Copy ref to variable to avoid ESLint warning
      const registry = serviceRegistry.current;
      registry.cleanup();
    };
  }, [initializeServicesInBackground]);

  // Service helper methods
  const isServiceReady = useCallback(
    serviceName => {
      return services[serviceName] !== null && connectionStatus[serviceName] !== 'disconnected';
    },
    [services, connectionStatus]
  );

  const getAllServices = useCallback(() => {
    return services;
  }, [services]);

  const getConnectionStatus = useCallback(() => {
    return connectionStatus;
  }, [connectionStatus]);

  // Force initialization of specific service
  const initializeService = useCallback(
    async serviceName => {
      return getService(serviceName);
    },
    [getService]
  );

  // Context value
  const contextValue = {
    services,
    isInitialized,
    initializationError,
    connectionStatus,
    getService,
    isServiceReady,
    getAllServices,
    getConnectionStatus,
    initializeService,
    useMockServices: serviceRegistry.current.useMockServices,
  };

  return (
    <Phase2ServicesContext.Provider value={contextValue}>{children}</Phase2ServicesContext.Provider>
  );
};

// Custom hook to use Phase 2 services
export const usePhase2Services = () => {
  const context = useContext(Phase2ServicesContext);

  if (!context) {
    throw new Error('usePhase2Services must be used within an OptimizedPhase2ServicesProvider');
  }

  return context;
};

// Individual service hooks with lazy loading
export const useSmartNotifications = () => {
  const { getService, isServiceReady } = usePhase2Services();
  const [service, setService] = useState(null);

  useEffect(() => {
    getService('notifications').then(setService);
  }, [getService]);

  return {
    service,
    isReady: isServiceReady('notifications'),
  };
};

export const useEnhancedAI = () => {
  const { getService, isServiceReady } = usePhase2Services();
  const [service, setService] = useState(null);

  useEffect(() => {
    getService('ai').then(setService);
  }, [getService]);

  return {
    service,
    isReady: isServiceReady('ai'),
  };
};

export const useRealtimeService = () => {
  const { getService, isServiceReady } = usePhase2Services();
  const [service, setService] = useState(null);

  useEffect(() => {
    getService('realtime').then(setService);
  }, [getService]);

  return {
    service,
    isReady: isServiceReady('realtime'),
  };
};

export const useAdvancedAnalytics = () => {
  const { getService, isServiceReady } = usePhase2Services();
  const [service, setService] = useState(null);

  useEffect(() => {
    getService('analytics').then(setService);
  }, [getService]);

  return {
    service,
    isReady: isServiceReady('analytics'),
  };
};

// Service status component for debugging
export const Phase2ServicesStatus = () => {
  const { connectionStatus, isInitialized, initializationError } = usePhase2Services();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <div>Phase 2 Services Status (Optimized):</div>
      <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
      {initializationError && (
        <div style={{ color: 'red' }}>Error: {initializationError.message}</div>
      )}
      {Object.entries(connectionStatus).map(([service, status]) => (
        <div key={service}>
          {service}: {status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'}{' '}
          {status}
        </div>
      ))}
    </div>
  );
};

export default OptimizedPhase2ServicesProvider;
