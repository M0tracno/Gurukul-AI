/**
 * Unit tests: feedbackController edge cases.
 *
 * These tests exercise the HTTP-thin controller in isolation by mocking the
 * underlying `feedbackService`. The controller's contract is narrow and
 * deterministic:
 *   - it derives the actor identity from `req.user` only,
 *   - it forwards the service result inside the canonical success Envelope with
 *     the correct status code, and
 *   - it forwards any thrown error to `next` (never returning a success status
 *     when the service does not confirm the outcome).
 *
 * Mocking the service keeps the focus on that controller ↔ HTTP mapping; the
 * service business logic (scope derivation, stats computation, persistence
 * confirmation) is covered by its own property tests under `tests/property`
 * and `src/services/*.property.test.ts`.
 *
 * Coverage:
 *   - listOwn with an empty result        → 200 + empty data            (Req 7.5)
 *   - listReceived with an empty result   → 200 + empty data + zeroed
 *                                            stats { total, positive,
 *                                            needsAttention, averageRating }  (Req 8.5)
 *   - reply for an unknown feedbackId      → 404 forwarded to next       (Req 9.4)
 *   - submit on confirmed persistence      → 201 + created body          (Req 6.3, 9.5)
 *   - reply on confirmed persistence       → 201 + updated body          (Req 6.3, 9.5)
 *   - reply when persistence is not
 *     confirmed                            → error forwarded, NO 201     (Req 6.3, 9.8)
 *
 * **Validates: Requirements 6.3, 7.5, 8.5, 9.4, 9.5, 9.8**
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import type {
  FeedbackDTO,
  FeedbackStats,
} from '../../services/feedbackService.js';

// ---------------------------------------------------------------------------
// Service mock
// ---------------------------------------------------------------------------
// The controller imports `{ feedbackService }` from the service module; we
// replace that module with a mock whose methods are jest.fn()s configured
// per-test. `auditContextFrom` is exercised for real so the controller's
// req.user-only identity derivation is genuinely covered.

const feedbackServiceMock = {
  submit: jest.fn(),
  listOwn: jest.fn(),
  listReceived: jest.fn(),
  reply: jest.fn(),
  requestFeedback: jest.fn(),
};

jest.unstable_mockModule('../../services/feedbackService.js', () => ({
  feedbackService: feedbackServiceMock,
  FeedbackService: class {},
}));

// Imports deferred until after the mock is registered.
let feedbackController: typeof import('../feedbackController.js')['feedbackController'];

beforeAll(async () => {
  ({ feedbackController } = await import('../feedbackController.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Mock req / res / next helpers
// ---------------------------------------------------------------------------

interface MockRes {
  status: jest.Mock;
  json: jest.Mock;
  statusCode: number | undefined;
  body: unknown;
}

/**
 * Build a Response double that records the status code and JSON body and
 * supports the fluent `res.status(n).json(x)` chain used by the controller.
 */
