/**
 * Route-level code splitting with React.lazy and Suspense.
 *
 * Each top-level route is loaded as a separate chunk via dynamic import,
 * keeping the initial entry bundle small (< 200 KB gzipped). The Suspense
 * boundary wraps each lazy component with a skeleton-style loading fallback.
 *
 * Requirements: 5.3, 5.4
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getNormalizedPathname, createLocationState } from '../utils/routerHelpers';
import { PageErrorBoundary } from '../features/shared/components/ErrorBoundary';
import { RouteLoadingSkeleton } from './RouteLoadingSkeleton';

// ---------------------------------------------------------------------------
// Lazy-loaded route components — each produces a separate chunk
// ---------------------------------------------------------------------------

// Public routes
const LandingPage = React.lazy(() => import('../pages/LandingPage'));
const RoleSelection = React.lazy(() => import('../pages/EnhancedRoleSelection'));
const FacultyLogin = React.lazy(() => import('../pages/ModernFacultyLogin'));
const StudentLogin = React.lazy(() => import('../pages/StudentLogin'));
const ParentLogin = React.lazy(() => import('../pages/ParentLogin'));
const AdminLogin = React.lazy(() => import('../pages/AdminLogin'));
const SetupPassword = React.lazy(() => import('../pages/SetupPassword'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Dashboard routes (role-specific, loaded on-demand)
const FacultyDashboard = React.lazy(() => import('../pages/FacultyDashboard'));
const StudentDashboard = React.lazy(() => import('../pages/StudentDashboard'));
const ParentDashboard = React.lazy(() => import('../pages/ParentDashboard'));
const AdminDashboard = React.lazy(() => import('../pages/AdminDashboard'));

// Feature routes
const SmartFeaturesRoutes = React.lazy(
  () => import('../components/navigation/SmartFeaturesRoutes')
);
const SecurityRoutes = React.lazy(() => import('../components/security/SecurityRoutes'));

// ---------------------------------------------------------------------------
// PrivateRoute — redirects unauthenticated/unauthorized users to login
// ---------------------------------------------------------------------------

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();

  const isAuthenticated = currentUser && userRole;
  const hasValidRole = isAuthenticated && allowedRoles.includes(userRole);

  if (!hasValidRole) {
    const roleLoginPaths: Record<string, string> = {
      faculty: '/faculty-login',
      student: '/student-login',
      parent: '/parent-login',
      admin: '/admin-login',
    };

    const redirectPath = roleLoginPaths[allowedRoles[0]] || '/faculty-login';
    const pathname = getNormalizedPathname(location);
    const state = createLocationState(pathname);

    return <Navigate to={redirectPath} state={state} replace />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// LazyRoute — wraps a lazy component in Suspense + PageErrorBoundary
// ---------------------------------------------------------------------------

interface LazyRouteProps {
  children: React.ReactNode;
  label?: string;
}

function LazyRoute({ children, label }: LazyRouteProps) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<RouteLoadingSkeleton label={label} />}>{children}</Suspense>
    </PageErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// AppRoutes — All application routes with lazy loading
// ---------------------------------------------------------------------------

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <LazyRoute label="Home">
            <LandingPage />
          </LazyRoute>
        }
      />
      <Route
        path="/role-select"
        element={
          <LazyRoute label="Role Selection">
            <RoleSelection />
          </LazyRoute>
        }
      />
      <Route
        path="/faculty-login"
        element={
          <LazyRoute label="Faculty Login">
            <FacultyLogin />
          </LazyRoute>
        }
      />
      <Route
        path="/student-login"
        element={
          <LazyRoute label="Student Login">
            <StudentLogin />
          </LazyRoute>
        }
      />
      <Route
        path="/parent-login"
        element={
          <LazyRoute label="Parent Login">
            <ParentLogin />
          </LazyRoute>
        }
      />
      <Route
        path="/admin-login"
        element={
          <LazyRoute label="Admin Login">
            <AdminLogin />
          </LazyRoute>
        }
      />
      <Route
        path="/setup-password"
        element={
          <LazyRoute label="Password Setup">
            <SetupPassword />
          </LazyRoute>
        }
      />

      {/* Private dashboard routes */}
      <Route
        path="/faculty-dashboard/*"
        element={
          <PrivateRoute allowedRoles={['faculty']}>
            <LazyRoute label="Faculty Dashboard">
              <FacultyDashboard />
            </LazyRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/student-dashboard/*"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <LazyRoute label="Student Dashboard">
              <StudentDashboard />
            </LazyRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/parent-dashboard/*"
        element={
          <PrivateRoute allowedRoles={['parent']}>
            <LazyRoute label="Parent Dashboard">
              <ParentDashboard />
            </LazyRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin-dashboard/*"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <LazyRoute label="Admin Dashboard">
              <AdminDashboard />
            </LazyRoute>
          </PrivateRoute>
        }
      />

      {/* Feature routes */}
      <Route
        path="/smart-features/*"
        element={
          <LazyRoute label="Smart Features">
            <SmartFeaturesRoutes />
          </LazyRoute>
        }
      />
      <Route
        path="/security/*"
        element={
          <LazyRoute label="Security">
            <SecurityRoutes />
          </LazyRoute>
        }
      />

      {/* 404 catch-all */}
      <Route
        path="*"
        element={
          <LazyRoute label="Page Not Found">
            <NotFound />
          </LazyRoute>
        }
      />
    </Routes>
  );
}
