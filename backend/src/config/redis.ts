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
 * Create a new Redis connection instance configured for BullMQ.
 *
 * @returns A new Redis connection instance.
 */
export function createRedisConnection(): Redis {
  const { url, options } = getRedisOptions();

  if (url) {
    return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
  }

  return new Redis(options);
}
