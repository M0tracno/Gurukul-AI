import { Worker, Job } from 'bullmq';
import { Server as SocketIOServer } from 'socket.io';
import { createRedisConnection } from '../config/redis.js';
import { GRADING_QUEUE_NAME } from './gradingQueue.js';
import GradingJob, { type IGradingJob, type IGradingSubmission } from '../models/GradingJob.js';
import Submission from '../models/Submission.js';
import Assessment from '../models/Assessment.js';
import type { IGradedAnswer, GradingStatus } from '../models/Submission.js';
import type { IQuestion } from '../models/Assessment.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// AI Grading Interface — abstracted for testability and easy mocking
// ---------------------------------------------------------------------------

/**
 * Interface for the AI grading service. Implementations can call Gemini,
 * OpenAI, or a mock for testing purposes.
 */
export interface IGradingAI {
  gradeSubmission(
    fileUrl: string,
    mimeType: string,
  ): Promise<{
    score: number;
    maxScore: number;
    confidence: number;
    explanation: string;
  }>;
}

/**
 * Default Gemini-based grading AI implementation.
 * Uses the Google Generative AI REST API via fetch.
 * Falls back to a placeholder if no API key is configured.
 */
export class GeminiGradingAI implements IGradingAI {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  async gradeSubmission(
    fileUrl: string,
    mimeType: string,
  ): Promise<{ score: number; maxScore: number; confidence: number; explanation: string }> {
    if (!this.apiKey) {
      // Placeholder/mock when API key is not available
      logger.warn('GEMINI_API_KEY not configured — returning placeholder grade', {
        fileUrl,
        mimeType,
      });
      return {
        score: Math.floor(Math.random() * 80) + 20,
        maxScore: 100,
        confidence: 0.75,
        explanation: 'Graded using placeholder AI (no API key configured).',
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are an educational grading assistant. Grade the following student submission.
File URL: ${fileUrl}
File type: ${mimeType}

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"score": <number>, "maxScore": <number>, "confidence": <number between 0 and 1>, "explanation": "<string max 500 chars>"}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    // Parse the JSON from the response
    const parsed = JSON.parse(text.trim());

    // Validate required fields
    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.maxScore !== 'number' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.explanation !== 'string'
    ) {
      throw new Error('Gemini response missing required fields');
    }

    return {
      score: parsed.score,
      maxScore: parsed.maxScore,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      explanation: parsed.explanation.slice(0, 500),
    };
  }
}

// ---------------------------------------------------------------------------
// Subjective Answer Grading AI Interface
// ---------------------------------------------------------------------------

/**
 * Result of grading a single subjective answer.
 * Must satisfy: 0 <= score <= maxScore and feedback is non-empty.
 */
export interface SubjectiveGradingResult {
  score: number;
  maxScore: number;
  confidence: number;
  feedback: string;
}

/**
 * Interface for subjective answer AI grading.
 * Evaluates a student's text response against a question prompt.
 */
export interface ISubjectiveGradingAI {
  gradeAnswer(
    questionPrompt: string,
    studentResponse: string,
    maxScore: number,
  ): Promise<SubjectiveGradingResult>;
}

/**
 * Default Gemini-based subjective answer grading implementation.
 * Uses NLP evaluation to produce score, maxScore, confidence, and feedback.
 */
