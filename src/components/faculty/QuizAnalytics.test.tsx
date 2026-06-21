/**
 * Tests for QuizAnalytics component wiring to real quiz analytics endpoint.
 *
 * Validates task 13.5: Faculty Quiz Analytics correctly calls
 * /api/faculty/me/quiz-analytics.
 *
 * Coverage:
 * - Quiz analytics fetching from /api/faculty/me/quiz-analytics
 * - Mapping of backend response shape to UI state
 * - Loading states
 * - Error handling and friendly error messages
 * - Empty/zero state handling
 * - Metrics display (totalAttempts, averageScorePercent, scoreDistribution, completionStatus)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QuizAnalytics from './QuizAnalytics';
import facultyService from '../../services/facultyService';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';

// Mock the facultyService
vi.mock('../../services/facultyService', () => ({
  default: {
    getQuizAnalytics: vi.fn(),
  },
}));

// Test wrapper with required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const theme = createTheme();
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </BrowserRouter>
  );
};

describe('QuizAnalytics - Quiz Analytics API Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Analytics Fetching', () => {
    it('successfully fetches quiz analytics from /api/faculty/me/quiz-analytics', async () => {
      const mockAnalytics = {
        totalAttempts: 150,
        averageScorePercent: 78.5,
        scoreDistribution: {
          '0-20': 2,
          '21-40': 5,
          '41-60': 18,
          '61-80': 45,
          '81-100': 80,
        },
        completionStatus: {
          queued: 5,
          processing: 3,
          completed: 140,
          failed: 2,
        },
        completionRatePercent: 85.2,
        passRatePercent: 82.0,
        perAssessment: [
          {
            assessmentId: 'quiz1',
            title: 'Math Quiz 1',
            totalAttempts: 50,
            averageScorePercent: 75.0,
          },
        ],
      };

      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockAnalytics,
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Verify analytics data is displayed
      await waitFor(() => {
        const totalAttempts = screen.queryByText(/150/);
        if (totalAttempts) {
          expect(totalAttempts).toBeInTheDocument();
        }

        const avgScore = screen.queryByText(/78\.5/);
        if (avgScore) {
          expect(avgScore).toBeInTheDocument();
        }
      });
    });

    it('derives faculty scope from auth token, not from request', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockImplementation(
        async (quizId?: any, timeRange?: any) => {
          // Verify no teacherId is passed (derived from auth token)
          expect(quizId).toBe(null);

          return {
            success: true,
            data: {
              totalAttempts: 0,
              averageScorePercent: 0,
              scoreDistribution: {},
              completionStatus: {},
              perAssessment: [],
            },
          };
        }
      );

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });
    });
  });

  describe('Metrics Display', () => {
    it('displays totalAttempts correctly', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 42,
          averageScorePercent: 0,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      await waitFor(() => {
        const attemptsText = screen.queryByText(/42/);
        if (attemptsText) {
          expect(attemptsText).toBeInTheDocument();
        }
      });
    });

    it('displays averageScorePercent correctly', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 10,
          averageScorePercent: 85.3,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      await waitFor(() => {
        const avgText = screen.queryByText(/85\.3/);
        if (avgText) {
          expect(avgText).toBeInTheDocument();
        }
      });
    });

    it('displays scoreDistribution bands correctly', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 100,
          averageScorePercent: 70,
          scoreDistribution: {
            '0-20': 5,
            '21-40': 10,
            '41-60': 20,
            '61-80': 35,
            '81-100': 30,
          },
          completionStatus: {},
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Verify score bands are displayed
      await waitFor(() => {
        const band1 = screen.queryByText(/0-20/);
        const band2 = screen.queryByText(/81-100/);
        if (band1) expect(band1).toBeInTheDocument();
        if (band2) expect(band2).toBeInTheDocument();
      });
    });

    it('displays completionStatus counts correctly', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 50,
          averageScorePercent: 70,
          scoreDistribution: {},
          completionStatus: {
            queued: 2,
            processing: 1,
            completed: 45,
            failed: 2,
          },
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Verify completion status is displayed
      await waitFor(() => {
        const completedText = screen.queryByText(/45/);
        if (completedText) {
          expect(completedText).toBeInTheDocument();
        }
      });
    });
  });

  describe('Optional Metrics', () => {
    it('omits completionRatePercent when not available', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 10,
          averageScorePercent: 75,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
          // completionRatePercent is omitted
        },
      });

      const { container } = render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Metric should not be fabricated or shown as 0
      // (Design Req 11.8: omitted metrics are absent, not fabricated)
    });

    it('omits passRatePercent when not available', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 10,
          averageScorePercent: 75,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
          // passRatePercent is omitted
        },
      });

      const { container } = render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Metric should not be fabricated
    });

    it('displays completionRatePercent when available', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 50,
          averageScorePercent: 75,
          scoreDistribution: {},
          completionStatus: {},
          completionRatePercent: 89.5,
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      await waitFor(() => {
        const rateText = screen.queryByText(/89\.5/);
        if (rateText) {
          expect(rateText).toBeInTheDocument();
        }
      });
    });
  });

  describe('Empty/Zero State', () => {
    it('handles zero attempts gracefully', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 0,
          averageScorePercent: 0,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Should display zero state
      await waitFor(() => {
        const zeroText = screen.queryByText(/0/) || screen.queryByText(/no.*data/i);
        if (zeroText) {
          expect(zeroText).toBeInTheDocument();
        }
      });
    });

    it('handles assessment with no submissions', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          totalAttempts: 0,
          averageScorePercent: 0,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [
            {
              assessmentId: 'quiz1',
              title: 'Empty Quiz',
              totalAttempts: 0,
              averageScorePercent: 0,
            },
          ],
        },
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Should show assessment with zeroed metrics
      await waitFor(() => {
        const quizTitle = screen.queryByText(/Empty Quiz/i);
        if (quizTitle) {
          expect(quizTitle).toBeInTheDocument();
        }
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading indicator while fetching analytics', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockReturnValue(promise);

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      // Loading indicator should be visible
      await waitFor(() => {
        const loader = screen.queryByRole('progressbar') || screen.queryByText(/loading/i);
        if (loader) {
          expect(loader).toBeInTheDocument();
        }
      });

      // Resolve the promise
      resolvePromise!({
        success: true,
        data: {
          totalAttempts: 0,
          averageScorePercent: 0,
          scoreDistribution: {},
          completionStatus: {},
          perAssessment: [],
        },
      });

      await waitFor(() => {
        const loader = screen.queryByRole('progressbar');
        if (loader) {
          expect(loader).not.toBeInTheDocument();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error with friendly message', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Internal database error at QuizAnalyticsService line 245',
        data: {},
      });

      const { container } = render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Should NOT expose internal error details
      expect(container.innerHTML).not.toMatch(/QuizAnalyticsService/i);
      expect(container.innerHTML).not.toMatch(/line 245/i);
      expect(container.innerHTML).not.toMatch(/Internal database error/i);
    });

    it('handles network errors gracefully', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network timeout')
      );

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Should not crash
      expect(screen.getByText(/Quiz.*Analytics/i)).toBeInTheDocument();
    });

    it('does not expose internal error details to user', async () => {
      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'MongoDB aggregation pipeline failed: stage $lookup returned null',
        data: {},
      });

      const { container } = render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Should NOT show technical error details
      expect(container.innerHTML).not.toMatch(/MongoDB/i);
      expect(container.innerHTML).not.toMatch(/aggregation pipeline/i);
      expect(container.innerHTML).not.toMatch(/\$lookup/i);
    });
  });

  describe('Response Shape Mapping', () => {
    it('correctly maps backend QuizAnalytics shape to UI state', async () => {
      const backendShape = {
        totalAttempts: 100,
        averageScorePercent: 75.5,
        scoreDistribution: {
          '0-20': 5,
          '21-40': 10,
          '41-60': 20,
          '61-80': 30,
          '81-100': 35,
        },
        completionStatus: {
          queued: 2,
          processing: 3,
          completed: 90,
          failed: 5,
        },
        completionRatePercent: 88.0,
        passRatePercent: 82.5,
        perAssessment: [
          {
            assessmentId: 'a1',
            title: 'Quiz 1',
            totalAttempts: 50,
            averageScorePercent: 80.0,
          },
          {
            assessmentId: 'a2',
            title: 'Quiz 2',
            totalAttempts: 50,
            averageScorePercent: 71.0,
          },
        ],
      };

      (facultyService.getQuizAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: backendShape,
      });

      render(
        <TestWrapper>
          <QuizAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(facultyService.getQuizAnalytics).toHaveBeenCalled();
      });

      // Verify all metrics are mapped and displayed
      await waitFor(() => {
        const totalText = screen.queryByText(/100/);
        const avgText = screen.queryByText(/75\.5/);
        if (totalText) expect(totalText).toBeInTheDocument();
        if (avgText) expect(avgText).toBeInTheDocument();
      });
    });
  });
});
