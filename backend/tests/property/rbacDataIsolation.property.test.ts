/**
 * Property 9: RBAC Data Isolation
 *
 * Feature: gurukul-ai-modernization, Property 9: RBAC Data Isolation
 *
 * For any two distinct students A and B, a request authenticated as student A
 * to access student B's records SHALL be rejected with HTTP 403.
 * For any parent, data access SHALL be limited to their linked ward's records only.
 *
 * **Validates: Requirements 4.3**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import { AuthorizationService } from '../../src/services/authorizationService.js';
import { StudentService } from '../../src/services/studentService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register ParentStudentRelation model for parent access tests
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
  // Clean up all collections between tests
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

/**
 * Generates a valid ObjectId string using mongoose.
 * Each invocation produces a fresh, unique ObjectId.
 */
const objectIdArb = fc.constant(null).map(() => new mongoose.Types.ObjectId().toString());

/**
 * Generates a pair of distinct ObjectIds.
 */
const distinctIdPairArb = fc.tuple(objectIdArb, objectIdArb).filter(([a, b]) => a !== b);

describe('Property 9: RBAC Data Isolation', () => {
  const authorizationService = new AuthorizationService();

  describe('Student A cannot access Student B records', () => {
    /**
     * For any two distinct student IDs A and B,
     * assertStudentOwnership(A, B, 'student') should throw HTTP 403.
     */
    it('should reject with 403 when student A tries to access student B records', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([studentAId, studentBId]) => {
          let error: AppError | null = null;

          try {
            authorizationService.assertStudentOwnership(studentAId, studentBId, 'student');
          } catch (err) {
            error = err as AppError;
          }

          // Must throw an error
          expect(error).not.toBeNull();
          expect(error).toBeInstanceOf(AppError);
          // Must be HTTP 403 Forbidden
          expect(error!.statusCode).toBe(403);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any student ID, assertStudentOwnership(A, A, 'student') should NOT throw —
     * a student CAN access their own records. This is the complementary property.
     */
    it('should allow access when student accesses their own records (control property)', async () => {
      await fc.assert(
        fc.asyncProperty(objectIdArb, async (studentId) => {
          expect(() => {
            authorizationService.assertStudentOwnership(studentId, studentId, 'student');
          }).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Parent can only access linked ward records', () => {
    /**
     * For any parent ID and any student ID where no ParentStudentRelation exists,
     * assertParentAccess should throw HTTP 403.
     */
    it('should reject with 403 when parent tries to access an unlinked student', async () => {
      await fc.assert(
        fc.asyncProperty(distinctIdPairArb, async ([parentId, unlinkedStudentId]) => {
          // No relation exists in the DB (DB is cleaned between each test run,
          // and we don't insert any relation here)
          let error: AppError | null = null;

          try {
            await authorizationService.assertParentAccess(parentId, unlinkedStudentId, 'parent');
          } catch (err) {
            error = err as AppError;
          }

          // Must throw an error
          expect(error).not.toBeNull();
          expect(error).toBeInstanceOf(AppError);
          // Must be HTTP 403 Forbidden
          expect(error!.statusCode).toBe(403);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any parent with an active relation to a student (linked ward),
     * assertParentAccess should NOT throw.
     */
    it('should allow access when parent accesses their linked ward', async () => {
      const ParentStudentRelation = mongoose.models['ParentStudentRelation']!;

      await fc.assert(
        fc.asyncProperty(objectIdArb, objectIdArb, async (parentId, studentId) => {
          // Create an active relation between this parent and student
          await ParentStudentRelation.create({
            parentId: new mongoose.Types.ObjectId(parentId),
            studentId: new mongoose.Types.ObjectId(studentId),
            isActive: true,
          });

          // Should NOT throw - parent has valid relation to this student
          await expect(
            authorizationService.assertParentAccess(parentId, studentId, 'parent'),
          ).resolves.toBeUndefined();

          // Clean up for next iteration
          await ParentStudentRelation.deleteMany({});
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any parent with an inactive (revoked) relation to a student,
     * assertParentAccess should throw HTTP 403.
     */
    it('should reject with 403 when parent relation is inactive', async () => {
      const ParentStudentRelation = mongoose.models['ParentStudentRelation']!;

      await fc.assert(
        fc.asyncProperty(objectIdArb, objectIdArb, async (parentId, studentId) => {
          // Create an INACTIVE relation between this parent and student
          await ParentStudentRelation.create({
            parentId: new mongoose.Types.ObjectId(parentId),
            studentId: new mongoose.Types.ObjectId(studentId),
            isActive: false,
          });

          let error: AppError | null = null;

          try {
            await authorizationService.assertParentAccess(parentId, studentId, 'parent');
          } catch (err) {
            error = err as AppError;
          }

          // Must throw an error — inactive relations don't grant access
          expect(error).not.toBeNull();
          expect(error).toBeInstanceOf(AppError);
          expect(error!.statusCode).toBe(403);

          // Clean up for next iteration
          await ParentStudentRelation.deleteMany({});
        }),
        { numRuns: 100 },
      );
    });
  });
});
