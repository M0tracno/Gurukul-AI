import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { redisConfig } from '../config/redis.js';

/**
 * Health check endpoint.
 *
 * Reports the connectivity status of each dependent service:
 * - database (MongoDB)
 * - cache (Redis)
 * - externalApi (placeholder for external API checks, e.g., Google Gemini)
 *
 * Each service reports one of: "connected", "degraded", or "disconnected".
 * A connectivity check that exceeds 5 seconds results in "disconnected".
 *
 * Validates: Requirements 11.4, 11.8
 */

export type ServiceStatus = 'connected' | 'degraded' | 'disconnected';

export interface ServiceHealthResult {
  status: ServiceStatus;
  responseTimeMs?: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealthResult;
    cache: ServiceHealthResult;
    externalApi: ServiceHealthResult;
  };
}

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the given timeout, it rejects with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} health check timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Check MongoDB connectivity by pinging the database.
 */
export async function checkDatabase(): Promise<ServiceHealthResult> {
  const start = Date.now();

  try {
    const readyState = mongoose.connection.readyState;

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState === 0 || readyState === 3) {
      return { status: 'disconnected', responseTimeMs: Date.now() - start };
    }

    if (readyState === 2) {
      return { status: 'degraded', responseTimeMs: Date.now() - start };
    }

    // readyState === 1 — attempt a ping to confirm actual connectivity
    await withTimeout(
      mongoose.connection.db!.admin().ping(),
      HEALTH_CHECK_TIMEOUT_MS,
      'Database',
    );

    const responseTimeMs = Date.now() - start;

    // If response is slow (>2s but within timeout), report degraded
    if (responseTimeMs > 2000) {
      return { status: 'degraded', responseTimeMs };
    }

    return { status: 'connected', responseTimeMs };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timed out')) {
      return { status: 'disconnected', responseTimeMs, error: message };
    }

    return { status: 'disconnected', responseTimeMs, error: message };
  }
}

/**
 * Check Redis connectivity by issuing a PING command.
 */
export async function checkRedis(): Promise<ServiceHealthResult> {
  const start = Date.now();
  let client: Redis | null = null;

  try {
    client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      connectTimeout: HEALTH_CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry during health checks
      lazyConnect: true,
      enableReadyCheck: false,
    });

    await withTimeout(client.connect(), HEALTH_CHECK_TIMEOUT_MS, 'Redis connect');

    const pong = await withTimeout(client.ping(), HEALTH_CHECK_TIMEOUT_MS, 'Redis ping');

    const responseTimeMs = Date.now() - start;

    if (pong !== 'PONG') {
      return { status: 'degraded', responseTimeMs };
    }

    // If response is slow (>2s but within timeout), report degraded
    if (responseTimeMs > 2000) {
      return { status: 'degraded', responseTimeMs };
    }

    return { status: 'connected', responseTimeMs };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timed out')) {
      return { status: 'disconnected', responseTimeMs, error: message };
    }

    return { status: 'disconnected', responseTimeMs, error: message };
  } finally {
    if (client) {
      try {
        client.disconnect();
      } catch {
        // Ignore disconnect errors during health check cleanup
      }
    }
  }
}

/**
 * Check external API connectivity.
 * Uses the EXTERNAL_API_HEALTH_URL env var if set; otherwise defaults
 * to a basic connectivity check against Google's Gemini API endpoint.
 */
export async function checkExternalApi(): Promise<ServiceHealthResult> {
  const start = Date.now();
  const url = process.env.EXTERNAL_API_HEALTH_URL || 'https://generativelanguage.googleapis.com';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - start;

    // Any response (even 4xx) means the service is reachable
    if (response.ok || response.status < 500) {
      if (responseTimeMs > 2000) {
        return { status: 'degraded', responseTimeMs };
      }
      return { status: 'connected', responseTimeMs };
    }

    // 5xx means the service is up but having issues
    return { status: 'degraded', responseTimeMs };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('abort') || message.includes('timed out') || responseTimeMs >= HEALTH_CHECK_TIMEOUT_MS) {
      return { status: 'disconnected', responseTimeMs, error: 'Health check timed out' };
    }

    return { status: 'disconnected', responseTimeMs, error: message };
  }
}

/**
 * Determine overall health status from individual service statuses.
 */
export function determineOverallStatus(
  services: HealthCheckResponse['services'],
): HealthCheckResponse['status'] {
  const statuses = Object.values(services).map((s) => s.status);

  if (statuses.every((s) => s === 'connected')) {
    return 'healthy';
  }

  if (statuses.some((s) => s === 'disconnected')) {
    // If the database is disconnected, the whole system is unhealthy
    if (services.database.status === 'disconnected') {
      return 'unhealthy';
    }
    return 'degraded';
  }

  return 'degraded';
}

const router = Router();

/**
 * GET /health
 *
 * Returns service status for database, cache, and external APIs.
 * Each service is checked with a 5-second timeout.
 */
router.get('/', async (_req: Request, res: Response) => {
  const [database, cache, externalApi] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalApi(),
  ]);

  const services = { database, cache, externalApi };
  const overallStatus = determineOverallStatus(services);

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  };

  // Return 200 for healthy/degraded, 503 for unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json(response);
});

export default router;
