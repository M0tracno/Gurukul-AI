/**
 * Property-Based Tests: Recording Association
 *
 * Feature: admin-portal-overhaul, Property 30: Recording association
 *
 * Property 30: For any stored PTM recording, the recording reference SHALL
 * resolve to the correct originating PTM.
 * **Validates: Requirements 19.2**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { RecordingService } from './recordingService.js';
import PTM from '../models/PTM.js';

// ---------------------------------------------------------------------------
// Mock AWS S3 SDK — prevent real S3 calls
// ---------------------------------------------------------------------------

// We inject a mock S3 client directly into the RecordingService constructor
// to avoid real AWS calls entirely.
const mockS3Send = jest.fn().mockResolvedValue({} as never);
const mockS3Client = { send: mockS3Send } as unknown;

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let recordingService: RecordingService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create the service with a mock S3 client injected directly
  recordingService = new RecordingService(
    {
      bucket: 'test-bucket',
      region: 'us-east-1',
      signedUrlExpiresIn: 3600,
    },
    mockS3Client as any,
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PTM.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

/**
 * Generates a valid time window (start < end) for PTM scheduling.
 */
const timeWindowArb = fc
  .tuple(
    fc.integer({
      min: new Date('2024-01-01').getTime(),
      max: new Date('2029-01-01').getTime(),
    }),
    fc.integer({ min: 30 * 60 * 1000, max: 4 * 60 * 60 * 1000 }),
  )
  .map(([startMs, durationMs]) => ({
    scheduledStart: new Date(startMs),
    scheduledEnd: new Date(startMs + durationMs),
  }));

/**
 * Generates a non-empty Buffer representing recording session data.
 */
const sessionDataArb = fc
  .uint8Array({ minLength: 1, maxLength: 1024 })
  .map((arr) => Buffer.from(arr));

/**
 * Generates a PTM document with recording enabled, ready for capture.
 */
const ptmWithRecordingArb = fc
  .tuple(objectIdArb, objectIdArb, objectIdArb, timeWindowArb)
  .map(([teacherId, parentId, studentId, window]) => ({
    teacherId: new Types.ObjectId(teacherId),
    parentId: new Types.ObjectId(parentId),
    studentId: new Types.ObjectId(studentId),
    scheduledStart: window.scheduledStart,
    scheduledEnd: window.scheduledEnd,
    status: 'active' as const,
    participants: [new Types.ObjectId(teacherId), new Types.ObjectId(parentId)],
    recordingEnabled: true,
  }));

// ---------------------------------------------------------------------------
// Property 30: Recording association
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 30: Recording association
describe('Property 30: Recording association', () => {
  it('for any stored PTM recording, the recording reference resolves to the correct originating PTM', async () => {
    await fc.assert(
      fc.asyncProperty(
        ptmWithRecordingArb,
        sessionDataArb,
        async (ptmData, sessionData) => {
          // Clean slate
          await PTM.deleteMany({});

          // Create the PTM in the database with recording enabled
          const ptmDoc = await PTM.create(ptmData);
          const ptmId = ptmDoc._id.toString();

          // Capture the session — this stores the recording and associates it with the PTM
          const captureResult = await recordingService.captureSession(ptmId, sessionData);

          // Verify the capture returned a valid s3Key and the correct ptmId
          expect(captureResult.s3Key).toBeDefined();
          expect(captureResult.s3Key.length).toBeGreaterThan(0);
          expect(captureResult.ptmId).toBe(ptmId);

          // Reload the PTM from the database to verify the association
          const reloadedPtm = await PTM.findById(ptmId).lean().exec();
          expect(reloadedPtm).not.toBeNull();

          // The recording reference on the PTM SHALL resolve to the stored recording
          expect(reloadedPtm!.recordingRef).toBe(captureResult.s3Key);

          // The recording reference SHALL contain the originating PTM's ID,
          // proving it resolves to the correct PTM
          expect(captureResult.s3Key).toContain(ptmId);

          // Additionally verify we can look up which PTM owns this recording
          // by querying for the recordingRef — it should return exactly this PTM
          const ptmByRef = await PTM.findOne({ recordingRef: captureResult.s3Key }).lean().exec();
          expect(ptmByRef).not.toBeNull();
          expect(ptmByRef!._id.toString()).toBe(ptmId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
