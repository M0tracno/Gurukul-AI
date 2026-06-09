/**
 * Course query and mutation hooks.
 *
 * Manages server state for course resources via TanStack React Query.
 * - staleTime: 10 minutes (course data is relatively stable)
 * - gcTime: 15 minutes
 * - Mutations auto-invalidate related queries on success.
 *
 * Validates: Requirements 5.2, 5.7
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { queryKeys } from './queryKeys';
import type { PaginationParams, PaginatedResponse } from '../types';

// --- Types ---

export interface Course {
  _id: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  semester: string;
  department?: string;
  facultyId?: string;
  maxCapacity?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  code: string;
  description?: string;
  credits: number;
  semester: string;
  department?: string;
  facultyId?: string;
  maxCapacity?: number;
}

export interface UpdateCourseInput {
  name?: string;
  code?: string;
  description?: string;
  credits?: number;
  semester?: string;
  department?: string;
  facultyId?: string;
  maxCapacity?: number;
}

// --- Query configuration ---

const COURSE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const COURSE_GC_TIME = 15 * 60 * 1000; // 15 minutes

// --- Query hooks ---

/** Fetch paginated list of courses */
export function useCourses(
  params?: PaginationParams & { search?: string; semester?: string },
  options?: Partial<UseQueryOptions<PaginatedResponse<Course>>>
) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Course>>('/api/v1/courses', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: COURSE_STALE_TIME,
    gcTime: COURSE_GC_TIME,
    ...options,
  });
}

/** Fetch a single course by ID */
export function useCourse(id: string, options?: Partial<UseQueryOptions<Course>>) {
  return useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: () => apiClient<Course>(`/api/v1/courses/${id}`),
    staleTime: COURSE_STALE_TIME,
    gcTime: COURSE_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

// --- Mutation hooks ---

/** Create a new course; invalidates course lists on success */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCourseInput) =>
      apiClient<Course>('/api/v1/courses', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
    },
  });
}

/** Update an existing course; invalidates lists and detail cache */
export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCourseInput) =>
      apiClient<Course>(`/api/v1/courses/${id}`, { method: 'PUT', body: data }),
    onSuccess: updatedCourse => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
      queryClient.setQueryData(queryKeys.courses.detail(id), updatedCourse);
    },
  });
}

/** Soft-delete a course; invalidates course lists */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/courses/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.courses.detail(id) });
    },
  });
}
