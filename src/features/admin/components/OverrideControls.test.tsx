/**
 * OverrideControls & GradingOverridePanel — Unit Tests
 *
 * Validates:
 * - Override controls render score/feedback inputs and submit button (Requirement 11.2)
 * - Successful override displays the updated record (Requirement 11.3)
 * - Failed override shows Error_Envelope message and leaves the record unchanged (Requirement 11.4)
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OverrideControls } from './OverrideControls';

// Mock the admin API service
vi.mock('../services/adminApiService', () => {
  const ApiClientError = class extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode: number, code: string) {
      super(message);
      this.name = 'ApiClientError';
      this.statusCode = statusCode;
      this.code = code;
    }
  };

  return {
    submitGradeOverride: vi.fn(),
    ApiClientError,
  };
});

import { submitGradeOverride, ApiClientError } from '../services/adminApiService';

const mockSubmitGradeOverride = submitGradeOverride as ReturnType<typeof vi.fn>;

// Minimal MUI theme for rendering
const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const defaultProps = {
  submissionId: 'sub-001',
  questionId: 'q-001',
  currentScore: 7,
  maxScore: 10,
  currentFeedback: 'Good attempt, but needs more detail.',
  alreadyOverridden: false,
};

describe('OverrideControls', () => {
  beforeEach(() => {
    mockSubmitGradeOverride.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.2: Override controls render for authorized records
  // ---------------------------------------------------------------------------

  describe('Rendering (Requirement 11.2)', () => {
    it('renders a score input field', () => {
      renderWithTheme(<OverrideControls {...defaultProps} />);
      const scoreInput = screen.getByLabelText('Score');
      expect(scoreInput).toBeInTheDocument();
      expect(scoreInput).toHaveValue(7);
    });

    it('renders a feedback input field', () => {
      renderWithTheme(<OverrideControls {...defaultProps} />);
      const feedbackInput = screen.getByLabelText('Feedback');
      expect(feedbackInput).toBeInTheDocument();
      expect(feedbackInput).toHaveValue('Good attempt, but needs more detail.');
    });

    it('renders a submit override button', () => {
      renderWithTheme(<OverrideControls {...defaultProps} />);
      const submitButton = screen.getByRole('button', { name: /submit override/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it('shows "Previously Overridden" chip when alreadyOverridden is true', () => {
      renderWithTheme(<OverrideControls {...defaultProps} alreadyOverridden={true} />);
      expect(screen.getByText('Previously Overridden')).toBeInTheDocument();
    });

    it('does not show "Previously Overridden" chip when alreadyOverridden is false', () => {
      renderWithTheme(<OverrideControls {...defaultProps} alreadyOverridden={false} />);
      expect(screen.queryByText('Previously Overridden')).not.toBeInTheDocument();
    });

    it('displays the max score helper text', () => {
      renderWithTheme(<OverrideControls {...defaultProps} />);
      expect(screen.getByText('Max: 10')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.3: Successful override displays updated record
  // ---------------------------------------------------------------------------

  describe('Successful override (Requirement 11.3)', () => {
    it('displays the updated record on successful override', async () => {
      const updatedResult = {
        submissionId: 'sub-001',
        questionId: 'q-001',
        score: 9,
        feedback: 'Excellent work with thorough explanation.',
        overriddenByTeacher: true,
      };
      mockSubmitGradeOverride.mockResolvedValueOnce(updatedResult);

      const onSuccess = vi.fn();
      renderWithTheme(<OverrideControls {...defaultProps} onOverrideSuccess={onSuccess} />);

      // Change score and feedback
      const scoreInput = screen.getByLabelText('Score');
      const feedbackInput = screen.getByLabelText('Feedback');
      fireEvent.change(scoreInput, { target: { value: '9' } });
      fireEvent.change(feedbackInput, {
        target: { value: 'Excellent work with thorough explanation.' },
      });

      // Submit override
      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      // Wait for success display
      await waitFor(() => {
        expect(screen.getByText('Override applied successfully')).toBeInTheDocument();
      });

      // Verify updated record details are displayed
      expect(screen.getByText(/Score: 9/)).toBeInTheDocument();
      expect(
        screen.getByText(/Feedback: Excellent work with thorough explanation\./)
      ).toBeInTheDocument();
    });

    it('calls onOverrideSuccess callback with the result', async () => {
      const updatedResult = {
        submissionId: 'sub-001',
        questionId: 'q-001',
        score: 8,
        feedback: 'Well done.',
        overriddenByTeacher: true,
      };
      mockSubmitGradeOverride.mockResolvedValueOnce(updatedResult);

      const onSuccess = vi.fn();
      renderWithTheme(<OverrideControls {...defaultProps} onOverrideSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(updatedResult);
      });
    });

    it('calls submitGradeOverride with correct parameters', async () => {
      mockSubmitGradeOverride.mockResolvedValueOnce({
        submissionId: 'sub-001',
        questionId: 'q-001',
        score: 7,
        feedback: 'Good attempt, but needs more detail.',
        overriddenByTeacher: true,
      });

      renderWithTheme(<OverrideControls {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(mockSubmitGradeOverride).toHaveBeenCalledWith({
          submissionId: 'sub-001',
          questionId: 'q-001',
          score: 7,
          feedback: 'Good attempt, but needs more detail.',
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.4: Failed override shows Error_Envelope message,
  //                    record remains unchanged
  // ---------------------------------------------------------------------------

  describe('Failed override (Requirement 11.4)', () => {
    it('displays the Error_Envelope message when override fails', async () => {
      mockSubmitGradeOverride.mockRejectedValueOnce(
        new ApiClientError(
          'Submission is already finalized and cannot be overridden.',
          400,
          'ALREADY_FINALIZED'
        )
      );

      renderWithTheme(<OverrideControls {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Submission is already finalized and cannot be overridden.')
        ).toBeInTheDocument();
      });
    });

    it('does NOT display a success message when override fails', async () => {
      mockSubmitGradeOverride.mockRejectedValueOnce(
        new ApiClientError('Forbidden: insufficient permissions.', 403, 'FORBIDDEN')
      );

      renderWithTheme(<OverrideControls {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(screen.getByText('Forbidden: insufficient permissions.')).toBeInTheDocument();
      });

      // No success indicator
      expect(screen.queryByText('Override applied successfully')).not.toBeInTheDocument();
    });

    it('leaves the displayed record unchanged on failure (score and feedback remain)', async () => {
      mockSubmitGradeOverride.mockRejectedValueOnce(
        new ApiClientError('Internal server error.', 500, 'INTERNAL_ERROR')
      );

      renderWithTheme(<OverrideControls {...defaultProps} />);

      // Verify initial values before submission
      const scoreInput = screen.getByLabelText('Score') as HTMLInputElement;
      const feedbackInput = screen.getByLabelText('Feedback') as HTMLInputElement;
      expect(scoreInput.value).toBe('7');
      expect(feedbackInput.value).toBe('Good attempt, but needs more detail.');

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Internal server error.')).toBeInTheDocument();
      });

      // Verify record is unchanged — score and feedback remain at original values
      expect(scoreInput.value).toBe('7');
      expect(feedbackInput.value).toBe('Good attempt, but needs more detail.');
    });

    it('shows a generic message for non-ApiClientError failures', async () => {
      mockSubmitGradeOverride.mockRejectedValueOnce(new Error('Network failure'));

      renderWithTheme(<OverrideControls {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred while submitting the override.')
        ).toBeInTheDocument();
      });
    });

    it('does not call onOverrideSuccess when override fails', async () => {
      mockSubmitGradeOverride.mockRejectedValueOnce(
        new ApiClientError('Conflict detected.', 409, 'CONFLICT')
      );

      const onSuccess = vi.fn();
      renderWithTheme(<OverrideControls {...defaultProps} onOverrideSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(screen.getByText('Conflict detected.')).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  describe('Client-side validation', () => {
    it('shows error when score is negative', async () => {
      renderWithTheme(<OverrideControls {...defaultProps} />);

      const scoreInput = screen.getByLabelText('Score');
      fireEvent.change(scoreInput, { target: { value: '-1' } });
      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(screen.getByText('Score must be a non-negative number.')).toBeInTheDocument();
      });

      // API should not be called
      expect(mockSubmitGradeOverride).not.toHaveBeenCalled();
    });

    it('shows error when feedback is empty', async () => {
      renderWithTheme(<OverrideControls {...defaultProps} currentFeedback="" />);

      fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

      await waitFor(() => {
        expect(screen.getByText('Feedback is required.')).toBeInTheDocument();
      });

      expect(mockSubmitGradeOverride).not.toHaveBeenCalled();
    });
  });
});
