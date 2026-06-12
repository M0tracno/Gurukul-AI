/**
 * Property-Based Test: Message sending is gated by messaging permission with
 * no side effect on denial.
 *
 * Feature: communication-feedback-and-admin-apis, Property 8: Message sending is gated by messaging permission with no side effect on denial
 *
 * Property 8: For any sender/recipient pair, a message is persisted if and only
 * if `validateMessagingPermission` allows it; when it is denied, the request is
 * rejected with 403 and the total message count is unchanged.
 *
 * The test exercises `messageService.send`, which calls
 * `validateMessagingPermission` BEFORE persisting any document (Requirements
 * 3.3, 3.4). For each generated parent → faculty pair the underlying linkage
 * (parent→ward relation, ward→course enrollment, faculty teaching the course)
 * is seeded so that some pairs are permitted and some are denied. The same
 * `validateMessagingPermission` helper is consulted independently as an oracle,
 * and the persistence outcome of `send` is asserted to match it exactly:
 *   - allowed  → send resolves and the total Message count increases by 1
 *   - denied   → send rejects with 403 and the total Message count is unchanged
 *
 * **Validates: Requirements 3.3, 3.4**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { messageService } from './messageService.js';
import Message from '../models/Message.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Parent from '../models/Parent.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
import { validateMessagingPermission } from '../realtime/messagingRbac.js';
import type { AuditContext } from '../utils/auditContext.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

const RELATION_COLLECTION = 'parent_student_relations';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    Message.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
    Parent.deleteMany({}),
    Faculty.deleteMany({}),
    Student.deleteMany({}),
    AuditLog.deleteMany({}),
    mongoose.connection.collection(RELATION_COLLECTION).deleteMany({}),
  ]);
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * The three independent linkage facts that gate a parent → faculty message.
 * A parent may message a faculty member only when all three hold:
 *   - the ward is linked to the parent (active ParentStudentRelation)
 *   - the ward is enrolled in a course (active/completed Enrollment)
 *   - that course is taught by the target faculty member
 * Toggling each independently produces both allowed and denied pairs.
 */
const scenarioArb = fc.record({
  linkWardToParent: fc.boolean(),
  enrollWard: fc.boolean(),
  facultyTeachesCourse: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 8
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 8: Message sending is gated by messaging permission with no side effect on denial
describe('Property 8: Message sending is gated by messaging permission with no side effect on denial', () => {
  it('persists a message iff validateMessagingPermission allows it; denial yields 403 with no count change', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        // Fresh, isolated corpus per run.
        await Promise.all([
          Message.deleteMany({}),
          Course.deleteMany({}),
          Enrollment.deleteMany({}),
          Parent.deleteMany({}),
          Faculty.deleteMany({}),
          Student.deleteMany({}),
          mongoose.connection.collection(RELATION_COLLECTION).deleteMany({}),
        ]);

        const parentId = new Types.ObjectId();
        const facultyId = new Types.ObjectId();
        const otherFacultyId = new Types.ObjectId();
        const studentId = new Types.ObjectId();
        const courseId = new Types.ObjectId();

        // Seed real participant records so a permitted send always reaches and
        // confirms persistence (name resolution must succeed). Inserted via the
        // model collection to bypass unrelated required-field validation while
        // still landing in the collection the service reads from.
        await Promise.all([
          Parent.collection.insertOne({
            _id: parentId,
            firstName: 'Pat',
            lastName: 'Parent',
          } as never),
          Faculty.collection.insertOne({
            _id: facultyId,
            firstName: 'Fay',
            lastName: 'Faculty',
          } as never),
          Student.collection.insertOne({
            _id: studentId,
            firstName: 'Sam',
            lastName: 'Student',
          } as never),
        ]);

        // The course is always present; whether OUR faculty teaches it is
        // controlled by `facultyTeachesCourse`.
        await Course.collection.insertOne({
          _id: courseId,
          faculty: scenario.facultyTeachesCourse ? facultyId : otherFacultyId,
          deletedAt: null,
        } as never);

        if (scenario.enrollWard) {
          await Enrollment.collection.insertOne({
            student: studentId,
            course: courseId,
            status: 'active',
          } as never);
        }

        if (scenario.linkWardToParent) {
          await mongoose.connection.collection(RELATION_COLLECTION).insertOne({
            parentId,
            studentId,
            isActive: true,
          });
        }

        // Independent oracle: the very permission gate the service consults.
        const oracle = await validateMessagingPermission(
          parentId.toString(),
          'parent',
          facultyId.toString(),
          'Faculty',
        );

        const ctx: AuditContext = {
          userId: parentId.toString(),
          role: 'parent',
          ip: '127.0.0.1',
          correlationId: 'test-correlation',
        };

        const before = await Message.countDocuments({});

        const sendPromise = messageService.send(
          parentId.toString(),
          'parent',
          {
            subject: 'Subject',
            content: 'Hello there',
            recipientId: facultyId.toString(),
            recipientModel: 'Faculty',
            studentId: studentId.toString(),
          },
          ctx,
        );

        if (oracle.allowed) {
          // Permitted → message persisted, count increases by exactly 1.
          const dto = await sendPromise;
          const after = await Message.countDocuments({});
          expect(after).toBe(before + 1);

          const persisted = await Message.findById(dto.id).lean();
          expect(persisted).not.toBeNull();
          expect(persisted!.senderId.toString()).toBe(parentId.toString());
          expect(persisted!.recipientId.toString()).toBe(facultyId.toString());
        } else {
          // Denied → 403 and no side effect on the total message count.
          await expect(sendPromise).rejects.toMatchObject({ statusCode: 403 });
          const after = await Message.countDocuments({});
          expect(after).toBe(before);
        }
      }),
      { numRuns: 100 },
    );
  });
});
