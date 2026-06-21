/**
 * Property-Based Tests: Assessment Authoring and Submission
 *
 * Feature: admin-portal-overhaul, Property 16: Submission window enforcement
 * Feature: admin-portal-overhaul, Property 17: Assessment persistence round-trip
 *
 * Property 16: For any Assessment submission, the submission SHALL be accepted and
 * persisted with a Success_Envelope if and only if its submission time falls within
 * [opensAt, closesAt]; otherwise it SHALL be rejected with an Error_Envelope.
 * **Validates: Requirements 12.3, 12.4**
 *
 * Property 17: For any created Assessment, loading it back SHALL yield equivalent
 * questions and the same Course association.
 * **Validates: Requirements 12.1**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock BullMQ gradingQueue before importing the service (avoids Redis connection)
const mockQueueAdd = jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'mock-bull-job-id' });

jest.unstable_mockModule('../jobs/gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {
    add: mockQueueAdd,
  },
}));

// Mock logger to suppress output during tests
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Dynamic imports after mocks are set up
const { AssessmentService } = await import('./assessmentService.js');
const { default: Assessment } = await import('../models/Assessment.js');
const { default: Submission } = await import('../models/Submission.js');
const { default: Course } = await import('../models/Course.js');
const { default: GradingJob } = await import('../models/GradingJob.js');
const { AppError } = await import('../middleware/errorHandler.js');

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let assessmentService: InstanceType<typeof AssessmentService>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  assessmentService = new AssessmentService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Assessment.deleteMany({});
  await Submission.deleteMany({});
  await Course.deleteMany({});
  await GradingJob.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a Course in the test DB and return its ID.
 */
async function seedCourse(teacherId: Types.ObjectId): Promise<Types.ObjectId> {
  const course = await Course.create({
    title: 'Property Test Course',
    code: `PTC-${new Types.ObjectId().toHexString().slice(0, 8)}`,
    description: 'Course for property testing',
    faculty: teacherId,
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2025, 11, 31),
    credits: 3,
    maxStudents: 30,
    active: true,
  });
  return course._id as Types.ObjectId;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a non-empty question prompt string (pre-trimmed to match Mongoose trim behavior). */
const promptArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Generates a question type. */
const questionTypeArb = fc.oneof(
  fc.constant('objective' as const),
  fc.constant('subjective' as const),
);

/** Generates a valid maxScore > 0 for a question. */
const maxScoreArb = fc.integer({ min: 1, max: 100 });

/** Generates a unique question ID. */
const questionIdArb = fc.stringMatching(/^q[a-z0-9]{4,10}$/);

/** Generates a single question object. */
const questionArb = fc.record({
  questionId: questionIdArb,
  prompt: promptArb,
  type: questionTypeArb,
  maxScore: maxScoreArb,
});

/** Generates a non-empty array of questions with unique IDs. */
const questionsArb = fc
  .uniqueArray(questionArb, { minLength: 1, maxLength: 10, selector: (q) => q.questionId })
  .filter((arr) => arr.length > 0);

/** Generates a valid assessment title (pre-trimmed to match Mongoose trim behavior). */
const titleArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/**
 * Generates a submission window: [opensAt, closesAt] where closesAt > opensAt.
 * Both dates are within a reasonable range.
 */
const windowArb = fc
  .tuple(
    fc.integer({ min: 1_700_000_000_000, max: 1_800_000_000_000 }),
    fc.integer({ min: 1, max: 7 * 24 * 60 * 60 * 1000 }), // window duration up to 7 days in ms
  )
  .map(([openMs, durationMs]) => ({
    opensAt: new Date(openMs),
    closesAt: new Date(openMs + durationMs),
  }));

/**
 * Generates a timestamp that is strictly within [opensAt, closesAt].
 */
function withinWindowArb(opensAt: Date, closesAt: Date): fc.Arbitrary<Date> {
  const openMs = opensAt.getTime();
  const closeMs = closesAt.getTime();
  return fc.integer({ min: openMs, max: closeMs }).map((ms) => new Date(ms));
}

/**
 * Generates a timestamp that is strictly before opensAt.
 */
function beforeWindowArb(opensAt: Date): fc.Arbitrary<Date> {
  const openMs = opensAt.getTime();
  // At least 1ms before, up to 30 days before
  return fc
    .integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 })
    .map((delta) => new Date(openMs - delta));
}

/**
 * Generates a timestamp that is strictly after closesAt.
 */
