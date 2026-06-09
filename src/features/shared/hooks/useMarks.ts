/**
 * Marks query and mutation hooks.
 *
 * Manages server state for mark/grade resources via TanStack React Query.
 * - staleTime: 5 minutes (marks change infrequently once entered)
 * - gcTime: 10 minutes
 * - Mutations auto-invalidate related queries on success.
 *
 * Validates: Requirements 5.2, 5.7
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { queryKeys } from './queryKeys';
import type { PaginationParams, PaginatedResponse } from '../types';

// --- Types ---

export interface Mark {
  _id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  examType: string;
  score: number;
  maxScore: number;
  weight?: number;
  remarks?: string;
  gradedBy: string;
  gradedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarkInput {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  examType: string;
  score: number;
  maxScore: number;
  weight?: number;
  remarks?: string;
}

export interface UpdateMarkInput {
  score?: number;
  maxScore?: number;
  weight?: number;
  remarks?: string;
}

export interface MarkFilters {
  courseId?: string;
  studentId?: string;
  examType?: string;
}

// --- Query configuration ---

const MARK_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const MARK_GC_TIME = 10 * 60 * 1000; // 10 minutes

// --- Query hooks ---

/** Fetch paginated list of marks with filters */
export function useMarks(
  params?: PaginationParams & MarkFilters,
  options?: Partial<UseQueryOptions<PaginatedResponse<Mark>>>
) {
  return useQuery({
    queryKey: queryKeys.marks.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Mark>>('/api/v1/marks', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: MARK_STALE_TIME,
    gcTime: MARK_GC_TIME,
    ...options,
  });
}

/** Fetch a single mark record by ID */
export function useMark(id: string, options?: Partial<UseQueryOptions<Mark>>) {
  return useQuery({
    queryKey: queryKeys.marks.detail(id),
    queryFn: () => apiClient<Mark>(`/api/v1/marks/${id}`),
    staleTime: MARK_STALE_TIME,
    gcTime: MARK_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/** Fetch marks for a specific student */
export function useMarksByStudent(
  studentId: string,
  params?: { courseId?: string; examType?: string },
  options?: Partial<UseQueryOptions<Mark[]>>
) {
  return useQuery({
    queryKey: queryKeys.marks.byStudent(studentId),
    queryFn: () =>
      apiClient<Mark[]>(`/api/v1/marks/student/${studentId}`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: MARK_STALE_TIME,
    gcTime: MARK_GC_TIME,
    enabled: !!studentId,
    ...options,
  });
}

/** Fetch marks for a specific course */
export function useMarksByCourse(
  courseId: string,
  params?: { examType?: string },
  options?: Partial<UseQueryOptions<Mark[]>>
) {
  return useQuery({
    queryKey: queryKeys.marks.byCourse(courseId),
    queryFn: () =>
      apiClient<Mark[]>(`/api/v1/marks/course/${courseId}`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: MARK_STALE_TIME,
    gcTime: MARK_GC_TIME,
    enabled: !!courseId,
    ...options,
  });
}

// --- Mutation hooks ---

/** Create a new mark entry; invalidates marks lists and related student/course queries */
export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarkInput) =>
      apiClient<Mark>('/api/v1/marks', { method: 'POST', body: data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.marks.byStudent(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.marks.byCourse(variables.courseId),
      });
    },
  });
}

/** Update an existing mark record */
export function useUpdateMark(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMarkInput) =>
      apiClient<Mark>(`/api/v1/marks/${id}`, { method: 'PUT', body: data }),
    onSuccess: updatedMark => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.lists() });
      queryClient.setQueryData(queryKeys.marks.detail(id), updatedMark);
      // Also invalidate student and course views
      if (updatedMark.studentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.marks.byStudent(updatedMark.studentId),
        });
      }
      if (updatedMark.courseId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.marks.byCourse(updatedMark.courseId),
        });
      }
    },
  });
}

/** Delete a mark record */
export function useDeleteMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/marks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
    },
  });
}
