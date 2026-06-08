/**
 * Property 23: Messaging RBAC Restrictions
 *
 * Feature: gurukul-ai-modernization, Property 23: Messaging RBAC Restrictions
 *
 * For any user pair (sender, recipient), messaging SHALL only be permitted if
 * the relationship satisfies: Students can message only assigned Teachers,
 * Parents can message only their ward's Teachers, Teachers can message
 * Students/Parents within their courses. All other pairs SHALL be rejected.
 *
 * **Validates: Requirements 8.9**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import { validateMessagingPermission } from '../../src/realtime/messagingRbac.js';
import Course from '../../src/models/Course.js';
import Enrollment from '../../src/models/Enrollment.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register ParentStudentRelation model if not already registered
  if (!mongoose.models['ParentStudentRelation']) {
    mongoose.model(
      'ParentStudentRelation',
      new mongoose.Schema(
        {
          parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
          isActive: { type: Boolean, default: true },
        },
        { collection: 'parent_student_relations' },
      ),
    );
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

/**
 * Generates a valid ObjectId string.
 */
const objectIdArb = fc.constant(null).map(() => new mongoose.Types.ObjectId().toString());

/**
 * Generates a pair of distinct ObjectIds.
 */
const distinctIdPairArb = fc.tuple(objectIdArb, objectIdArb).filter(([a, b]) => a !== b);

/**
 * Generates a recipient model type that is NOT Faculty (i.e., invalid recipient for students/parents).
 */
const nonFacultyRecipientModelArb = fc.constantFrom('Parent' as const, 'Student' as const);

/**
 * Generates any recipient model type.
 */
const recipientModelArb = fc.constantFrom('Parent' as const, 'Faculty' as const, 'Student' as const);

