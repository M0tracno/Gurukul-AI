/**
 * Admin API Service
 *
 * Provides typed methods for admin-specific API calls:
 * - System metrics from /metrics/json endpoint
 * - Grading override (PUT /api/v1/grading/submissions/:submissionId/answers/:questionId/override)
 * - Submission finalization (POST /api/v1/grading/submissions/:submissionId/finalize)
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { apiClient, ApiClientError } from '@/features/shared/services/apiClient';

// --- Metrics Types ---

export interface EndpointMetrics {
  requestCount: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  slowResponseCount: number;
}

export interface SystemMetrics {
  totalRequests: number;
  totalErrors: number;
  alertThresholdMs: number;
  notificationChannel: string;
  alertingEnabled: boolean;
  endpoints: Record<string, EndpointMetrics>;
}

export interface MetricsEnvelope {
  success: boolean;
  data: SystemMetrics;
}

// --- Override Types ---

export interface GradedAnswer {
  questionId: string;
  score: number;
  maxScore: number;
  confidence?: number;
  feedback?: string;
  overriddenByTeacher: boolean;
}

export interface SubmissionRecord {
  _id: string;
  assessmentId: string;
  studentId: string;
  answers: Array<{ questionId: string; response: string }>;
  submittedAt: string;
  gradingStatus: 'queued' | 'processing' | 'completed' | 'failed';
  gradedAnswers?: GradedAnswer[];
  finalized: boolean;
}

export interface OverrideRequest {
  submissionId: string;
  questionId: string;
  score: number;
  feedback: string;
}

export interface OverrideResult {
  submissionId: string;
  questionId: string;
  score: number;
  feedback: string;
  overriddenByTeacher: boolean;
}

export interface OverrideEnvelope {
  success: boolean;
  data: OverrideResult;
  message?: string;
}

// --- Dashboard Stats Types ---

export interface DashboardMetrics {
  students: number;
  faculty: number;
  courses: number;
  parentAccounts: number;
}

// --- API Methods ---

/**
 * Fetch live system metrics from the /metrics/json endpoint.
 * Requirement 11.1: Display system metrics sourced from the metrics Endpoints.
 */
export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const envelope = await apiClient<MetricsEnvelope>('/metrics/json');
  return envelope.data;
}

/**
 * Fetch dashboard entity counts from backend paginated endpoints.
 * Uses page=1&limit=1 to get totals efficiently.
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [studentsRes, facultyRes, coursesRes] = await Promise.allSettled([
    apiClient<{ data: unknown; meta?: { total?: number }; pagination?: { total?: number } }>(
      '/api/students',
      { params: { page: 1, limit: 1 } }
    ),
    apiClient<{ data: unknown; meta?: { total?: number }; pagination?: { total?: number } }>(
      '/api/faculty',
      { params: { page: 1, limit: 1 } }
    ),
    apiClient<{ data: unknown; meta?: { total?: number }; pagination?: { total?: number } }>(
      '/api/courses',
      { params: { page: 1, limit: 1 } }
    ),
  ]);

  const extractTotal = (result: PromiseSettledResult<unknown>): number => {
    if (result.status !== 'fulfilled') return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = result.value as any;
    return (
      val?.meta?.total ?? val?.pagination?.total ?? val?.data?.pagination?.total ?? val?.total ?? 0
    );
  };

  return {
    students: extractTotal(studentsRes),
    faculty: extractTotal(facultyRes),
    courses: extractTotal(coursesRes),
    parentAccounts: 0, // Parent count endpoint not yet available
  };
}

/**
 * Submit a grading override for a specific answer.
 * PUT /api/v1/grading/submissions/:submissionId/answers/:questionId/override
 * Requirement 11.2, 11.3: Override controls calling override Endpoints, display updated record.
 */
export async function submitGradeOverride(override: OverrideRequest): Promise<OverrideResult> {
  const { submissionId, questionId, score, feedback } = override;
  const envelope = await apiClient<{ success: boolean; data: OverrideResult }>(
    `/api/v1/grading/submissions/${submissionId}/answers/${questionId}/override`,
    {
      method: 'PUT',
      body: { score, feedback },
    }
  );
  return envelope.data;
}

/**
 * Finalize a submission after admin/teacher review.
 * POST /api/v1/grading/submissions/:submissionId/finalize
 */
export async function finalizeSubmission(submissionId: string): Promise<{ finalized: boolean }> {
  const envelope = await apiClient<{ success: boolean; data: { finalized: boolean } }>(
    `/api/v1/grading/submissions/${submissionId}/finalize`,
    { method: 'POST' }
  );
  return envelope.data;
}

/**
 * Re-export ApiClientError for error handling in components.
 */
export { ApiClientError };
