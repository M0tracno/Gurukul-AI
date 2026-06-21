import { useEffect, useState } from 'react';

// PWA Service Worker Hook
export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Setup PWA event listeners
    setupPWAEventListeners();

    // Setup online/offline detection
    setupNetworkDetection();

    return () => {
      // Cleanup event listeners
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(registration);
        console.log('Service Worker registered successfully:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                console.log('New version available!');
              }
            });
          }
        });

        // Handle service worker messages
        navigator.serviceWorker.addEventListener('message', event => {
          console.log('Message from service worker:', event.data);

          if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            setUpdateAvailable(true);
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const setupPWAEventListeners = () => {
    // Install prompt handling
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed handling
    window.addEventListener('appinstalled', event => {
      console.log('PWA was installed successfully');
      setIsInstallable(false);
      setDeferredPrompt(null);

      // Track installation analytics
      if (window.gtag) {
        window.gtag('event', 'pwa_installed', {
          event_category: 'PWA',
          event_label: 'Installation',
        });
      }
    });
  };

  const handleBeforeInstallPrompt = event => {
    console.log('PWA install prompt available');
    event.preventDefault();
    setDeferredPrompt(event);
    setIsInstallable(true);
  };

  const setupNetworkDetection = () => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  };

  const handleOnline = () => {
    setIsOffline(false);
    console.log('Application is online');

    // Notify service worker
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'NETWORK_ONLINE' });
    }
  };

  const handleOffline = () => {
    setIsOffline(true);
    console.log('Application is offline');

    // Notify service worker
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'NETWORK_OFFLINE' });
    }
  };

  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log('Install prompt not available');
      return false;
    }

    try {
      // Show install prompt
      deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`User ${outcome} the install prompt`);

      if (outcome === 'accepted') {
        setIsInstallable(false);

        // Track successful installation prompt
        if (window.gtag) {
          window.gtag('event', 'pwa_install_prompt_accepted', {
            event_category: 'PWA',
            event_label: 'Install Prompt',
          });
        }
      }

      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload page after update
      window.location.reload();
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  };

  const showNotification = (title, options = {}) => {
    if ('serviceWorker' in navigator && registration) {
      registration.showNotification(title, {
        body: options.body || '',
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        vibrate: options.vibrate || [200, 100, 200],
        data: options.data || {},
        actions: options.actions || [],
        ...options,
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  };

  const getNetworkInfo = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  };

  const getCacheStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usageDetails: estimate.usageDetails,
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  };

  const clearAppCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        console.log('All caches cleared');
      }

      if (registration) {
        await registration.unregister();
        console.log('Service worker unregistered');
      }

      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing app cache:', error);
    }
  };

  return {
    // State
    isInstallable,
    isOffline,
    updateAvailable,
    registration,

    // Actions
    installPWA,
    updateServiceWorker,
    requestNotificationPermission,
    showNotification,
    clearAppCache,

    // Utilities
    getNetworkInfo,
    getCacheStorageUsage,
  };
};

// PWA Status Component
export const PWAStatus = ({ className = '' }) => {
  const { isOffline, updateAvailable, updateServiceWorker } = usePWA();

  if (!isOffline && !updateAvailable) return null;

  return (
    <div className={`pwa-status ${className}`}>
      {isOffline && (
        <div className="offline-indicator">🔌 You're offline - Some features may be limited</div>
      )}

      {updateAvailable && (
        <div className="update-indicator">
          <span>🔄 New version available!</span>
          <button onClick={updateServiceWorker}>Update Now</button>
        </div>
      )}
    </div>
  );
};

// PWA Install Button Component
export const PWAInstallButton = ({ children, className = '', ...props }) => {
  const { isInstallable, installPWA } = usePWA();

  if (!isInstallable) return null;

  return (
    <button className={`pwa-install-button ${className}`} onClick={installPWA} {...props}>
      {children || '📱 Install App'}
    </button>
  );
};

// Network Status Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleConnectionChange = () => {
      updateNetworkInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Initial network info
    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, networkInfo };
};

export default usePWA;
