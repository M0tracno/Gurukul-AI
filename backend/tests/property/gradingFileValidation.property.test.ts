/**
 * Property-Based Test: Grading File Validation (Property 18)
 *
 * Feature: gurukul-ai-modernization, Property 18: Grading File Validation
 *
 * For any submission file with size exceeding 20 MB or a MIME type not in
 * {PDF, JPEG, PNG}, the AI_Pipeline SHALL reject the file with a specific
 * error before processing begins.
 *
 * **Validates: Requirements 7.6**
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import type { GradingJobInput } from '../../src/services/gradingService.js';
import type { AppError as AppErrorType } from '../../src/middleware/errorHandler.js';

// --- Mock external dependencies (DB and queue) ---

const mockGradingJobCreate = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  _id: { toString: () => 'mock-job-id' },
  batchId: 'test-batch',
  teacherId: 'teacher-1',
  status: 'pending',
  totalSubmissions: 1,
  processedCount: 0,
  successCount: 0,
  failureCount: 0,
  concurrency: 5,
  submissions: [],
});

jest.unstable_mockModule('../../src/models/GradingJob.js', () => ({
  default: {
    create: mockGradingJobCreate,
  },
}));

jest.unstable_mockModule('../../src/jobs/gradingQueue.js', () => ({
  gradingQueue: {
    add: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  },
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { GradingService } = await import('../../src/services/gradingService.js');
const { AppError } = await import('../../src/middleware/errorHandler.js');

// --- Constants matching the service ---

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const INVALID_MIME_TYPES_EXAMPLES = [
  'text/plain',
  'text/html',
  'application/json',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
  'image/svg+xml',
  'application/zip',
  'application/octet-stream',
  'video/mp4',
  'audio/mpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// --- Generators ---

/**
 * Generates a valid submission ID.
 */
const submissionIdArb = fc.uuid();

/**
 * Generates a valid file URL.
 */
const fileUrlArb = fc.webUrl();

/**
 * Generates a file size that exceeds 20 MB (invalid).
 */
const oversizedFileSizeArb = fc.integer({
  min: MAX_FILE_SIZE_BYTES + 1,
  max: MAX_FILE_SIZE_BYTES * 5, // Up to 100 MB
});

/**
 * Generates a file size within the 20 MB limit (valid).
 */
const validFileSizeArb = fc.integer({
  min: 1,
  max: MAX_FILE_SIZE_BYTES,
});

/**
 * Generates an accepted MIME type (PDF, JPEG, PNG).
 */
const validMimeTypeArb = fc.constantFrom(...ACCEPTED_MIME_TYPES);

/**
 * Generates an invalid MIME type (not PDF, JPEG, or PNG).
 */
const invalidMimeTypeArb = fc.constantFrom(...INVALID_MIME_TYPES_EXAMPLES);

/**
 * Generates a random MIME-like string that is not in the accepted set.
 * Produces strings like "type/subtype" that aren't accepted.
 */
const randomInvalidMimeTypeArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,12}$/),
    fc.stringMatching(/^[a-z]{3,12}$/),
  )
  .map(([type, subtype]) => `${type}/${subtype}`)
  .filter((mime) => !ACCEPTED_MIME_TYPES.includes(mime));

/**
 * Generates a valid submission (within file size and accepted MIME type).
 */
const validSubmissionArb = fc.record({
  submissionId: submissionIdArb,
  fileUrl: fileUrlArb,
  fileSize: validFileSizeArb,
  mimeType: validMimeTypeArb,
});

/**
 * Generates a submission with file size exceeding 20 MB.
 */
const oversizedSubmissionArb = fc.record({
  submissionId: submissionIdArb,
  fileUrl: fileUrlArb,
  fileSize: oversizedFileSizeArb,
  mimeType: validMimeTypeArb,
});

/**
 * Generates a submission with an invalid MIME type.
 */
const invalidMimeSubmissionArb = fc.record({
  submissionId: submissionIdArb,
  fileUrl: fileUrlArb,
  fileSize: validFileSizeArb,
  mimeType: invalidMimeTypeArb,
});

/**
 * Generates a submission with both invalid file size and MIME type.
 */
const bothInvalidSubmissionArb = fc.record({
  submissionId: submissionIdArb,
  fileUrl: fileUrlArb,
  fileSize: oversizedFileSizeArb,
  mimeType: invalidMimeTypeArb,
});

/**
 * Creates a valid GradingJobInput with given submissions.
 */
function createBatchInput(
  submissions: GradingJobInput['submissions'],
): GradingJobInput {
  return {
    batchId: 'test-batch-id',
    teacherId: 'teacher-123',
    submissions,
    concurrency: 5,
  };
}

// --- Property Tests ---

