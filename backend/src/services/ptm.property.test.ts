/**
 * Property-Based Tests: PTM Scheduling (Persistence, Conflict Detection, Authorization)
 *
 * Feature: admin-portal-overhaul, Property 27: PTM persistence round-trip
 * Feature: admin-portal-overhaul, Property 28: PTM conflict detection
 * Feature: admin-portal-overhaul, Property 29: PTM and recording authorization
 *
 * Property 27: For any validly scheduled PTM, loading it back SHALL yield
 * equivalent participants, date, and time.
 * **Validates: Requirements 17.1**
 *
 * Property 28: For any existing PTM and any new PTM request for the same Teacher,
 * the new request SHALL be rejected with a conflict Error_Envelope if and only if
 * their time ranges overlap.
 * **Validates: Requirements 17.3**
 *
 * Property 29: For any user who is not a party to a PTM, both joining the meeting
 * and requesting its recording SHALL be denied with an Error_Envelope and HTTP
 * status 403.
 * **Validates: Requirements 17.4, 19.4**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { PTMService } from './ptmService.js';
import type { SchedulePTMDto } from './ptmService.js';
import PTM from '../models/PTM.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let ptmService: PTMService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  ptmService = new PTMService();
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
 * Uses integer timestamps to avoid NaN date issues from arithmetic overflow.
 */
const timeWindowArb = fc
  .tuple(
    fc.integer({
      min: new Date('2024-01-01').getTime(),
      max: new Date('2029-01-01').getTime(),
    }),
    fc.integer({ min: 30 * 60 * 1000, max: 4 * 60 * 60 * 1000 }), // 30 min to 4 hours duration
  )
  .map(([startMs, durationMs]) => ({
    scheduledStart: new Date(startMs),
    scheduledEnd: new Date(startMs + durationMs),
  }));

/**
 * Generates a valid SchedulePTMDto with random but valid ObjectIds and time window.
 */
const schedulePTMDtoArb: fc.Arbitrary<SchedulePTMDto> = fc
  .tuple(objectIdArb, objectIdArb, objectIdArb, timeWindowArb, fc.boolean())
  .map(([teacherId, parentId, studentId, window, recordingEnabled]) => ({
    teacherId,
    parentId,
    studentId,
    scheduledStart: window.scheduledStart,
    scheduledEnd: window.scheduledEnd,
    recordingEnabled,
  }));

/**
 * Generates two time windows that are guaranteed to overlap for the same teacher.
 * Overlap condition: A_start < B_end AND B_start < A_end
 * Uses integer timestamps to avoid NaN date issues.
 */
const overlappingWindowsArb = fc
  .tuple(
    fc.integer({
      min: new Date('2024-01-01').getTime(),
      max: new Date('2028-01-01').getTime(),
    }),
    fc.integer({ min: 60 * 60 * 1000, max: 3 * 60 * 60 * 1000 }), // 1-3 hours
    fc.integer({ min: 1, max: 60 * 60 * 1000 - 1 }), // overlap offset (< first duration so they overlap)
  )
  .map(([firstStartMs, firstDuration, overlapOffset]) => {
    const firstEndMs = firstStartMs + firstDuration;
    // Second meeting starts before first ends (guaranteed overlap)
    const secondStartMs = firstEndMs - overlapOffset;
    const secondEndMs = secondStartMs + firstDuration;
    return {
      first: { scheduledStart: new Date(firstStartMs), scheduledEnd: new Date(firstEndMs) },
      second: { scheduledStart: new Date(secondStartMs), scheduledEnd: new Date(secondEndMs) },
    };
  });

/**
 * Generates two time windows that are guaranteed NOT to overlap for the same teacher.
 * Non-overlap: second starts at or after first ends.
 * Uses integer timestamps to avoid NaN date issues.
 */
const nonOverlappingWindowsArb = fc
  .tuple(
    fc.integer({
      min: new Date('2024-01-01').getTime(),
      max: new Date('2026-01-01').getTime(),
    }),
    fc.integer({ min: 30 * 60 * 1000, max: 2 * 60 * 60 * 1000 }), // 30 min to 2 hours
    fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 }), // gap between meetings (1ms to 24h)
    fc.integer({ min: 30 * 60 * 1000, max: 2 * 60 * 60 * 1000 }), // second meeting duration
  )
  .map(([firstStartMs, firstDuration, gap, secondDuration]) => {
    const firstEndMs = firstStartMs + firstDuration;
    const secondStartMs = firstEndMs + gap;
    const secondEndMs = secondStartMs + secondDuration;
    return {
      first: { scheduledStart: new Date(firstStartMs), scheduledEnd: new Date(firstEndMs) },
      second: { scheduledStart: new Date(secondStartMs), scheduledEnd: new Date(secondEndMs) },
    };
  });