export class GeminiSubjectiveGradingAI implements ISubjectiveGradingAI {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  async gradeAnswer(
    questionPrompt: string,
    studentResponse: string,
    maxScore: number,
  ): Promise<SubjectiveGradingResult> {
    if (!this.apiKey) {
      // Placeholder when API key is not available
      logger.warn('GEMINI_API_KEY not configured — returning placeholder subjective grade');
      const score = Math.min(maxScore, Math.floor(Math.random() * maxScore * 0.8) + Math.floor(maxScore * 0.2));
      return {
        score,
        maxScore,
        confidence: 0.75,
        feedback: 'Graded using placeholder AI (no API key configured). The response was evaluated for content quality.',
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are an educational grading assistant. Grade the following subjective answer.

Question: ${questionPrompt}
Maximum Score: ${maxScore}
Student's Answer: ${studentResponse}

Evaluate the answer for correctness, completeness, clarity, and reasoning quality.
Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"score": <number between 0 and ${maxScore}>, "maxScore": ${maxScore}, "confidence": <number between 0 and 1>, "feedback": "<constructive feedback string, max 500 chars>"}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    const parsed = JSON.parse(text.trim());

    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.maxScore !== 'number' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.feedback !== 'string'
    ) {
      throw new Error('Gemini response missing required fields for subjective grading');
    }

    // Enforce invariants: 0 <= score <= maxScore, non-empty feedback
    const clampedScore = Math.max(0, Math.min(maxScore, parsed.score));
    const clampedConfidence = Math.max(0, Math.min(1, parsed.confidence));
    const feedback = parsed.feedback.trim().slice(0, 500) || 'No specific feedback provided.';

    return {
      score: clampedScore,
      maxScore,
      confidence: clampedConfidence,
      feedback,
    };
  }
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------

/**
 * Calculate exponential backoff delay.
 * @param attempt - Zero-based attempt index (0 = first retry)
 * @param baseDelay - Base delay in milliseconds (default 1000)
 * @param maxDelay - Maximum delay cap in milliseconds (default 30000)
 */
export function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a given number of milliseconds.
 * Exported for testability — tests can mock this to avoid real delays.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Job payload type
// ---------------------------------------------------------------------------

export interface GradingJobPayload {
  gradingJobId: string;
  concurrency?: number;
}

/**
 * Payload for assessment-based subjective grading jobs.
 * Enqueued by assessmentService.submitAnswers when subjective answers exist.
 */
export interface SubjectiveGradingJobPayload {
  gradingJobId: string;
  submissionId: string;
  assessmentId: string;
  subjectiveQuestionIds: string[];
}

// ---------------------------------------------------------------------------
// Progress event types
// ---------------------------------------------------------------------------

export interface GradingProgressEvent {
  jobId: string;
  batchId: string;
  teacherId: string;
  processedCount: number;
  totalSubmissions: number;
  status: 'processing' | 'completed' | 'completed_with_failures';
  submissionId: string;
  submissionStatus: 'success' | 'failed';
}

export interface GradingBatchCompletionEvent {
  jobId: string;
  batchId: string;
  teacherId: string;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  status: 'completed' | 'completed_with_failures';
}

// ---------------------------------------------------------------------------
// Worker core: process a single submission with retry
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;

/**
 * Process a single submission with exponential backoff retry.
 * Isolated: failure in this function does NOT throw to the caller.
 * Returns the updated submission state.
 */
export async function processSubmission(
  submission: IGradingSubmission,
  gradingAI: IGradingAI,
): Promise<IGradingSubmission> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES - 1; attempt++) {
    // Wait before retry (skip for first attempt)
    if (attempt > 0) {
      const delay = calculateBackoff(attempt - 1);
      logger.info('Retrying submission', {
        submissionId: submission.submissionId,
        attempt: attempt + 1,
        delayMs: delay,
      });
      await sleep(delay);
    }

    try {
      const result = await gradingAI.gradeSubmission(submission.fileUrl, submission.mimeType);

      // Requirement 7.5: If confidence or explanation is missing, mark as failed
      if (result.confidence === undefined || result.confidence === null) {
        submission.status = 'failed';
        submission.failureReason = 'Metadata generation failure: missing confidence score';
        submission.retryCount = attempt + 1;
        return submission;
      }

      if (!result.explanation || result.explanation.trim().length === 0) {
        submission.status = 'failed';
        submission.failureReason = 'Metadata generation failure: missing explanation';
        submission.retryCount = attempt + 1;
        return submission;
      }

      // Successful grading — enforce metadata invariants (Req 7.5)
      submission.status = 'success';
      submission.result = {
        score: result.score,
        maxScore: result.maxScore,
        confidence: Math.max(0, Math.min(1, result.confidence)),
        explanation: result.explanation.slice(0, 500),
      };
      submission.retryCount = attempt;
      return submission;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('Submission grading attempt failed', {
        submissionId: submission.submissionId,
        attempt: attempt + 1,
        error: lastError.message,
      });
    }
  }

  // All retries exhausted — mark as failed
  submission.status = 'failed';
  submission.failureReason = lastError?.message || 'Unknown error after maximum retries';
  submission.retryCount = MAX_RETRIES;
  return submission;
}

// ---------------------------------------------------------------------------
// Worker: process entire grading job
// ---------------------------------------------------------------------------

/**
 * Process all submissions in a grading job with configurable concurrency.
 * Emits progress events after each submission completes.
 * Failure of one submission does not affect others (isolation).
 */
