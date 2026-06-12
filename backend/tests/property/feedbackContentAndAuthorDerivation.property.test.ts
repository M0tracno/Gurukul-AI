/**
 * Property 11: Submitting feedback preserves content and derives the author
 * from the authenticated user.
 *
 * For any valid feedback submission, the persisted feedback's
 * authorId/authorModel/authorRole equal the values derived from `req.user`
 * (never from the request body), and its rating, comment, targetType, and
 * targetId round-trip unchanged.
 *
 * Feature: communication-feedback-and-admin-apis, Property 11: Submitting feedback preserves content and derives the author from the authenticated user
 *
 * **Validates: Requirements 6.1, 6.4**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import Feedback from '../../src/models/Feedback.js';
import Faculty from '../../src/models/Faculty.js';
import Course from '../../src/models/Course.js';
import AuditLog from '../../src/models/AuditLog.js';
import { feedbackService } from '../../src/services/feedbackService.js';
import type { SubmitFeedbackInput } from '../../src/services/feedbackService.js';
import type { AuditContext } from '../../src/utils/auditContext.js';
import type { UserRole } from '../../src/types/common.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Feedback.deleteMany({});
  await Faculty.deleteMany({});
  await Course.deleteMany({});
  await AuditLog.deleteMany({});
});

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

/** Seed a non-deleted Faculty target and return its id. */
async function seedFacultyTarget(): Promise<string> {
  const suffix = uniqueSuffix();
  const faculty = await Faculty.create({
    firstName: 'Tina',
    lastName: 'Teacher',
    email: `faculty_${suffix}@school.edu`,
    password: 'Password123',
    employeeId: `EMP-${suffix}`,
    department: 'Mathematics',
  });
  return String(faculty._id);
}

/** Seed a non-deleted Course target and return its id. */
async function seedCourseTarget(): Promise<string> {
  const suffix = uniqueSuffix();
  const course = await Course.create({
    title: 'Algebra',
    code: `MATH-${suffix}`,
    description: 'An introductory algebra course.',
    faculty: new mongoose.Types.ObjectId(),
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-01'),
    credits: 3,
  });
  return String(course._id);
}

// Only students and parents may author feedback (Requirement 6.1).
const roleArb = fc.constantFrom<UserRole>('student', 'parent');

const targetTypeArb = fc.constantFrom<'teacher' | 'course'>('teacher', 'course');

// Integer rating within the configured [1, 5] scale.
const ratingArb = fc.integer({ min: 1, max: 5 });

// A non-empty, already-trimmed comment so the schema's trim transform is a
// no-op and the comment round-trips byte-for-byte.
const commentArb = fc
  .string({ minLength: 1, maxLength: 300 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

function expectedAuthorFor(role: UserRole): {
  authorModel: string;
  authorRole: string;
} {
  return role === 'student'
    ? { authorModel: 'Student', authorRole: 'student' }
    : { authorModel: 'Parent', authorRole: 'parent' };
}

describe('Property 11: Submitting feedback preserves content and derives the author from the authenticated user', () => {
  it('derives author from req.user (never the body) and round-trips rating/comment/targetType/targetId', async () => {
    await fc.assert(
      fc.asyncProperty(
        roleArb,
        targetTypeArb,
        ratingArb,
        commentArb,
        async (role, targetType, rating, comment) => {
          await Feedback.deleteMany({});

          // The authenticated user (the only legitimate source of identity).
          const authenticatedId = new mongoose.Types.ObjectId().toString();
          // A bogus author identity smuggled in via the request body — it must
          // never be honored (Requirement 6.4).
          const bogusAuthorId = new mongoose.Types.ObjectId().toString();

          const targetId =
            targetType === 'teacher'
              ? await seedFacultyTarget()
              : await seedCourseTarget();

          // Build the input WITH extra author fields that an attacker might
          // try to supply; the service signature ignores them entirely.
          const input = {
            targetType,
            targetId,
            rating,
            comment,
            // Bogus, must-be-ignored fields:
            authorId: bogusAuthorId,
            authorModel: role === 'student' ? 'Parent' : 'Student',
            authorRole: role === 'student' ? 'parent' : 'student',
          } as unknown as SubmitFeedbackInput;

          const ctx: AuditContext = {
            userId: authenticatedId,
            role,
            ip: '127.0.0.1',
            correlationId: `corr_${uniqueSuffix()}`,
          };

          const result = await feedbackService.submit(
            authenticatedId,
            role,
            input,
            ctx,
          );

          const expected = expectedAuthorFor(role);

          // Author identity derives from the authenticated user, never the body.
          expect(result.authorId).toBe(authenticatedId);
          expect(result.authorId).not.toBe(bogusAuthorId);
          expect(result.authorModel).toBe(expected.authorModel);
          expect(result.authorRole).toBe(expected.authorRole);

          // Content round-trips unchanged.
          expect(result.rating).toBe(rating);
          expect(result.comment).toBe(comment);
          expect(result.targetType).toBe(targetType);
          expect(result.targetId).toBe(targetId);

          // The persisted document agrees with the returned DTO.
          const persisted = await Feedback.findById(result.id).lean();
          expect(persisted).not.toBeNull();
          expect(String(persisted!.authorId)).toBe(authenticatedId);
          expect(String(persisted!.authorId)).not.toBe(bogusAuthorId);
          expect(persisted!.authorModel).toBe(expected.authorModel);
          expect(persisted!.authorRole).toBe(expected.authorRole);
          expect(persisted!.rating).toBe(rating);
          expect(persisted!.comment).toBe(comment);
          expect(persisted!.targetType).toBe(targetType);
          expect(String(persisted!.targetId)).toBe(targetId);
        },
      ),
      { numRuns: 100 },
    );
  }, 300000);
});
