/**
 * Student query and mutation hooks.
 *
 * Manages server state for student resources via TanStack React Query.
 * - staleTime: 5 minutes (student data changes infrequently during a session)
 * - gcTime: 10 minutes (keep in cache for quick navigation)
 * - Mutations auto-invalidate related queries on success.
 *
 * Validates: Requirements 5.2, 5.7
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { queryKeys } from './queryKeys';
import type { PaginationParams, PaginatedResponse } from '../types';

// --- Types ---

export interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  grade: string;
  dateOfBirth?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  address?: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studentId: string;
  grade: string;
  dateOfBirth?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  address?: string;
}

export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  grade?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  address?: string;
  avatar?: string;
}

// --- Query configuration ---

const STUDENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const STUDENT_GC_TIME = 10 * 60 * 1000; // 10 minutes

// --- Query hooks ---

/** Fetch paginated list of students */
export function useStudents(
  params?: PaginationParams & { search?: string },
  options?: Partial<UseQueryOptions<PaginatedResponse<Student>>>
) {
  return useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Student>>('/api/v1/students', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: STUDENT_STALE_TIME,
    gcTime: STUDENT_GC_TIME,
    ...options,
  });
}

/** Fetch a single student by ID */
export function useStudent(
  id: string,
  options?: Partial<UseQueryOptions<Student>>
) {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => apiClient<Student>(`/api/v1/students/${id}`),
    staleTime: STUDENT_STALE_TIME,
    gcTime: STUDENT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

// --- Mutation hooks ---

/** Create a new student; invalidates student lists on success */
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentInput) =>
      apiClient<Student>('/api/v1/students', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}

/** Update an existing student; invalidates lists and the specific detail cache */
export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStudentInput) =>
      apiClient<Student>(`/api/v1/students/${id}`, { method: 'PUT', body: data }),
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.setQueryData(queryKeys.students.detail(id), updatedStudent);
    },
  });
}

/** Soft-delete a student; invalidates student lists */
export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/students/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.students.detail(id) });
    },
  });
}
