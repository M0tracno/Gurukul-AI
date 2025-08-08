import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './theme/ThemeProvider';
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';
import { ProgressiveLoader } from './components/common/LoadingComponents';
import PerformanceMonitoringService from './services/PerformanceMonitoringService';
import SecurityService from './services/SecurityService';
import StartupPerformanceService from './services/StartupPerformanceService';
import OptimizedPhase2ServicesProvider from './providers/OptimizedPhase2ServicesProvider';
import SmartFeaturesRoutes from './components/navigation/SmartFeaturesRoutes';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import RoleSelection from './pages/RoleSelection';
import RouterErrorBoundary from './components/RouterErrorBoundary';
import { APP_NAME } from './constants/appConstants';
import { getNormalizedPathname, createLocationState } from './utils/routerHelpers';
import consoleUtils from './utils/consoleUtils';
import { useScrollTopFix } from './utils/scrollTopFix';
import FacultyLogin from './pages/FacultyLogin';
import StudentLogin from './pages/StudentLogin';
import ParentLogin from './pages/ParentLogin';
import AdminLogin from './pages/AdminLogin';
import SetupPassword from './pages/SetupPassword';
import NotFound from './pages/NotFound';
import DemoBanner from './components/common/DemoBanner';
import { isDemoMode } from './config/productionDemo';

// Enhanced App.js with Phase 1 improvements

// Enhanced Phase 1 imports

// Phase 2 Smart Features imports - Optimized for faster startup

// Legacy imports for backward compatibility

// Add constants and utilities

// Global Styles and scroll utility

// Login page imports

// Phase 5 Security imports
const SecurityRoutes = React.lazy(() => import('./components/security/SecurityRoutes'));

// Test version 12: Add lazy-loaded dashboard components
const FacultyDashboard = React.lazy(() =>
  import('./pages/FacultyDashboard')
    .then(mod => {
      console.log('FacultyDashboard loaded:', mod);
      return { default: mod.default };
    })
    .catch(e => {
      console.error('FacultyDashboard failed to load', e);
      throw e;
    })
);
const StudentDashboard = React.lazy(() =>
  import('./pages/StudentDashboard')
    .then(mod => {
      console.log('StudentDashboard loaded:', mod);
      return { default: mod.default };
    })
    .catch(e => {
      console.error('StudentDashboard failed to load', e);
      throw e;
    })
);
const ParentDashboard = React.lazy(() =>
  import('./pages/ParentDashboard')
    .then(mod => {
      console.log('ParentDashboard loaded:', mod);
      return { default: mod.default };
    })
    .catch(e => {
      console.error('ParentDashboard failed to load', e);
      throw e;
    })
);
// Use the new futuristic AdminDashboard with glassmorphism design
const AdminDashboard = React.lazy(() =>
  import('./pages/AdminDashboard')
    .then(mod => {
      console.log('AdminDashboard loaded:', mod);
      console.log('AdminDashboard default export type:', typeof mod.default);
      return mod;
    })
    .catch(e => {
      console.error('AdminDashboard failed to load', e);
      throw e;
    })
);
// Phase test pages for development
const Phase2TestPage = React.lazy(() =>
  import('./pages/Phase2TestPage').then(mod => {
    console.log('Phase2TestPage loaded:', mod);
    return { default: mod.default };
  })
);
const Phase3TestPage = React.lazy(() =>
  import('./pages/Phase3TestPage').then(mod => {
    console.log('Phase3TestPage loaded:', mod);
    return { default: mod.default };
  })
);
const Phase3BTestPage = React.lazy(() =>
  import('./pages/Phase3BTestPage').then(mod => {
    console.log('Phase3BTestPage loaded:', mod);
    return { default: mod.default };
  })
);
const Phase3CTestPage = React.lazy(() =>
  import('./pages/Phase3CTestPage').then(mod => {
    console.log('Phase3CTestPage loaded:', mod);
    return { default: mod.default };
  })
);
const Phase5SecurityTestPage = React.lazy(() =>
  import('./pages/Phase5SecurityTestPage').then(mod => {
    console.log('Phase5SecurityTestPage loaded:', mod);
    return { default: mod.default };
  })
);

// Enhanced Loading component using our new LoadingComponents
const LoadingFallback = () => {
  return <ProgressiveLoader message="Loading application..." />;
};

// Test version 14: Add PrivateRoute component
function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();

  // Check if user is authenticated and has allowed role
  const isAuthenticated = currentUser && userRole;
  const hasValidRole = isAuthenticated && allowedRoles.includes(userRole);

  // Use normalized pathname to be future-proof for React Router v7
  const pathname = getNormalizedPathname(location);

  console.log('PrivateRoute check:', {
    path: pathname,
    currentUser: !!currentUser,
    userRole,
    allowedRoles,
    isAuthenticated,
    hasValidRole,
  });

  if (!hasValidRole) {
    // In normal mode, redirect to appropriate login based on role
    const roleLoginPaths = {
      faculty: '/faculty-login',
      student: '/student-login',
      parent: '/parent-login',
      admin: '/admin-login',
    };

    // Choose the first allowed role for redirection
    const redirectPath = roleLoginPaths[allowedRoles[0]] || '/faculty-login';

    // Use createLocationState to ensure compatibility with future Router versions
    const state = createLocationState(pathname);

    return <Navigate to={redirectPath} state={state} replace />;
  }

  return children;
}

