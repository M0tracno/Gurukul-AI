/**
 * Integration tests for the login user flow.
 *
 * Covers:
 * - Success path: user enters valid credentials, receives tokens, is redirected
 * - Error path: user enters invalid credentials, sees error message
 *
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the sentry module
vi.mock('../../config/sentry', () => ({
  setSentryUser: vi.fn(),
  default: { init: vi.fn() },
}));

// Mock env module
vi.mock('../../config/env', () => ({
  default: {
    API_URL: 'http://localhost:5000',
    NODE_ENV: 'test',
    DEV: false,
    PROD: false,
    SENTRY_DSN: '',
  },
}));

import { AuthProvider } from '../../providers/AuthProvider';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function DashboardPage() {
  return <div data-testid="dashboard">Dashboard Content</div>;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthFromProvider();
  const navigate = useNavigateFromRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter email"
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Enter password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}

// Simplified test wrapper components to test the AuthProvider integration
import { useState } from 'react';
import { useAuth as useAuthFromProvider } from '../../providers/AuthProvider';
import { useNavigate as useNavigateFromRouter } from 'react-router-dom';

function renderWithProviders(ui: ReactNode, { initialRoute = '/login' } = {}) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={ui} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Login Integration Flow', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  it('successfully logs in with valid credentials and stores tokens', async () => {
    const user = userEvent.setup();

    // Create a mock JWT token with embedded user data
    const payload = {
      sub: 'user-123',
      email: 'teacher@school.edu',
      role: 'teacher',
      name: 'Dr. Smith',
      exp: Math.floor(Date.now() / 1000) + 900, // 15 min
    };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockAccessToken = `header.${encodedPayload}.signature`;

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            accessToken: mockAccessToken,
            refreshToken: 'refresh-token-abc',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'teacher@school.edu');
    await user.type(passwordInput, 'SecurePass123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'teacher@school.edu',
            password: 'SecurePass123',
          }),
        })
      );
    });

    // Verify tokens were stored
    await waitFor(() => {
      const stored = localStorage.getItem('gurukul-auth-tokens');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.accessToken).toBe(mockAccessToken);
      expect(parsed.refreshToken).toBe('refresh-token-abc');
    });
  });

  it('displays an error message when login fails with invalid credentials', async () => {
    const user = userEvent.setup();

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'wrong@email.com');
    await user.type(passwordInput, 'WrongPass');
    await user.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/invalid email or password/i);
    });

    // Verify tokens were NOT stored
    expect(localStorage.getItem('gurukul-auth-tokens')).toBeNull();
  });

  it('displays an error message when network request fails', async () => {
    const user = userEvent.setup();

    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'user@school.edu');
    await user.type(passwordInput, 'Pass123');
    await user.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/network error/i);
    });
  });
});
