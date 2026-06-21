import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Increase timeout for Socket.IO-based integration tests
jest.setTimeout(30000);

/**
 * Integration tests for WebRTC signaling flow.
 *
 * Tests the complete signaling lifecycle:
 * - Joining a PTM room (with authorization)
 * - Exchanging offer/answer/ICE candidates
 * - Leaving/disconnecting from a PTM room
 * - Unauthorized access denial
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const mockValidateAccessToken = jest.fn<(token: string) => Promise<{ userId: string; role: string; iat: number; exp: number }>>();

jest.unstable_mockModule('../services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Message model (needed by socketManager)
const mockFind = jest.fn().mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) });
jest.unstable_mockModule('../models/Message.js', () => ({
  default: {
    find: mockFind,
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

// Mock messageHandler (needed by socketManager)
jest.unstable_mockModule('./messageHandler.js', () => ({
  setupMessageHandlers: jest.fn(),
}));

// Mock messagingRbac (needed by socketManager)
jest.unstable_mockModule('./messagingRbac.js', () => ({
  canJoin: jest.fn().mockReturnValue({ allowed: true }),
  canPost: jest.fn().mockReturnValue({ allowed: true }),
  resolveChannelType: jest.fn().mockReturnValue('parent_teacher'),
  validateMessagingPermission: jest.fn<() => Promise<{ allowed: boolean }>>().mockResolvedValue({ allowed: true }),
  CHANNEL_ROLE_PAIRS: {
    parent_teacher: ['parent', 'teacher'],
    teacher_student: ['teacher', 'student'],
    teacher_admin: ['teacher', 'admin'],
  },
  ALL_CHANNEL_TYPES: ['parent_teacher', 'teacher_student', 'teacher_admin'],
}));

// Mock envelope utilities
jest.unstable_mockModule('../utils/envelope.js', () => ({
  failure: jest.fn((message: string, details?: unknown[]) => ({
    success: false,
    message,
    ...(details && { details }),
  })),
}));

// Dynamic imports after mocks
const { createSocketManager } = await import('./socketManager.js');
const PTMModule = await import('../models/PTM.js');
const PTM = PTMModule.default;
type PTMStatus = import('../models/PTM.js').PTMStatus;

// ─── Test Setup ──────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-webrtc-secret';

let mongoServer: MongoMemoryServer;
let httpServer: http.Server;
let socketManager: ReturnType<typeof createSocketManager>;
let TEST_PORT: number;

// Track all connected clients for cleanup
let activeClients: ClientSocket[] = [];

function generateTestToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
}

function connectClient(userId: string, role: string): ClientSocket {
  const token = generateTestToken(userId, role);
  mockValidateAccessToken.mockResolvedValueOnce({
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  });

  const client = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token },
    transports: ['websocket'],
  });
  activeClients.push(client);
  return client;
}

async function createTestPTM(overrides: {
  teacherId: Types.ObjectId;
  parentId: Types.ObjectId;
  studentId?: Types.ObjectId;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  status?: PTMStatus;
}) {
  const now = new Date();
  return PTM.create({
    teacherId: overrides.teacherId,
    parentId: overrides.parentId,
    studentId: overrides.studentId ?? new Types.ObjectId(),
    scheduledStart: overrides.scheduledStart ?? new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
    scheduledEnd: overrides.scheduledEnd ?? new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
    status: overrides.status ?? 'active',
    participants: [overrides.teacherId, overrides.parentId],
    recordingEnabled: false,
  });
}

/**
 * Helper: waits for a client to connect, joins the PTM room, and resolves
 * once the client has received `ptm_joined`.
 */
function waitForJoin(client: ClientSocket, ptmId: string): Promise<void> {
  return new Promise<void>((resolve) => {
    client.on('ptm_joined', () => {
      resolve();
    });

    if (client.connected) {
      client.emit('ptm_join', { ptmId });
    } else {
      client.on('connect', () => {
        client.emit('ptm_join', { ptmId });
      });
    }
  });
}

/**
 * Helper: connects two clients and waits until both have joined the PTM room.
 * Returns a promise that resolves once both clients have received `ptm_joined`.
 */
function joinBothClients(
  ptmId: string,
  client1: ClientSocket,
  client2: ClientSocket
): Promise<void> {
  return Promise.all([waitForJoin(client1, ptmId), waitForJoin(client2, ptmId)]).then(() => {});
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  httpServer = http.createServer();
  socketManager = createSocketManager(httpServer);

  // Use port 0 to let the OS assign a free port — avoids collisions with other test files
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  TEST_PORT = typeof addr === 'object' && addr !== null ? addr.port : 0;
}, 60000);

