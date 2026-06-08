import { Worker, Job } from 'bullmq';
import { Server as SocketIOServer } from 'socket.io';
import { createRedisConnection } from '../config/redis.js';
import { GRADING_QUEUE_NAME } from './gradingQueue.js';
import GradingJob, { type IGradingJob, type IGradingSubmission } from '../models/GradingJob.js';
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
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Job payload type
// ---------------------------------------------------------------------------

export interface GradingJobPayload {
  gradingJobId: string;
  concurrency?: number;
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

export interface GradingWorkerOptions {
  gradingAI?: IGradingAI;
  io?: SocketIOServer;
  concurrency?: number;
}

/**
 * Create a BullMQ Worker for the grading queue.
 *
 * @param options - Optional dependencies (AI provider, Socket.IO, concurrency)
 * @returns The BullMQ Worker instance
 */
export function createGradingWorker(options: GradingWorkerOptions = {}): Worker<GradingJobPayload> {
  const {
    gradingAI = new GeminiGradingAI(),
    io,
    concurrency = 1, // BullMQ-level concurrency (how many jobs processed at once)
  } = options;

  const worker = new Worker<GradingJobPayload>(
    GRADING_QUEUE_NAME,
    async (job: Job<GradingJobPayload>) => {
      await processGradingJob(job, gradingAI, io);
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
