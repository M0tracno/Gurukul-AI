import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Job } from 'bullmq';
import type { IGradingSubmission } from '../models/GradingJob.js';

// ---------------------------------------------------------------------------
// Module mocks — must be set up BEFORE dynamic imports
// ---------------------------------------------------------------------------

const mockSave = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

const mockGradingJobDoc = {
  _id: 'job-123',
  batchId: 'batch-abc',
  teacherId: { toString: () => 'teacher-1' },
  status: 'pending' as string,
  totalSubmissions: 3,
  processedCount: 0,
  successCount: 0,
  failureCount: 0,
  concurrency: 2,
  submissions: [] as IGradingSubmission[],
  startedAt: null as Date | null,
  completedAt: null as Date | null,
  save: mockSave,
};

const mockFindById = jest.fn<(id: string) => Promise<typeof mockGradingJobDoc | null>>();

jest.unstable_mockModule('../models/GradingJob.js', () => ({
  default: { findById: mockFindById },
}));

// Mock the gradingQueue to avoid Redis connection at module load
jest.unstable_mockModule('./gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {},
}));

// Mock redis config too
jest.unstable_mockModule('../config/redis.js', () => ({
  createRedisConnection: () => ({}),
}));

// ---------------------------------------------------------------------------
// Dynamic imports after mocks
// ---------------------------------------------------------------------------

const {
  processSubmission,
  calculateBackoff,
  processGradingJob,
} = await import('./gradingWorker.js');

type IGradingAI = import('./gradingWorker.js').IGradingAI;
type GradingJobPayload = import('./gradingWorker.js').GradingJobPayload;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run an async function that uses setTimeout-based delays (e.g. retry backoff)
 * under fake timers to avoid real waiting time.
 */
async function runWithFakeTimers<T>(fn: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  const promise = fn();
  // Advance timers enough to cover all retry delays (max 3 retries × up to 4s each)
  for (let i = 0; i < 10; i++) {
    await jest.advanceTimersByTimeAsync(5000);
  }
  const result = await promise;
  jest.useRealTimers();
  return result;
}

function makeSubmission(id: string, overrides?: Partial<IGradingSubmission>): IGradingSubmission {
  return {
    submissionId: id,
    fileUrl: `https://storage.example.com/${id}.pdf`,
    fileSize: 1024,
    mimeType: 'application/pdf',
    status: 'pending',
    retryCount: 0,
    ...overrides,
  };
}

