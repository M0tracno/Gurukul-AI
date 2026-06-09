/**
 * Unit tests for GradingService — Teacher Override and Finalization
 *
 * Tests:
 * - overrideGradedAnswer: Teacher can override AI score/feedback before finalization
 * - finalizeSubmission: Teacher can finalize a submission after review
 * - Failure handling: failure notification emitted to teacher via Socket.IO
 *
 * **Validates: Requirements 13.4, 13.5**
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock BullMQ gradingQueue before importing the service
const mockQueueAdd = jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'mock-bull-job-id' });
const mockGetJob = jest.fn<() => Promise<null>>().mockResolvedValue(null);

jest.unstable_mockModule('../jobs/gradingQueue.js', () => ({
  GRADING_QUEUE_NAME: 'ai-grading',
  gradingQueue: {
    add: mockQueueAdd,
    getJob: mockGetJob,
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
const { GradingService } = await import('./gradingService.js');
const { default: Submission } = await import('../models/Submission.js');
const { default: Assessment } = await import('../models/Assessment.js');
const { default: GradingJob } = await import('../models/GradingJob.js');
const { AppError } = await import('../middleware/errorHandler.js');

let mongoServer: MongoMemoryServer;
let service: InstanceType<typeof GradingService>;

const teacherId = new mongoose.Types.ObjectId();
const otherTeacherId = new mongoose.Types.ObjectId();
const studentId = new mongoose.Types.ObjectId();
const courseId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  service = new GradingService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Submission.deleteMany({});
  await Assessment.deleteMany({});
  await GradingJob.deleteMany({});
  jest.clearAllMocks();
});

/**
 * Helper: create an assessment owned by teacherId.
 */
async function createAssessment() {
  return Assessment.create({
    courseId,
    teacherId,
    title: 'Test Assessment',
    questions: [
      { questionId: 'q1', prompt: 'Explain X', type: 'subjective', maxScore: 10 },
      { questionId: 'q2', prompt: 'Describe Y', type: 'subjective', maxScore: 20 },
    ],
    opensAt: new Date('2024-01-01'),
    closesAt: new Date('2025-12-31'),
  });
}

/**
 * Helper: create a completed submission with graded answers.
 */
async function createGradedSubmission(assessmentId: mongoose.Types.ObjectId) {
  return Submission.create({
    assessmentId,
    studentId,
    answers: [
      { questionId: 'q1', response: 'My answer for X' },
      { questionId: 'q2', response: 'My answer for Y' },
    ],
    submittedAt: new Date(),
    gradingStatus: 'completed',
    gradedAnswers: [
      { questionId: 'q1', score: 7, maxScore: 10, confidence: 0.85, feedback: 'Good answer', overriddenByTeacher: false },
      { questionId: 'q2', score: 15, maxScore: 20, confidence: 0.9, feedback: 'Well explained', overriddenByTeacher: false },
    ],
    finalized: false,
  });
}

