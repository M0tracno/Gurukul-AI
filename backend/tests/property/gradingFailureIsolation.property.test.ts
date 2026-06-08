/**
 * Property-Based Test: Grading Failure Isolation (Property 16)
 *
 * Feature: gurukul-ai-modernization, Property 16: Grading Failure Isolation
 *
 * For any individual submission that fails processing, the AI_Pipeline SHALL
 * retry it up to 3 times, and the failure SHALL NOT affect the processing
 * status or results of other submissions in the same batch.
 *
 * **Validates: Requirements 7.3**
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import type { Job } from 'bullmq';
import type { IGradingSubmission } from '../../src/models/GradingJob.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSave = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

const mockGradingJobDoc = {
  _id: 'job-isolation-test',
  batchId: 'batch-isolation',
  teacherId: { toString: () => 'teacher-isolation-1' },
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
const { processGradingJob, processSubmission } = await import('../../src/jobs/gradingWorker.js');

type IGradingAI = import('../../src/jobs/gradingWorker.js').IGradingAI;
type GradingJobPayload = import('../../src/jobs/gradingWorker.js').GradingJobPayload;

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
    id: 'bullmq-job-isolation',
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
  return { mockIO, emittedEvents };
}

/**
 * Helper to run async code that uses setTimeout-based delays.
 * Uses fake timers to avoid waiting for actual exponential backoff delays.
 */
