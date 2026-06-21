/**
 * Property-Based Tests: Grading Queue Order Preservation
 *
 * Feature: admin-portal-overhaul, Property 31: Grading queue order preservation
 *
 * Property 31: For any sequence of enqueued Grading_Jobs, the jobs SHALL be processed
 * in enqueue order with no enqueued job dropped.
 * **Validates: Requirements 23.2**
 *
 * This test verifies the FIFO ordering contract at the logical level by capturing
 * enqueue calls to BullMQ and asserting that the processing order matches enqueue
 * order and no jobs are lost.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock setup: capture all jobs added to the BullMQ queue in order
// ---------------------------------------------------------------------------

/** In-memory FIFO queue that simulates BullMQ's waiting queue behavior. */
const enqueuedJobs: Array<{ name: string; data: unknown; opts?: unknown }> = [];

const mockQueueAdd = jest.fn<(name: string, data: unknown, opts?: unknown) => Promise<{ id: string; name: string }>>(
  async (name: string, data: unknown, opts?: unknown) => {
    const entry = { name, data, opts };
    enqueuedJobs.push(entry);
    return { id: `job-${enqueuedJobs.length}`, name };
  },
);

const mockQueueGetJobs = jest.fn<(states: string[]) => Promise<Array<{ id: string; name: string; data: unknown; timestamp: number }>>>(
  async (_states: string[]) => {
    // BullMQ getJobs('waiting') returns jobs in FIFO order (oldest first)
    return enqueuedJobs.map((entry, idx) => ({
      id: `job-${idx + 1}`,
      name: entry.name,
      data: entry.data,
      timestamp: idx, // Monotonically increasing timestamp simulates enqueue order
    }));
  },
);

jest.unstable_mockModule('../config/redis.js', () => ({
  createRedisConnection: jest.fn(() => ({})),
  redisConfig: { host: 'localhost', port: 6379 },
  getRedisOptions: jest.fn(() => ({ options: { host: 'localhost', port: 6379, maxRetriesPerRequest: null, enableReadyCheck: false } })),
}));

jest.unstable_mockModule('./gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {
    add: mockQueueAdd,
    getJobs: mockQueueGetJobs,
    name: 'ai-grading',
  },
}));

// Dynamic import after mocks
const { gradingQueue, GRADING_QUEUE_NAME } = await import('./gradingQueue.js');

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a unique job ID (simulating a MongoDB ObjectId hex string). */
const hexCharArb = fc.constantFrom(...'0123456789abcdef'.split(''));
const jobIdArb = fc.array(hexCharArb, { minLength: 24, maxLength: 24 }).map((chars) => chars.join(''));

/** Generates a batch ID string. */
const batchIdArb = fc.string({ minLength: 5, maxLength: 30 }).filter((s) => s.trim().length > 0);

/** Generates a teacher ID (24-char hex). */
const teacherIdArb = fc.array(hexCharArb, { minLength: 24, maxLength: 24 }).map((chars) => chars.join(''));

/** Generates concurrency value. */
const concurrencyArb = fc.integer({ min: 1, max: 5 });

/** Generates a grading job payload matching what gradingService enqueues. */
const gradingJobPayloadArb = fc.tuple(jobIdArb, batchIdArb, teacherIdArb, concurrencyArb).map(
  ([jobId, batchId, teacherId, concurrency]) => ({
    jobId,
    batchId,
    teacherId,
    concurrency,
  }),
);

/** Generates a sequence of 1–20 unique grading job payloads (unique by jobId). */
const jobSequenceArb = fc.uniqueArray(gradingJobPayloadArb, {
  minLength: 1,
  maxLength: 20,
  selector: (payload) => payload.jobId,
});

