/**
 * Integration tests for the dashboard navigation user flow.
 *
 * Covers:
 * - Success path: authenticated user navigates to role-specific dashboard
 * - Error path: unauthenticated user is redirected to login
 *
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock sentry
vi.mock('../../config/sentry', () => ({
  setSentryUser: vi.fn(),
  default: { init: vi.fn() },
}));

// Mock env
vi.mock('../../config/env', () => ({
  default: {
    API_URL: 'http://localhost:5000',
    NODE_ENV: 'test',
    DEV: false,
    PROD: false,
    SENTRY_DSN: '',
  },
}));

import { AuthProvider, useAuth } from '../../providers/AuthProvider';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// --- Page components for the test ---

function LoginRedirect() {
  return <div data-testid="login-page">Please log in</div>;
}

function TeacherDashboard() {
  return (
    <div data-testid="teacher-dashboard">
      <h1>Teacher Dashboard</h1>
      <nav aria-label="Dashboard navigation">
        <Link to="/teacher-dashboard/courses">My Courses</Link>
        <Link to="/teacher-dashboard/attendance">Attendance</Link>
        <Link to="/teacher-dashboard/grades">Grades</Link>
        <Link to="/teacher-dashboard/messages">Messages</Link>
      </nav>
    </div>
  );
}

function CoursesPage() {
  return <div data-testid="courses-page">My Courses</div>;
}

function AttendancePage() {
  return <div data-testid="attendance-page">Attendance</div>;
}

function GradesPage() {
  return <div data-testid="grades-page">Grades</div>;
}

function MessagesPage() {
  return <div data-testid="messages-page">Messages</div>;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginRedirect />;
  }

  return <>{children}</>;
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderWithAuth(initialRoute: string, isAuthenticated: boolean) {
  const queryClient = createTestQueryClient();

  // Set up localStorage with auth tokens if authenticated
  if (isAuthenticated) {
    const payload = {
      sub: 'user-teacher-1',
      email: 'teacher@school.edu',
      role: 'teacher',
      name: 'Dr. Smith',
      exp: Math.floor(Date.now() / 1000) + 900,
    };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockAccessToken = `header.${encodedPayload}.signature`;

    localStorage.setItem(
      'gurukul-auth-tokens',
      JSON.stringify({
        accessToken: mockAccessToken,
        refreshToken: 'refresh-token-valid',
      }),
    );
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route
              path="/teacher-dashboard"
              element={
                <PrivateRoute>
                  <TeacherDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher-dashboard/courses"
              element={
                <PrivateRoute>
                  <CoursesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher-dashboard/attendance"
              element={
                <PrivateRoute>
                  <AttendancePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher-dashboard/grades"
              element={
                <PrivateRoute>
                  <GradesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher-dashboard/messages"
              element={
                <PrivateRoute>
                  <MessagesPage />
                </PrivateRoute>
              }
            />
          </Routes>
          <LocationDisplay />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard Navigation Integration Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders dashboard for authenticated user and allows navigation between sections', async () => {
    const user = userEvent.setup();

    renderWithAuth('/teacher-dashboard', true);

    // Verify dashboard is rendered
    await waitFor(() => {
      expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();

    // Verify navigation links are present
    const nav = screen.getByRole('navigation', { name: /dashboard navigation/i });
    expect(nav).toBeInTheDocument();

    // Navigate to courses
    const coursesLink = screen.getByRole('link', { name: /my courses/i });
    await user.click(coursesLink);

    await waitFor(() => {
      expect(screen.getByTestId('courses-page')).toBeInTheDocument();
    });
  });

  it('navigates to attendance section from dashboard', async () => {
    const user = userEvent.setup();

    renderWithAuth('/teacher-dashboard', true);

    await waitFor(() => {
      expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument();
    });

    const attendanceLink = screen.getByRole('link', { name: /attendance/i });
    await user.click(attendanceLink);

    await waitFor(() => {
      expect(screen.getByTestId('attendance-page')).toBeInTheDocument();
    });
  });

  it('navigates to messages section from dashboard', async () => {
    const user = userEvent.setup();

    renderWithAuth('/teacher-dashboard', true);

    await waitFor(() => {
      expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument();
    });

    const messagesLink = screen.getByRole('link', { name: /messages/i });
    await user.click(messagesLink);

    await waitFor(() => {
      expect(screen.getByTestId('messages-page')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user away from dashboard', async () => {
    renderWithAuth('/teacher-dashboard', false);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Dashboard should NOT be visible
    expect(screen.queryByTestId('teacher-dashboard')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user away from nested dashboard routes', async () => {
    renderWithAuth('/teacher-dashboard/grades', false);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('grades-page')).not.toBeInTheDocument();
  });
});
