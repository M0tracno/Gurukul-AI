/**
 * Property-Based Tests: Parent linkage storage normalization and idempotency.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 18: Linkage storage normalizes the phone and is idempotent
 *
 * Property 18: For any admin link operation, the stored `linkagePhone` equals
 * `normalizePhone(input)` and the relation references both the parent and the
 * specific student; linking the same `(student, normalized phone)` pair more
 * than once results in exactly one active linkage (no duplicates).
 *
 * **Validates: Requirements 7.1, 7.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { ParentLinkageService } from './parentLinkageService.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import AuditLog from '../models/AuditLog.js';
import { normalizePhone } from '../utils/phone.js';
import type { AuditContext } from '../utils/auditContext.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let service: ParentLinkageService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Ensure the partial unique index on { studentId, linkagePhone } is built so
  // idempotency is enforced at the persistence layer as well as in the service.
  await ParentStudentRelation.createIndexes();
  service = new ParentLinkageService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ParentStudentRelation.deleteMany({});
  await AuditLog.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

/**
 * Significant phone digits: 8–13 digits with a non-zero leading digit so the
 * `00` international-prefix handling in `normalizePhone` is unambiguous.
 */
const digitsArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 1, max: 9 }),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 12 }),
  )
  .map(([head, rest]) => `${head}${rest.join('')}`);

/**
 * Build several formatting variants of the same number that all canonicalize
 * to `+<digits>` via `normalizePhone` (differing only in spaces, punctuation,
 * or `+` vs `00` country-code formatting).
 */
function formattingVariants(digits: string): string[] {
  const spaced = `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  const dashed = `+${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  const parens = `+(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return [
    `+${digits}`, // canonical
    spaced, // spaces
    dashed, // hyphens
    parens, // parentheses + space
    `00${digits}`, // 00 international prefix == leading '+'
    `  +${digits}  `, // surrounding whitespace
  ];
}

/** Pick a formatting-variant index within the available range. */
const variantIndexArb = fc.integer({ min: 0, max: 5 });

const auditCtx: AuditContext = {
  userId: '507f1f77bcf86cd799439011',
  role: 'admin',
  ip: '127.0.0.1',
  correlationId: 'pbt-correlation',
};

// ---------------------------------------------------------------------------
// Property 18
// ---------------------------------------------------------------------------

describe('Property 18: Linkage storage normalizes the phone and is idempotent', () => {
  it('stores the normalized phone, references both parties, and re-linking an equivalent phone yields exactly one active linkage', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        digitsArb,
        variantIndexArb,
        variantIndexArb,
        async (parentId, studentId, digits, firstVariant, secondVariant) => {
          // Isolate each run so prior linkages do not interfere.
          await ParentStudentRelation.deleteMany({});

          const variants = formattingVariants(digits);
          const firstInput = variants[firstVariant]!;
          const secondInput = variants[secondVariant]!;
          const canonical = normalizePhone(firstInput);

          // --- First link: normalization + references (Req 7.1) ---
          const first = await service.link(parentId, studentId, firstInput, auditCtx);

          // Stored linkagePhone equals normalizePhone(input).
          const stored = await ParentStudentRelation.findById(first._id).exec();
          expect(stored).not.toBeNull();
          expect(stored!.linkagePhone).toBe(canonical);

          // Relation references both the parent and the specific student.
          expect(String(stored!.parentId)).toBe(parentId);
          expect(String(stored!.studentId)).toBe(studentId);

          // Admin DTO exposes the canonical phone and both refs.
          expect(first.linkagePhone).toBe(canonical);
          expect(first.parentId).toBe(parentId);
          expect(first.studentId).toBe(studentId);
          expect(first.isActive).toBe(true);

          // --- Re-link with an equivalent (re-formatted) phone (Req 7.3) ---
          const second = await service.link(parentId, studentId, secondInput, auditCtx);

          // Idempotent: the same active linkage is returned, not a new one.
          expect(second._id).toBe(first._id);

          // Exactly one active linkage exists for this (studentId, phone).
          const activeCount = await ParentStudentRelation.countDocuments({
            studentId,
            linkagePhone: canonical,
            isActive: true,
          }).exec();
          expect(activeCount).toBe(1);

          // And only one linkage total for the student in this isolated run.
          const totalForStudent = await ParentStudentRelation.countDocuments({
            studentId,
          }).exec();
          expect(totalForStudent).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
