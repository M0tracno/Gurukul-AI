/**
 * Integration tests for the attendance viewing user flow.
 *
 * Covers:
 * - Success path: student views their attendance records with correct data
 * - Error path: API failure displays error message with retry action
 *
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the apiClient module
vi.mock('../../features/shared/services/apiClient', () => ({
  apiClient: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    statusCode: number;
    code: string;
    details?: Array<{ field: string; value: unknown; reason: string }>;
    constructor(msg: string, statusCode: number, code: string) {
      super(msg);
      this.name = 'ApiClientError';
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

import { apiClient } from '../../features/shared/services/apiClient';
import { useAttendanceByStudent, type AttendanceRecord } from '../../features/shared/hooks/useAttendance';

const mockApiClient = vi.mocked(apiClient);

// --- Test component that exercises the attendance viewing flow ---

function AttendanceViewer({ studentId }: { studentId: string }) {
  const { data, isLoading, isError, error, refetch } = useAttendanceByStudent(studentId);

  if (isLoading) {
    return <div data-testid="attendance-skeleton">Loading attendance...</div>;
  }

  if (isError) {
    return (
      <div role="alert" data-testid="attendance-error">
        <p>Failed to load attendance: {(error as Error).message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div data-testid="attendance-empty">No attendance records found</div>;
  }

  const totalRecords = data.length;
  const presentCount = data.filter(
    (r: AttendanceRecord) => r.status === 'present' || r.status === 'late',
  ).length;
  const percentage = Math.round((presentCount / totalRecords) * 100);

  return (
    <div data-testid="attendance-view">
      <h2>Attendance Summary</h2>
      <p data-testid="attendance-percentage">
        Attendance: {percentage}% ({presentCount}/{totalRecords})
      </p>
      <table aria-label="Attendance records">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((record: AttendanceRecord) => (
            <tr key={record._id} data-testid={`attendance-row-${record._id}`}>
              <td>{record.date}</td>
              <td>{record.status}</td>
              <td>{record.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Attendance Viewing Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays attendance records with correct summary for a student', async () => {
    const mockAttendance: AttendanceRecord[] = [
      {
        _id: 'att-1',
        enrollmentId: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2024-03-01',
        status: 'present',
        remarks: '',
        markedBy: 'teacher-1',
        createdAt: '2024-03-01T08:00:00Z',
        updatedAt: '2024-03-01T08:00:00Z',
      },
      {
        _id: 'att-2',
        enrollmentId: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2024-03-02',
        status: 'present',
        remarks: '',
        markedBy: 'teacher-1',
        createdAt: '2024-03-02T08:00:00Z',
        updatedAt: '2024-03-02T08:00:00Z',
      },
      {
        _id: 'att-3',
        enrollmentId: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2024-03-03',
        status: 'absent',
        remarks: 'Sick leave',
        markedBy: 'teacher-1',
        createdAt: '2024-03-03T08:00:00Z',
        updatedAt: '2024-03-03T08:00:00Z',
      },
      {
        _id: 'att-4',
        enrollmentId: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2024-03-04',
        status: 'late',
        remarks: 'Arrived 10 min late',
        markedBy: 'teacher-1',
        createdAt: '2024-03-04T08:00:00Z',
        updatedAt: '2024-03-04T08:00:00Z',
      },
    ];

    mockApiClient.mockResolvedValueOnce(mockAttendance);

    render(<AttendanceViewer studentId="student-1" />, {
      wrapper: createWrapper(),
    });

    // Initially shows loading skeleton
    expect(screen.getByTestId('attendance-skeleton')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('attendance-view')).toBeInTheDocument();
    });

    // Verify summary: 3 present/late out of 4 = 75%
    expect(screen.getByTestId('attendance-percentage')).toHaveTextContent(
      'Attendance: 75% (3/4)',
    );

    // Verify table rows
    expect(screen.getByTestId('attendance-row-att-1')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-row-att-2')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-row-att-3')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-row-att-4')).toBeInTheDocument();

    // Verify remarks are shown
    expect(screen.getByText('Sick leave')).toBeInTheDocument();
    expect(screen.getByText('Arrived 10 min late')).toBeInTheDocument();

    // Verify API was called correctly
    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/v1/attendance/student/student-1',
      expect.objectContaining({
        params: undefined,
      }),
    );
  });

  it('shows empty state when no attendance records exist', async () => {
    mockApiClient.mockResolvedValueOnce([]);

    render(<AttendanceViewer studentId="student-new" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('attendance-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('No attendance records found')).toBeInTheDocument();
  });

  it('displays error with retry button when API request fails', async () => {
    const user = userEvent.setup();

    // First call fails
    mockApiClient.mockRejectedValueOnce(
      new Error('Server error: unable to fetch attendance records'),
    );

    render(<AttendanceViewer studentId="student-1" />, {
      wrapper: createWrapper(),
    });

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('attendance-error')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /failed to load attendance/i,
    );

    // Retry button should be visible
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Mock a successful response for retry
    const mockAttendance: AttendanceRecord[] = [
      {
        _id: 'att-1',
        enrollmentId: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2024-03-01',
        status: 'present',
        remarks: '',
        markedBy: 'teacher-1',
        createdAt: '2024-03-01T08:00:00Z',
        updatedAt: '2024-03-01T08:00:00Z',
      },
    ];
    mockApiClient.mockResolvedValueOnce(mockAttendance);

    // Click retry
    await user.click(retryBtn);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByTestId('attendance-view')).toBeInTheDocument();
    });

    expect(screen.getByTestId('attendance-percentage')).toHaveTextContent(
      'Attendance: 100% (1/1)',
    );
  });
});
