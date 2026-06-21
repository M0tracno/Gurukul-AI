/**
 * Query Key Factory — Centralized query key definitions for TanStack React Query.
 *
 * Provides structured, type-safe query keys for all resources.
 * Follows the query key factory pattern recommended by TanStack React Query docs.
 */

export const queryKeys = {
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
  },
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    lists: () => [...queryKeys.attendance.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.attendance.lists(), filters] as const,
    details: () => [...queryKeys.attendance.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.attendance.details(), id] as const,
    byCourse: (courseId: string) => [...queryKeys.attendance.all, 'course', courseId] as const,
    byStudent: (studentId: string) => [...queryKeys.attendance.all, 'student', studentId] as const,
  },
  marks: {
    all: ['marks'] as const,
    lists: () => [...queryKeys.marks.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.marks.lists(), filters] as const,
    details: () => [...queryKeys.marks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.marks.details(), id] as const,
    byStudent: (studentId: string) => [...queryKeys.marks.all, 'student', studentId] as const,
    byCourse: (courseId: string) => [...queryKeys.marks.all, 'course', courseId] as const,
  },
  faculty: {
    all: ['faculty'] as const,
    lists: () => [...queryKeys.faculty.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.faculty.lists(), filters] as const,
    details: () => [...queryKeys.faculty.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.faculty.details(), id] as const,
  },
  enrollment: {
    all: ['enrollment'] as const,
    lists: () => [...queryKeys.enrollment.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.enrollment.lists(), filters] as const,
    details: () => [...queryKeys.enrollment.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.enrollment.details(), id] as const,
    byStudent: (studentId: string) => [...queryKeys.enrollment.all, 'student', studentId] as const,
    byCourse: (courseId: string) => [...queryKeys.enrollment.all, 'course', courseId] as const,
  },
} as const;