function buildRes(): MockRes {
  const res: MockRes = {
    statusCode: undefined,
    body: undefined,
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

/**
 * Build an authenticated Request double. The controller reads `req.user`,
 * `req.query`, `req.body`, `req.params`, plus `req.ip`/`req.correlationId`
 * (consumed by the real `auditContextFrom`).
 */
function buildReq(overrides: Partial<Record<string, unknown>> = {}): Request {
  return {
    user: { userId: 'actor-1', role: 'teacher' },
    query: {},
    body: {},
    params: {},
    ip: '127.0.0.1',
    correlationId: 'corr-test',
    headers: {},
    ...overrides,
  } as unknown as Request;
}

const sampleFeedback: FeedbackDTO = {
  id: '507f1f77bcf86cd799439011',
  authorId: '507f1f77bcf86cd799439099',
  authorModel: 'Student',
  authorRole: 'student',
  targetType: 'teacher',
  targetId: '507f1f77bcf86cd799439022',
  rating: 5,
  comment: 'Great teacher',
  replies: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// listOwn — empty result (Requirement 7.5)
// ---------------------------------------------------------------------------
describe('feedbackController.listOwn with no authored feedback', () => {
  it('returns HTTP 200 with a success Envelope containing an empty collection', async () => {
    feedbackServiceMock.listOwn.mockResolvedValue({ data: [], total: 0 });

    const req = buildReq({ user: { userId: 'student-1', role: 'student' } });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.listOwn(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    const body = res.body as { success: boolean; data: unknown[]; meta: { total: number } };
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);

    // Author scope is derived from req.user only.
    expect(feedbackServiceMock.listOwn).toHaveBeenCalledWith('student-1', 'student', 1, 20);
  });
});

// ---------------------------------------------------------------------------
// listReceived — empty result with zeroed stats (Requirement 8.5)
// ---------------------------------------------------------------------------
describe('feedbackController.listReceived with no addressed feedback', () => {
  it('returns HTTP 200 with an empty collection and zeroed Feedback_Stats', async () => {
    const zeroedStats: FeedbackStats = {
      total: 0,
      positive: 0,
      needsAttention: 0,
      averageRating: 0,
    };
    feedbackServiceMock.listReceived.mockResolvedValue({
      data: [],
      total: 0,
      stats: zeroedStats,
    });

    const req = buildReq({ user: { userId: 'teacher-1', role: 'teacher' } });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.listReceived(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    const body = res.body as {
      success: boolean;
      data: unknown[];
      meta: { total: number; stats: FeedbackStats };
    };
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.stats).toEqual({
      total: 0,
      positive: 0,
      needsAttention: 0,
      averageRating: 0,
    });

    // Target scope is derived from req.user only.
    expect(feedbackServiceMock.listReceived).toHaveBeenCalledWith('teacher-1', 1, 20);
  });
});

// ---------------------------------------------------------------------------
// reply — unknown feedbackId (Requirement 9.4)
// ---------------------------------------------------------------------------
describe('feedbackController.reply for an unknown feedbackId', () => {
  it('forwards a 404 AppError to next and never sends a 201', async () => {
    feedbackServiceMock.reply.mockRejectedValue(
      AppError.notFound('No feedback found for id 507f1f77bcf86cd7994390ff'),
    );

    const req = buildReq({
      user: { userId: 'teacher-1', role: 'teacher' },
      params: { feedbackId: '507f1f77bcf86cd7994390ff' },
      body: { message: 'Thanks for the feedback' },
    });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.reply(req, res as unknown as Response, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledTimes(1);
    const forwarded = (next as unknown as jest.Mock).mock.calls[0][0] as AppError;
    expect(forwarded).toBeInstanceOf(AppError);
    expect(forwarded.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// submit / reply — 201 bodies on confirmed persistence (Requirements 6.3, 9.5)
// ---------------------------------------------------------------------------
describe('feedbackController write handlers on confirmed persistence', () => {
  it('submit returns HTTP 201 with the created feedback in a success Envelope', async () => {
    feedbackServiceMock.submit.mockResolvedValue(sampleFeedback);

    const req = buildReq({
      user: { userId: 'student-1', role: 'student' },
      body: {
        targetType: 'teacher',
        targetId: '507f1f77bcf86cd799439022',
        rating: 5,
        comment: 'Great teacher',
      },
    });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.submit(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);

    const body = res.body as { success: boolean; data: FeedbackDTO };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(sampleFeedback);

    // Author identity comes from req.user, not the body.
    expect(feedbackServiceMock.submit).toHaveBeenCalledWith(
      'student-1',
      'student',
      expect.objectContaining({ targetType: 'teacher', rating: 5 }),
      expect.objectContaining({ userId: 'student-1', role: 'student' }),
    );
  });

  it('reply returns HTTP 201 with the updated feedback in a success Envelope', async () => {
    const replied: FeedbackDTO = {
      ...sampleFeedback,
      replies: [
        {
          id: 'reply-1',
          responderId: '507f1f77bcf86cd799439022',
          responderModel: 'Faculty',
          message: 'Thank you',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    };
    feedbackServiceMock.reply.mockResolvedValue(replied);

    const req = buildReq({
      user: { userId: '507f1f77bcf86cd799439022', role: 'teacher' },
      params: { feedbackId: sampleFeedback.id },
      body: { message: 'Thank you' },
    });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.reply(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);

    const body = res.body as { success: boolean; data: FeedbackDTO };
    expect(body.success).toBe(true);
    expect(body.data.replies).toHaveLength(1);

    // Responder identity comes from req.user only.
    expect(feedbackServiceMock.reply).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439022',
      sampleFeedback.id,
      'Thank you',
      expect.objectContaining({ userId: '507f1f77bcf86cd799439022' }),
    );
  });
});

// ---------------------------------------------------------------------------
// reply — persistence not confirmed (Requirements 6.3, 9.8)
// ---------------------------------------------------------------------------
describe('feedbackController.reply when persistence is not confirmed', () => {
  it('forwards the error and does NOT return HTTP 201', async () => {
    // The service throws when the write is not confirmed (findOneAndUpdate
    // returned null); the controller must surface that error instead of a 201.
    feedbackServiceMock.reply.mockRejectedValue(
      AppError.internal('Failed to persist feedback reply'),
    );

    const req = buildReq({
      user: { userId: 'teacher-1', role: 'teacher' },
      params: { feedbackId: sampleFeedback.id },
      body: { message: 'Thank you' },
    });
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;

    await feedbackController.reply(req, res as unknown as Response, next);

    // No success status / body was sent.
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // The failure was forwarded to the global error handler chain.
    expect(next).toHaveBeenCalledTimes(1);
    const forwarded = (next as unknown as jest.Mock).mock.calls[0][0] as AppError;
    expect(forwarded).toBeInstanceOf(AppError);
    expect(forwarded.statusCode).toBe(500);
  });
});
