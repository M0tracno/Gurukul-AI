/**
 * Attendance query and mutation hooks.
 *
 * Manages server state for attendance resources via TanStack React Query.
 * - staleTime: 2 minutes (attendance can change frequently during class hours)
 * - gcTime: 5 minutes
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

export interface AttendanceRecord {
  _id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  markedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkAttendanceInput {
  courseId: string;
  date: string;
  records: Array<{
    studentId: string;
    enrollmentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }>;
}

export interface AttendanceFilters {
  courseId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
}

// --- Query configuration ---

const ATTENDANCE_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const ATTENDANCE_GC_TIME = 5 * 60 * 1000; // 5 minutes

// --- Query hooks ---

/** Fetch paginated attendance records with filters */
export function useAttendance(
  params?: PaginationParams & AttendanceFilters,
  options?: Partial<UseQueryOptions<PaginatedResponse<AttendanceRecord>>>
) {
  return useQuery({
    queryKey: queryKeys.attendance.list(params),
    queryFn: () =>
      apiClient<PaginatedResponse<AttendanceRecord>>('/api/v1/attendance', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: ATTENDANCE_STALE_TIME,
    gcTime: ATTENDANCE_GC_TIME,
    ...options,
  });
}

/** Fetch attendance records for a specific course */
export function useAttendanceByCourse(
  courseId: string,
  params?: { date?: string },
  options?: Partial<UseQueryOptions<AttendanceRecord[]>>
) {
  return useQuery({
    queryKey: queryKeys.attendance.byCourse(courseId),
    queryFn: () =>
      apiClient<AttendanceRecord[]>(`/api/v1/attendance/course/${courseId}`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: ATTENDANCE_STALE_TIME,
    gcTime: ATTENDANCE_GC_TIME,
    enabled: !!courseId,
    ...options,
  });
}

/** Fetch attendance records for a specific student */
export function useAttendanceByStudent(
  studentId: string,
  params?: { courseId?: string; startDate?: string; endDate?: string },
  options?: Partial<UseQueryOptions<AttendanceRecord[]>>
) {
  return useQuery({
    queryKey: queryKeys.attendance.byStudent(studentId),
    queryFn: () =>
      apiClient<AttendanceRecord[]>(`/api/v1/attendance/student/${studentId}`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    staleTime: ATTENDANCE_STALE_TIME,
    gcTime: ATTENDANCE_GC_TIME,
    enabled: !!studentId,
    ...options,
  });
}

// --- Mutation hooks ---

/** Mark attendance for a class; invalidates attendance lists and related queries */
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAttendanceInput) =>
      apiClient<AttendanceRecord[]>('/api/v1/attendance', { method: 'POST', body: data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.byCourse(variables.courseId),
      });
      // Invalidate each student's attendance cache
      variables.records.forEach((record) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attendance.byStudent(record.studentId),
        });
      });
    },
  });
}

/** Update a single attendance record */
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: AttendanceRecord['status']; remarks?: string }) =>
      apiClient<AttendanceRecord>(`/api/v1/attendance/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
}
