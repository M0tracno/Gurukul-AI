/**
 * Integration tests for the admin-management rate limiter and failed-auth
 * audit logging bundle (`adminManagementRateLimit`).
 *
 * Verifies the two security behaviours from Requirements 1.6 and 9.4:
 *   1. `auditService.logFailedAuth` is invoked when a protected endpoint
 *      responds 401 (failed authentication), so enumeration/brute-force
 *      attempts are recorded.
 *   2. Repeated failing requests from a single source engage the strict
 *      per-IP limiter and are eventually rejected with HTTP 429.
 *
 * Uses supertest against a minimal in-memory Express app mounting the real
 * `adminManagementRateLimit` chain. `auditService` and `logger` are mocked
 * (ESM `unstable_mockModule`) so we can assert the audit call without a DB,
 * and the `finish` hook's fire-and-forget audit write is observable.
 *
 * _Requirements: 1.6, 9.4_
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';

// Mock the audit service so we can assert `logFailedAuth` is invoked without
// touching the database. The middleware fires it as fire-and-forget, so it
// must resolve.
const mockLogFailedAuth = jest
  .fn<
    (
      userId: string,
      role: string,
      ip: string,
      correlationId: string,
      reason: string,
    ) => Promise<void>
  >()
  .mockResolvedValue(undefined);
jest.unstable_mockModule('../services/auditService.js', () => ({
  auditService: {
    logFailedAuth: mockLogFailedAuth,
  },
}));

// Mock logger to avoid import.meta.url issues in ts-jest and suppress noise.
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Dynamic import after mocks are registered.
const { adminManagementRateLimit } = await import('./rateLimiter.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal app that mounts the real rate-limit + audit bundle in front
 * of handlers that deterministically fail, so the limiter and audit hook are
 * exercised in isolation.
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  // A protected endpoint that always fails authentication with 401.
  app.get(
    '/protected',
    ...adminManagementRateLimit,
    (_req: Request, res: Response) => {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'no token' });
    },
  );

  // A password-reset style endpoint that fails (404 for a missing account).
  app.post(
    '/students/:id/password-reset',
    ...adminManagementRateLimit,
    (_req: Request, res: Response) => {
      res.status(404).json({ error: 'NOT_FOUND', message: 'no such account' });
    },
  );

  return app;
}

/** Wait a tick so the response `finish` hook's async audit write can run. */
async function flushFinishHook(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('adminManagementRateLimit integration', () => {
  beforeEach(() => {
    mockLogFailedAuth.mockClear();
  });

  it('invokes auditService.logFailedAuth on a 401 response', async () => {
    const app = createTestApp();

    await request(app).get('/protected').expect(401);
    await flushFinishHook();

    expect(mockLogFailedAuth).toHaveBeenCalledTimes(1);
    // Signature: (userId, role, ip, correlationId, reason)
    const call = mockLogFailedAuth.mock.calls[0]!;
    expect(call[0]).toBe('anonymous'); // userId
    expect(call[1]).toBe('anonymous'); // role
    expect(typeof call[2]).toBe('string'); // ip is resolved to a string
    expect(call[2]!.length).toBeGreaterThan(0);
    expect(call[4]).toBe('failed_authentication'); // reason
  });

  it('invokes auditService.logFailedAuth on a failed password-reset attempt', async () => {
    const app = createTestApp();

    await request(app).post('/students/missing/password-reset').expect(404);
    await flushFinishHook();

    expect(mockLogFailedAuth).toHaveBeenCalledTimes(1);
    const reason = mockLogFailedAuth.mock.calls[0]![4];
    expect(reason).toBe('failed_password_reset:404');
  });

  it('engages the limiter (429) after repeated failures from one source', async () => {
    const app = createTestApp();

    // The strict limiter allows 10 failures per IP per window; send well past
    // that so a 429 is guaranteed regardless of any residual window state.
    const statuses: number[] = [];
    for (let i = 0; i < 13; i += 1) {
      const res = await request(app).get('/protected');
      statuses.push(res.status);
    }

    const rateLimited = statuses.filter((s) => s === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // The first responses are the underlying 401s before the limit trips.
    expect(statuses[0]).toBe(401);
    // Once limited, subsequent requests are short-circuited with 429.
    expect(statuses[statuses.length - 1]).toBe(429);
  });
});