describe('Property 18: Grading File Validation', () => {
  const gradingService = new GradingService();

  /**
   * Property: Any submission file with size exceeding 20 MB SHALL be rejected
   * with a specific error before processing begins.
   */
  it('should reject submissions with file size exceeding 20 MB', () => {
    fc.assert(
      fc.asyncProperty(oversizedSubmissionArb, async (submission) => {
        const input = createBatchInput([submission]);

        try {
          await gradingService.submitBatch(input);
          // Should not reach here
          throw new Error('Expected AppError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppErrorType;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('failed validation');
          expect(appErr.details).toBeDefined();
          expect(appErr.details!.length).toBeGreaterThan(0);

          // Verify error mentions file size
          const sizeError = appErr.details!.find((d) =>
            d.reason.toLowerCase().includes('size'),
          );
          expect(sizeError).toBeDefined();
          expect(sizeError!.reason).toContain('20 MB');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any submission file with a MIME type not in {PDF, JPEG, PNG}
   * SHALL be rejected with a specific error before processing begins.
   */
  it('should reject submissions with invalid MIME types', () => {
    fc.assert(
      fc.asyncProperty(invalidMimeSubmissionArb, async (submission) => {
        const input = createBatchInput([submission]);

        try {
          await gradingService.submitBatch(input);
          throw new Error('Expected AppError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppErrorType;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('failed validation');
          expect(appErr.details).toBeDefined();
          expect(appErr.details!.length).toBeGreaterThan(0);

          // Verify error mentions MIME type
          const mimeError = appErr.details!.find((d) =>
            d.reason.toLowerCase().includes('mime type'),
          );
          expect(mimeError).toBeDefined();
          expect(mimeError!.reason).toContain('not accepted');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any submission with a randomly generated invalid MIME type
   * (not application/pdf, image/jpeg, image/png) SHALL be rejected.
   */
  it('should reject submissions with arbitrary non-accepted MIME types', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          submissionId: submissionIdArb,
          fileUrl: fileUrlArb,
          fileSize: validFileSizeArb,
          mimeType: randomInvalidMimeTypeArb,
        }),
        async (submission) => {
          const input = createBatchInput([submission]);

          try {
            await gradingService.submitBatch(input);
            throw new Error('Expected AppError to be thrown');
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            const appErr = err as AppErrorType;
            expect(appErr.statusCode).toBe(400);
            expect(appErr.message).toContain('failed validation');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any submission with both invalid file size (>20 MB) AND invalid
   * MIME type SHALL be rejected with errors mentioning both violations.
   */
  it('should report both size and MIME type errors when both are invalid', () => {
    fc.assert(
      fc.asyncProperty(bothInvalidSubmissionArb, async (submission) => {
        const input = createBatchInput([submission]);

        try {
          await gradingService.submitBatch(input);
          throw new Error('Expected AppError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppErrorType;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.details).toBeDefined();

          // Should have at least 2 error details (size + MIME type)
          expect(appErr.details!.length).toBeGreaterThanOrEqual(2);

          const hasSize = appErr.details!.some((d) =>
            d.reason.toLowerCase().includes('size'),
          );
          const hasMime = appErr.details!.some((d) =>
            d.reason.toLowerCase().includes('mime'),
          );
          expect(hasSize).toBe(true);
          expect(hasMime).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any submission with valid file size (≤ 20 MB) AND a valid
   * MIME type (PDF, JPEG, PNG) SHALL NOT be rejected for file validation
   * reasons (passes validation step).
   */
  it('should accept submissions with valid file size and valid MIME type', () => {
    fc.assert(
      fc.asyncProperty(validSubmissionArb, async (submission) => {
        const input = createBatchInput([submission]);

        // Should not throw an AppError related to file validation
        // (It will proceed to create GradingJob and enqueue, which are mocked)
        const result = await gradingService.submitBatch(input);
        expect(result).toBeDefined();
        expect(result.jobId).toBe('mock-job-id');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: In a batch with mixed valid and invalid files, individual
   * file validation errors SHALL be reported per file before batch processing.
   */
  it('should report individual file validation errors in mixed batches', () => {
    fc.assert(
      fc.asyncProperty(
        validSubmissionArb,
        oversizedSubmissionArb,
        async (validSub, invalidSub) => {
          const input = createBatchInput([validSub, invalidSub]);

          try {
            await gradingService.submitBatch(input);
            throw new Error('Expected AppError to be thrown');
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            const appErr = err as AppErrorType;
            expect(appErr.statusCode).toBe(400);
            expect(appErr.message).toContain('failed validation');
            expect(appErr.details).toBeDefined();

            // Error should reference the invalid submission's field
            const detail = appErr.details!.find((d) =>
              d.field.includes(invalidSub.submissionId),
            );
            expect(detail).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: File size at exactly 20 MB boundary SHALL be accepted.
   */
  it('should accept files at exactly the 20 MB boundary', () => {
    fc.assert(
      fc.asyncProperty(validMimeTypeArb, async (mimeType) => {
        const submission = {
          submissionId: 'boundary-test-id',
          fileUrl: 'https://example.com/file',
          fileSize: MAX_FILE_SIZE_BYTES, // Exactly 20 MB
          mimeType,
        };
        const input = createBatchInput([submission]);

        const result = await gradingService.submitBatch(input);
        expect(result).toBeDefined();
        expect(result.jobId).toBe('mock-job-id');
      }),
      { numRuns: 100 },
    );
  });
});
