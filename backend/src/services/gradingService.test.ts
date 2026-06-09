/**
 * Unit tests for GradingService
 *
 * Tests batch submission validation (batch size 1-200), file validation
 * (≤20 MB, PDF/JPEG/PNG MIME types), job creation, and queue submission.
 *
 * **Validates: Requirements 7.1, 7.6**
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock BullMQ gradingQueue before importing the service
const mockQueueAdd = jest.fn<(...args: unknown[]) => Promise<{ id: string }>>().mockResolvedValue({ id: 'mock-bull-job-id' });
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
const { default: GradingJob } = await import('../models/GradingJob.js');
const { AppError } = await import('../middleware/errorHandler.js');

import type { GradingJobInput } from './gradingService.js';

let mongoServer: MongoMemoryServer;
let service: InstanceType<typeof GradingService>;

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
  await GradingJob.deleteMany({});
  jest.clearAllMocks();
});

function makeValidSubmission(overrides: Partial<GradingJobInput['submissions'][0]> = {}) {
  return {
    submissionId: new mongoose.Types.ObjectId().toString(),
    fileUrl: 'https://storage.example.com/file.pdf',
    fileSize: 5 * 1024 * 1024, // 5 MB
    mimeType: 'application/pdf',
    ...overrides,
  };
}

function makeValidInput(overrides: Partial<GradingJobInput> = {}): GradingJobInput {
  return {
    batchId: 'batch-001',
    teacherId: new mongoose.Types.ObjectId().toString(),
    submissions: [makeValidSubmission()],
    ...overrides,
  };
}

describe('GradingService', () => {
  describe('submitBatch', () => {
    describe('batch size validation', () => {
      it('should accept a batch with 1 submission', async () => {
        const input = makeValidInput({ submissions: [makeValidSubmission()] });
        const result = await service.submitBatch(input);
        expect(result.jobId).toBeDefined();
        expect(typeof result.jobId).toBe('string');
      });

      it('should accept a batch with 200 submissions', async () => {
        const submissions = Array.from({ length: 200 }, () => makeValidSubmission());
        const input = makeValidInput({ submissions });
        const result = await service.submitBatch(input);
        expect(result.jobId).toBeDefined();
      });

      it('should reject a batch with 0 submissions', async () => {
        const input = makeValidInput({ submissions: [] });
        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          expect((err as InstanceType<typeof AppError>).statusCode).toBe(400);
        }
      });

      it('should reject a batch with more than 200 submissions', async () => {
        const submissions = Array.from({ length: 201 }, () => makeValidSubmission());
        const input = makeValidInput({ submissions });
        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as InstanceType<typeof AppError>;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('200');
        }
      });
    });

    describe('file validation (Req 7.6)', () => {
      it('should accept PDF files ≤ 20 MB', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ mimeType: 'application/pdf', fileSize: 20 * 1024 * 1024 })],
        });
        const result = await service.submitBatch(input);
        expect(result.jobId).toBeDefined();
      });

      it('should accept JPEG files ≤ 20 MB', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ mimeType: 'image/jpeg', fileSize: 10 * 1024 * 1024 })],
        });
        const result = await service.submitBatch(input);
        expect(result.jobId).toBeDefined();
      });

      it('should accept PNG files ≤ 20 MB', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ mimeType: 'image/png', fileSize: 1024 })],
        });
        const result = await service.submitBatch(input);
        expect(result.jobId).toBeDefined();
      });

      it('should reject files exceeding 20 MB', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ fileSize: 21 * 1024 * 1024 })],
        });
        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as InstanceType<typeof AppError>;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('validation');
        }
      });

      it('should reject invalid MIME types', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ mimeType: 'application/zip' })],
        });
        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as InstanceType<typeof AppError>;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('validation');
        }
      });

      it('should report individual file validation errors', async () => {
        const submissions = [
          makeValidSubmission({ submissionId: 'good-1' }),
          makeValidSubmission({ submissionId: 'bad-size', fileSize: 25 * 1024 * 1024 }),
          makeValidSubmission({ submissionId: 'bad-type', mimeType: 'text/html' }),
        ];
        const input = makeValidInput({ submissions });

        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as InstanceType<typeof AppError>;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.details).toBeDefined();
          expect(appErr.details!.length).toBeGreaterThanOrEqual(2);
          // Check that both bad submissions are reported individually via field names
          const reportedFields = appErr.details!.map((d) => d.field);
          expect(reportedFields.some((f) => f.includes('bad-size'))).toBe(true);
          expect(reportedFields.some((f) => f.includes('bad-type'))).toBe(true);
        }
      });

      it('should reject files with negative size', async () => {
        const input = makeValidInput({
          submissions: [makeValidSubmission({ fileSize: -1 })],
        });
        try {
          await service.submitBatch(input);
          throw new Error('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
        }
      });
    });

    describe('concurrency configuration', () => {
      it('should use default concurrency of 5 when not specified', async () => {
        const input = makeValidInput();
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job!.concurrency).toBe(5);
      });

      it('should accept concurrency between 1 and 20', async () => {
        const input = makeValidInput({ concurrency: 10 });
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job!.concurrency).toBe(10);
      });

      it('should clamp concurrency below 1 to 1', async () => {
        const input = makeValidInput({ concurrency: 0 });
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job!.concurrency).toBe(1);
      });

      it('should clamp concurrency above 20 to 20', async () => {
        const input = makeValidInput({ concurrency: 50 });
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job!.concurrency).toBe(20);
      });
    });

    describe('job creation', () => {
      it('should create a GradingJob document in the database', async () => {
        const input = makeValidInput();
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job).not.toBeNull();
        expect(job!.batchId).toBe(input.batchId);
        expect(job!.teacherId.toString()).toBe(input.teacherId);
        expect(job!.status).toBe('pending');
        expect(job!.totalSubmissions).toBe(1);
        expect(job!.processedCount).toBe(0);
        expect(job!.successCount).toBe(0);
        expect(job!.failureCount).toBe(0);
      });

      it('should set all submissions to pending status', async () => {
        const submissions = [makeValidSubmission(), makeValidSubmission()];
        const input = makeValidInput({ submissions });
        const result = await service.submitBatch(input);

        const job = await GradingJob.findById(result.jobId).lean();
        expect(job!.submissions).toHaveLength(2);
        for (const sub of job!.submissions) {
          expect(sub.status).toBe('pending');
          expect(sub.retryCount).toBe(0);
        }
      });

      it('should add the job to the BullMQ queue', async () => {
        const input = makeValidInput();
        await service.submitBatch(input);

        expect(mockQueueAdd).toHaveBeenCalledTimes(1);
        expect(mockQueueAdd).toHaveBeenCalledWith(
          expect.stringContaining('grade-batch-'),
          expect.objectContaining({
            batchId: input.batchId,
            teacherId: input.teacherId,
          }),
          expect.objectContaining({
            jobId: expect.stringContaining('grading-'),
          }),
        );
      });
    });
  });

  describe('getJobProgress', () => {
    it('should return progress for an existing job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      const progress = await service.getJobProgress(jobId);
      expect(progress.jobId).toBe(jobId);
      expect(progress.status).toBe('pending');
      expect(progress.totalSubmissions).toBe(1);
      expect(progress.processedCount).toBe(0);
      expect(progress.successCount).toBe(0);
      expect(progress.failureCount).toBe(0);
    });

    it('should throw NotFound for a non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      try {
        await service.getJobProgress(fakeId);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });
  });

  describe('cancelJob', () => {
    it('should mark a pending job as completed_with_failures', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      await service.cancelJob(jobId);

      const job = await GradingJob.findById(jobId).lean();
      expect(job!.status).toBe('completed_with_failures');
      expect(job!.completedAt).toBeDefined();
    });

    it('should throw NotFound for a non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      try {
        await service.cancelJob(fakeId);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });

    it('should throw BadRequest when trying to cancel a completed job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      // Manually mark as completed
      await GradingJob.findByIdAndUpdate(jobId, { status: 'completed' });

      try {
        await service.cancelJob(jobId);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as InstanceType<typeof AppError>;
        expect(appErr.statusCode).toBe(400);
        expect(appErr.message).toContain('completed');
      }
    });
  });

  describe('getJobStatus', () => {
    it('should return queued status for a pending job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      const status = await service.getJobStatus(jobId);
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('queued');
      expect(status.resultRef).toBeUndefined();
    });

    it('should return processing status for a processing job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      await GradingJob.findByIdAndUpdate(jobId, {
        status: 'processing',
        startedAt: new Date(),
      });

      const status = await service.getJobStatus(jobId);
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('processing');
      expect(status.startedAt).toBeDefined();
      expect(status.resultRef).toBeUndefined();
    });

    it('should return completed status with result reference for a completed job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      await GradingJob.findByIdAndUpdate(jobId, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Create a Submission linked to this grading job
      const { default: Submission } = await import('../models/Submission.js');
      const submission = await Submission.create({
        assessmentId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(),
        answers: [{ questionId: 'q1', response: 'answer' }],
        submittedAt: new Date(),
        gradingJobId: new mongoose.Types.ObjectId(jobId),
        gradingStatus: 'completed',
        gradedAnswers: [
          { questionId: 'q1', score: 8, maxScore: 10, confidence: 0.9, feedback: 'Good answer', overriddenByTeacher: false },
        ],
        finalized: false,
      });

      const status = await service.getJobStatus(jobId);
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('completed');
      expect(status.completedAt).toBeDefined();
      expect(status.submissionId).toBe(submission._id.toString());
      expect(status.gradedAnswerCount).toBe(1);
      expect(status.resultRef).toBe(`submissions/${submission._id.toString()}/graded-answers`);

      // Clean up
      await Submission.deleteMany({});
    });

    it('should return failed status for a completed_with_failures job', async () => {
      const input = makeValidInput();
      const { jobId } = await service.submitBatch(input);

      await GradingJob.findByIdAndUpdate(jobId, {
        status: 'completed_with_failures',
        completedAt: new Date(),
      });

      const status = await service.getJobStatus(jobId);
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('failed');
      expect(status.completedAt).toBeDefined();
    });

    it('should throw NotFound for a non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      try {
        await service.getJobStatus(fakeId);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });
  });
});