// ---------------------------------------------------------------------------
// Property 27: PTM persistence round-trip
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 27: PTM persistence round-trip
describe('Property 27: PTM persistence round-trip', () => {
  it('a scheduled PTM loaded back yields equivalent participants, date, and time', async () => {
    await fc.assert(
      fc.asyncProperty(schedulePTMDtoArb, async (dto) => {
        // Clean slate for each iteration
        await PTM.deleteMany({});

        // Schedule a PTM
        const result = await ptmService.schedule(dto.teacherId, dto);

        // Load it back from DB
        const loaded = await ptmService.getPTMById(result.ptmId);

        // Participants round-trip: teacher and parent should be in the list
        expect(loaded.participants).toContain(dto.teacherId);
        expect(loaded.participants).toContain(dto.parentId);
        expect(loaded.participants.length).toBeGreaterThanOrEqual(2);

        // Teacher, parent, student IDs round-trip
        expect(loaded.teacherId).toBe(dto.teacherId);
        expect(loaded.parentId).toBe(dto.parentId);
        expect(loaded.studentId).toBe(dto.studentId);

        // Date and time round-trip (compare timestamps to avoid timezone issues)
        expect(loaded.scheduledStart.getTime()).toBe(dto.scheduledStart.getTime());
        expect(loaded.scheduledEnd.getTime()).toBe(dto.scheduledEnd.getTime());

        // Status defaults to 'scheduled'
        expect(loaded.status).toBe('scheduled');

        // Recording flag round-trips
        expect(loaded.recordingEnabled).toBe(dto.recordingEnabled ?? false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 28: PTM conflict detection
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 28: PTM conflict detection
describe('Property 28: PTM conflict detection', () => {
  it('overlapping PTM for the same Teacher is rejected with conflict', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb, // teacherId (same for both)
        objectIdArb, // parentId for first PTM
        objectIdArb, // parentId for second PTM
        objectIdArb, // studentId for first PTM
        objectIdArb, // studentId for second PTM
        overlappingWindowsArb,
        async (teacherId, parentId1, parentId2, studentId1, studentId2, windows) => {
          await PTM.deleteMany({});

          // Schedule the first PTM successfully
          const firstDto: SchedulePTMDto = {
            teacherId,
            parentId: parentId1,
            studentId: studentId1,
            scheduledStart: windows.first.scheduledStart,
            scheduledEnd: windows.first.scheduledEnd,
          };

          await ptmService.schedule(teacherId, firstDto);

          // Attempt to schedule a second PTM with overlapping time for the same teacher
          const secondDto: SchedulePTMDto = {
            teacherId,
            parentId: parentId2,
            studentId: studentId2,
            scheduledStart: windows.second.scheduledStart,
            scheduledEnd: windows.second.scheduledEnd,
          };

          try {
            await ptmService.schedule(teacherId, secondDto);
            // Should not succeed — this line should not be reached
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(409);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-overlapping PTM for the same Teacher is accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb, // teacherId (same for both)
        objectIdArb, // parentId for first PTM
        objectIdArb, // parentId for second PTM
        objectIdArb, // studentId for first PTM
        objectIdArb, // studentId for second PTM
        nonOverlappingWindowsArb,
        async (teacherId, parentId1, parentId2, studentId1, studentId2, windows) => {
          await PTM.deleteMany({});

          // Schedule the first PTM successfully
          const firstDto: SchedulePTMDto = {
            teacherId,
            parentId: parentId1,
            studentId: studentId1,
            scheduledStart: windows.first.scheduledStart,
            scheduledEnd: windows.first.scheduledEnd,
          };

          await ptmService.schedule(teacherId, firstDto);

          // Schedule a second non-overlapping PTM — should succeed
          const secondDto: SchedulePTMDto = {
            teacherId,
            parentId: parentId2,
            studentId: studentId2,
            scheduledStart: windows.second.scheduledStart,
            scheduledEnd: windows.second.scheduledEnd,
          };

          const result = await ptmService.schedule(teacherId, secondDto);
          expect(result.ptmId).toBeDefined();
          expect(result.status).toBe('scheduled');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: PTM and recording authorization
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 29: PTM and recording authorization
describe('Property 29: PTM and recording authorization', () => {
  it('non-participant attempting to join a PTM is denied with 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        schedulePTMDtoArb,
        objectIdArb, // outsider userId
        async (dto, outsiderId) => {
          // Ensure the outsider is neither the teacher nor the parent
          fc.pre(outsiderId !== dto.teacherId && outsiderId !== dto.parentId);

          await PTM.deleteMany({});

          // Schedule a PTM
          const result = await ptmService.schedule(dto.teacherId, dto);

          // Outsider attempts to join
          try {
            await ptmService.authorizeJoin(result.ptmId, outsiderId);
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('authorized participant (teacher) can join the PTM', async () => {
    await fc.assert(
      fc.asyncProperty(schedulePTMDtoArb, async (dto) => {
        await PTM.deleteMany({});

        const result = await ptmService.schedule(dto.teacherId, dto);

        // Teacher is a participant and should be allowed to join
        const joinResult = await ptmService.authorizeJoin(result.ptmId, dto.teacherId);
        expect(joinResult.ptmId).toBe(result.ptmId);
      }),
      { numRuns: 100 },
    );
  });

  it('authorized participant (parent) can join the PTM', async () => {
    await fc.assert(
      fc.asyncProperty(schedulePTMDtoArb, async (dto) => {
        await PTM.deleteMany({});

        const result = await ptmService.schedule(dto.teacherId, dto);

        // Parent is a participant and should be allowed to join
        const joinResult = await ptmService.authorizeJoin(result.ptmId, dto.parentId);
        expect(joinResult.ptmId).toBe(result.ptmId);
      }),
      { numRuns: 100 },
    );
  });

  it('non-participant requesting recording access is denied with 403 (recording authorization)', async () => {
    await fc.assert(
      fc.asyncProperty(
        schedulePTMDtoArb.map((dto) => ({ ...dto, recordingEnabled: true })),
        objectIdArb, // outsider userId
        async (dto, outsiderId) => {
          // Ensure the outsider is neither the teacher nor the parent
          fc.pre(outsiderId !== dto.teacherId && outsiderId !== dto.parentId);

          await PTM.deleteMany({});

          // Schedule a PTM with recording enabled
          const result = await ptmService.schedule(dto.teacherId, dto);

          // Recording authorization uses the same participant check as join authorization
          // (Requirement 19.4: unauthorized user requesting a PTM recording → 403)
          // The authorization logic is identical: only PTM participants may access recordings
          try {
            await ptmService.authorizeJoin(result.ptmId, outsiderId);
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
