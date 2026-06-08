/**
 * Property-Based Test: Grading Batch Completion Count Invariant (Property 19)
 *
 * Feature: gurukul-ai-modernization, Property 19: Grading Batch Completion Count Invariant
 *
 * For any completed batch, the batch-completion event SHALL report counts where
 * successCount + failureCount == totalSubmissions.
 *
 * **Validates: Requirements 7.7**
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import type { Job } from 'bullmq';
import type { IGradingSubmission } from '../../src/models/GradingJob.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSave = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

const mockGradingJobDoc = {
  _id: 'job-completion-test',
  batchId: 'batch-completion',
  teacherId: { toString: () => 'teacher-completion-1' },
  status: 'pending' as string,
  totalSubmissions: 0,
  processedCount: 0,
  successCount: 0,
  failureCount: 0,
  concurrency: 5,
  submissions: [] as IGradingSubmission[],
  startedAt: null as Date | null,
  completedAt: null as Date | null,
  save: mockSave,
};

const mockFindById = jest.fn<(id: string) => Promise<typeof mockGradingJobDoc | null>>();

jest.unstable_mockModule('../../src/models/GradingJob.js', () => ({
  default: { findById: mockFindById },
}));

// Mock the gradingQueue to avoid Redis connection at module load
jest.unstable_mockModule('../../src/jobs/gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {},
}));

// Mock the redis config
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  createRedisConnection: jest.fn(),
}));

// Mock the logger to avoid output noise
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Dynamic imports after mocks
const { processGradingJob } = await import('../../src/jobs/gradingWorker.js');

type IGradingAI = import('../../src/jobs/gradingWorker.js').IGradingAI;
type GradingJobPayload = import('../../src/jobs/gradingWorker.js').GradingJobPayload;
type GradingBatchCompletionEvent = import('../../src/jobs/gradingWorker.js').GradingBatchCompletionEvent;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSubmission(id: string): IGradingSubmission {
  return {
    submissionId: id,
    fileUrl: `https://storage.example.com/files/${id}.pdf`,
    fileSize: 1024 * 100, // 100 KB
    mimeType: 'application/pdf',
    status: 'pending',
    retryCount: 0,
  };
}

function createMockJob(data: GradingJobPayload): Job<GradingJobPayload> {
  return {
    data,
    id: 'bullmq-job-completion',
    updateProgress: jest.fn<(progress: unknown) => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as Job<GradingJobPayload>;
}

function createMockSocketIO() {
  const emittedEvents: Array<{ event: string; data: unknown }> = [];
  const mockEmit = jest.fn((event: string, data: unknown) => {
    emittedEvents.push({ event, data });
  });
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockIO = { to: mockTo } as unknown as import('socket.io').Server;
  return { mockIO, mockEmit, mockTo, emittedEvents };
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 19: Grading Batch Completion Count Invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGradingJobDoc.status = 'pending';
    mockGradingJobDoc.processedCount = 0;
    mockGradingJobDoc.successCount = 0;
    mockGradingJobDoc.failureCount = 0;
    mockGradingJobDoc.startedAt = null;
    mockGradingJobDoc.completedAt = null;
    mockGradingJobDoc.submissions = [];
  });

  /**
   * Property: For any batch of N submissions where all succeed,
   * the batch-completion event reports successCount + failureCount == totalSubmissions.
   *
   * Validates: Requirements 7.7
   */
  it('should report successCount + failureCount == totalSubmissions when all succeed', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        async (numSubmissions, concurrency) => {
          // Reset state
          jest.clearAllMocks();
          mockGradingJobDoc.status = 'pending';
          mockGradingJobDoc.processedCount = 0;
          mockGradingJobDoc.successCount = 0;
          mockGradingJobDoc.failureCount = 0;
          mockGradingJobDoc.startedAt = null;
          mockGradingJobDoc.completedAt = null;
          mockGradingJobDoc.totalSubmissions = numSubmissions;
          mockGradingJobDoc.concurrency = concurrency;

          // Create N submissions
          mockGradingJobDoc.submissions = Array.from(
            { length: numSubmissions },
            (_, i) => makeSubmission(`sub-success-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Mock AI always succeeds
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score: 85,
              maxScore: 100,
              confidence: 0.92,
              explanation: 'Well-structured response with good analysis.',
            }),
          };

          const { mockIO, emittedEvents } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-completion-test' });

          await processGradingJob(job, mockAI, mockIO);

          // Find the batch completion event
          const completionEvents = emittedEvents.filter(
            (e) => e.event === 'grading_batch_complete',
          );

          // There should be exactly one batch completion event
          expect(completionEvents.length).toBe(1);

          const completion = completionEvents[0].data as GradingBatchCompletionEvent;

          // Property: successCount + failureCount == totalSubmissions
          expect(completion.successCount + completion.failureCount).toBe(numSubmissions);

          // All succeeded, so:
          expect(completion.successCount).toBe(numSubmissions);
          expect(completion.failureCount).toBe(0);
          expect(completion.totalProcessed).toBe(numSubmissions);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any batch of N submissions with mixed successes and failures
   * (controlled via metadata generation failure), the batch-completion event
   * reports successCount + failureCount == totalSubmissions.
   *
   * Validates: Requirements 7.7
   */
  it('should report successCount + failureCount == totalSubmissions with mixed results', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.boolean(), { minLength: 2, maxLength: 50 }),
        async (numSubmissions, concurrency, successFlags) => {
          // Trim or extend successFlags to match numSubmissions
          const flags = Array.from({ length: numSubmissions }, (_, i) =>
            i < successFlags.length ? successFlags[i] : true,
          );

          // Reset state
          jest.clearAllMocks();
          mockGradingJobDoc.status = 'pending';
          mockGradingJobDoc.processedCount = 0;
          mockGradingJobDoc.successCount = 0;
          mockGradingJobDoc.failureCount = 0;
          mockGradingJobDoc.startedAt = null;
          mockGradingJobDoc.completedAt = null;
          mockGradingJobDoc.totalSubmissions = numSubmissions;
          mockGradingJobDoc.concurrency = concurrency;

          // Create N submissions
          mockGradingJobDoc.submissions = Array.from(
            { length: numSubmissions },
            (_, i) => makeSubmission(`sub-mixed-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Track call count to determine success/failure per submission
          let callIndex = 0;
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(async () => {
              const shouldSucceed = flags[callIndex % flags.length];
              callIndex++;

              if (shouldSucceed) {
                return {
                  score: 75,
                  maxScore: 100,
                  confidence: 0.8,
                  explanation: 'Good submission.',
                };
              } else {
                // Return missing confidence to trigger immediate failure (no retries)
                return {
                  score: 60,
                  maxScore: 100,
                  confidence: undefined as unknown as number,
                  explanation: 'Metadata failure.',
                };
              }
            }),
          };

          const { mockIO, emittedEvents } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-completion-test' });

          await processGradingJob(job, mockAI, mockIO);

          // Find the batch completion event
          const completionEvents = emittedEvents.filter(
            (e) => e.event === 'grading_batch_complete',
          );

          // There should be exactly one batch completion event
          expect(completionEvents.length).toBe(1);

          const completion = completionEvents[0].data as GradingBatchCompletionEvent;

          // Property: successCount + failureCount == totalSubmissions
          expect(completion.successCount + completion.failureCount).toBe(numSubmissions);

          // totalProcessed should also equal totalSubmissions
          expect(completion.totalProcessed).toBe(numSubmissions);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);

  /**
   * Property: For any batch of N submissions where ALL fail (via metadata
   * generation failure), the batch-completion event reports
   * successCount + failureCount == totalSubmissions with successCount == 0.
   *
   * Validates: Requirements 7.7
   */
  it('should report successCount + failureCount == totalSubmissions when all fail', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        async (numSubmissions, concurrency) => {
          // Reset state
          jest.clearAllMocks();
          mockGradingJobDoc.status = 'pending';
          mockGradingJobDoc.processedCount = 0;
          mockGradingJobDoc.successCount = 0;
          mockGradingJobDoc.failureCount = 0;
          mockGradingJobDoc.startedAt = null;
          mockGradingJobDoc.completedAt = null;
          mockGradingJobDoc.totalSubmissions = numSubmissions;
          mockGradingJobDoc.concurrency = concurrency;

          // Create N submissions
          mockGradingJobDoc.submissions = Array.from(
            { length: numSubmissions },
            (_, i) => makeSubmission(`sub-allfail-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Mock AI always fails via missing confidence
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score: 50,
              maxScore: 100,
              confidence: undefined as unknown as number,
              explanation: 'Cannot grade.',
            }),
          };

          const { mockIO, emittedEvents } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-completion-test' });

          await processGradingJob(job, mockAI, mockIO);

          // Find the batch completion event
          const completionEvents = emittedEvents.filter(
            (e) => e.event === 'grading_batch_complete',
          );

          // There should be exactly one batch completion event
          expect(completionEvents.length).toBe(1);

          const completion = completionEvents[0].data as GradingBatchCompletionEvent;

          // Property: successCount + failureCount == totalSubmissions
          expect(completion.successCount + completion.failureCount).toBe(numSubmissions);

          // All failed:
          expect(completion.successCount).toBe(0);
          expect(completion.failureCount).toBe(numSubmissions);
          expect(completion.totalProcessed).toBe(numSubmissions);
          expect(completion.status).toBe('completed_with_failures');
        },
      ),
      { numRuns: 100 },
    );
  });
});
