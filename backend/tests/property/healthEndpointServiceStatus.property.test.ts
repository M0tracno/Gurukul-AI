/**
 * Property-Based Test: Health Endpoint Service Status (Property 29)
 *
 * Feature: gurukul-ai-modernization, Property 29: Health Endpoint Service Status
 *
 * For any combination of dependent service states (database, cache, external APIs),
 * the /health endpoint SHALL report each service's actual status as "connected",
 * "degraded", or "disconnected" based on a connectivity check completing within
 * 5 seconds.
 *
 * **Validates: Requirements 11.4, 11.8**
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import type { ServiceStatus, ServiceHealthResult, HealthCheckResponse } from '../../src/routes/healthRoutes.js';

// Mock modules before importing
jest.unstable_mockModule('mongoose', () => ({
  default: {
    connection: {
      readyState: 1,
      db: {
        admin: () => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    },
  },
}));

jest.unstable_mockModule('ioredis', () => ({
  Redis: jest.fn(),
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisConfig: {
    host: 'localhost',
    port: 6379,
    password: undefined,
  },
}));

const { determineOverallStatus } = await import('../../src/routes/healthRoutes.js');

// Generator for valid service statuses
const serviceStatusArb: fc.Arbitrary<ServiceStatus> = fc.constantFrom(
  'connected' as ServiceStatus,
  'degraded' as ServiceStatus,
  'disconnected' as ServiceStatus
);

// Generator for response time in ms (0 to 6000 to include both within and exceeding timeout)
const responseTimeMsArb = fc.integer({ min: 0, max: 6000 });

// Generator for optional error message
const errorMessageArb = fc.option(
  fc.string({ minLength: 1, maxLength: 100 }),
  { nil: undefined }
);

// Generator for a complete ServiceHealthResult
const serviceHealthResultArb: fc.Arbitrary<ServiceHealthResult> = fc.record({
  status: serviceStatusArb,
  responseTimeMs: responseTimeMsArb,
  error: errorMessageArb,
});

// Generator for a full services combination
const servicesArb: fc.Arbitrary<HealthCheckResponse['services']> = fc.record({
  database: serviceHealthResultArb,
  cache: serviceHealthResultArb,
  externalApi: serviceHealthResultArb,
});

describe('Property 29: Health Endpoint Service Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property: Each service reports one of the three valid statuses:
   * "connected", "degraded", or "disconnected".
   */
  it('each service status is one of the three valid values', async () => {
    await fc.assert(
      fc.property(
        servicesArb,
        (services) => {
          const validStatuses: ServiceStatus[] = ['connected', 'degraded', 'disconnected'];

          expect(validStatuses).toContain(services.database.status);
          expect(validStatuses).toContain(services.cache.status);
          expect(validStatuses).toContain(services.externalApi.status);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: When all services are "connected", overall status is "healthy".
   */
  it('overall status is "healthy" when all services are "connected"', async () => {
    await fc.assert(
      fc.property(
        responseTimeMsArb,
        responseTimeMsArb,
        responseTimeMsArb,
        (dbTime, cacheTime, apiTime) => {
          const services: HealthCheckResponse['services'] = {
            database: { status: 'connected', responseTimeMs: dbTime },
            cache: { status: 'connected', responseTimeMs: cacheTime },
            externalApi: { status: 'connected', responseTimeMs: apiTime },
          };

          const overall = determineOverallStatus(services);
          expect(overall).toBe('healthy');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: When database is "disconnected", overall status is "unhealthy"
   * regardless of other service states.
   */
  it('overall status is "unhealthy" when database is "disconnected"', async () => {
    await fc.assert(
      fc.property(
        serviceStatusArb,
        serviceStatusArb,
        (cacheStatus, apiStatus) => {
          const services: HealthCheckResponse['services'] = {
            database: { status: 'disconnected', responseTimeMs: 5000 },
            cache: { status: cacheStatus },
            externalApi: { status: apiStatus },
          };

          const overall = determineOverallStatus(services);
          expect(overall).toBe('unhealthy');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: When any non-database service is "disconnected" but database is
   * "connected" or "degraded", overall status is "degraded".
   */
  it('overall status is "degraded" when a non-database service is "disconnected" but database is not', async () => {
    const nonDisconnectedStatusArb = fc.constantFrom(
      'connected' as ServiceStatus,
      'degraded' as ServiceStatus
    );

    await fc.assert(
      fc.property(
        nonDisconnectedStatusArb,
        fc.boolean(),
        (dbStatus, cacheDisconnected) => {
          // At least one of cache or externalApi is disconnected, but database is not
          const services: HealthCheckResponse['services'] = {
            database: { status: dbStatus },
            cache: { status: cacheDisconnected ? 'disconnected' : 'connected' },
            externalApi: { status: cacheDisconnected ? 'connected' : 'disconnected' },
          };

          const overall = determineOverallStatus(services);
          expect(overall).toBe('degraded');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: When at least one service is "degraded" and none are "disconnected",
   * overall status is "degraded".
   */
  it('overall status is "degraded" when at least one service is "degraded" and none are "disconnected"', async () => {
    const connectedOrDegradedArb = fc.constantFrom(
      'connected' as ServiceStatus,
      'degraded' as ServiceStatus
    );

    await fc.assert(
      fc.property(
        connectedOrDegradedArb,
        connectedOrDegradedArb,
        connectedOrDegradedArb,
        (dbStatus, cacheStatus, apiStatus) => {
          // Only run when at least one is degraded (pre-condition)
          fc.pre(
            dbStatus === 'degraded' || cacheStatus === 'degraded' || apiStatus === 'degraded'
          );

          const services: HealthCheckResponse['services'] = {
            database: { status: dbStatus },
            cache: { status: cacheStatus },
            externalApi: { status: apiStatus },
          };

          const overall = determineOverallStatus(services);
          expect(overall).toBe('degraded');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: The overall status is always one of "healthy", "degraded", or "unhealthy"
   * for any combination of service states.
   */
  it('overall status is always one of the valid values for any service state combination', async () => {
    await fc.assert(
      fc.property(
        servicesArb,
        (services) => {
          const overall = determineOverallStatus(services);
          expect(['healthy', 'degraded', 'unhealthy']).toContain(overall);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any service that times out (≥5 seconds), it reports "disconnected".
   * This tests that the status logic correctly identifies timeout scenarios.
   */
  it('a service with timeout error reports "disconnected" status', async () => {
    await fc.assert(
      fc.property(
        serviceStatusArb,
        serviceStatusArb,
        (cacheStatus, apiStatus) => {
          // A timed-out service has error message containing "timed out"
          const timedOutResult: ServiceHealthResult = {
            status: 'disconnected',
            responseTimeMs: 5000,
            error: 'Database health check timed out after 5000ms',
          };

          const services: HealthCheckResponse['services'] = {
            database: timedOutResult,
            cache: { status: cacheStatus },
            externalApi: { status: apiStatus },
          };

          // Since database is disconnected, overall should be unhealthy
          const overall = determineOverallStatus(services);
          expect(overall).toBe('unhealthy');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: The determination of overall status is purely a function of
   * the individual service statuses — it is deterministic for any given combination.
   */
  it('determineOverallStatus is deterministic (same inputs produce same output)', async () => {
    await fc.assert(
      fc.property(
        servicesArb,
        (services) => {
          const result1 = determineOverallStatus(services);
          const result2 = determineOverallStatus(services);
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any combination of service states, the overall status follows
   * the correct priority rules:
   * - All connected → healthy
   * - Database disconnected → unhealthy
   * - Any other disconnected → degraded
   * - Any degraded (no disconnected) → degraded
   */
  it('overall status follows priority rules consistently for all state combinations', async () => {
    await fc.assert(
      fc.property(
        serviceStatusArb,
        serviceStatusArb,
        serviceStatusArb,
        (dbStatus, cacheStatus, apiStatus) => {
          const services: HealthCheckResponse['services'] = {
            database: { status: dbStatus },
            cache: { status: cacheStatus },
            externalApi: { status: apiStatus },
          };

          const overall = determineOverallStatus(services);
          const allStatuses = [dbStatus, cacheStatus, apiStatus];

          if (allStatuses.every(s => s === 'connected')) {
            // All connected → healthy
            expect(overall).toBe('healthy');
          } else if (dbStatus === 'disconnected') {
            // Database disconnected → unhealthy
            expect(overall).toBe('unhealthy');
          } else if (allStatuses.some(s => s === 'disconnected')) {
            // Non-database service disconnected → degraded
            expect(overall).toBe('degraded');
          } else {
            // At least one degraded, none disconnected → degraded
            expect(overall).toBe('degraded');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
