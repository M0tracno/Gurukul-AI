/**
 * Property-Based Test: Grading Progress Event Count (Property 15)
 *
 * Feature: gurukul-ai-modernization, Property 15: Grading Progress Event Count
 *
 * For any batch of N submissions processed by the AI_Pipeline, exactly N progress
 * events SHALL be emitted, each reporting the correct count of processed submissions
 * out of the total.
 *
 * **Validates: Requirements 7.2**
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
  _id: 'job-progress-test',
  batchId: 'batch-progress',
  teacherId: { toString: () => 'teacher-progress-1' },
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
type GradingProgressEvent = import('../../src/jobs/gradingWorker.js').GradingProgressEvent;

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
    id: 'bullmq-job-progress',
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

describe('Property 15: Grading Progress Event Count', () => {
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
   * Property: For any batch of N submissions (1 ≤ N ≤ 50), exactly N
   * progress events shall be emitted via Socket.IO, each reporting the
   * correct cumulative count of processed submissions out of the total.
   *
   * We cap at 50 for test performance (to keep within 100 iterations budget),
   * but the property holds for any valid batch size (1-200).
   */
  it('should emit exactly N progress events for N submissions, each with correct processed count', () => {
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
            (_, i) => makeSubmission(`sub-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Mock AI always succeeds
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score: 80,
              maxScore: 100,
              confidence: 0.85,
              explanation: 'Good work on this assignment.',
            }),
          };

          const { mockIO, emittedEvents } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-progress-test' });

          await processGradingJob(job, mockAI, mockIO);

          // Filter only progress events (exclude batch_completion)
          const progressEvents = emittedEvents.filter(
            (e) => e.event === 'grading_progress',
          );

          // Property: exactly N progress events emitted
          expect(progressEvents.length).toBe(numSubmissions);

          // Property: each progress event reports correct cumulative processed count
          for (let i = 0; i < progressEvents.length; i++) {
            const eventData = progressEvents[i].data as GradingProgressEvent;
            expect(eventData.processedCount).toBe(i + 1);
            expect(eventData.totalSubmissions).toBe(numSubmissions);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any batch of N submissions where some fail (via missing
   * metadata), exactly N progress events are still emitted (failure does not
   * suppress progress events). Uses metadata-validation failures to avoid
   * retry sleep delays.
   */
  it('should emit exactly N progress events even when some submissions fail', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 30 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (numSubmissions, concurrency, failEveryN) => {
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
            (_, i) => makeSubmission(`sub-fail-${i}`),
          );

          mockFindById.mockResolvedValue(mockGradingJobDoc);

          // Fail some submissions via missing confidence (no retries triggered)
          let callCount = 0;
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockImplementation(async () => {
              callCount++;
              // Every Nth call returns a result missing confidence (causes immediate failure)
              if (callCount % (failEveryN + 1) === 0) {
                return {
                  score: 75,
                  maxScore: 100,
                  confidence: undefined as unknown as number,
                  explanation: 'Missing confidence.',
                };
              }
              return {
                score: 75,
                maxScore: 100,
                confidence: 0.8,
                explanation: 'Adequate submission.',
              };
            }),
          };

          const { mockIO, emittedEvents } = createMockSocketIO();
          const job = createMockJob({ gradingJobId: 'job-progress-test' });

          await processGradingJob(job, mockAI, mockIO);

          // Filter only progress events
          const progressEvents = emittedEvents.filter(
            (e) => e.event === 'grading_progress',
          );

          // Property: exactly N progress events emitted regardless of failures
          expect(progressEvents.length).toBe(numSubmissions);

          // Property: each event has monotonically increasing processedCount
          for (let i = 0; i < progressEvents.length; i++) {
            const eventData = progressEvents[i].data as GradingProgressEvent;
            expect(eventData.processedCount).toBe(i + 1);
            expect(eventData.totalSubmissions).toBe(numSubmissions);
          }

          // Property: final processedCount == N
          const lastEvent = progressEvents[progressEvents.length - 1].data as GradingProgressEvent;
          expect(lastEvent.processedCount).toBe(numSubmissions);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
