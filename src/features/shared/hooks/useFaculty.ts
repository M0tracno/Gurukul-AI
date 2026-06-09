/**
 * Faculty query and mutation hooks.
 *
 * Manages server state for faculty resources via TanStack React Query.
 * - staleTime: 10 minutes (faculty data is relatively stable)
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

export interface Faculty {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  department: string;
  designation?: string;
  specialization?: string;
  phone?: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacultyInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  facultyId: string;
  department: string;
  designation?: string;
  specialization?: string;
  phone?: string;
}

export interface UpdateFacultyInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  designation?: string;
  specialization?: string;
  phone?: string;
  avatar?: string;
}

// --- Query configuration ---

const FACULTY_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const FACULTY_GC_TIME = 15 * 60 * 1000; // 15 minutes

// --- Query hooks ---

/** Fetch paginated list of faculty */
export function useFaculty(
  params?: PaginationParams & { search?: string; department?: string },
  options?: Partial<UseQueryOptions<PaginatedResponse<Faculty>>>
) {
  return useQuery({
    queryKey: queryKeys.faculty.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Faculty>>('/api/v1/faculty', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: FACULTY_STALE_TIME,
    gcTime: FACULTY_GC_TIME,
    ...options,
  });
}

/** Fetch a single faculty member by ID */
export function useFacultyMember(id: string, options?: Partial<UseQueryOptions<Faculty>>) {
  return useQuery({
    queryKey: queryKeys.faculty.detail(id),
    queryFn: () => apiClient<Faculty>(`/api/v1/faculty/${id}`),
    staleTime: FACULTY_STALE_TIME,
    gcTime: FACULTY_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

// --- Mutation hooks ---

/** Create a new faculty member; invalidates faculty lists on success */
export function useCreateFaculty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFacultyInput) =>
      apiClient<Faculty>('/api/v1/faculty', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.lists() });
    },
  });
}

/** Update an existing faculty member; invalidates lists and detail cache */
export function useUpdateFaculty(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFacultyInput) =>
      apiClient<Faculty>(`/api/v1/faculty/${id}`, { method: 'PUT', body: data }),
    onSuccess: updatedFaculty => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.lists() });
      queryClient.setQueryData(queryKeys.faculty.detail(id), updatedFaculty);
    },
  });
}

/** Soft-delete a faculty member; invalidates faculty lists */
export function useDeleteFaculty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/faculty/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.faculty.detail(id) });
    },
  });
}