async function runWithFakeTimers<T>(fn: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  const promise = fn();
  // Advance timers enough to cover all possible retry backoff delays
  // Max delay is 30s, 3 retries: need ~30s * numSubmissions worst case
  // Run until all pending timers resolve
  for (let i = 0; i < 20; i++) {
    await jest.advanceTimersByTimeAsync(35000);
  }
  const result = await promise;
  jest.useRealTimers();
  return result;
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 16: Grading Failure Isolation', () => {
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
   * Property: For any batch where specific submissions are designated to fail,
   * the successful submissions must still complete with correct results and
   * their status is unaffected by the failing ones.
   */
  it('individual submission failures do not affect other submissions in the same batch', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1 }),
        async (numSubmissions, concurrency, failSeed) => {
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

          // Create submissions
          const submissions = Array.from(
            { length: numSubmissions },
            (_, i) => makeSubmission(`sub-iso-${i}`),
          );
          mockGradingJobDoc.submissions = submissions;

          // Determine which submissions will fail (at least 1, but not all)
          const failCount = Math.max(1, Math.min(numSubmissions - 1, (failSeed % (numSubmissions - 1)) + 1));
          const failingIndices = new Set<number>();
          for (let i = 0; i < failCount; i++) {
            failingIndices.add(i);
          }

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // AI that fails for specific submission indices
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(
              async (fileUrl: string) => {
                const match = fileUrl.match(/sub-iso-(\d+)/);
                const submissionIdx = match ? parseInt(match[1], 10) : -1;

                if (failingIndices.has(submissionIdx)) {
                  throw new Error(`Simulated failure for submission ${submissionIdx}`);
                }

                return {
                  score: 85,
                  maxScore: 100,
                  confidence: 0.9,
                  explanation: 'Well done.',
                };
              },
            ),
          };

          const { mockIO } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-isolation-test' });

          await runWithFakeTimers(() => processGradingJob(job, mockAI, mockIO));

          // Verify: successful submissions have correct results
          for (let i = 0; i < numSubmissions; i++) {
            const sub = mockGradingJobDoc.submissions[i];
            if (!failingIndices.has(i)) {
              // Successful submissions must be unaffected by failures
              expect(sub.status).toBe('success');
              expect(sub.result).toBeDefined();
              expect(sub.result!.score).toBe(85);
              expect(sub.result!.maxScore).toBe(100);
              expect(sub.result!.confidence).toBe(0.9);
              expect(sub.failureReason).toBeUndefined();
            } else {
              // Failing submissions are marked as failed
              expect(sub.status).toBe('failed');
              expect(sub.failureReason).toBeDefined();
            }
          }

          // Verify: overall counts are correct
          const expectedSuccessCount = numSubmissions - failCount;
          expect(mockGradingJobDoc.successCount).toBe(expectedSuccessCount);
          expect(mockGradingJobDoc.failureCount).toBe(failCount);
          expect(mockGradingJobDoc.processedCount).toBe(numSubmissions);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: A failing submission is retried up to 3 times before being
   * marked as failed. The processSubmission function never throws.
   */
  it('failing submissions are retried exactly 3 times before being marked as failed', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 999 }),
        async (submissionIndex) => {
          const submissionId = `retry-test-${submissionIndex}`;
          const submission = makeSubmission(submissionId);

          let callCount = 0;
          const failAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(async () => {
              callCount++;
              throw new Error('Persistent AI failure');
            }),
          };

          // processSubmission must never throw
          const result = await runWithFakeTimers(() => processSubmission(submission, failAI));

          // Must be marked as failed
          expect(result.status).toBe('failed');
          expect(result.failureReason).toBeDefined();
          expect(result.failureReason).toContain('Persistent AI failure');

          // Must have been called exactly 3 times (3 attempts total)
          expect(callCount).toBe(3);
          expect(result.retryCount).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: processSubmission never throws regardless of AI behavior —
   * failures are always contained within the return value.
   */
  it('processSubmission never throws — failures are contained in the return value', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 999 }),
        fc.boolean(),
        async (index, shouldFail) => {
          const submissionId = `containment-${index}`;
          const submission = makeSubmission(submissionId);

          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(async () => {
              if (shouldFail) {
                throw new Error('Random AI error');
              }
              return {
                score: 90,
                maxScore: 100,
                confidence: 0.95,
                explanation: 'Excellent work.',
              };
            }),
          };

          // Should never throw
          const result = await runWithFakeTimers(() => processSubmission(submission, mockAI));

          // Always returns a valid submission with a terminal status
          expect(result).toBeDefined();
          expect(result.submissionId).toBe(submissionId);
          expect(['success', 'failed']).toContain(result.status);

          if (result.status === 'success') {
            expect(result.result).toBeDefined();
            expect(result.result!.score).toBe(90);
          } else {
            expect(result.failureReason).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: In a batch with mixed success and failure, the final job
   * status reflects failures without corrupting successful results.
   */
  it('batch completion status correctly reflects mixed success/failure without corrupting results', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 15 }),
        fc.integer({ min: 1, max: 5 }),
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

          mockGradingJobDoc.submissions = Array.from(
            { length: numSubmissions },
            (_, i) => makeSubmission(`mixed-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Make the first submission always fail, rest succeed
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(
              async (fileUrl: string) => {
                if (fileUrl.includes('mixed-0')) {
                  throw new Error('First submission always fails');
                }
                return {
                  score: 88,
                  maxScore: 100,
                  confidence: 0.87,
                  explanation: 'Good submission.',
                };
              },
            ),
          };

          const { mockIO } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-isolation-test' });

          await runWithFakeTimers(() => processGradingJob(job, mockAI, mockIO));

          // The failed submission should not corrupt other results
          const failedSub = mockGradingJobDoc.submissions[0];
          expect(failedSub.status).toBe('failed');

          // All other submissions must be successful
          for (let i = 1; i < numSubmissions; i++) {
            const sub = mockGradingJobDoc.submissions[i];
            expect(sub.status).toBe('success');
            expect(sub.result).toBeDefined();
            expect(sub.result!.score).toBe(88);
            expect(sub.result!.confidence).toBe(0.87);
          }

          // Job status should be 'completed_with_failures' since at least one failed
          expect(mockGradingJobDoc.status).toBe('completed_with_failures');
          expect(mockGradingJobDoc.failureCount).toBe(1);
          expect(mockGradingJobDoc.successCount).toBe(numSubmissions - 1);
          expect(mockGradingJobDoc.processedCount).toBe(numSubmissions);
        },
      ),
      { numRuns: 100 },
    );
  });
});
