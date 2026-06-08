/**
 * Integration tests for the assignment submission (grade entry) user flow.
 *
 * Covers:
 * - Success path: teacher submits grades for students, data is persisted
 * - Error path: submission fails with validation error, user sees details
 *
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';

// Mock the apiClient module
vi.mock('../../features/shared/services/apiClient', () => {
  class ApiClientError extends Error {
    statusCode: number;
    code: string;
    details?: Array<{ field: string; value: unknown; reason: string }>;
    constructor(
      msg: string,
      statusCode: number,
      code: string,
      details?: Array<{ field: string; value: unknown; reason: string }>,
    ) {
      super(msg);
      this.name = 'ApiClientError';
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  }

  return {
    apiClient: vi.fn(),
    ApiClientError,
  };
});

import { apiClient, ApiClientError } from '../../features/shared/services/apiClient';
import { useCreateMark, type Mark, type CreateMarkInput } from '../../features/shared/hooks/useMarks';

const mockApiClient = vi.mocked(apiClient);

// --- Test component that exercises the assignment submission flow ---

function AssignmentSubmissionForm({
  courseId,
  studentId,
}: {
  courseId: string;
  studentId: string;
}) {
  const [examType, setExamType] = useState('midterm');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [weight, setWeight] = useState('');
  const [remarks, setRemarks] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const createMark = useCreateMark();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    const input: CreateMarkInput = {
      enrollmentId: `enr-${studentId}-${courseId}`,
      studentId,
      courseId,
      examType,
      score: Number(score),
      maxScore: Number(maxScore),
      ...(weight && { weight: Number(weight) }),
      ...(remarks && { remarks }),
    };

    createMark.mutate(input, {
      onSuccess: () => {
        setSuccessMessage('Grade submitted successfully');
        setScore('');
        setRemarks('');
      },
    });
  };

  return (
    <div data-testid="assignment-form-container">
      <h2>Submit Grade</h2>
      <form onSubmit={handleSubmit} aria-label="Grade submission form">
        <div>
          <label htmlFor="exam-type">Exam Type</label>
          <select
            id="exam-type"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
          >
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
            <option value="assignment">Assignment</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>

        <div>
          <label htmlFor="score">Score</label>
          <input
            id="score"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            min="0"
            required
          />
        </div>

        <div>
          <label htmlFor="max-score">Max Score</label>
          <input
            id="max-score"
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            min="1"
            required
          />
        </div>

        <div>
          <label htmlFor="weight">Weight (optional)</label>
          <input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="0"
            step="0.1"
          />
        </div>

        <div>
          <label htmlFor="remarks">Remarks</label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks..."
          />
        </div>

        <button type="submit" disabled={createMark.isPending}>
          {createMark.isPending ? 'Submitting...' : 'Submit Grade'}
        </button>
      </form>

      {successMessage && (
        <div data-testid="success-message" role="status">
          {successMessage}
        </div>
      )}

      {createMark.isError && (
        <div data-testid="submission-error" role="alert">
          <p>{(createMark.error as Error).message}</p>
          {(createMark.error as { details?: Array<{ field: string; reason: string }> })
            .details && (
            <ul data-testid="error-details">
              {(
                createMark.error as {
                  details: Array<{ field: string; reason: string }>;
                }
              ).details.map((detail, i) => (
                <li key={i}>
                  {detail.field}: {detail.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Assignment Submission Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully submits a grade and shows confirmation', async () => {
    const user = userEvent.setup();

    const mockCreatedMark: Mark = {
      _id: 'mark-new-1',
      enrollmentId: 'enr-student-1-course-math',
      studentId: 'student-1',
      courseId: 'course-math',
      examType: 'midterm',
      score: 85,
      maxScore: 100,
      weight: 0.3,
      remarks: 'Good performance',
      gradedBy: 'teacher-1',
      gradedAt: '2024-03-15T10:00:00Z',
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
    };

    mockApiClient.mockResolvedValueOnce(mockCreatedMark);

    render(
      <AssignmentSubmissionForm courseId="course-math" studentId="student-1" />,
      { wrapper: createWrapper() },
    );

    // Fill in the form
    const scoreInput = screen.getByLabelText(/^score$/i);
    const weightInput = screen.getByLabelText(/weight/i);
    const remarksInput = screen.getByLabelText(/remarks/i);
    const submitBtn = screen.getByRole('button', { name: /submit grade/i });

    await user.clear(scoreInput);
    await user.type(scoreInput, '85');
    await user.clear(weightInput);
    await user.type(weightInput, '0.3');
    await user.type(remarksInput, 'Good performance');
    await user.click(submitBtn);

    // Verify the API was called with correct data
    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/marks', {
        method: 'POST',
        body: {
          enrollmentId: 'enr-student-1-course-math',
          studentId: 'student-1',
          courseId: 'course-math',
          examType: 'midterm',
          score: 85,
          maxScore: 100,
          weight: 0.3,
          remarks: 'Good performance',
        },
      });
    });

    // Verify success message
    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Grade submitted successfully',
    );

    // Verify form is partially cleared (score and remarks reset)
    expect(scoreInput).toHaveValue(null);
    expect(remarksInput).toHaveValue('');
  });

  it('submits an assignment-type grade with different exam type', async () => {
    const user = userEvent.setup();

    const mockCreatedMark: Mark = {
      _id: 'mark-new-2',
      enrollmentId: 'enr-student-2-course-science',
      studentId: 'student-2',
      courseId: 'course-science',
      examType: 'assignment',
      score: 45,
      maxScore: 50,
      gradedBy: 'teacher-1',
      gradedAt: '2024-03-15T11:00:00Z',
      createdAt: '2024-03-15T11:00:00Z',
      updatedAt: '2024-03-15T11:00:00Z',
    };

    mockApiClient.mockResolvedValueOnce(mockCreatedMark);

    render(
      <AssignmentSubmissionForm
        courseId="course-science"
        studentId="student-2"
      />,
      { wrapper: createWrapper() },
    );

    // Select assignment exam type
    const examTypeSelect = screen.getByLabelText(/exam type/i);
    await user.selectOptions(examTypeSelect, 'assignment');

    // Fill score and max score
    const scoreInput = screen.getByLabelText(/^score$/i);
    const maxScoreInput = screen.getByLabelText(/max score/i);

    await user.clear(scoreInput);
    await user.type(scoreInput, '45');
    await user.clear(maxScoreInput);
    await user.type(maxScoreInput, '50');

    await user.click(screen.getByRole('button', { name: /submit grade/i }));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/marks', {
        method: 'POST',
        body: {
          enrollmentId: 'enr-student-2-course-science',
          studentId: 'student-2',
          courseId: 'course-science',
          examType: 'assignment',
          score: 45,
          maxScore: 50,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
  });

  it('displays validation error details when submission fails', async () => {
    const user = userEvent.setup();

    const validationError = new ApiClientError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      [
        { field: 'score', value: 150, reason: 'Score cannot exceed maxScore' },
      ],
    );
    mockApiClient.mockRejectedValueOnce(validationError);

    render(
      <AssignmentSubmissionForm courseId="course-math" studentId="student-1" />,
      { wrapper: createWrapper() },
    );

    // Enter an invalid score (exceeds max)
    const scoreInput = screen.getByLabelText(/^score$/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '150');

    await user.click(screen.getByRole('button', { name: /submit grade/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('submission-error')).toBeInTheDocument();
    });

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Validation failed');

    // Verify error details are shown
    expect(screen.getByTestId('error-details')).toBeInTheDocument();
    expect(screen.getByText(/score: score cannot exceed maxscore/i)).toBeInTheDocument();
  });

  it('displays generic error when server returns 500', async () => {
    const user = userEvent.setup();

    mockApiClient.mockRejectedValueOnce(
      new Error('Internal server error'),
    );

    render(
      <AssignmentSubmissionForm courseId="course-math" studentId="student-1" />,
      { wrapper: createWrapper() },
    );

    const scoreInput = screen.getByLabelText(/^score$/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '80');

    await user.click(screen.getByRole('button', { name: /submit grade/i }));

    await waitFor(() => {
      expect(screen.getByTestId('submission-error')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Internal server error',
    );
  });

  it('shows loading state while submission is pending', async () => {
    const user = userEvent.setup();

    // Use a delayed resolution to observe the pending state
    let resolveApi: (value: Mark) => void;
    mockApiClient.mockReturnValueOnce(
      new Promise<Mark>((resolve) => {
        resolveApi = resolve;
      }) as unknown as ReturnType<typeof apiClient>,
    );

    render(
      <AssignmentSubmissionForm courseId="course-math" studentId="student-1" />,
      { wrapper: createWrapper() },
    );

    const scoreInput = screen.getByLabelText(/^score$/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '75');

    const submitBtn = screen.getByRole('button', { name: /submit grade/i });
    await user.click(submitBtn);

    // Button should show loading state
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /submitting/i }),
      ).toBeDisabled();
    });

    // Resolve the API call
    resolveApi!({
      _id: 'mark-3',
      enrollmentId: 'enr-student-1-course-math',
      studentId: 'student-1',
      courseId: 'course-math',
      examType: 'midterm',
      score: 75,
      maxScore: 100,
      gradedBy: 'teacher-1',
      gradedAt: '2024-03-15T12:00:00Z',
      createdAt: '2024-03-15T12:00:00Z',
      updatedAt: '2024-03-15T12:00:00Z',
    });

    // Button should return to normal
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /submit grade/i }),
      ).not.toBeDisabled();
    });
  });
});
