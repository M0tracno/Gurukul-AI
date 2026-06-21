/**
 * Unit Tests: Subjective Free-Text Affordance
 *
 * Validates: Requirement 12.2
 * "Where an Assessment includes subjective questions, the Portal SHALL allow
 * free-text answer fields for those questions."
 *
 * These tests verify that:
 * 1. The Assessment model supports `type: 'subjective'` on questions.
 * 2. When submitting answers for a subjective question, any free-text string
 *    response is accepted (no format restriction).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
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

const teacherId = new Types.ObjectId();
const studentId = new Types.ObjectId();

async function seedCourse(): Promise<Types.ObjectId> {
  const course = await Course.create({
    title: 'Subjective Test Course',
    code: `STC-${new Types.ObjectId().toHexString().slice(0, 8)}`,
    description: 'Course for subjective free-text testing',
    faculty: teacherId,
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2025, 11, 31),
    credits: 3,
    maxStudents: 30,
    active: true,
  });
  return course._id as Types.ObjectId;
}

/**
 * Creates an assessment with the given questions, with a wide-open submission
 * window so that date-based rejections don't interfere.
 */
async function createOpenAssessment(courseId: Types.ObjectId, questions: Array<{
  questionId: string;
  prompt: string;
  type: 'objective' | 'subjective';
  maxScore: number;
}>) {
  const now = new Date();
  const opensAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

  return assessmentService.createAssessment(teacherId.toHexString(), {
    courseId: courseId.toHexString(),
    title: 'Subjective Free-Text Assessment',
    questions,
    opensAt,
    closesAt,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Subjective Free-Text Affordance (Requirement 12.2)', () => {
  describe('Assessment model supports subjective question type', () => {
    it('should persist a question with type "subjective"', async () => {
      const courseId = await seedCourse();

      const assessment = await createOpenAssessment(courseId, [
        {
          questionId: 'q1',
          prompt: 'Explain the theory of relativity in your own words.',
          type: 'subjective',
          maxScore: 10,
        },
      ]);

      expect(assessment.questions).toHaveLength(1);
      expect(assessment.questions[0].type).toBe('subjective');
      expect(assessment.questions[0].prompt).toBe('Explain the theory of relativity in your own words.');
    });

    it('should persist an assessment with mixed objective and subjective questions', async () => {
      const courseId = await seedCourse();

      const assessment = await createOpenAssessment(courseId, [
        {
          questionId: 'q1',
          prompt: 'What is 2+2?',
          type: 'objective',
          maxScore: 5,
        },
        {
          questionId: 'q2',
          prompt: 'Discuss the causes of World War I.',
          type: 'subjective',
          maxScore: 20,
        },
      ]);

      expect(assessment.questions).toHaveLength(2);
      expect(assessment.questions[0].type).toBe('objective');
      expect(assessment.questions[1].type).toBe('subjective');
    });
  });

  describe('Subjective questions accept free-text answer fields', () => {
    it('should accept a short free-text response for a subjective question', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'What is your opinion?', type: 'subjective', maxScore: 10 },
      ]);

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: 'I think it is great.' }] },
      );

      expect(result.answers[0].response).toBe('I think it is great.');
      expect(result.submissionId).toBeDefined();
    });

    it('should accept a long multi-paragraph free-text response', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'Write an essay on climate change.', type: 'subjective', maxScore: 50 },
      ]);

      const longResponse = `Climate change is one of the most pressing issues of our time.

It affects every ecosystem on Earth, from the deep oceans to the highest mountain peaks. 
The scientific consensus is clear: human activities, particularly the burning of fossil fuels, 
are driving unprecedented changes in Earth's climate system.

In this essay, I will explore three key aspects:
1. The scientific evidence for anthropogenic climate change
2. The socioeconomic impacts on vulnerable populations
3. Potential mitigation strategies and their feasibility

The evidence shows that global temperatures have risen by approximately 1.1°C since 
pre-industrial times, with the rate of warming accelerating in recent decades.`;

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: longResponse }] },
      );

      expect(result.answers[0].response).toBe(longResponse);
    });

    it('should accept special characters, unicode, and formatting in free-text responses', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'Express your thoughts freely.', type: 'subjective', maxScore: 10 },
      ]);

      const specialResponse = '数学の公式: E = mc² — «Привет мир» — émojis: 🎓📚✅ & "quotes" <tags>';

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: specialResponse }] },
      );

      expect(result.answers[0].response).toBe(specialResponse);
    });

    it('should accept numeric-looking text without converting it', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'Explain the significance of pi.', type: 'subjective', maxScore: 10 },
      ]);

      const numericResponse = '3.14159265358979 is the ratio of a circle circumference to its diameter.';

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: numericResponse }] },
      );

      expect(result.answers[0].response).toBe(numericResponse);
    });

    it('should accept free-text for subjective alongside objective answers in the same submission', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'What is 2+2?', type: 'objective', maxScore: 5 },
        { questionId: 'q2', prompt: 'Explain why math matters.', type: 'subjective', maxScore: 20 },
        { questionId: 'q3', prompt: 'Describe the Pythagorean theorem.', type: 'subjective', maxScore: 15 },
      ]);

      const answers = [
        { questionId: 'q1', response: '4' },
        { questionId: 'q2', response: 'Math is the language of the universe, enabling us to model and predict natural phenomena.' },
        { questionId: 'q3', response: 'In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides: a² + b² = c².' },
      ];

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers },
      );

      expect(result.answers).toHaveLength(3);
      expect(result.answers[0].response).toBe('4');
      expect(result.answers[1].response).toBe(answers[1].response);
      expect(result.answers[2].response).toBe(answers[2].response);
    });

    it('should persist the free-text submission in the database', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'Write freely.', type: 'subjective', maxScore: 10 },
      ]);

      const freeTextAnswer = 'This is my freely written response with no format constraints.';

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: freeTextAnswer }] },
      );

      // Verify persistence by loading directly from the database
      const persisted = await Submission.findById(result.submissionId).lean().exec();
      expect(persisted).not.toBeNull();
      expect(persisted!.answers[0].response).toBe(freeTextAnswer);
      expect(persisted!.answers[0].questionId).toBe('q1');
    });

    it('should enqueue a grading job when subjective answers are submitted', async () => {
      const courseId = await seedCourse();
      const assessment = await createOpenAssessment(courseId, [
        { questionId: 'q1', prompt: 'Discuss freely.', type: 'subjective', maxScore: 10 },
      ]);

      const result = await assessmentService.submitAnswers(
        studentId.toHexString(),
        assessment.assessmentId,
        { answers: [{ questionId: 'q1', response: 'My free-text answer on this topic.' }] },
      );

      // Grading status should be 'queued' for subjective submissions
      expect(result.gradingStatus).toBe('queued');
      expect(result.gradingJobId).toBeDefined();
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });
  });
});
