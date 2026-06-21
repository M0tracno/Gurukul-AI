/**
 * Unit tests for {@link messageController} edge cases (Task 3.12).
 *
 * The controller is HTTP-thin and delegates to {@link messageService}, so these
 * tests drive the real service against an in-memory MongoDB (mongodb-memory-server)
 * through the controller's mock `req`/`res`/`next`. This exercises the genuine
 * 404/403/all-deleted/empty/failure-path logic rather than a stubbed service.
 * `messagingRbac.validateMessagingPermission` is mocked so the send-permission
 * outcome is controllable, and `auditService.logEvent` is spied to assert audit
 * entries are written on send and delete.
 *
 * Covers:
 *  - markRead / softDelete unknown id -> 404 (Requirements 4.5, 5.4)
 *  - non-recipient marking an unknown id -> 403, auth-before-existence (Req 4.3)
 *  - getThread distinguishes all-deleted (conversationExists true) from
 *    non-existent (conversationExists false) (Requirements 2.6, 2.7)
 *  - empty conversation list -> 200 with empty data (Requirement 1.7)
 *  - audit entry written on send and delete (Requirements 3.6, 5.5)
 *  - softDelete failure-path: throws rather than returning success (Req 5.10)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the Winston logger to avoid import.meta.url resolution under ts-jest ESM.
jest.unstable_mockModule('../utils/logger.js', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the messaging-permission helper so `send` permission is controllable
// without seeding the full Course/Enrollment/relation graph.
const mockValidateMessagingPermission =
  jest.fn<() => Promise<{ allowed: boolean; reason?: string }>>();
jest.unstable_mockModule('../realtime/messagingRbac.js', () => ({
  __esModule: true,
  validateMessagingPermission: mockValidateMessagingPermission,
}));

const { messageController } = await import('./messageController.js');
const { messageService } = await import('../services/messageService.js');
const { auditService } = await import('../services/auditService.js');
const Message = (await import('../models/Message.js')).default;
const Faculty = (await import('../models/Faculty.js')).default;
const Parent = (await import('../models/Parent.js')).default;
const Student = (await import('../models/Student.js')).default;
const AuditLog = (await import('../models/AuditLog.js')).default;

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([Message.deleteMany({}), AuditLog.deleteMany({})]);
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface MockRes extends Response {
  statusCode?: number;
  body?: unknown;
}

/** Minimal Express `Response` capturing the status code and JSON body. */
function mockRes(): MockRes {
  const res = {} as MockRes;
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as Response['status'];
  res.json = jest.fn((payload: unknown) => {
    res.body = payload;
    return res;
  }) as unknown as Response['json'];
  return res;
}

/** Build a mock authenticated request with the fields the controller reads. */
function mockReq(opts: {
  userId: string;
  role: string;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}): Request {
  return {
    user: { userId: opts.userId, role: opts.role },
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
    ip: '203.0.113.7',
    headers: {},
    correlationId: 'corr-test-1',
  } as unknown as Request;
}

