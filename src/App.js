import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './auth/AuthContext';
import { APP_NAME } from './constants/appConstants';
import { useScrollTopFix } from './utils/scrollTopFix';
import { AppRoutes } from './app/routes';

// Context providers
const SecurityProvider = React.lazy(() => import('./contexts/SecurityContext').then(m => ({ default: m.SecurityProvider })));
const DatabaseProvider = React.lazy(() => import('./contexts/DatabaseContext').then(m => ({ default: m.DatabaseProvider })));

// Lightweight loading component
const LoadingFallback = ({ message = 'Loading...' }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '200px',
    fontSize: '16px',
    color: '#666'
  }}>
    {message}
  </div>
);

// Base URL helper
const getBasename = () => {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }

  const pathSegments = window.location.pathname.split('/');
  if (pathSegments.length > 2) {
    return '/' + pathSegments[1];
  }

  return '/';
};

function App() {
  useScrollTopFix();

  // Initialize services lazily
  useEffect(() => {
    const initServices = async () => {
      try {
        // Only import heavy services when needed
        const [
          PerformanceMonitoringService,
          SecurityService,
          StartupPerformanceService
        ] = await Promise.all([
          import('./services/PerformanceMonitoringService').then(m => m.default),
          import('./services/SecurityService').then(m => m.default),
          import('./services/StartupPerformanceService').then(m => m.default)
        ]);

        PerformanceMonitoringService.initialize();
        SecurityService.initialize();
        StartupPerformanceService.recordMilestone('core_services_init', 'Core services initialized');
      } catch (error) {
        console.error('Failed to initialize core services:', error);
      }
    };

    initServices();
  }, []);

  const [isDeployed] = useState(() => {
    return !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
  });

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Suspense fallback={<LoadingFallback message="Initializing security..." />}>
          <SecurityProvider>
            <Suspense fallback={<LoadingFallback message="Connecting to database..." />}>
              <DatabaseProvider>
                <Router
                  basename={isDeployed ? getBasename() : '/'}
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <AppRoutes />
                </Router>
              </DatabaseProvider>
            </Suspense>
          </SecurityProvider>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;