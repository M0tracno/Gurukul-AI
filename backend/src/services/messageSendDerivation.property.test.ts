/**
 * Property-Based Test: Sending a message preserves content and derives the
 * sender from the authenticated user.
 *
 * Feature: communication-feedback-and-admin-apis, Property 6: Sending a message preserves content and derives the sender from the authenticated user
 *
 * Property 6: For any valid send input, the persisted message's
 * `senderId`/`senderModel` equal the values derived from `req.user` (never from
 * the request body), and its `subject`, `content`, `recipientId`,
 * `recipientModel`, and `studentId` round-trip unchanged.
 *
 * Strategy: seed a real parent -> faculty messaging relationship that
 * `validateMessagingPermission` permits — a Parent linked (via an active
 * `ParentStudentRelation`) to a Student who is enrolled in a Course taught by
 * the Faculty recipient. The authenticated sender is the Parent (role
 * `parent`). For each run a fresh, valid send input is generated (with a bogus
 * `senderId`/`senderModel`/`senderName` deliberately injected into the request
 * body) and passed to {@link MessageService.send}. The persisted document is
 * then re-read from the database and checked: the sender must equal the
 * authenticated Parent (never the injected body values), and subject, content,
 * recipientId, recipientModel, and studentId must round-trip unchanged.
 *
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { messageService, type SendMessageInput } from './messageService.js';
import type { AuditContext } from '../utils/auditContext.js';
import Message from '../models/Message.js';
import Parent from '../models/Parent.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import AuditLog from '../models/AuditLog.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// Fixture identities seeded once and reused across all property runs; only the
// Message/AuditLog collections grow per run and are cleared between iterations.
let parentId: mongoose.Types.ObjectId;
let facultyId: mongoose.Types.ObjectId;
let studentId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  parentId = new mongoose.Types.ObjectId();
  facultyId = new mongoose.Types.ObjectId();
  studentId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();

  // Seed records via the native driver to bypass password-hashing/save hooks —
  // only identity and the fields read by the service/permission check matter.
  await Parent.collection.insertOne({
    _id: parentId,
    parentId: 'P-PROP6',
    firstName: 'Pat',
    lastName: 'Parent',
    relationToStudent: 'Other',
    isActive: true,
    isVerified: false,
    isDemo: false,
    failedLoginAttempts: 0,
  });

  await Faculty.collection.insertOne({
    _id: facultyId,
    firstName: 'Fran',
    lastName: 'Faculty',
    email: `${facultyId.toString()}@example.com`,
    password: 'placeholder',
    active: true,
    isDemo: false,
    failedLoginAttempts: 0,
  });

  await Student.collection.insertOne({
    _id: studentId,
    firstName: 'Sam',
    lastName: 'Student',
    email: `${studentId.toString()}@example.com`,
    password: 'placeholder',
    studentId: 'STU0001',
    grade: '10',
    active: true,
    isDemo: false,
    failedLoginAttempts: 0,
  });

  // Course taught by the Faculty recipient (deletedAt null so it is selectable).
  await Course.collection.insertOne({
    _id: courseId,
    title: 'Property Course',
    code: 'PROP-101',
    description: 'A course for the messaging permission fixture',
    faculty: facultyId,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    schedule: [],
    credits: 3,
    maxStudents: 30,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
  });

  // Active enrollment of the student in the faculty's course.
  await Enrollment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    student: studentId,
    course: courseId,
    enrollmentDate: new Date(),
    status: 'active',
    grade: 'N/A',
    finalScore: null,
  });

  // Active linkage between the parent and the enrolled student.
  await ParentStudentRelation.collection.insertOne({
    parentId,
    studentId,
    linkagePhone: '+11234567890',
    isActive: true,
    isDemo: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([Message.deleteMany({}), AuditLog.deleteMany({})]);
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A trimmed, non-empty string of at most `max` characters. Mongoose trims
 * `subject`/`content`, so pre-trimming the input keeps the round-trip exact
 * (trimming an already-trimmed value is a no-op).
 */
const trimmedTextArb = (max: number, fallback: string): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: max }).map((s) => {
    const trimmed = s.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  });

const messageTypeArb = fc.constantFrom(
  'general',
  'academic',
  'behavioral',
  'attendance',
  'urgent',
) as fc.Arbitrary<NonNullable<SendMessageInput['messageType']>>;

const priorityArb = fc.constantFrom('low', 'normal', 'high', 'urgent') as fc.Arbitrary<
  NonNullable<SendMessageInput['priority']>
>;

const ipArb = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 4, maxLength: 4 })
  .map((octets) => octets.join('.'));

// ---------------------------------------------------------------------------
// Property 6
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 6: Sending a message preserves content and derives the sender from the authenticated user
describe('Property 6: Sending a message preserves content and derives the sender from the authenticated user', () => {
  it(
    'derives sender from req.user (never the body) and round-trips subject/content/recipient/student',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          trimmedTextArb(200, 'Subject'),
          trimmedTextArb(2000, 'Content'),
          fc.option(messageTypeArb, { nil: undefined }),
          fc.option(priorityArb, { nil: undefined }),
          ipArb,
          fc.uuid(),
          async (subject, content, messageType, priority, ip, correlationId) => {
            // Fresh message corpus per run so the persisted document is unique.
            await Message.deleteMany({});

            const recipientIdStr = String(facultyId);
            const studentIdStr = String(studentId);

            // A bogus sender block injected into the request body. The service
            // must ignore these and derive the sender from req.user instead.
            const bogusSenderId = new mongoose.Types.ObjectId();
            const input = {
              subject,
              content,
              recipientId: recipientIdStr,
              recipientModel: 'Faculty',
              studentId: studentIdStr,
              ...(messageType ? { messageType } : {}),
              ...(priority ? { priority } : {}),
              // Deliberately spoofed fields — must NOT influence persistence.
              senderId: String(bogusSenderId),
              senderModel: 'Faculty',
              senderName: 'Spoofed Sender',
            } as unknown as SendMessageInput;

            const ctx: AuditContext = {
              userId: String(parentId),
              role: 'parent',
              ip,
              correlationId,
            };

            const dto = await messageService.send(String(parentId), 'parent', input, ctx);

            // Re-read the persisted document directly from the database.
            const raw = await Message.findById(dto.id).lean();
            expect(raw).not.toBeNull();
            if (!raw) {
              return false;
            }

            // --- Sender derived from req.user, never from the body ---
            expect(String(raw.senderId)).toBe(String(parentId));
            expect(raw.senderModel).toBe('Parent');
            expect(String(raw.senderId)).not.toBe(String(bogusSenderId));

            // --- Content/recipient/student round-trip unchanged ---
            expect(raw.subject).toBe(subject);
            expect(raw.content).toBe(content);
            expect(String(raw.recipientId)).toBe(recipientIdStr);
            expect(raw.recipientModel).toBe('Faculty');
            expect(String(raw.studentId)).toBe(studentIdStr);

            // --- The returned DTO mirrors the same derivation/round-trip ---
            expect(dto.senderId).toBe(String(parentId));
            expect(dto.senderModel).toBe('Parent');
            expect(dto.subject).toBe(subject);
            expect(dto.content).toBe(content);
            expect(dto.recipientId).toBe(recipientIdStr);
            expect(dto.recipientModel).toBe('Faculty');
            expect(dto.studentId).toBe(studentIdStr);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