export async function processGradingJob(
  job: Job<GradingJobPayload>,
  gradingAI: IGradingAI,
  io?: SocketIOServer,
): Promise<void> {
  const { gradingJobId } = job.data;

  // Load the grading job from DB
  const gradingJob = await GradingJob.findById(gradingJobId);
  if (!gradingJob) {
    throw new Error(`GradingJob ${gradingJobId} not found`);
  }

  const teacherId = gradingJob.teacherId.toString();
  const batchId = gradingJob.batchId;

  // Mark job as processing
  gradingJob.status = 'processing';
  gradingJob.startedAt = new Date();
  await gradingJob.save();

  logger.info('Starting grading job processing', {
    jobId: gradingJobId,
    batchId,
    totalSubmissions: gradingJob.totalSubmissions,
    concurrency: gradingJob.concurrency,
  });

  // Process submissions with concurrency limit
  const concurrency = gradingJob.concurrency || 5;
  const submissions = gradingJob.submissions;
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;

  // Process in batches of `concurrency`
  for (let i = 0; i < submissions.length; i += concurrency) {
    const batch = submissions.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (submission) => {
        // Mark individual submission as processing
        submission.status = 'processing';

        // Process with retry logic — isolated, never throws
        const processed = await processSubmission(submission, gradingAI);
        return processed;
      }),
    );

    // Update each submission in the grading job
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const submissionIndex = i + j;

      if (result.status === 'fulfilled') {
        const processed = result.value;
        gradingJob.submissions[submissionIndex] = processed;

        if (processed.status === 'success') {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        // This shouldn't happen since processSubmission catches all errors,
        // but handle defensively for failure isolation
        gradingJob.submissions[submissionIndex].status = 'failed';
        gradingJob.submissions[submissionIndex].failureReason =
          result.reason?.message || 'Unexpected processing error';
        failureCount++;
      }

      processedCount++;

      // Update progress on the job document
      gradingJob.processedCount = processedCount;
      gradingJob.successCount = successCount;
      gradingJob.failureCount = failureCount;

      // Emit progress event via Socket.IO
      const progressEvent: GradingProgressEvent = {
        jobId: gradingJobId,
        batchId,
        teacherId,
        processedCount,
        totalSubmissions: gradingJob.totalSubmissions,
        status: 'processing',
        submissionId: gradingJob.submissions[submissionIndex].submissionId,
        submissionStatus: gradingJob.submissions[submissionIndex].status as 'success' | 'failed',
      };

      if (io) {
        io.to(`user_${teacherId}`).emit('grading_progress', progressEvent);
      }

      // Update BullMQ job progress for monitoring
      await job.updateProgress({
        processedCount,
        totalSubmissions: gradingJob.totalSubmissions,
      });
    }

    // Persist intermediate progress to DB after each concurrent batch
    await gradingJob.save();
  }

  // Determine final job status
  const finalStatus: IGradingJob['status'] =
    failureCount > 0 ? 'completed_with_failures' : 'completed';

  gradingJob.status = finalStatus;
  gradingJob.completedAt = new Date();
  await gradingJob.save();

  // Emit batch-completion event
  const completionEvent: GradingBatchCompletionEvent = {
    jobId: gradingJobId,
    batchId,
    teacherId,
    totalProcessed: processedCount,
    successCount,
    failureCount,
    status: finalStatus,
  };

  if (io) {
    io.to(`user_${teacherId}`).emit('grading_batch_complete', completionEvent);
  }

  logger.info('Grading job completed', {
    jobId: gradingJobId,
    batchId,
    status: finalStatus,
    successCount,
    failureCount,
    totalProcessed: processedCount,
  });
}

// ---------------------------------------------------------------------------
// Worker factory: create and return a BullMQ Worker instance
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Subjective Answer Grading: process a submission's answers
// ---------------------------------------------------------------------------

const SUBJECTIVE_MAX_RETRIES = 3;

/**
 * Grade a single subjective answer with retry logic.
 * Returns a graded answer result satisfying 0 <= score <= maxScore with non-empty feedback.
 */