/** Seed a single Parent <-> Faculty message and return the relevant ids. */
async function seedMessage(
  overrides: Partial<{ isDeleted: boolean; conversationId: string }> = {},
): Promise<{
  messageId: string;
  conversationId: string;
  parentId: Types.ObjectId;
  facultyId: Types.ObjectId;
  studentId: Types.ObjectId;
}> {
  const parentId = new Types.ObjectId();
  const facultyId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const conversationId =
    overrides.conversationId ?? `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

  const created = await Message.create({
    conversationId,
    subject: 'Subject',
    content: 'Content',
    senderId: parentId,
    senderModel: 'Parent',
    senderName: 'Parent Name',
    recipientId: facultyId,
    recipientModel: 'Faculty',
    recipientName: 'Faculty Name',
    studentId,
    studentName: 'Student Name',
    isRead: false,
    isDeleted: overrides.isDeleted ?? false,
  });

  return { messageId: String(created._id), conversationId, parentId, facultyId, studentId };
}

// ---------------------------------------------------------------------------
// markRead / softDelete unknown id -> 404 (Requirements 4.5, 5.4)
// ---------------------------------------------------------------------------

describe('messageController unknown-id handling', () => {
  it('markRead returns 404 when the id matches no message and authorization does not otherwise fail (Req 4.5)', async () => {
    // An admin is authorized as recipient against the placeholder, so the
    // request falls through to the not-found check rather than 403.
    const unknownId = new Types.ObjectId().toString();
    const req = mockReq({ userId: 'admin-1', role: 'admin', params: { messageId: unknownId } });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.markRead(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ statusCode: 404 });
  });

  it('softDelete returns 404 when the id matches no message (Req 5.4)', async () => {
    const unknownId = new Types.ObjectId().toString();
    const req = mockReq({ userId: 'parent-1', role: 'parent', params: { messageId: unknownId } });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.remove(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ statusCode: 404 });
  });

  it('markRead returns 403 for a non-recipient even when the id matches no message (auth before existence, Req 4.3)', async () => {
    const unknownId = new Types.ObjectId().toString();
    const req = mockReq({ userId: 'teacher-1', role: 'teacher', params: { messageId: unknownId } });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.markRead(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});

// ---------------------------------------------------------------------------
// getThread: all-deleted vs non-existent distinctness (Requirements 2.6, 2.7)
// ---------------------------------------------------------------------------

describe('messageController getThread existence vs emptiness', () => {
  it('returns 200 with empty data and conversationExists=true when the conversation exists but all messages are deleted (Req 2.7)', async () => {
    const { conversationId, parentId } = await seedMessage({ isDeleted: true });

    const req = mockReq({
      userId: parentId.toString(),
      role: 'parent',
      params: { conversationId },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.getThread(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      data: [],
      meta: { total: 0, conversationExists: true },
    });
  });

  it('returns 200 with empty data and conversationExists=false for a non-existent conversation (Req 2.6)', async () => {
    const missingConversationId = `parent_${new Types.ObjectId()}_teacher_${new Types.ObjectId()}_student_${new Types.ObjectId()}`;

    const req = mockReq({
      userId: new Types.ObjectId().toString(),
      role: 'parent',
      params: { conversationId: missingConversationId },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.getThread(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      data: [],
      meta: { total: 0, conversationExists: false },
    });
  });
});

// ---------------------------------------------------------------------------
// Empty conversation list -> 200 empty (Requirement 1.7)
// ---------------------------------------------------------------------------

describe('messageController getConversations empty result', () => {
  it('returns 200 with an empty collection when the user has no conversations (Req 1.7)', async () => {
    const req = mockReq({ userId: new Types.ObjectId().toString(), role: 'teacher' });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.getConversations(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      data: [],
      meta: { total: 0 },
    });
    expect((res.body as { data: unknown[] }).data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Audit entry written on send and delete (Requirements 3.6, 5.5)
// ---------------------------------------------------------------------------

describe('messageController audit on send and delete', () => {
  it('writes a message_sent audit entry and returns 201 on a confirmed send (Req 3.6)', async () => {
    mockValidateMessagingPermission.mockResolvedValue({ allowed: true });

    // Seed name-resolution records (bypassing schema validation) for the
    // parent sender, faculty recipient, and student subject.
    const parentId = new Types.ObjectId();
    const facultyId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    await Promise.all([
      Parent.collection.insertOne({ _id: parentId, firstName: 'Pat', lastName: 'Parent' }),
      Faculty.collection.insertOne({ _id: facultyId, firstName: 'Fay', lastName: 'Faculty' }),
      Student.collection.insertOne({ _id: studentId, firstName: 'Sam', lastName: 'Student' }),
    ]);

    const auditSpy = jest
      .spyOn(auditService, 'logEvent')
      .mockResolvedValue(undefined);

    const req = mockReq({
      userId: parentId.toString(),
      role: 'parent',
      body: {
        subject: 'Hello',
        content: 'A message body',
        recipientId: facultyId.toString(),
        recipientModel: 'Faculty',
        studentId: studentId.toString(),
      },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.send(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toMatchObject({ success: true, data: { subject: 'Hello' } });

    const createdId = (res.body as { data: { id: string } }).data.id;
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy.mock.calls[0][0]).toMatchObject({
      action: 'message_sent',
      resource: 'message',
      resourceId: createdId,
    });

    auditSpy.mockRestore();
  });

  it('writes a message_deleted audit entry and returns 200 on a confirmed delete (Req 5.5)', async () => {
    const { messageId, parentId } = await seedMessage();

    const auditSpy = jest
      .spyOn(auditService, 'logEvent')
      .mockResolvedValue(undefined);

    const req = mockReq({
      userId: parentId.toString(),
      role: 'parent',
      params: { messageId },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.remove(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy.mock.calls[0][0]).toMatchObject({
      action: 'message_deleted',
      resource: 'message',
      resourceId: messageId,
    });

    auditSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// softDelete failure-path persistence (Requirement 5.10)
// ---------------------------------------------------------------------------

describe('messageController softDelete failure path', () => {
  it('does not return 200 and forwards an error when the soft-delete write is not confirmed (Req 5.10)', async () => {
    const { messageId, parentId } = await seedMessage();

    // Simulate an unconfirmed persistence: the saved document reports the
    // soft-delete flags as unset, so the service must throw instead of
    // reporting success.
    const saveSpy = jest
      .spyOn(Message.prototype, 'save')
      .mockResolvedValueOnce({ isDeleted: false, deletedAt: undefined } as never);

    const req = mockReq({
      userId: parentId.toString(),
      role: 'parent',
      params: { messageId },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await messageController.remove(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(200);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ statusCode: 500 });

    saveSpy.mockRestore();
  });
});