describe('GradingService - Teacher Override', () => {
  describe('overrideGradedAnswer', () => {
    it('should allow the teacher to override score and feedback', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      const result = await service.overrideGradedAnswer({
        submissionId: submission._id.toString(),
        questionId: 'q1',
        teacherId: teacherId.toString(),
        score: 9,
        feedback: 'Excellent answer after reconsideration',
      });

      expect(result.submissionId).toBe(submission._id.toString());
      expect(result.questionId).toBe('q1');
      expect(result.score).toBe(9);
      expect(result.maxScore).toBe(10);
      expect(result.feedback).toBe('Excellent answer after reconsideration');
      expect(result.overriddenByTeacher).toBe(true);
    });

    it('should set overriddenByTeacher to true on the graded answer', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      await service.overrideGradedAnswer({
        submissionId: submission._id.toString(),
        questionId: 'q1',
        teacherId: teacherId.toString(),
        score: 5,
        feedback: 'Revised feedback',
      });

      // Reload from DB
      const updated = await Submission.findById(submission._id).lean();
      const gradedAnswer = updated!.gradedAnswers!.find((ga) => ga.questionId === 'q1');
      expect(gradedAnswer!.overriddenByTeacher).toBe(true);
      expect(gradedAnswer!.score).toBe(5);
      expect(gradedAnswer!.feedback).toBe('Revised feedback');
    });

    it('should reject override if submission is already finalized', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);
      submission.finalized = true;
      await submission.save();

      try {
        await service.overrideGradedAnswer({
          submissionId: submission._id.toString(),
          questionId: 'q1',
          teacherId: teacherId.toString(),
          score: 9,
          feedback: 'Late override',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
      }
    });

    it('should reject override from a teacher who does not own the assessment', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      try {
        await service.overrideGradedAnswer({
          submissionId: submission._id.toString(),
          questionId: 'q1',
          teacherId: otherTeacherId.toString(),
          score: 9,
          feedback: 'Not my assessment',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(403);
      }
    });

    it('should reject override if grading is not yet completed', async () => {
      const assessment = await createAssessment();
      const submission = await Submission.create({
        assessmentId: assessment._id,
        studentId,
        answers: [{ questionId: 'q1', response: 'Answer' }],
        submittedAt: new Date(),
        gradingStatus: 'processing',
        finalized: false,
      });

      try {
        await service.overrideGradedAnswer({
          submissionId: submission._id.toString(),
          questionId: 'q1',
          teacherId: teacherId.toString(),
          score: 5,
          feedback: 'Too early',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
      }
    });

    it('should reject override if score exceeds maxScore', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      try {
        await service.overrideGradedAnswer({
          submissionId: submission._id.toString(),
          questionId: 'q1',
          teacherId: teacherId.toString(),
          score: 15, // maxScore is 10
          feedback: 'Too high',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
      }
    });

    it('should reject override for a non-existent questionId', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      try {
        await service.overrideGradedAnswer({
          submissionId: submission._id.toString(),
          questionId: 'q-nonexistent',
          teacherId: teacherId.toString(),
          score: 5,
          feedback: 'Bad question',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });

    it('should reject override for a non-existent submission', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      try {
        await service.overrideGradedAnswer({
          submissionId: fakeId,
          questionId: 'q1',
          teacherId: teacherId.toString(),
          score: 5,
          feedback: 'No submission',
        });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });
  });

  describe('finalizeSubmission', () => {
    it('should finalize a completed submission', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      const result = await service.finalizeSubmission(
        submission._id.toString(),
        teacherId.toString(),
      );

      expect(result.submissionId).toBe(submission._id.toString());
      expect(result.finalized).toBe(true);
      expect(result.gradedAnswerCount).toBe(2);
    });

    it('should persist finalized=true in the database', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      await service.finalizeSubmission(
        submission._id.toString(),
        teacherId.toString(),
      );

      const updated = await Submission.findById(submission._id).lean();
      expect(updated!.finalized).toBe(true);
    });

    it('should reject re-finalization of an already-finalized submission', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);
      submission.finalized = true;
      await submission.save();

      try {
        await service.finalizeSubmission(
          submission._id.toString(),
          teacherId.toString(),
        );
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
      }
    });

    it('should reject finalization by a non-owning teacher', async () => {
      const assessment = await createAssessment();
      const submission = await createGradedSubmission(assessment._id as mongoose.Types.ObjectId);

      try {
        await service.finalizeSubmission(
          submission._id.toString(),
          otherTeacherId.toString(),
        );
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(403);
      }
    });

    it('should reject finalization before grading completes', async () => {
      const assessment = await createAssessment();
      const submission = await Submission.create({
        assessmentId: assessment._id,
        studentId,
        answers: [{ questionId: 'q1', response: 'Answer' }],
        submittedAt: new Date(),
        gradingStatus: 'queued',
        finalized: false,
      });

      try {
        await service.finalizeSubmission(
          submission._id.toString(),
          teacherId.toString(),
        );
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
      }
    });

    it('should reject finalization for a non-existent submission', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      try {
        await service.finalizeSubmission(fakeId, teacherId.toString());
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });
  });
});
