/**
 * Enrollment query and mutation hooks.
 *
 * Manages server state for enrollment resources via TanStack React Query.
 * - staleTime: 10 minutes (enrollments are stable once set)
 * - gcTime: 15 minutes
 * - Mutations auto-invalidate related queries (enrollment, students, courses) on success.
 *
 * Validates: Requirements 5.2, 5.7
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { queryKeys } from './queryKeys';
import type { PaginationParams, PaginatedResponse } from '../types';

// --- Types ---

export interface Enrollment {
  _id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'dropped' | 'withdrawn';
  grade?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrollmentInput {
  studentId: string;
  courseId: string;
  enrollmentDate?: string;
}

export interface UpdateEnrollmentInput {
  status?: Enrollment['status'];
  grade?: string;
  completedAt?: string;
}

export interface EnrollmentFilters {
  studentId?: string;
  courseId?: string;
  status?: Enrollment['status'];
}

// --- Query configuration ---

const ENROLLMENT_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const ENROLLMENT_GC_TIME = 15 * 60 * 1000; // 15 minutes

// --- Query hooks ---

/** Fetch paginated list of enrollments with filters */
export function useEnrollments(
  params?: PaginationParams & EnrollmentFilters,
  options?: Partial<UseQueryOptions<PaginatedResponse<Enrollment>>>
) {
  return useQuery({
    queryKey: queryKeys.enrollment.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Enrollment>>('/api/v1/enrollments', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: ENROLLMENT_STALE_TIME,
    gcTime: ENROLLMENT_GC_TIME,
    ...options,
  });
}

/** Fetch a single enrollment by ID */
export function useEnrollment(id: string, options?: Partial<UseQueryOptions<Enrollment>>) {
  return useQuery({
    queryKey: queryKeys.enrollment.detail(id),
    queryFn: () => apiClient<Enrollment>(`/api/v1/enrollments/${id}`),
    staleTime: ENROLLMENT_STALE_TIME,
    gcTime: ENROLLMENT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/** Fetch enrollments for a specific student */
export function useEnrollmentsByStudent(
  studentId: string,
  options?: Partial<UseQueryOptions<Enrollment[]>>
) {
  return useQuery({
    queryKey: queryKeys.enrollment.byStudent(studentId),
    queryFn: () => apiClient<Enrollment[]>(`/api/v1/enrollments/student/${studentId}`),
    staleTime: ENROLLMENT_STALE_TIME,
    gcTime: ENROLLMENT_GC_TIME,
    enabled: !!studentId,
    ...options,
  });
}

/** Fetch enrollments for a specific course */
export function useEnrollmentsByCourse(
  courseId: string,
  options?: Partial<UseQueryOptions<Enrollment[]>>
) {
  return useQuery({
    queryKey: queryKeys.enrollment.byCourse(courseId),
    queryFn: () => apiClient<Enrollment[]>(`/api/v1/enrollments/course/${courseId}`),
    staleTime: ENROLLMENT_STALE_TIME,
    gcTime: ENROLLMENT_GC_TIME,
    enabled: !!courseId,
    ...options,
  });
}

// --- Mutation hooks ---

/** Create a new enrollment; invalidates enrollment lists, student, and course queries */
export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEnrollmentInput) =>
      apiClient<Enrollment>('/api/v1/enrollments', { method: 'POST', body: data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment.byStudent(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment.byCourse(variables.courseId),
      });
      // Also invalidate student and course lists since enrollment counts may change
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
    },
  });
}

/** Update an enrollment (e.g., change status); invalidates related queries */
export function useUpdateEnrollment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEnrollmentInput) =>
      apiClient<Enrollment>(`/api/v1/enrollments/${id}`, { method: 'PUT', body: data }),
    onSuccess: updatedEnrollment => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.lists() });
      queryClient.setQueryData(queryKeys.enrollment.detail(id), updatedEnrollment);
      if (updatedEnrollment.studentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.enrollment.byStudent(updatedEnrollment.studentId),
        });
      }
      if (updatedEnrollment.courseId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.enrollment.byCourse(updatedEnrollment.courseId),
        });
      }
    },
  });
}

/** Delete/withdraw an enrollment; invalidates enrollment queries */
export function useDeleteEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/enrollments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
    },
  });
}
