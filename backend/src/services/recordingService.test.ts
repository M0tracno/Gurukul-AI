import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ─── Mock S3 Client ─────────────────────────────────────────────────────────────

const mockSend = jest.fn().mockResolvedValue({} as never);
const mockGetSignedUrl = jest.fn<() => Promise<string>>().mockResolvedValue('https://s3.example.com/signed-url');

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
import type { RecordingConfig, RecordingUser } from './recordingService.js';

// ─── Test Setup ──────────────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;

const testConfig: RecordingConfig = {
  bucket: 'test-recordings',
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

function createTestPTM(overrides: Partial<{
  teacherId: Types.ObjectId;
  parentId: Types.ObjectId;
  studentId: Types.ObjectId;
  recordingEnabled: boolean;
  recordingRef: string;
}> = {}) {
  const teacherId = overrides.teacherId ?? new Types.ObjectId();
  const parentId = overrides.parentId ?? new Types.ObjectId();
  return PTM.create({
    teacherId,
    parentId,
    studentId: overrides.studentId ?? new Types.ObjectId(),
    scheduledStart: new Date('2025-01-15T10:00:00Z'),
    scheduledEnd: new Date('2025-01-15T11:00:00Z'),
    status: 'scheduled',
    participants: [teacherId, parentId],
    recordingEnabled: overrides.recordingEnabled ?? true,
    ...(overrides.recordingRef && { recordingRef: overrides.recordingRef }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe('RecordingService', () => {
  describe('captureSession', () => {
    it('should store a recording in S3 and associate reference with the PTM (Req 19.1, 19.2)', async () => {
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('fake-video-data');

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);
      const result = await service.captureSession(ptmId, sessionData);

      // Verify S3 upload was called
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify the result contains expected data
      expect(result.ptmId).toBe(ptmId);
      expect(result.bucket).toBe('test-recordings');
      expect(result.s3Key).toMatch(/^recordings\/.+\/\d+\.webm$/);

      // Verify the PTM was updated with the recording reference
      const updatedPtm = await PTM.findById(ptmId).lean().exec();
      expect((updatedPtm as unknown as Record<string, unknown>)['recordingRef']).toBe(result.s3Key);
    });

    it('should reject capture when recording is not enabled (Req 19.1)', async () => {
      const ptm = await createTestPTM({ recordingEnabled: false });
      const ptmId = (ptm._id as Types.ObjectId).toString();
      const sessionData = Buffer.from('fake-video-data');

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      await expect(service.captureSession(ptmId, sessionData)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('not enabled'),
      });
    });

    it('should throw 404 for a non-existent PTM', async () => {
      const fakeId = new Types.ObjectId().toString();
      const sessionData = Buffer.from('fake-video-data');

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      await expect(service.captureSession(fakeId, sessionData)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getRecordingUrl', () => {
    it('should return a signed URL for authorized participants (Req 19.3)', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        recordingRef: 'recordings/test-ptm/12345.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const user: RecordingUser = { id: teacherId.toString() };
      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      const result = await service.getRecordingUrl(ptmId, user);

      expect(result.url).toBe('https://s3.example.com/signed-url');
      expect(result.expiresIn).toBe(3600);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should deny access with 403 for unauthorized users (Req 19.4)', async () => {
      const ptm = await createTestPTM({
        recordingEnabled: true,
        recordingRef: 'recordings/test-ptm/12345.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const unauthorizedUser: RecordingUser = { id: new Types.ObjectId().toString() };
      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      await expect(service.getRecordingUrl(ptmId, unauthorizedUser)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('not authorized'),
      });
    });

    it('should throw 404 when no recording exists for the PTM', async () => {
      const teacherId = new Types.ObjectId();
      const parentId = new Types.ObjectId();
      const ptm = await createTestPTM({
        teacherId,
        parentId,
        recordingEnabled: true,
        // No recordingRef set
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const user: RecordingUser = { id: teacherId.toString() };
      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      await expect(service.getRecordingUrl(ptmId, user)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('No recording found'),
      });
    });

    it('should throw 404 for a non-existent PTM', async () => {
      const fakeId = new Types.ObjectId().toString();
      const user: RecordingUser = { id: new Types.ObjectId().toString() };

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      await expect(service.getRecordingUrl(fakeId, user)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('hasRecording', () => {
    it('should return true when a recording reference exists', async () => {
      const ptm = await createTestPTM({
        recordingEnabled: true,
        recordingRef: 'recordings/test/123.webm',
      });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      const result = await service.hasRecording(ptmId);
      expect(result).toBe(true);
    });

    it('should return false when no recording reference exists', async () => {
      const ptm = await createTestPTM({ recordingEnabled: true });
      const ptmId = (ptm._id as Types.ObjectId).toString();

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      const result = await service.hasRecording(ptmId);
      expect(result).toBe(false);
    });

    it('should return false for a non-existent PTM', async () => {
      const fakeId = new Types.ObjectId().toString();

      const mockS3 = { send: mockSend } as unknown;
      const service = new RecordingService(testConfig, mockS3 as import('@aws-sdk/client-s3').S3Client);

      const result = await service.hasRecording(fakeId);
      expect(result).toBe(false);
    });
  });
});