export async function gradeSubjectiveAnswer(
  question: IQuestion,
  studentResponse: string,
  gradingAI: ISubjectiveGradingAI,
): Promise<SubjectiveGradingResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < SUBJECTIVE_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = calculateBackoff(attempt - 1);
      await sleep(delay);
    }

    try {
      const result = await gradingAI.gradeAnswer(
        question.prompt,
        studentResponse,
        question.maxScore,
      );

      // Enforce invariants: 0 <= score <= maxScore and non-empty feedback
      if (result.score < 0 || result.score > result.maxScore) {
        result.score = Math.max(0, Math.min(result.maxScore, result.score));
      }
      if (!result.feedback || result.feedback.trim().length === 0) {
        result.feedback = 'Answer evaluated by AI grader.';
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('Subjective grading attempt failed', {
        questionId: question.questionId,
        attempt: attempt + 1,
        error: lastError.message,
      });
    }
  }

  throw lastError || new Error('Subjective grading failed after maximum retries');
}

/**
 * Process a subjective grading job:
 * 1. Transition grading status to 'processing'
 * 2. Evaluate each subjective answer producing { score, maxScore, confidence, feedback }
 * 3. Persist graded answers on the Submission document
 * 4. Transition grading status to 'completed' (or 'failed' on error)
 *
 * This runs off the request path on the Lambda_Worker (BullMQ worker).
 * Requirements: 13.2, 13.3, 14.2, 14.3
 */
export async function processSubjectiveGradingJob(
  job: Job<SubjectiveGradingJobPayload>,
  gradingAI: ISubjectiveGradingAI,
  io?: SocketIOServer,
): Promise<void> {
  const { gradingJobId, submissionId, assessmentId, subjectiveQuestionIds } = job.data;

  // Load the grading job from DB
  const gradingJob = await GradingJob.findById(gradingJobId);
  if (!gradingJob) {
    throw new Error(`GradingJob ${gradingJobId} not found`);
  }

  // Load the submission
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    gradingJob.status = 'completed_with_failures';
    gradingJob.completedAt = new Date();
    await gradingJob.save();
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Load the assessment to get question prompts/maxScores
  const assessment = await Assessment.findById(assessmentId).lean().exec();
  if (!assessment) {
    gradingJob.status = 'completed_with_failures';
    gradingJob.completedAt = new Date();
    submission.gradingStatus = 'failed';
    await submission.save();
    await gradingJob.save();
    throw new Error(`Assessment ${assessmentId} not found`);
  }

  // Transition: queued → processing
  gradingJob.status = 'processing';
  gradingJob.startedAt = new Date();
  await gradingJob.save();

  submission.gradingStatus = 'processing';
  await submission.save();

  logger.info('Starting subjective grading job', {
    gradingJobId,
    submissionId,
    assessmentId,
    subjectiveQuestionCount: subjectiveQuestionIds.length,
  });

  // Build a map of questions for quick lookup
  const questionMap = new Map<string, IQuestion>(
    assessment.questions.map((q: IQuestion) => [q.questionId, q]),
  );

  // Build a map of student answers for quick lookup
  const answerMap = new Map<string, string>(
    submission.answers.map((a) => [a.questionId, a.response]),
  );

  // Grade each subjective answer
  const gradedAnswers: IGradedAnswer[] = [];
  let allSucceeded = true;
  let failureReason: string | undefined;

  for (const questionId of subjectiveQuestionIds) {
    const question = questionMap.get(questionId);
    const studentResponse = answerMap.get(questionId);

    if (!question || !studentResponse) {
      // Skip answers that don't match a question — shouldn't happen if validation is correct
      logger.warn('Skipping subjective answer: question or response not found', {
        questionId,
        hasQuestion: !!question,
        hasResponse: !!studentResponse,
      });
      continue;
    }

    try {
      const result = await gradeSubjectiveAnswer(question, studentResponse, gradingAI);

      gradedAnswers.push({
        questionId,
        score: result.score,
        maxScore: result.maxScore,
        confidence: result.confidence,
        feedback: result.feedback,
        overriddenByTeacher: false,
      });
    } catch (error) {
      allSucceeded = false;
      failureReason = error instanceof Error ? error.message : String(error);
      logger.error('Failed to grade subjective answer', {
        gradingJobId,
        submissionId,
        questionId,
        error: failureReason,
      });
      break; // Stop grading on failure — mark entire job as failed
    }
  }

  if (allSucceeded && gradedAnswers.length > 0) {
    // Persist graded answers on the submission (Requirement 13.3)
    submission.gradedAnswers = gradedAnswers;
    submission.gradingStatus = 'completed';
    await submission.save();

    // Update the grading job
    gradingJob.status = 'completed';
    gradingJob.processedCount = 1;
    gradingJob.successCount = 1;
    gradingJob.completedAt = new Date();

    // Store result in the first submission entry
    if (gradingJob.submissions.length > 0) {
      gradingJob.submissions[0].status = 'success';
      gradingJob.submissions[0].result = {
        score: gradedAnswers.reduce((sum, a) => sum + a.score, 0),
        maxScore: gradedAnswers.reduce((sum, a) => sum + a.maxScore, 0),
        confidence: gradedAnswers.reduce((sum, a) => sum + (a.confidence || 0), 0) / gradedAnswers.length,
        explanation: `Graded ${gradedAnswers.length} subjective answer(s) successfully.`,
      };
    }
    await gradingJob.save();

    // Emit completion event
    if (io) {
      const teacherId = gradingJob.teacherId.toString();
      io.to(`user_${teacherId}`).emit('grading_batch_complete', {
        jobId: gradingJobId,
        batchId: gradingJob.batchId,
        teacherId,
        totalProcessed: 1,
        successCount: 1,
        failureCount: 0,
        status: 'completed',
      });
    }

    logger.info('Subjective grading job completed', {
      gradingJobId,
      submissionId,
      gradedAnswerCount: gradedAnswers.length,
    });
  } else {
    // Mark as failed
    submission.gradingStatus = 'failed';
    await submission.save();

    gradingJob.status = 'completed_with_failures';
    gradingJob.processedCount = 1;
    gradingJob.failureCount = 1;
    gradingJob.completedAt = new Date();

    if (gradingJob.submissions.length > 0) {
      gradingJob.submissions[0].status = 'failed';
      gradingJob.submissions[0].failureReason = failureReason || 'No subjective answers graded';
    }
    await gradingJob.save();

    // Emit failure notification to the owning Teacher (Requirement 13.5)
    if (io) {
      const teacherId = gradingJob.teacherId.toString();

      // Dedicated failure notification event for the teacher
      io.to(`user_${teacherId}`).emit('grading_job_failed', {
        jobId: gradingJobId,
        submissionId,
        assessmentId,
        teacherId,
        reason: failureReason || 'No subjective answers graded',
        failedAt: new Date().toISOString(),
      });

      // Also emit the generic batch completion event for backward compatibility
      io.to(`user_${teacherId}`).emit('grading_batch_complete', {
        jobId: gradingJobId,
        batchId: gradingJob.batchId,
        teacherId,
        totalProcessed: 1,
        successCount: 0,
        failureCount: 1,
        status: 'completed_with_failures',
      });
    }

    logger.info('Subjective grading job failed', {
      gradingJobId,
      submissionId,
      reason: failureReason,
    });
  }
}