// Base URL for deployed app
const getBasename = () => {
  // Get basename from package.json homepage or default to '/'
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }

  // Check for GitHub pages repo format
  const pathSegments = window.location.pathname.split('/');
  if (pathSegments.length > 2) {
    return '/' + pathSegments[1]; // e.g., /repo-name
  }

  return '/';
};

function App() {
  useScrollTopFix();

  // Record app component start
  StartupPerformanceService.recordMilestone(
    'app_component_start',
    'App component function started'
  );

  // Initialize performance monitoring and security
  useEffect(() => {
    const initServices = async () => {
      const timer = StartupPerformanceService.createServiceTimer('core_services');
      const endTimer = timer.start();

      try {
        PerformanceMonitoringService.initialize();
        SecurityService.initialize();
        StartupPerformanceService.recordMilestone(
          'core_services_init',
          'Core services initialized'
        );
      } catch (error) {
        console.error('Failed to initialize core services:', error);
      } finally {
        endTimer();
      }
    };

    initServices();

    return () => {
      PerformanceMonitoringService.cleanup();
      SecurityService.cleanup();
    };
  }, []);

  // Check if this is a deployed environment
  const [isDeployed] = useState(() => {
    // If we're not on localhost, we consider it deployed
    return (
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    );
  });

  // Log deployment environment and suppress console warnings
  useEffect(() => {
    // Suppress non-critical console warnings in production
    if (process.env.NODE_ENV === 'production') {
      consoleUtils.suppressWarnings();
    }

    consoleUtils.devLog('App initialized', 'success', {
      isDeployed,
      basename: getBasename(),
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      href: window.location.href,
      publicUrl: process.env.PUBLIC_URL || '/',
    });

    // Set document title to app name
    document.title = APP_NAME;
  }, [isDeployed]);
  return (
    <ThemeProvider>
      <CssBaseline />
      {/* Demo Banner - show if in demo mode */}
      {isDemoMode() && <DemoBanner />}
      <OptimizedPhase2ServicesProvider>
        <EnhancedErrorBoundary>
          <AuthProvider>
            <SecurityProvider>
              <DatabaseProvider>
                <RouterErrorBoundary>
                  <Router
                    basename={isDeployed ? getBasename() : '/'}
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<RoleSelection />} />
                        <Route path="/faculty-login" element={<FacultyLogin />} />
                        <Route path="/student-login" element={<StudentLogin />} />
                        <Route path="/parent-login" element={<ParentLogin />} />
                        <Route path="/admin-login" element={<AdminLogin />} />
                        <Route path="/setup-password" element={<SetupPassword />} />

                        {/* Private routes */}
                        <Route
                          path="/faculty-dashboard/*"
                          element={
                            <PrivateRoute allowedRoles={['faculty']}>
                              <Suspense fallback={<LoadingFallback />}>
                                <FacultyDashboard />
                              </Suspense>
                            </PrivateRoute>
                          }
                        />

                        <Route
                          path="/student-dashboard/*"
                          element={
                            <PrivateRoute allowedRoles={['student']}>
                              <Suspense fallback={<LoadingFallback />}>
                                <StudentDashboard />
                              </Suspense>
                            </PrivateRoute>
                          }
                        />

                        <Route
                          path="/parent-dashboard/*"
                          element={
                            <PrivateRoute allowedRoles={['parent']}>
                              <Suspense fallback={<LoadingFallback />}>
                                <ParentDashboard />
                              </Suspense>
                            </PrivateRoute>
                          }
                        />

                        <Route
                          path="/admin-dashboard/*"
                          element={
                            <PrivateRoute allowedRoles={['admin']}>
                              <Suspense fallback={<LoadingFallback />}>
                                <AdminDashboard />
                              </Suspense>
                            </PrivateRoute>
                          }
                        />

                        {/* Phase testing pages for development */}
                        <Route
                          path="/phase2-test"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <Phase2TestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/phase3-test"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <Phase3TestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/phase3b-test"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <Phase3BTestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/phase3c-test"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <Phase3CTestPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/phase5-security-test"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <Phase5SecurityTestPage />
                            </Suspense>
                          }
                        />

                        {/* Phase 2 Smart Features Routes */}
                        <Route
                          path="/smart-features/*"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <SmartFeaturesRoutes />
                            </Suspense>
                          }
                        />

                        {/* Phase 5 Security Routes */}
                        <Route
                          path="/security/*"
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              <SecurityRoutes />
                            </Suspense>
                          }
                        />

                        {/* 404 route */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </Router>
                </RouterErrorBoundary>
              </DatabaseProvider>
            </SecurityProvider>
          </AuthProvider>
        </EnhancedErrorBoundary>
      </OptimizedPhase2ServicesProvider>
    </ThemeProvider>
  );
}

export default App;
