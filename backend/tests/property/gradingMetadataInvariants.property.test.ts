/**
 * Property 17: Grading Result Metadata Invariants
 *
 * For any successfully produced grade, the confidence score SHALL be in the
 * range [0, 1] (inclusive) and the explanation text SHALL be at most 500
 * characters in length.
 *
 * Feature: gurukul-ai-modernization, Property 17: Grading Result Metadata Invariants
 *
 * **Validates: Requirements 7.5**
 */

import { jest } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Module mocks — must be set up BEFORE dynamic imports
// ---------------------------------------------------------------------------

// Mock the gradingQueue to avoid Redis connection at module load
jest.unstable_mockModule('../../src/jobs/gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {},
}));

// Mock redis config too
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  createRedisConnection: () => ({}),
}));

// Mock GradingJob model to avoid MongoDB connection
jest.unstable_mockModule('../../src/models/GradingJob.js', () => ({
  default: { findById: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Dynamic imports after mocks
// ---------------------------------------------------------------------------

const { processSubmission } = await import('../../src/jobs/gradingWorker.js');

type IGradingAI = import('../../src/jobs/gradingWorker.js').IGradingAI;
type IGradingSubmission = import('../../src/models/GradingJob.js').IGradingSubmission;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSubmission(id: string): IGradingSubmission {
  return {
    submissionId: id,
    fileUrl: `https://storage.example.com/${id}.pdf`,
    fileSize: 1024,
    mimeType: 'application/pdf',
    status: 'pending',
    retryCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Arbitrary that generates confidence values across the full numeric range,
 * including values outside [0, 1] to test clamping behavior.
 */
const confidenceArb: fc.Arbitrary<number> = fc.oneof(
  // Valid range
  fc.double({ min: 0, max: 1, noNaN: true }),
  // Values that may be out of range (to test clamping in the worker)
  fc.double({ min: -10, max: 10, noNaN: true }),
);

/**
 * Arbitrary that generates explanation strings of varying lengths,
 * including strings that exceed 500 characters to test truncation.
 */
const explanationArb: fc.Arbitrary<string> = fc.oneof(
  // Short explanations (within limit)
  fc.string({ minLength: 1, maxLength: 500 }),
  // Long explanations (exceeding limit, to test truncation)
  fc.string({ minLength: 501, maxLength: 1000 }),
  // Strings with special characters
  fc.string({ minLength: 1, maxLength: 600 }),
);

/**
 * Arbitrary that generates a score value
 */
const scoreArb: fc.Arbitrary<number> = fc.double({ min: 0, max: 100, noNaN: true });

/**
 * Arbitrary that generates a maxScore value
 */
const maxScoreArb: fc.Arbitrary<number> = fc.double({ min: 1, max: 100, noNaN: true });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 17: Grading Result Metadata Invariants', () => {
  it('confidence score is always in [0, 1] for any successfully produced grade', async () => {
    await fc.assert(
      fc.asyncProperty(
        confidenceArb,
        explanationArb,
        scoreArb,
        maxScoreArb,
        async (confidence: number, explanation: string, score: number, maxScore: number) => {
          // Create a mock AI that returns the generated values
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score,
              maxScore,
              confidence,
              explanation,
            }),
          };

          const submission = makeSubmission(`sub-${Math.random().toString(36).slice(2)}`);
          const result = await processSubmission(submission, mockAI);

          // Only check invariants on successful grades
          if (result.status === 'success' && result.result) {
            // Confidence MUST be in [0, 1]
            expect(result.result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.result.confidence).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('explanation text is at most 500 characters for any successfully produced grade', async () => {
    await fc.assert(
      fc.asyncProperty(
        confidenceArb,
        explanationArb,
        scoreArb,
        maxScoreArb,
        async (confidence: number, explanation: string, score: number, maxScore: number) => {
          // Create a mock AI that returns the generated values
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score,
              maxScore,
              confidence,
              explanation,
            }),
          };

          const submission = makeSubmission(`sub-${Math.random().toString(36).slice(2)}`);
          const result = await processSubmission(submission, mockAI);

          // Only check invariants on successful grades
          if (result.status === 'success' && result.result) {
            // Explanation MUST be at most 500 characters
            expect(result.result.explanation.length).toBeLessThanOrEqual(500);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('both confidence ∈ [0,1] and explanation ≤ 500 chars hold simultaneously for any successful grade', async () => {
    await fc.assert(
      fc.asyncProperty(
        confidenceArb,
        explanationArb,
        scoreArb,
        maxScoreArb,
        async (confidence: number, explanation: string, score: number, maxScore: number) => {
          // Create a mock AI that returns the generated values
          const mockAI: IGradingAI = {
            gradeSubmission: jest.fn<IGradingAI['gradeSubmission']>().mockResolvedValue({
              score,
              maxScore,
              confidence,
              explanation,
            }),
          };

          const submission = makeSubmission(`sub-${Math.random().toString(36).slice(2)}`);
          const result = await processSubmission(submission, mockAI);

          // Only check invariants on successful grades
          if (result.status === 'success' && result.result) {
            // Both invariants must hold simultaneously
            expect(result.result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.result.confidence).toBeLessThanOrEqual(1);
            expect(result.result.explanation.length).toBeLessThanOrEqual(500);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
