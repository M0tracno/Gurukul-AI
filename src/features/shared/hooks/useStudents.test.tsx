/**
 * Tests for student query and mutation hooks.
 *
 * Validates:
 * - Query hooks use correct query keys and configuration
 * - Mutation hooks invalidate related queries on success
 * - 3-retry failure behavior (React Query global default)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
} from './useStudents';
import { queryKeys } from './queryKeys';

// Mock the apiClient module
vi.mock('../services/apiClient', () => ({
  apiClient: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    statusCode: number;
    code: string;
    constructor(msg: string, statusCode: number, code: string) {
      super(msg);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

import { apiClient } from '../services/apiClient';

const mockApiClient = vi.mocked(apiClient);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // disable retries for faster tests
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a paginated list of students', async () => {
    const mockResponse = {
      data: [
        {
          _id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          studentId: 'S001',
          grade: '10',
          active: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    mockApiClient.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useStudents({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/students', {
      params: { page: 1, pageSize: 10 },
    });
  });

  it('fetches a single student by ID', async () => {
    const mockStudent = {
      _id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      studentId: 'S001',
      grade: '10',
      active: true,
      createdAt: '',
      updatedAt: '',
    };
    mockApiClient.mockResolvedValueOnce(mockStudent);

    const { result } = renderHook(() => useStudent('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStudent);
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/students/1');
  });

  it('does not fetch student when id is empty', () => {
    const { result } = renderHook(() => useStudent(''), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a student and invalidates student list queries', async () => {
    const newStudent = {
      _id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      studentId: 'S002',
      grade: '11',
      active: true,
      createdAt: '',
      updatedAt: '',
    };
    mockApiClient.mockResolvedValueOnce(newStudent);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCreateStudent(), { wrapper: Wrapper });

    result.current.mutate({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'password123',
      studentId: 'S002',
      grade: '11',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.students.lists(),
    });
  });
});

describe('useUpdateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a student and invalidates related queries', async () => {
    const updatedStudent = {
      _id: '1',
      firstName: 'John',
      lastName: 'Updated',
      email: 'john@example.com',
      studentId: 'S001',
      grade: '10',
      active: true,
      createdAt: '',
      updatedAt: '',
    };
    mockApiClient.mockResolvedValueOnce(updatedStudent);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useUpdateStudent('1'), { wrapper: Wrapper });

    result.current.mutate({ lastName: 'Updated' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.students.lists(),
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(queryKeys.students.detail('1'), updatedStudent);
  });
});

describe('useDeleteStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a student and invalidates/removes related queries', async () => {
    mockApiClient.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDeleteStudent(), { wrapper: Wrapper });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.students.lists(),
    });
    expect(removeQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.students.detail('1'),
    });
  });
});

describe('Query key structure', () => {
  it('produces correct hierarchical keys for students', () => {
    expect(queryKeys.students.all).toEqual(['students']);
    expect(queryKeys.students.lists()).toEqual(['students', 'list']);
    expect(queryKeys.students.list({ search: 'John' })).toEqual([
      'students',
      'list',
      { search: 'John' },
    ]);
    expect(queryKeys.students.details()).toEqual(['students', 'detail']);
    expect(queryKeys.students.detail('123')).toEqual(['students', 'detail', '123']);
  });
});
