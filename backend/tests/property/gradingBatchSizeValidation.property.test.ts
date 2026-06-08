/**
 * Property-Based Test: Grading Batch Size Validation (Property 14)
 *
 * Feature: gurukul-ai-modernization, Property 14: Grading Batch Size Validation
 *
 * For any batch submission with a size between 1 and 200 (inclusive), the AI_Pipeline
 * SHALL accept the batch. For any batch with size exceeding 200, the AI_Pipeline SHALL
 * reject it with an error indicating the maximum allowed size.
 *
 * **Validates: Requirements 7.1**
 */

import * as fc from 'fast-check';
import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import { AppError } from '../../src/middleware/errorHandler.js';

// --- Mocks (set up before dynamic import) ---

const mockCreate = jest.fn();
const mockQueueAdd = jest.fn();

jest.unstable_mockModule('../../src/models/GradingJob.js', () => ({
  default: {
    create: mockCreate,
  },
}));

jest.unstable_mockModule('../../src/jobs/gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {
    add: mockQueueAdd,
    close: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  createRedisConnection: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Dynamic import after mocks are set up
const { GradingService } = await import('../../src/services/gradingService.js');

// --- Generators ---

/**
 * Generates a valid submission entry for the grading batch.
 */
const validSubmissionArb = fc.record({
  submissionId: fc.uuid(),
  fileUrl: fc.constant('https://storage.example.com/file.pdf'),
  fileSize: fc.integer({ min: 1, max: 20 * 1024 * 1024 }), // 1 byte to 20 MB
  mimeType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
});

/**
 * Generates a batch size in the valid range (1-200).
 */
const validBatchSizeArb = fc.integer({ min: 1, max: 200 });

/**
 * Generates a batch size exceeding the maximum (201+).
 * Capped at 500 to keep tests tractable.
 */
const oversizedBatchSizeArb = fc.integer({ min: 201, max: 500 });

/**
 * Helper: Create an array of valid submissions of a given size.
 */
function createSubmissions(size: number) {
  return Array.from({ length: size }, (_, i) => ({
    submissionId: `submission-${i}`,
    fileUrl: 'https://storage.example.com/file.pdf',
    fileSize: 1024 * 1024, // 1 MB
    mimeType: 'application/pdf',
  }));
}

// --- Property Tests ---

describe('Property 14: Grading Batch Size Validation', () => {
  let gradingService: InstanceType<typeof GradingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    gradingService = new GradingService();

    // Mock GradingJob.create to return a successful document
    mockCreate.mockImplementation((...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      return Promise.resolve({
        ...data,
        _id: { toString: () => 'mock-job-id-123' },
      });
    });

    // Mock queue add to resolve successfully
    mockQueueAdd.mockResolvedValue(undefined as never);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property: For any batch size between 1 and 200 (inclusive), the grading service
   * SHALL accept the batch and return a jobId without throwing an error.
   */
  it('should accept batches with size between 1 and 200', async () => {
    await fc.assert(
      fc.asyncProperty(validBatchSizeArb, async (batchSize) => {
        const input = {
          batchId: `batch-${batchSize}`,
          teacherId: 'teacher-123',
          submissions: createSubmissions(batchSize),
        };

        const result = await gradingService.submitBatch(input);

        expect(result).toBeDefined();
        expect(result.jobId).toBeDefined();
        expect(typeof result.jobId).toBe('string');
        expect(result.jobId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  }, 60000);

  /**
   * Property: For any batch size exceeding 200, the grading service SHALL reject
   * the batch with an AppError (status 400) containing an error message indicating
   * the maximum allowed batch size.
   */
  it('should reject batches with size greater than 200', async () => {
    await fc.assert(
      fc.asyncProperty(oversizedBatchSizeArb, async (batchSize) => {
        const input = {
          batchId: `batch-${batchSize}`,
          teacherId: 'teacher-123',
          submissions: createSubmissions(batchSize),
        };

        try {
          await gradingService.submitBatch(input);
          // Should not reach here
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('200');
          expect(appErr.details).toBeDefined();
          expect(appErr.details!.length).toBeGreaterThan(0);
          expect(appErr.details![0].field).toBe('submissions');
          expect(appErr.details![0].value).toBe(batchSize);
          expect(appErr.details![0].reason).toContain('200');
        }

        // Verify that the GradingJob was NOT created
        expect(mockCreate).not.toHaveBeenCalled();
        // Verify that no job was added to the queue
        expect(mockQueueAdd).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  }, 60000);

  /**
   * Property: For a batch with zero submissions (empty array), the grading
   * service SHALL reject it with an appropriate error indicating minimum batch size.
   */
  it('should reject batches with zero submissions (empty array)', async () => {
    const input = {
      batchId: 'batch-empty',
      teacherId: 'teacher-123',
      submissions: [] as Array<{
        submissionId: string;
        fileUrl: string;
        fileSize: number;
        mimeType: string;
      }>,
    };

    try {
      await gradingService.submitBatch(input);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.message).toContain('at least');
      expect(appErr.details).toBeDefined();
      expect(appErr.details!.length).toBeGreaterThan(0);
    }

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  /**
   * Property: The boundary value of exactly 200 submissions SHALL be accepted.
   */
  it('should accept batches with exactly 200 submissions (upper boundary)', async () => {
    const input = {
      batchId: 'batch-200',
      teacherId: 'teacher-123',
      submissions: createSubmissions(200),
    };

    const result = await gradingService.submitBatch(input);

    expect(result).toBeDefined();
    expect(result.jobId).toBe('mock-job-id-123');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  /**
   * Property: The boundary value of exactly 201 submissions SHALL be rejected.
   */
  it('should reject batches with exactly 201 submissions (boundary exceeded)', async () => {
    const input = {
      batchId: 'batch-201',
      teacherId: 'teacher-123',
      submissions: createSubmissions(201),
    };

    try {
      await gradingService.submitBatch(input);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.message).toContain('200');
      expect(appErr.details![0].value).toBe(201);
    }

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  /**
   * Property: A batch with exactly 1 submission (minimum valid) SHALL be accepted.
   */
  it('should accept batches with exactly 1 submission (lower boundary)', async () => {
    const input = {
      batchId: 'batch-1',
      teacherId: 'teacher-123',
      submissions: createSubmissions(1),
    };

    const result = await gradingService.submitBatch(input);

    expect(result).toBeDefined();
    expect(result.jobId).toBe('mock-job-id-123');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  /**
   * Property: For any batch size in the valid range, the service SHALL create
   * a GradingJob document with the correct totalSubmissions count matching the
   * batch size provided.
   */
  it('should create GradingJob with correct totalSubmissions for valid batches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 200 }),
        async (batchSize) => {
          mockCreate.mockClear();
          mockQueueAdd.mockClear();

          const input = {
            batchId: `batch-${batchSize}`,
            teacherId: 'teacher-123',
            submissions: createSubmissions(batchSize),
          };

          await gradingService.submitBatch(input);

          expect(mockCreate).toHaveBeenCalledTimes(1);
          const createArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
          expect(createArg.totalSubmissions).toBe(batchSize);
          expect((createArg.submissions as unknown[]).length).toBe(batchSize);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