describe('Property 23: Messaging RBAC Restrictions', () => {
  describe('Student messaging restrictions - unauthorized pairs rejected', () => {
    /**
     * For any student attempting to message a non-Faculty recipient (Parent or Student),
     * the permission check SHALL reject the message.
     */
    it('should reject student messaging a non-Faculty recipient (Parent or Student)', async () => {
      await fc.assert(
        fc.asyncProperty(
          distinctIdPairArb,
          nonFacultyRecipientModelArb,
          async ([studentId, recipientId], recipientModel) => {
            const result = await validateMessagingPermission(
              studentId,
              'student',
              recipientId,
              recipientModel,
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any student messaging a Faculty member who does NOT teach any of the
     * student's enrolled courses, the permission check SHALL reject.
     */
    it('should reject student messaging a teacher not assigned to their courses', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([studentId, teacherId]) => {
          // No enrollments/courses exist in the DB, so the student has no assigned teacher
          const result = await validateMessagingPermission(
            studentId,
            'student',
            teacherId,
            'Faculty',
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any student who IS enrolled in a course taught by a specific teacher,
     * the permission check SHALL allow the message.
     */
    it('should allow student messaging an assigned teacher (valid relationship)', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([studentId, teacherId]) => {
          const studentOid = new mongoose.Types.ObjectId(studentId);
          const teacherOid = new mongoose.Types.ObjectId(teacherId);

          // Create a course taught by the teacher
          const course = await Course.create({
            title: 'Test Course',
            code: `CS-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
            description: 'A test course',
            faculty: teacherOid,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-06-01'),
            credits: 3,
          });

          // Enroll the student in the course
          await Enrollment.create({
            student: studentOid,
            course: course._id,
            status: 'active',
          });

          const result = await validateMessagingPermission(
            studentId,
            'student',
            teacherId,
            'Faculty',
          );

          expect(result.allowed).toBe(true);

          // Clean up for next iteration
          await Enrollment.deleteMany({});
          await Course.deleteMany({});
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Parent messaging restrictions - unauthorized pairs rejected', () => {
    /**
     * For any parent attempting to message a non-Faculty recipient (Parent or Student),
     * the permission check SHALL reject the message.
     */
    it('should reject parent messaging a non-Faculty recipient', async () => {
      await fc.assert(
        fc.asyncProperty(
          distinctIdPairArb,
          nonFacultyRecipientModelArb,
          async ([parentId, recipientId], recipientModel) => {
            const result = await validateMessagingPermission(
              parentId,
              'parent',
              recipientId,
              recipientModel,
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any parent with no linked ward or no ward enrolled in the teacher's courses,
     * the permission check SHALL reject the message.
     */
    it('should reject parent messaging a teacher when no ward relationship exists', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([parentId, teacherId]) => {
          // No parent-student relations exist → messaging should be rejected
          const result = await validateMessagingPermission(
            parentId,
            'parent',
            teacherId,
            'Faculty',
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any parent whose ward IS enrolled in a course taught by the recipient teacher,
     * the permission check SHALL allow the message.
     */
    it('should allow parent messaging their ward\'s teacher (valid relationship)', async () => {
      const ParentStudentRelation = mongoose.models['ParentStudentRelation']!;

      await fc.assert(
        fc.asyncProperty(
          objectIdArb,
          objectIdArb,
          objectIdArb,
          async (parentId, studentId, teacherId) => {
            const parentOid = new mongoose.Types.ObjectId(parentId);
            const studentOid = new mongoose.Types.ObjectId(studentId);
            const teacherOid = new mongoose.Types.ObjectId(teacherId);

            // Create parent-student relationship
            await ParentStudentRelation.create({
              parentId: parentOid,
              studentId: studentOid,
              isActive: true,
            });

            // Create a course taught by the teacher
            const course = await Course.create({
              title: 'Test Course',
              code: `CS-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
              description: 'A test course',
              faculty: teacherOid,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-06-01'),
              credits: 3,
            });

            // Enroll the student (ward) in the course
            await Enrollment.create({
              student: studentOid,
              course: course._id,
              status: 'active',
            });

            const result = await validateMessagingPermission(
              parentId,
              'parent',
              teacherId,
              'Faculty',
            );

            expect(result.allowed).toBe(true);

            // Clean up for next iteration
            await ParentStudentRelation.deleteMany({});
            await Enrollment.deleteMany({});
            await Course.deleteMany({});
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Teacher messaging restrictions - unauthorized pairs rejected', () => {
    /**
     * For any teacher attempting to message another Faculty member,
     * the permission check SHALL reject the message.
     */
    it('should reject teacher messaging another Faculty member', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([teacherId, otherTeacherId]) => {
          const result = await validateMessagingPermission(
            teacherId,
            'teacher',
            otherTeacherId,
            'Faculty',
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any teacher attempting to message a Student who is NOT enrolled
     * in any of the teacher's courses, the permission check SHALL reject.
     */
    it('should reject teacher messaging a student not in their courses', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([teacherId, studentId]) => {
          // No courses or enrollments exist → teacher has no students
          const result = await validateMessagingPermission(
            teacherId,
            'teacher',
            studentId,
            'Student',
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any teacher attempting to message a Parent whose ward is NOT enrolled
     * in any of the teacher's courses, the permission check SHALL reject.
     */
    it('should reject teacher messaging a parent whose ward is not in their courses', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([teacherId, parentId]) => {
          // No courses, enrollments, or relations exist
          const result = await validateMessagingPermission(
            teacherId,
            'teacher',
            parentId,
            'Parent',
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any teacher who teaches a course that a student is enrolled in,
     * the permission check SHALL allow the teacher to message that student.
     */
    it('should allow teacher messaging a student in their courses (valid relationship)', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([teacherId, studentId]) => {
          const teacherOid = new mongoose.Types.ObjectId(teacherId);
          const studentOid = new mongoose.Types.ObjectId(studentId);

          // Create a course taught by the teacher
          const course = await Course.create({
            title: 'Test Course',
            code: `CS-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
            description: 'A test course',
            faculty: teacherOid,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-06-01'),
            credits: 3,
          });

          // Enroll the student in the teacher's course
          await Enrollment.create({
            student: studentOid,
            course: course._id,
            status: 'active',
          });

          const result = await validateMessagingPermission(
            teacherId,
            'teacher',
            studentId,
            'Student',
          );

          expect(result.allowed).toBe(true);

          // Clean up for next iteration
          await Enrollment.deleteMany({});
          await Course.deleteMany({});
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any teacher who teaches a course where a parent's ward is enrolled,
     * the permission check SHALL allow the teacher to message that parent.
     */
    it('should allow teacher messaging a parent whose ward is in their courses', async () => {
      const ParentStudentRelation = mongoose.models['ParentStudentRelation']!;

      await fc.assert(
        fc.asyncProperty(
          objectIdArb,
          objectIdArb,
          objectIdArb,
          async (teacherId, parentId, studentId) => {
            const teacherOid = new mongoose.Types.ObjectId(teacherId);
            const parentOid = new mongoose.Types.ObjectId(parentId);
            const studentOid = new mongoose.Types.ObjectId(studentId);

            // Create parent-student relationship
            await ParentStudentRelation.create({
              parentId: parentOid,
              studentId: studentOid,
              isActive: true,
            });

            // Create a course taught by the teacher
            const course = await Course.create({
              title: 'Test Course',
              code: `CS-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
              description: 'A test course',
              faculty: teacherOid,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-06-01'),
              credits: 3,
            });

            // Enroll the parent's ward in the teacher's course
            await Enrollment.create({
              student: studentOid,
              course: course._id,
              status: 'active',
            });

            const result = await validateMessagingPermission(
              teacherId,
              'teacher',
              parentId,
              'Parent',
            );

            expect(result.allowed).toBe(true);

            // Clean up for next iteration
            await ParentStudentRelation.deleteMany({});
            await Enrollment.deleteMany({});
            await Course.deleteMany({});
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('All unauthorized sender-recipient pairs are rejected', () => {
    /**
     * For any random sender role and recipient model combination that does NOT
     * have a valid relationship in the database, the message SHALL be rejected.
     * This is the comprehensive property test verifying RBAC across all roles.
     */
    it('should reject all unauthorized sender-recipient pairs without valid relationships', async () => {
      const senderRoleArb = fc.constantFrom(
        'student' as const,
        'parent' as const,
        'teacher' as const,
      );

      await fc.assert(
        fc.asyncProperty(
          distinctIdPairArb,
          senderRoleArb,
          recipientModelArb,
          async ([senderId, recipientId], senderRole, recipientModel) => {
            // No relationships exist in DB (cleaned between each test)
            const result = await validateMessagingPermission(
              senderId,
              senderRole,
              recipientId,
              recipientModel,
            );

            // Without any valid relationship in the DB, ALL non-admin pairs
            // should be rejected
            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Admin can always message anyone regardless of recipient model —
     * this is the complementary control property demonstrating that
     * authorized senders ARE permitted.
     */
    it('should allow admin to message any recipient (control property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          distinctIdPairArb,
          recipientModelArb,
          async ([adminId, recipientId], recipientModel) => {
            const result = await validateMessagingPermission(
              adminId,
              'admin',
              recipientId,
              recipientModel,
            );

            expect(result.allowed).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