// ---------------------------------------------------------------------------
// Worker factory (original): create and return a BullMQ Worker instance
// ---------------------------------------------------------------------------

export interface GradingWorkerOptions {
  gradingAI?: IGradingAI;
  subjectiveGradingAI?: ISubjectiveGradingAI;
  io?: SocketIOServer;
  concurrency?: number;
}

/**
 * Create a BullMQ Worker for the grading queue.
 * Handles both batch file-based grading and assessment-based subjective grading.
 *
 * @param options - Optional dependencies (AI provider, Socket.IO, concurrency)
 * @returns The BullMQ Worker instance
 */
export function createGradingWorker(options: GradingWorkerOptions = {}): Worker {
  const {
    gradingAI = new GeminiGradingAI(),
    subjectiveGradingAI = new GeminiSubjectiveGradingAI(),
    io,
    concurrency = 1, // BullMQ-level concurrency (how many jobs processed at once)
  } = options;

  const worker = new Worker(
    GRADING_QUEUE_NAME,
    async (job: Job) => {
      // Determine which processor to use based on job data
      if ('submissionId' in job.data && 'subjectiveQuestionIds' in job.data) {
        // Assessment-based subjective grading job
        await processSubjectiveGradingJob(
          job as Job<SubjectiveGradingJobPayload>,
          subjectiveGradingAI,
          io,
        );
      } else {
        // Legacy batch file grading job
        await processGradingJob(
          job as Job<GradingJobPayload>,
          gradingAI,
          io,
        );
      }
    },
    {
      connection: createRedisConnection(),
      concurrency,
    },
  );

  worker.on('completed', (job) => {
    logger.info('BullMQ grading job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('BullMQ grading job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Grading worker error', { error: err.message });
  });

  return worker;
}
