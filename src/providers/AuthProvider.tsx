/**
 * AuthProvider — Authentication state management.
 *
 * Manages user session state, token storage, and provides
 * login/logout/refresh operations to the rest of the app.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setSentryUser } from '../config/sentry';

/** Supported user roles across the platform */
type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  /** Currently authenticated user, or null if unauthenticated */
  user: AuthUser | null;
  /** Whether the initial auth check is still in progress */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current access token (for API calls) */
  accessToken: string | null;
  /** Log in with credentials; resolves on success, throws on failure */
  login: (email: string, password: string) => Promise<void>;
  /** Log out and clear all session state */
  logout: () => Promise<void>;
  /** Manually refresh the token pair */
  refreshTokens: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'gurukul-auth-tokens';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthTokens;
    if (parsed.accessToken && parsed.refreshToken) return parsed;
  } catch {
    // Corrupted or unavailable storage
  }
  return null;
}

function storeTokens(tokens: AuthTokens): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Silently fail — tokens still usable for the session
  }
}

function clearStoredTokens(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Decodes a JWT payload without validation (for reading user info client-side).
 * Actual validation happens server-side.
 */
function decodeTokenPayload(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return {
      id: payload.sub || payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name || payload.email,
    };
  } catch {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from stored tokens on mount
  useEffect(() => {
    const stored = getStoredTokens();
    if (stored) {
      const decoded = decodeTokenPayload(stored.accessToken);
      if (decoded) {
        setUser(decoded);
        setAccessToken(stored.accessToken);
        setSentryUser({ id: decoded.id, email: decoded.email, role: decoded.role });
      } else {
        // Token is unreadable — clear it
        clearStoredTokens();
        setSentryUser(null);
      }
    } else {
      setSentryUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message || 'Login failed',
      );
    }

    const data = (await response.json()) as {
      data: { accessToken: string; refreshToken: string };
    };
    const tokens: AuthTokens = {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
    };

    storeTokens(tokens);
    setAccessToken(tokens.accessToken);
    const decoded = decodeTokenPayload(tokens.accessToken);
    setUser(decoded);
    setSentryUser(decoded ? { id: decoded.id, email: decoded.email, role: decoded.role } : null);
  }, []);

  const logout = useCallback(async () => {
    const stored = getStoredTokens();
    // Best-effort server logout
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(stored?.accessToken && {
            Authorization: `Bearer ${stored.accessToken}`,
          }),
        },
        body: JSON.stringify({
          refreshToken: stored?.refreshToken,
        }),
      });
    } catch {
      // Logout is best-effort; always clear locally
    }

    clearStoredTokens();
    setAccessToken(null);
    setUser(null);
    setSentryUser(null);
  }, []);

  const refreshTokens = useCallback(async () => {
    const stored = getStoredTokens();
    if (!stored?.refreshToken) {
      // No refresh token available — force logout
      clearStoredTokens();
      setAccessToken(null);
      setUser(null);
      setSentryUser(null);
      return;
    }

    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed — session is invalid
      clearStoredTokens();
      setAccessToken(null);
      setUser(null);
      setSentryUser(null);
      return;
    }

    const data = (await response.json()) as {
      data: { accessToken: string; refreshToken: string };
    };
    const newTokens: AuthTokens = {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
    };

    storeTokens(newTokens);
    setAccessToken(newTokens.accessToken);
    const decoded = decodeTokenPayload(newTokens.accessToken);
    setUser(decoded);
    setSentryUser(decoded ? { id: decoded.id, email: decoded.email, role: decoded.role } : null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      accessToken,
      login,
      logout,
      refreshTokens,
    }),
    [user, isLoading, accessToken, login, logout, refreshTokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state and actions.
 * Must be used inside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