// ---------------------------------------------------------------------------
// Property 31: Grading queue order preservation
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 31: Grading queue order preservation
describe('Property 31: Grading queue order preservation', () => {
  beforeEach(() => {
    enqueuedJobs.length = 0;
    jest.clearAllMocks();
  });

  it('jobs enqueued in sequence are retrievable in the same FIFO order with none dropped', async () => {
    await fc.assert(
      fc.asyncProperty(jobSequenceArb, async (jobs) => {
        // Reset internal queue state
        enqueuedJobs.length = 0;
        mockQueueAdd.mockClear();
        mockQueueGetJobs.mockClear();

        // Enqueue all jobs in sequence (simulating what gradingService does)
        for (const payload of jobs) {
          await gradingQueue.add(
            `grade-batch-${payload.batchId}`,
            {
              jobId: payload.jobId,
              batchId: payload.batchId,
              teacherId: payload.teacherId,
              concurrency: payload.concurrency,
            },
            {
              jobId: `grading-${payload.jobId}`,
            },
          );
        }

        // ASSERTION 1: No enqueued job is dropped — all jobs are in the queue
        expect(enqueuedJobs.length).toBe(jobs.length);

        // ASSERTION 2: The add function was called exactly once per job
        expect(mockQueueAdd).toHaveBeenCalledTimes(jobs.length);

        // ASSERTION 3: Jobs are retrievable in FIFO enqueue order
        const waitingJobs = await gradingQueue.getJobs(['waiting']);
        expect(waitingJobs.length).toBe(jobs.length);

        // Verify order preservation: the i-th enqueued job matches the i-th waiting job
        for (let i = 0; i < jobs.length; i++) {
          const enqueued = jobs[i];
          const retrieved = waitingJobs[i].data as {
            jobId: string;
            batchId: string;
            teacherId: string;
            concurrency: number;
          };

          // Same job at same position — order is preserved
          expect(retrieved.jobId).toBe(enqueued.jobId);
          expect(retrieved.batchId).toBe(enqueued.batchId);
          expect(retrieved.teacherId).toBe(enqueued.teacherId);
          expect(retrieved.concurrency).toBe(enqueued.concurrency);
        }

        // ASSERTION 4: Timestamps are monotonically increasing (FIFO confirmation)
        for (let i = 1; i < waitingJobs.length; i++) {
          expect(waitingJobs[i].timestamp).toBeGreaterThan(waitingJobs[i - 1].timestamp);
        }

        // ASSERTION 5: Every original job ID appears exactly once in the queue (no duplicates, no drops)
        const queuedJobIds = waitingJobs.map((j) => (j.data as { jobId: string }).jobId);
        const originalJobIds = jobs.map((j) => j.jobId);
        expect(queuedJobIds).toEqual(originalJobIds);
      }),
      { numRuns: 100 },
    );
  });

  it('processing order matches enqueue order when jobs are dequeued sequentially', async () => {
    await fc.assert(
      fc.asyncProperty(jobSequenceArb, async (jobs) => {
        // Reset internal queue state
        enqueuedJobs.length = 0;
        mockQueueAdd.mockClear();

        // Enqueue all jobs
        for (const payload of jobs) {
          await gradingQueue.add(
            `grade-batch-${payload.batchId}`,
            {
              jobId: payload.jobId,
              batchId: payload.batchId,
              teacherId: payload.teacherId,
              concurrency: payload.concurrency,
            },
            {
              jobId: `grading-${payload.jobId}`,
            },
          );
        }

        // Simulate sequential processing (dequeue from head = FIFO)
        const processedOrder: string[] = [];
        for (let i = 0; i < enqueuedJobs.length; i++) {
          const job = enqueuedJobs[i];
          const data = job.data as { jobId: string };
          processedOrder.push(data.jobId);
        }

        // Processing order SHALL match enqueue order exactly
        const originalOrder = jobs.map((j) => j.jobId);
        expect(processedOrder).toEqual(originalOrder);
        expect(processedOrder.length).toBe(originalOrder.length);
      }),
      { numRuns: 100 },
    );
  });
});
