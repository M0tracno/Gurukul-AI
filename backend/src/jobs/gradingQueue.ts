import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

export const GRADING_QUEUE_NAME = 'ai-grading';

/**
 * BullMQ queue for AI grading jobs.
 *
 * Default job options:
 * - attempts: 3 (retry up to 3 times on failure)
 * - backoff: exponential starting at 1s, capped at 30s
 * - removeOnComplete: keep completed jobs for 24 hours (86400s)
 * - removeOnFail: keep failed jobs for 7 days (604800s)
 */
export const gradingQueue = new Queue(GRADING_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 },   // keep completed jobs for 24h
    removeOnFail: { age: 604800 },      // keep failed jobs for 7 days
  },
});