function createMockJob(data: GradingJobPayload): Job<GradingJobPayload> {
  return {
    data,
    id: 'bullmq-job-1',
    updateProgress: jest.fn<(progress: unknown) => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as Job<GradingJobPayload>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('gradingWorker', () => {
  describe('calculateBackoff', () => {
    it('should return base delay for first retry (attempt 0)', () => {
      expect(calculateBackoff(0)).toBe(1000);
    });

    it('should double the delay for each subsequent attempt', () => {
      expect(calculateBackoff(0)).toBe(1000); // 1s
      expect(calculateBackoff(1)).toBe(2000); // 2s
      expect(calculateBackoff(2)).toBe(4000); // 4s
      expect(calculateBackoff(3)).toBe(8000); // 8s
    });

    it('should cap at maxDelay', () => {
      expect(calculateBackoff(10, 1000, 30000)).toBe(30000);
      expect(calculateBackoff(20, 1000, 30000)).toBe(30000);
    });

    it('should respect custom baseDelay and maxDelay', () => {
      expect(calculateBackoff(0, 500, 5000)).toBe(500);
      expect(calculateBackoff(3, 500, 5000)).toBe(4000);
      expect(calculateBackoff(4, 500, 5000)).toBe(5000); // capped
    });
  });

  describe('processSubmission', () => {
    it('should return success when AI grades successfully', async () => {
      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 85,
          maxScore: 100,
          confidence: 0.92,
          explanation: 'Well structured answer with clear reasoning.',
        }),
      };

      const submission = makeSubmission('sub-1');
      const result = await processSubmission(submission, mockAI);

      expect(result.status).toBe('success');
      expect(result.result).toEqual({
        score: 85,
        maxScore: 100,
        confidence: 0.92,
        explanation: 'Well structured answer with clear reasoning.',
      });
      expect(result.retryCount).toBe(0);
    });

    it('should retry on failure and succeed on subsequent attempt', async () => {
      const gradeSubmission = jest.fn<IGradingAI['gradeSubmission']>();
      gradeSubmission
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          score: 70,
          maxScore: 100,
          confidence: 0.8,
          explanation: 'Good work.',
        });

      const mockAI: IGradingAI = { gradeSubmission };
      const submission = makeSubmission('sub-2');

      const result = await runWithFakeTimers(() => processSubmission(submission, mockAI));

      expect(result.status).toBe('success');
      expect(result.retryCount).toBe(1);
      expect(gradeSubmission).toHaveBeenCalledTimes(2);
    });

    it('should mark as failed after exhausting all retries', async () => {
      const gradeSubmission = jest.fn<IGradingAI['gradeSubmission']>();
      gradeSubmission.mockRejectedValue(new Error('Service unavailable'));

      const mockAI: IGradingAI = { gradeSubmission };
      const submission = makeSubmission('sub-3');

      const result = await runWithFakeTimers(() => processSubmission(submission, mockAI));

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Service unavailable');
      expect(result.retryCount).toBe(3);
      expect(gradeSubmission).toHaveBeenCalledTimes(3);
    });

    it('should fail if confidence is missing from result (Req 7.5)', async () => {
      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 90,
          maxScore: 100,
          confidence: undefined as unknown as number,
          explanation: 'Some explanation',
        }),
      };

      const submission = makeSubmission('sub-4');
      const result = await processSubmission(submission, mockAI);

      expect(result.status).toBe('failed');
      expect(result.failureReason).toContain('missing confidence score');
    });

    it('should fail if explanation is empty (Req 7.5)', async () => {
      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 90,
          maxScore: 100,
          confidence: 0.95,
          explanation: '',
        }),
      };

      const submission = makeSubmission('sub-5');
      const result = await processSubmission(submission, mockAI);

      expect(result.status).toBe('failed');
      expect(result.failureReason).toContain('missing explanation');
    });

    it('should truncate explanation to 500 characters', async () => {
      const longExplanation = 'A'.repeat(600);
      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 80,
          maxScore: 100,
          confidence: 0.88,
          explanation: longExplanation,
        }),
      };

      const submission = makeSubmission('sub-6');
      const result = await processSubmission(submission, mockAI);

      expect(result.status).toBe('success');
      expect(result.result!.explanation.length).toBe(500);
    });
  });

  describe('processGradingJob', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGradingJobDoc.status = 'pending';
      mockGradingJobDoc.processedCount = 0;
      mockGradingJobDoc.successCount = 0;
      mockGradingJobDoc.failureCount = 0;
      mockGradingJobDoc.startedAt = null;
      mockGradingJobDoc.completedAt = null;
      mockGradingJobDoc.submissions = [
        makeSubmission('sub-a'),
        makeSubmission('sub-b'),
        makeSubmission('sub-c'),
      ];
    });

    it('should process all submissions and mark job completed', async () => {
      mockFindById.mockResolvedValue(mockGradingJobDoc);

      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 85,
          maxScore: 100,
          confidence: 0.9,
          explanation: 'Good work.',
        }),
      };

      const job = createMockJob({ gradingJobId: 'job-123' });
      await processGradingJob(job, mockAI);

      expect(mockGradingJobDoc.status).toBe('completed');
      expect(mockGradingJobDoc.successCount).toBe(3);
      expect(mockGradingJobDoc.failureCount).toBe(0);
      expect(mockGradingJobDoc.completedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should mark job as completed_with_failures when some submissions fail', async () => {
      mockFindById.mockResolvedValue(mockGradingJobDoc);

      const gradeSubmission = jest.fn<IGradingAI['gradeSubmission']>();
      // First two succeed, third fails all retries
      gradeSubmission
        .mockResolvedValueOnce({ score: 80, maxScore: 100, confidence: 0.85, explanation: 'OK' })
        .mockResolvedValueOnce({ score: 75, maxScore: 100, confidence: 0.8, explanation: 'Decent' })
        .mockRejectedValue(new Error('AI unavailable'));

      const mockAI: IGradingAI = { gradeSubmission };
      const job = createMockJob({ gradingJobId: 'job-123' });

      await runWithFakeTimers(() => processGradingJob(job, mockAI));

      expect(mockGradingJobDoc.status).toBe('completed_with_failures');
      expect(mockGradingJobDoc.successCount).toBe(2);
      expect(mockGradingJobDoc.failureCount).toBe(1);
    });

    it('should throw if grading job is not found', async () => {
      mockFindById.mockResolvedValue(null);

      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>(),
      };

      const job = createMockJob({ gradingJobId: 'nonexistent' });

      await expect(processGradingJob(job, mockAI)).rejects.toThrow(
        'GradingJob nonexistent not found',
      );
    });

    it('should emit progress events via Socket.IO', async () => {
      mockFindById.mockResolvedValue(mockGradingJobDoc);

      const mockAI: IGradingAI = {
        gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
          score: 90,
          maxScore: 100,
          confidence: 0.95,
          explanation: 'Excellent.',
        }),
      };

      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockIO = { to: mockTo } as unknown as import('socket.io').Server;

      const job = createMockJob({ gradingJobId: 'job-123' });
      await processGradingJob(job, mockAI, mockIO);

      // Should emit progress for each submission (3) plus batch-completion (1)
      expect(mockTo).toHaveBeenCalledWith('user_teacher-1');
      // 3 progress events + 1 batch completion = 4 emit calls
      expect(mockEmit).toHaveBeenCalledTimes(4);

      // Check the batch completion event
      const lastCall = mockEmit.mock.calls[3];
      expect(lastCall[0]).toBe('grading_batch_complete');
      expect(lastCall[1]).toMatchObject({
        jobId: 'job-123',
        batchId: 'batch-abc',
        successCount: 3,
        failureCount: 0,
        status: 'completed',
      });
    });

    it('failure of one submission does not affect others (isolation)', async () => {
      mockFindById.mockResolvedValue(mockGradingJobDoc);

      const gradeSubmission = jest.fn<IGradingAI['gradeSubmission']>();
      // First submission (sub-a) fails all 3 retries, sub-b and sub-c succeed
      // With concurrency=2, first batch is [sub-a, sub-b], second batch is [sub-c]
      gradeSubmission
        // sub-a attempt 1
        .mockRejectedValueOnce(new Error('Fail 1'))
        // sub-b attempt 1 succeeds
        .mockResolvedValueOnce({ score: 70, maxScore: 100, confidence: 0.7, explanation: 'OK' })
        // sub-a attempt 2
        .mockRejectedValueOnce(new Error('Fail 2'))
        // sub-a attempt 3
        .mockRejectedValueOnce(new Error('Fail 3'))
        // sub-c attempt 1 succeeds
        .mockResolvedValueOnce({ score: 80, maxScore: 100, confidence: 0.8, explanation: 'Good' });

      const mockAI: IGradingAI = { gradeSubmission };
      const job = createMockJob({ gradingJobId: 'job-123' });

      await runWithFakeTimers(() => processGradingJob(job, mockAI));

      // sub-a failed, sub-b and sub-c succeeded
      expect(mockGradingJobDoc.submissions[0].status).toBe('failed');
      expect(mockGradingJobDoc.submissions[1].status).toBe('success');
      expect(mockGradingJobDoc.submissions[2].status).toBe('success');
      expect(mockGradingJobDoc.successCount).toBe(2);
      expect(mockGradingJobDoc.failureCount).toBe(1);
    });
  });
});
