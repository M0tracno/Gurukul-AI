import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Integration tests for the Recording Service with S3 capture and signed-URL access.
 *
 * Tests the complete recording lifecycle:
 * - Capture session to S3 (Recording_Store) when recording is enabled
 * - Associate recording reference with the PTM
 * - Retrieve recording with time-limited signed URL for authorized participants
 * - Deny access with 403 for unauthorized users
 *
 * Requirements: 19.1, 19.3
 */

// ─── Mock S3 Client ─────────────────────────────────────────────────────────────

const mockSend = jest.fn().mockResolvedValue({} as never);
const mockGetSignedUrl = jest.fn<() => Promise<string>>().mockResolvedValue(
  'https://s3.example.com/recordings/signed-url?X-Amz-Signature=abc123'
);

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}));

jest.unstable_mockModule('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// Dynamic imports AFTER mocks are set up
const { RecordingService } = await import('./recordingService.js');
import PTM from '../models/PTM.js';
import type { PTMStatus } from '../models/PTM.js';
import type { RecordingConfig, RecordingUser } from './recordingService.js';

// ─── Test Setup ──────────────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;

const testConfig: RecordingConfig = {
  bucket: 'test-recording-bucket',
  region: 'us-east-1',
  signedUrlExpiresIn: 3600,
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PTM.deleteMany({});
  mockSend.mockClear();
  mockGetSignedUrl.mockClear();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function createService() {
  const mockS3 = { send: mockSend } as unknown;
  return new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);
}

async function createTestPTM(overrides: {
  teacherId?: Types.ObjectId;
  parentId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  recordingEnabled?: boolean;
  recordingRef?: string;
  status?: PTMStatus;
} = {}) {
  const teacherId = overrides.teacherId ?? new Types.ObjectId();
  const parentId = overrides.parentId ?? new Types.ObjectId();
  return PTM.create({
    teacherId,
    parentId,
    studentId: overrides.studentId ?? new Types.ObjectId(),
    scheduledStart: new Date('2025-01-15T10:00:00Z'),
    scheduledEnd: new Date('2025-01-15T11:00:00Z'),
    status: overrides.status ?? 'active',
    participants: [teacherId, parentId],
    recordingEnabled: overrides.recordingEnabled ?? true,
    ...(overrides.recordingRef && { recordingRef: overrides.recordingRef }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe('Recording Service Integration', () => {
  describe('captureSession — S3 capture (Req 19.1)', () => {
    it('should capture a session and store it in S3 with proper key format', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('fake-webm-video-stream-data');

      const result = await service.captureSession(ptmId, sessionData);

      // Verify S3 upload was invoked
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify the result matches expected structure
      expect(result.ptmId).toBe(ptmId);
      expect(result.bucket).toBe('test-recording-bucket');
      expect(result.s3Key).toMatch(new RegExp(`^recordings/${ptmId}/\\d+\\.webm$`));
    });

    it('should associate the recording reference with the PTM (Req 19.2)', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('recording-content');

      const result = await service.captureSession(ptmId, sessionData);

      // Verify the PTM document was updated with the recording reference
      const updatedPtm = await PTM.findById(ptmId).lean().exec();
      expect((updatedPtm as unknown as Record<string, unknown>)['recordingRef']).toBe(result.s3Key);
    });

    it('should support custom content type for the recording', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('mp4-data');

      const result = await service.captureSession(ptmId, sessionData, 'video/mp4');

      expect(result.s3Key).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should reject capture when recording is disabled for the PTM', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: false });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('data');

      await expect(service.captureSession(ptmId, sessionData)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('not enabled'),
      });

      // S3 should NOT be called
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw 404 when PTM does not exist', async () => {
      const service = createService();
      const fakePtmId = new Types.ObjectId().toString();
      const sessionData = Buffer.from('data');

      await expect(service.captureSession(fakePtmId, sessionData)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should handle multiple recordings for the same PTM (overwrite ref)', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      // First capture
      const result1 = await service.captureSession(ptmId, Buffer.from('first'));
      // Second capture
      const result2 = await service.captureSession(ptmId, Buffer.from('second'));

      // The s3Keys should differ (timestamp-based)
      expect(result1.s3Key).not.toBe(result2.s3Key);

      // The PTM should have the latest recording reference
      const updatedPtm = await PTM.findById(ptmId).lean().exec();
      expect((updatedPtm as unknown as Record<string, unknown>)['recordingRef']).toBe(result2.s3Key);
    });
  });

  describe('getRecordingUrl — signed URL access (Req 19.3)', () => {
    it('should return a time-limited signed URL for an authorized teacher participant', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const service = createService();

      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        recordingRef: 'recordings/ptm123/1700000000000.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const user: RecordingUser = { id: teacherId.toString(), role: 'teacher' };
      const result = await service.getRecordingUrl(ptmId, user);

      expect(result.url).toContain('https://s3.example.com/recordings/signed-url');
      expect(result.expiresIn).toBe(3600);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should return a time-limited signed URL for an authorized parent participant', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const service = createService();

      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        recordingRef: 'recordings/ptm456/1700000000000.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const user: RecordingUser = { id: parentId.toString(), role: 'parent' };
      const result = await service.getRecordingUrl(ptmId, user);

      expect(result.url).toBeDefined();
      expect(result.expiresIn).toBe(3600);
    });

    it('should deny access with 403 for unauthorized users (Req 19.4)', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const unauthorizedUserId = new Types.ObjectId();
      const service = createService();

      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        recordingRef: 'recordings/ptm789/1700000000000.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const unauthorizedUser: RecordingUser = {
        id: unauthorizedUserId.toString(),
        role: 'student',
      };

      await expect(service.getRecordingUrl(ptmId, unauthorizedUser)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('not authorized'),
      });

      // S3 signed URL should NOT be generated for unauthorized users
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it('should throw 404 when PTM does not exist', async () => {
      const service = createService();
      const fakePtmId = new Types.ObjectId().toString();
      const user: RecordingUser = { id: new Types.ObjectId().toString() };

      await expect(service.getRecordingUrl(fakePtmId, user)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 when no recording reference exists for the PTM', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const service = createService();

      // PTM without a recording reference
      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        // No recordingRef
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const user: RecordingUser = { id: teacherId.toString() };

      await expect(service.getRecordingUrl(ptmId, user)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('No recording found'),
      });
    });
  });

  describe('End-to-end: capture then retrieve', () => {
    it('should allow capturing a session and then retrieving it via signed URL', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const service = createService();

      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      // Step 1: Capture the recording
      const captureResult = await service.captureSession(
        ptmId,
        Buffer.from('complete-ptm-recording-data'),
      );
      expect(captureResult.s3Key).toBeDefined();

      // Step 2: Retrieve the recording URL as an authorized participant
      const user: RecordingUser = { id: teacherId.toString(), role: 'teacher' };
      const urlResult = await service.getRecordingUrl(ptmId, user);

      expect(urlResult.url).toBeDefined();
      expect(urlResult.expiresIn).toBe(3600);
    });

    it('should deny retrieval for unauthorized user even after valid capture', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const unauthorizedId = new Types.ObjectId();
      const service = createService();

      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      // Capture works
      await service.captureSession(ptmId, Buffer.from('session-data'));

      // Unauthorized retrieval fails
      const unauthorizedUser: RecordingUser = { id: unauthorizedId.toString(), role: 'admin' };
      await expect(service.getRecordingUrl(ptmId, unauthorizedUser)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('hasRecording', () => {
    it('should return true after a recording is captured', async () => {
      const service = createService();
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      // Before capture
      expect(await service.hasRecording(ptmId)).toBe(false);

      // After capture
      await service.captureSession(ptmId, Buffer.from('data'));
      expect(await service.hasRecording(ptmId)).toBe(true);
    });

    it('should return false for non-existent PTM', async () => {
      const service = createService();
      const fakeId = new Types.ObjectId().toString();
      expect(await service.hasRecording(fakeId)).toBe(false);
    });
  });
});
