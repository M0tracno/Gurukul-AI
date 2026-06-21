/**
 * API Client — Typed HTTP client for TanStack React Query integration.
 *
 * Provides a thin wrapper around fetch with auth token handling,
 * consistent error formatting, and JSON parsing.
 */

import env from '@/config/env';

const API_BASE_URL = env.API_URL || 'http://localhost:5000';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Array<{ field: string; value: unknown; reason: string }>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Build URL with query parameters.
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Execute an authenticated API request.
 * Throws ApiClientError on non-2xx responses.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options;
  const token = getAuthToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    let errorBody: {
      error?: string;
      message?: string;
      details?: Array<{ field: string; value: unknown; reason: string }>;
    } = {
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    };

    try {
      errorBody = await response.json();
    } catch {
      // If response body isn't JSON, use defaults
    }

    throw new ApiClientError(
      errorBody.message || `Request failed with status ${response.status}`,
      response.status,
      errorBody.error || 'UNKNOWN_ERROR',
      errorBody.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