afterAll(async () => {
  // Close Socket.IO first (disconnects all remaining sockets)
  await new Promise<void>((resolve) => {
    socketManager.getIO().close(() => resolve());
  });
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Disconnect all active clients to prevent socket/port leaks
  for (const client of activeClients) {
    if (client.connected) {
      client.disconnect();
    }
  }
  activeClients = [];
  await PTM.deleteMany({});
  mockValidateAccessToken.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe('WebRTC Signaling Integration', () => {
  describe('ptm_join — join PTM room (Req 18.1)', () => {
    it('should allow authorized participants to join a PTM room at/after start time', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const client = connectClient(teacherId.toString(), 'teacher');

        client.on('connect', () => {
          client.emit('ptm_join', { ptmId });
        });

        client.on('ptm_joined', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.existingPeers).toEqual([]);
          expect(data.timestamp).toBeDefined();
          client.disconnect();
          done();
        });

        client.on('ptm_error', () => {
          client.disconnect();
          done(new Error('Should not receive ptm_error for authorized participant'));
        });
      });
    });

    it('should deny unauthorized users from joining a PTM room (Req 17.4)', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const unauthorizedUserId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const client = connectClient(unauthorizedUserId.toString(), 'student');

        client.on('connect', () => {
          client.emit('ptm_join', { ptmId });
        });

        client.on('ptm_error', (data) => {
          expect(data.status).toBe(403);
          expect(data.envelope.success).toBe(false);
          expect(data.envelope.message).toContain('not authorized');
          client.disconnect();
          done();
        });

        client.on('ptm_joined', () => {
          client.disconnect();
          done(new Error('Unauthorized user should not be able to join'));
        });
      });
    });

    it('should deny join when PTM has not started yet (Req 18.1)', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      // Schedule PTM 1 hour in the future
      const futureStart = new Date(Date.now() + 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);

      createTestPTM({
        teacherId,
        parentId,
        scheduledStart: futureStart,
        scheduledEnd: futureEnd,
        status: 'scheduled',
      }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const client = connectClient(teacherId.toString(), 'teacher');

        client.on('connect', () => {
          client.emit('ptm_join', { ptmId });
        });

        client.on('ptm_error', (data) => {
          expect(data.status).toBe(403);
          expect(data.envelope.message).toContain('not started yet');
          client.disconnect();
          done();
        });

        client.on('ptm_joined', () => {
          client.disconnect();
          done(new Error('Should not be able to join before start time'));
        });
      });
    });

    it('should notify existing peers when a new participant joins', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();

        // First participant joins
        const teacherClient = connectClient(teacherId.toString(), 'teacher');

        teacherClient.on('connect', () => {
          teacherClient.emit('ptm_join', { ptmId });
        });

        teacherClient.on('ptm_joined', () => {
          // Second participant joins after first is in the room
          const parentClient = connectClient(parentId.toString(), 'parent');

          teacherClient.on('ptm_peer_joined', (data) => {
            expect(data.ptmId).toBe(ptmId);
            expect(data.userId).toBe(parentId.toString());
            expect(data.timestamp).toBeDefined();
            teacherClient.disconnect();
            parentClient.disconnect();
            done();
          });

          parentClient.on('connect', () => {
            parentClient.emit('ptm_join', { ptmId });
          });
        });
      });
    });
  });

  describe('ptm_offer / ptm_answer / ptm_ice_candidate — signaling relay (Req 18.1, 18.2, 18.3)', () => {
    it('should relay an SDP offer to the other participant in the PTM room', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const testSdp = { type: 'offer', sdp: 'v=0\r\no=- 1234 ...' };

        const teacherClient = connectClient(teacherId.toString(), 'teacher');
        const parentClient = connectClient(parentId.toString(), 'parent');

        // The parent should receive the offer relayed from the teacher
        parentClient.on('ptm_offer', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.sdp).toEqual(testSdp);
          expect(data.fromUserId).toBe(teacherId.toString());
          expect(data.timestamp).toBeDefined();
          teacherClient.disconnect();
          parentClient.disconnect();
          done();
        });

        // Wait for both to be in the room before emitting the offer
        joinBothClients(ptmId, teacherClient, parentClient).then(() => {
          teacherClient.emit('ptm_offer', { ptmId, sdp: testSdp });
        });
      });
    });

    it('should relay an SDP answer back to the offering participant', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const testAnswer = { type: 'answer', sdp: 'v=0\r\no=- 5678 ...' };

        const teacherClient = connectClient(teacherId.toString(), 'teacher');
        const parentClient = connectClient(parentId.toString(), 'parent');

        // The teacher should receive the answer from the parent
        teacherClient.on('ptm_answer', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.sdp).toEqual(testAnswer);
          expect(data.fromUserId).toBe(parentId.toString());
          expect(data.timestamp).toBeDefined();
          teacherClient.disconnect();
          parentClient.disconnect();
          done();
        });

        // Wait for both to be in the room before emitting the answer
        joinBothClients(ptmId, teacherClient, parentClient).then(() => {
          parentClient.emit('ptm_answer', { ptmId, sdp: testAnswer });
        });
      });
    });

    it('should relay ICE candidates between participants', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();
        const testCandidate = {
          candidate: 'candidate:1 1 UDP 2130706431 10.0.0.1 12345 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        };

        const teacherClient = connectClient(teacherId.toString(), 'teacher');
        const parentClient = connectClient(parentId.toString(), 'parent');

        // The parent should receive the ICE candidate from the teacher
        parentClient.on('ptm_ice_candidate', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.candidate).toEqual(testCandidate);
          expect(data.fromUserId).toBe(teacherId.toString());
          teacherClient.disconnect();
          parentClient.disconnect();
          done();
        });

        // Wait for both to be in the room before emitting the ICE candidate
        joinBothClients(ptmId, teacherClient, parentClient).then(() => {
          teacherClient.emit('ptm_ice_candidate', { ptmId, candidate: testCandidate });
        });
      });
    });
  });

  describe('ptm_leave — release media connection (Req 18.4)', () => {
    it('should notify the other participant when someone leaves', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();

        const teacherClient = connectClient(teacherId.toString(), 'teacher');
        const parentClient = connectClient(parentId.toString(), 'parent');

        // The teacher should be notified that the parent left
        teacherClient.on('ptm_peer_left', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.userId).toBe(parentId.toString());
          expect(data.timestamp).toBeDefined();
          teacherClient.disconnect();
          parentClient.disconnect();
          done();
        });

        // Wait for both to be in the room, then parent leaves
        joinBothClients(ptmId, teacherClient, parentClient).then(() => {
          parentClient.emit('ptm_leave', { ptmId });
        });
      });
    });

    it('should notify peers on disconnect (reconnect scenario, Req 18.3)', (done) => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();

      createTestPTM({ teacherId, parentId }).then((ptm) => {
        const ptmId = ptm._id.toString();

        const teacherClient = connectClient(teacherId.toString(), 'teacher');
        const parentClient = connectClient(parentId.toString(), 'parent');

        // The teacher receives notification when parent disconnects
        teacherClient.on('ptm_peer_left', (data) => {
          expect(data.ptmId).toBe(ptmId);
          expect(data.userId).toBe(parentId.toString());
          expect(data.reason).toBe('disconnect');
          teacherClient.disconnect();
          done();
        });

        // Wait for both to be in the room, then simulate connection drop
        joinBothClients(ptmId, teacherClient, parentClient).then(() => {
          parentClient.disconnect();
        });
      });
    });
  });

  describe('Validation errors', () => {
    it('should return error when ptmId is missing on join', (done) => {
      const userId = new Types.ObjectId();
      const client = connectClient(userId.toString(), 'teacher');

      client.on('connect', () => {
        client.emit('ptm_join', { ptmId: '' });
      });

      client.on('ptm_error', (data) => {
        expect(data.status).toBe(400);
        expect(data.envelope.message).toContain('ptmId is required');
        client.disconnect();
        done();
      });
    });

    it('should return error when PTM does not exist', (done) => {
      const userId = new Types.ObjectId();
      const fakePtmId = new Types.ObjectId().toString();
      const client = connectClient(userId.toString(), 'teacher');

      client.on('connect', () => {
        client.emit('ptm_join', { ptmId: fakePtmId });
      });

      client.on('ptm_error', (data) => {
        expect(data.status).toBe(403);
        expect(data.envelope.success).toBe(false);
        client.disconnect();
        done();
      });
    });
  });
});
