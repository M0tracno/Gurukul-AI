import GradingJob from '../models/GradingJob.js';
import type { IGradingJob } from '../models/GradingJob.js';
import Submission from '../models/Submission.js';
import type { GradingStatus, IGradedAnswer } from '../models/Submission.js';
import Assessment from '../models/Assessment.js';
import { gradingQueue } from '../jobs/gradingQueue.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 200;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 20;
const DEFAULT_CONCURRENCY = 5;

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface GradingJobInput {
  batchId: string;
  teacherId: string;
  submissions: Array<{
    submissionId: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  concurrency?: number; // 1-20, default 5
}

export interface JobProgress {
  jobId: string;
  status: IGradingJob['status'];
  totalSubmissions: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface FileValidationError {
  submissionId: string;
  errors: string[];
}

export interface OverrideGradedAnswerInput {
  submissionId: string;
  questionId: string;
  teacherId: string;
  score: number;
  feedback: string;
}

export interface OverrideGradedAnswerResult {
  submissionId: string;
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  overriddenByTeacher: boolean;
}

export interface FinalizeSubmissionResult {
  submissionId: string;
  finalized: boolean;
  gradedAnswerCount: number;
}

export interface IGradingService {
  submitBatch(input: GradingJobInput): Promise<{ jobId: string }>;
  getJobProgress(jobId: string): Promise<JobProgress>;
  getJobStatus(jobId: string): Promise<JobStatusResult>;
  cancelJob(jobId: string): Promise<void>;
  overrideGradedAnswer(input: OverrideGradedAnswerInput): Promise<OverrideGradedAnswerResult>;
  finalizeSubmission(submissionId: string, teacherId: string): Promise<FinalizeSubmissionResult>;
}

/**
 * Job status result following the design's state machine:
 * queued → processing → (completed | failed)
 *
 * When completed, includes a result reference pointing to the graded submission.
 * Requirement 14.3, 14.4
 */
export interface JobStatusResult {
  jobId: string;
  status: GradingStatus; // 'queued' | 'processing' | 'completed' | 'failed'
  submissionId?: string;
  gradedAnswerCount?: number;
  resultRef?: string; // reference to graded submission when completed
  startedAt?: Date;
  completedAt?: Date;
}

// ─── Implementation ─────────────────────────────────────────────────────────────

export class GradingService implements IGradingService {
  /**
   * Submit a batch of submissions for AI grading.
   *
   * Validation order (per Req 7.6):
   * 1. Validate batch size (1-200)
   * 2. Validate individual files (≤20 MB, accepted MIME types)
   * 3. Create GradingJob document
   * 4. Add job to BullMQ queue
   */
  async submitBatch(input: GradingJobInput): Promise<{ jobId: string }> {
    const { batchId, teacherId, submissions, concurrency } = input;

    // 1. Validate batch size
    if (!submissions || submissions.length < MIN_BATCH_SIZE) {
      throw AppError.badRequest(
        `Batch must contain at least ${MIN_BATCH_SIZE} submission`,
        [{ field: 'submissions', reason: `Batch size must be between ${MIN_BATCH_SIZE} and ${MAX_BATCH_SIZE}` }],
      );
    }

    if (submissions.length > MAX_BATCH_SIZE) {
      throw AppError.badRequest(
        `Batch cannot exceed ${MAX_BATCH_SIZE} submissions`,
        [{ field: 'submissions', reason: `Maximum allowed batch size is ${MAX_BATCH_SIZE}` }],
      );
    }

    // 2. Validate individual files — report individual file validation status first (Req 7.6)
    const fileValidationErrors = this.validateFiles(submissions);
    if (fileValidationErrors.length > 0) {
      const details = fileValidationErrors.flatMap((fve) =>
        fve.errors.map((reason) => ({
          field: `submissions[${fve.submissionId}]`,
          reason,
        })),
      );
      throw AppError.badRequest('One or more submission files failed validation', details);
    }

    // 3. Resolve concurrency
    const resolvedConcurrency = this.resolveConcurrency(concurrency);

    // 4. Create GradingJob document
    const gradingJob = await GradingJob.create({
      batchId,
      teacherId,
      status: 'pending',
      totalSubmissions: submissions.length,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      concurrency: resolvedConcurrency,
      submissions: submissions.map((s) => ({
        submissionId: s.submissionId,
        fileUrl: s.fileUrl,
        fileSize: s.fileSize,
        mimeType: s.mimeType,
        status: 'pending' as const,
        retryCount: 0,
      })),
    });

    const jobId = gradingJob._id.toString();

    // 5. Add job to BullMQ queue
    await gradingQueue.add(
      `grade-batch-${batchId}`,
      {
        jobId,
        batchId,
        teacherId,
        concurrency: resolvedConcurrency,
      },
      {
        jobId: `grading-${jobId}`,
      },
    );

    logger.info('Grading batch submitted', {
      jobId,
      batchId,
      teacherId,
      totalSubmissions: submissions.length,
      concurrency: resolvedConcurrency,
    });

    return { jobId };
  }

  /**
   * Get the current progress of a grading job.
   */
  async getJobProgress(jobId: string): Promise<JobProgress> {
    const job = await GradingJob.findById(jobId).lean();

    if (!job) {
      throw AppError.notFound(`Grading job '${jobId}' not found`);
    }

    return {
      jobId: job._id.toString(),
      status: job.status,
      totalSubmissions: job.totalSubmissions,
      processedCount: job.processedCount,
      successCount: job.successCount,
      failureCount: job.failureCount,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
    };
  }

  /**
   * Get the status of a grading job following the design state machine:
   * queued → processing → (completed | failed)
   *
   * Maps the internal GradingJob statuses to the Submission-level grading
   * status exposed by the API. When completed, returns a result reference
   * to the graded submission.
   *
   * Requirements: 14.3, 14.4
   */
  async getJobStatus(jobId: string): Promise<JobStatusResult> {
    const job = await GradingJob.findById(jobId).lean();

    if (!job) {
      throw AppError.notFound(`Grading job '${jobId}' not found`);
    }

    // Map internal job status to the design's state machine
    // Internal: pending | processing | completed | completed_with_failures
    // Design:   queued  | processing | completed | failed
    const statusMap: Record<IGradingJob['status'], GradingStatus> = {
      pending: 'queued',
      processing: 'processing',
      completed: 'completed',
      completed_with_failures: 'failed',
    };

    const mappedStatus = statusMap[job.status];

    // Find the associated submission to get the result reference
    const submission = await Submission.findOne({ gradingJobId: job._id }).lean();

    const result: JobStatusResult = {
      jobId: job._id.toString(),
      status: mappedStatus,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
    };

    if (submission) {
      result.submissionId = submission._id.toString();

      if (mappedStatus === 'completed' && submission.gradedAnswers) {
        result.gradedAnswerCount = submission.gradedAnswers.length;
        result.resultRef = `submissions/${submission._id.toString()}/graded-answers`;
      }
    }

    return result;
  }

  /**
   * Cancel a grading job.
   * Removes the job from the queue if it hasn't started processing,
   * and marks it as cancelled in the database.
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await GradingJob.findById(jobId);

    if (!job) {
      throw AppError.notFound(`Grading job '${jobId}' not found`);
    }

    if (job.status === 'completed' || job.status === 'completed_with_failures') {
      throw AppError.badRequest('Cannot cancel a completed job', [
        { field: 'status', reason: 'Job has already completed' },
      ]);
    }

    // Try to remove the job from the BullMQ queue
    const bullJob = await gradingQueue.getJob(`grading-${jobId}`);
    if (bullJob) {
      const state = await bullJob.getState();
      if (state === 'waiting' || state === 'delayed') {
        await bullJob.remove();
      }
    }

    // Mark as completed with failures (closest status to cancelled in schema)
    // Since the schema doesn't have a 'cancelled' status, we use completed_with_failures
    // and set completedAt to indicate it was terminated early
    job.status = 'completed_with_failures';
    job.completedAt = new Date();
    await job.save();

    logger.info('Grading job cancelled', { jobId, batchId: job.batchId });
  }

  /**
   * Override the AI-generated score and feedback for a specific graded answer
   * before the submission is finalized. Only the owning Teacher (the one who
   * authored the assessment) may perform this action.
   *
   * Sets `overriddenByTeacher: true` on the targeted graded answer.
   *
   * Requirements: 13.4
   */
  async overrideGradedAnswer(input: OverrideGradedAnswerInput): Promise<OverrideGradedAnswerResult> {
    const { submissionId, questionId, teacherId, score, feedback } = input;

    // Load the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw AppError.notFound(`Submission '${submissionId}' not found`);
    }

    // Prevent override after finalization
    if (submission.finalized) {
      throw AppError.badRequest('Cannot override a finalized submission', [
        { field: 'finalized', reason: 'Submission has already been finalized' },
      ]);
    }

    // Ensure grading is completed before allowing override
    if (submission.gradingStatus !== 'completed') {
      throw AppError.badRequest('Cannot override grades before grading is complete', [
        { field: 'gradingStatus', reason: `Current grading status is '${submission.gradingStatus}'` },
      ]);
    }

    // Verify the teacher owns the assessment
    const assessment = await Assessment.findById(submission.assessmentId).lean().exec();
    if (!assessment) {
      throw AppError.notFound(`Assessment for submission '${submissionId}' not found`);
    }
    if (assessment.teacherId.toString() !== teacherId) {
      throw AppError.forbidden('Only the assessment author can override grades');
    }

    // Find the graded answer by questionId
    if (!submission.gradedAnswers || submission.gradedAnswers.length === 0) {
      throw AppError.badRequest('Submission has no graded answers to override', [
        { field: 'gradedAnswers', reason: 'No graded answers present' },
      ]);
    }

    const gradedAnswerIndex = submission.gradedAnswers.findIndex(
      (ga) => ga.questionId === questionId,
    );
    if (gradedAnswerIndex === -1) {
      throw AppError.notFound(`Graded answer for question '${questionId}' not found in submission`);
    }

    const gradedAnswer = submission.gradedAnswers[gradedAnswerIndex];

    // Validate score bounds
    if (score < 0 || score > gradedAnswer.maxScore) {
      throw AppError.badRequest('Score out of bounds', [
        { field: 'score', reason: `Score must be between 0 and ${gradedAnswer.maxScore}` },
      ]);
    }

    // Apply the override
    gradedAnswer.score = score;
    gradedAnswer.feedback = feedback;
    gradedAnswer.overriddenByTeacher = true;

    // Persist
    submission.gradedAnswers[gradedAnswerIndex] = gradedAnswer;
    submission.markModified('gradedAnswers');
    await submission.save();

    logger.info('Teacher overrode graded answer', {
      submissionId,
      questionId,
      teacherId,
      newScore: score,
    });

    return {
      submissionId,
      questionId,
      score: gradedAnswer.score,
      maxScore: gradedAnswer.maxScore,
      feedback: gradedAnswer.feedback || '',
      overriddenByTeacher: true,
    };
  }

  /**
   * Finalize a submission after the teacher has reviewed (and optionally overridden)
   * the AI-generated grades. Once finalized, no further overrides are allowed.
   *
   * Requirements: 13.4
   */
  async finalizeSubmission(submissionId: string, teacherId: string): Promise<FinalizeSubmissionResult> {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw AppError.notFound(`Submission '${submissionId}' not found`);
    }

    if (submission.finalized) {
      throw AppError.badRequest('Submission is already finalized', [
        { field: 'finalized', reason: 'Cannot finalize an already-finalized submission' },
      ]);
    }

    // Ensure grading is completed before allowing finalization
    if (submission.gradingStatus !== 'completed') {
      throw AppError.badRequest('Cannot finalize before grading is complete', [
        { field: 'gradingStatus', reason: `Current grading status is '${submission.gradingStatus}'` },
      ]);
    }

    // Verify the teacher owns the assessment
    const assessment = await Assessment.findById(submission.assessmentId).lean().exec();
    if (!assessment) {
      throw AppError.notFound(`Assessment for submission '${submissionId}' not found`);
    }
    if (assessment.teacherId.toString() !== teacherId) {
      throw AppError.forbidden('Only the assessment author can finalize submissions');
    }

    // Finalize
    submission.finalized = true;
    await submission.save();

    logger.info('Submission finalized by teacher', {
      submissionId,
      teacherId,
      gradedAnswerCount: submission.gradedAnswers?.length || 0,
    });

    return {
      submissionId,
      finalized: true,
      gradedAnswerCount: submission.gradedAnswers?.length || 0,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validate individual submission files.
   * Reports individual file validation status (Req 7.6):
   * - File size must be ≤ 20 MB
   * - MIME type must be one of: application/pdf, image/jpeg, image/png
   */
  private validateFiles(
    submissions: GradingJobInput['submissions'],
  ): FileValidationError[] {
    const errors: FileValidationError[] = [];

    for (const submission of submissions) {
      const fileErrors: string[] = [];

      // Validate file size
      if (submission.fileSize > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (submission.fileSize / (1024 * 1024)).toFixed(2);
        fileErrors.push(
          `File size ${sizeMB} MB exceeds the maximum allowed size of 20 MB`,
        );
      }

      if (submission.fileSize < 0) {
        fileErrors.push('File size cannot be negative');
      }

      // Validate MIME type
      if (!ACCEPTED_MIME_TYPES.has(submission.mimeType)) {
        fileErrors.push(
          `MIME type '${submission.mimeType}' is not accepted. Accepted types: PDF, JPEG, PNG`,
        );
      }

      if (fileErrors.length > 0) {
        errors.push({
          submissionId: submission.submissionId,
          errors: fileErrors,
        });
      }
    }

    return errors;
  }

  /**
   * Resolve concurrency value, clamping it within the allowed range.
   */
  private resolveConcurrency(concurrency?: number): number {
    if (concurrency === undefined || concurrency === null) {
      return DEFAULT_CONCURRENCY;
    }

    if (concurrency < MIN_CONCURRENCY) {
      return MIN_CONCURRENCY;
    }

    if (concurrency > MAX_CONCURRENCY) {
      return MAX_CONCURRENCY;
    }

    return Math.floor(concurrency);
  }
}

// Export a singleton instance for convenience
export const gradingService = new GradingService();
