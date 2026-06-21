import { Redis } from 'ioredis';

/**
 * Redis connection configuration for BullMQ.
 *
 * Environment variables:
 * - REDIS_URL: Full Redis connection URL (takes precedence over individual settings)
 * - REDIS_HOST: Redis host (default: 'localhost')
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 *
 * Note: maxRetriesPerRequest is set to null as required by BullMQ.
 * enableReadyCheck is disabled for BullMQ compatibility.
 */

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
}

/**
 * Exported Redis config object for use by other modules that need
 * raw connection parameters (e.g., health checks).
 */
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

/**
 * Parse Redis connection options from environment variables.
 * REDIS_URL takes precedence over individual host/port/password settings.
 */
export function getRedisOptions(): { url?: string; options: RedisConnectionOptions } {
  const url = process.env.REDIS_URL;

  if (url) {
    return {
      url,
      options: {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    };
  }

  return {
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
  };
}

/**
 * Detect whether we are running inside the Jest test environment.
 * True when NODE_ENV is 'test' or when Jest sets JEST_WORKER_ID.
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Test-only ioredis overrides.
 *
 * Importing the route graph eagerly constructs the BullMQ queue
 * (see jobs/gradingQueue.ts), which would otherwise open a Redis
 * connection that retries ECONNREFUSED forever when no Redis server
 * is running — keeping the Node event loop alive and forcing tests to
 * rely on `--forceExit`.
 *
 * Under test we therefore:
 * - `lazyConnect: true`  → do not connect on instantiation (so merely
 *   importing the queue never opens a socket)
 * - `retryStrategy: () => null` and `maxRetriesPerRequest: 0` → if a
 *   command ever does trigger a connect, fail fast instead of looping
 * - `enableOfflineQueue: false` → reject commands immediately rather
 *   than buffering them while (never) connecting
 *
 * Production behavior is unaffected.
 */
const TEST_CONNECTION_OVERRIDES = {
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: () => null,
} as const;

/**
 * Create a new Redis connection instance configured for BullMQ.
 *
 * @returns A new Redis connection instance.
 */
export function createRedisConnection(): Redis {
  const { url, options } = getRedisOptions();
  const testOverrides = isTestEnvironment() ? TEST_CONNECTION_OVERRIDES : {};

  if (url) {
    return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false, ...testOverrides });
  }

  return new Redis({ ...options, ...testOverrides });
}