function afterWindowArb(closesAt: Date): fc.Arbitrary<Date> {
  const closeMs = closesAt.getTime();
  // At least 1ms after, up to 30 days after
  return fc
    .integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 })
    .map((delta) => new Date(closeMs + delta));
}

// ---------------------------------------------------------------------------
// Property 16: Submission window enforcement
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 16: Submission window enforcement
describe('Property 16: Submission window enforcement', () => {
  it('submission SHALL be accepted when submission time falls within [opensAt, closesAt]', async () => {
    await fc.assert(
      fc.asyncProperty(
        questionsArb,
        titleArb,
        windowArb,
        async (questions, title, window) => {
          // Clean state
          await Assessment.deleteMany({});
          await Submission.deleteMany({});
          await Course.deleteMany({});
          await GradingJob.deleteMany({});

          const teacherId = new Types.ObjectId();
          const studentId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);

          // Create an assessment with the generated window
          const assessment = await assessmentService.createAssessment(
            teacherId.toHexString(),
            {
              courseId: courseId.toHexString(),
              title,
              questions,
              opensAt: window.opensAt,
              closesAt: window.closesAt,
            },
          );

          // Generate a submission time within the window
          const submissionTime = await fc.sample(withinWindowArb(window.opensAt, window.closesAt), 1)[0];

          // Override Date.now to simulate submission at the generated time
          const realDateNow = Date.now;
          const RealDate = global.Date;
          const mockNow = submissionTime.getTime();

          // Monkey-patch Date to return our controlled "now"
          // @ts-expect-error - Date mock override for testing
          jest.spyOn(global, 'Date').mockImplementation(function (this: unknown, ...args: unknown[]) {
            if (args.length === 0) {
              return new RealDate(mockNow);
            }
            // @ts-expect-error - calling Date constructor with spread args
            return new RealDate(...args);
          } as unknown as typeof Date);
          (global.Date as unknown as { now: () => number }).now = () => mockNow;
          Object.setPrototypeOf(global.Date, RealDate);
          // @ts-expect-error - restoring Date.prototype for test purposes
          global.Date.prototype = RealDate.prototype;

          try {
            // Build answers for all questions
            const answers = questions.map((q) => ({
              questionId: q.questionId,
              response: 'Test answer for property testing',
            }));

            // Submit — should succeed
            const result = await assessmentService.submitAnswers(
              studentId.toHexString(),
              assessment.assessmentId,
              { answers },
            );

            // Verify submission was accepted and persisted
            expect(result).toBeDefined();
            expect(result.submissionId).toBeDefined();
            expect(result.assessmentId).toBe(assessment.assessmentId);
            expect(result.studentId).toBe(studentId.toHexString());
            expect(result.answers).toHaveLength(questions.length);
          } finally {
            // Restore Date
            global.Date = RealDate;
            Date.now = realDateNow;
            jest.restoreAllMocks();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('submission SHALL be rejected when submission time is before opensAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        questionsArb,
        titleArb,
        windowArb,
        async (questions, title, window) => {
          // Clean state
          await Assessment.deleteMany({});
          await Submission.deleteMany({});
          await Course.deleteMany({});
          await GradingJob.deleteMany({});

          const teacherId = new Types.ObjectId();
          const studentId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);

          // Create an assessment
          const assessment = await assessmentService.createAssessment(
            teacherId.toHexString(),
            {
              courseId: courseId.toHexString(),
              title,
              questions,
              opensAt: window.opensAt,
              closesAt: window.closesAt,
            },
          );

          // Generate a submission time before the window opens
          const submissionTime = await fc.sample(beforeWindowArb(window.opensAt), 1)[0];

          // Override Date
          const realDateNow = Date.now;
          const RealDate = global.Date;
          const mockNow = submissionTime.getTime();

          // @ts-expect-error - Date mock override for testing
          jest.spyOn(global, 'Date').mockImplementation(function (this: unknown, ...args: unknown[]) {
            if (args.length === 0) {
              return new RealDate(mockNow);
            }
            // @ts-expect-error - calling Date constructor with spread args
            return new RealDate(...args);
          } as unknown as typeof Date);
          (global.Date as unknown as { now: () => number }).now = () => mockNow;
          Object.setPrototypeOf(global.Date, RealDate);
          // @ts-expect-error - restoring Date.prototype for test purposes
          global.Date.prototype = RealDate.prototype;

          try {
            const answers = questions.map((q) => ({
              questionId: q.questionId,
              response: 'Test answer',
            }));

            // Submit — should be rejected
            await expect(
              assessmentService.submitAnswers(
                studentId.toHexString(),
                assessment.assessmentId,
                { answers },
              ),
            ).rejects.toThrow();

            // Verify no submission was persisted
            const count = await Submission.countDocuments({
              assessmentId: new Types.ObjectId(assessment.assessmentId),
            });
            expect(count).toBe(0);
          } finally {
            global.Date = RealDate;
            Date.now = realDateNow;
            jest.restoreAllMocks();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('submission SHALL be rejected when submission time is after closesAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        questionsArb,
        titleArb,
        windowArb,
        async (questions, title, window) => {
          // Clean state
          await Assessment.deleteMany({});
          await Submission.deleteMany({});
          await Course.deleteMany({});
          await GradingJob.deleteMany({});

          const teacherId = new Types.ObjectId();
          const studentId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);

          // Create an assessment
          const assessment = await assessmentService.createAssessment(
            teacherId.toHexString(),
            {
              courseId: courseId.toHexString(),
              title,
              questions,
              opensAt: window.opensAt,
              closesAt: window.closesAt,
            },
          );

          // Generate a submission time after the window closes
          const submissionTime = await fc.sample(afterWindowArb(window.closesAt), 1)[0];

          // Override Date
          const realDateNow = Date.now;
          const RealDate = global.Date;
          const mockNow = submissionTime.getTime();

          // @ts-expect-error - Date mock override for testing
          jest.spyOn(global, 'Date').mockImplementation(function (this: unknown, ...args: unknown[]) {
            if (args.length === 0) {
              return new RealDate(mockNow);
            }
            // @ts-expect-error - calling Date constructor with spread args
            return new RealDate(...args);
          } as unknown as typeof Date);
          (global.Date as unknown as { now: () => number }).now = () => mockNow;
          Object.setPrototypeOf(global.Date, RealDate);
          // @ts-expect-error - restoring Date.prototype for test purposes
          global.Date.prototype = RealDate.prototype;

          try {
            const answers = questions.map((q) => ({
              questionId: q.questionId,
              response: 'Test answer',
            }));

            // Submit — should be rejected
            await expect(
              assessmentService.submitAnswers(
                studentId.toHexString(),
                assessment.assessmentId,
                { answers },
              ),
            ).rejects.toThrow();

            // Verify no submission was persisted
            const count = await Submission.countDocuments({
              assessmentId: new Types.ObjectId(assessment.assessmentId),
            });
            expect(count).toBe(0);
          } finally {
            global.Date = RealDate;
            Date.now = realDateNow;
            jest.restoreAllMocks();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Assessment persistence round-trip
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 17: Assessment persistence round-trip
describe('Property 17: Assessment persistence round-trip', () => {
  it('created Assessment loaded back SHALL yield equivalent questions and same Course association', async () => {
    await fc.assert(
      fc.asyncProperty(
        questionsArb,
        titleArb,
        windowArb,
        async (questions, title, window) => {
          // Clean state
          await Assessment.deleteMany({});
          await Course.deleteMany({});

          const teacherId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);

          // Create an assessment
          const created = await assessmentService.createAssessment(
            teacherId.toHexString(),
            {
              courseId: courseId.toHexString(),
              title,
              questions,
              opensAt: window.opensAt,
              closesAt: window.closesAt,
            },
          );

          // Load it back via the service
          const loaded = await assessmentService.getAssessmentById(created.assessmentId);

          // Verify course association is preserved
          expect(loaded.courseId).toBe(courseId.toHexString());

          // Verify teacher association is preserved
          expect(loaded.teacherId).toBe(teacherId.toHexString());

          // Verify title is preserved
          expect(loaded.title).toBe(title);

          // Verify questions are equivalent (same count, same data)
          expect(loaded.questions).toHaveLength(questions.length);

          for (let i = 0; i < questions.length; i++) {
            const original = questions[i];
            const persisted = loaded.questions[i];

            expect(persisted.questionId).toBe(original.questionId);
            expect(persisted.prompt).toBe(original.prompt);
            expect(persisted.type).toBe(original.type);
            expect(persisted.maxScore).toBe(original.maxScore);
          }

          // Verify window dates are preserved
          expect(new Date(loaded.opensAt).getTime()).toBe(window.opensAt.getTime());
          expect(new Date(loaded.closesAt).getTime()).toBe(window.closesAt.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });
});
