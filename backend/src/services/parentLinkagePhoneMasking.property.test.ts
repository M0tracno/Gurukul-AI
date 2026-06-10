/**
 * Property-Based Tests: Parent linkage phone masking by viewer role.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 19: Linkage phone is masked for non-admin viewers
 *
 * Property 19: For any seeded linkage, `listForStudent` exposes the full
 * `linkagePhone` only to the `admin` viewer role. Non-admin viewers
 * (`teacher`, `faculty`, `student`, `parent`) receive a `maskedPhone` that
 * reveals at most the final four digits, and the full canonical phone value
 * never appears anywhere in the returned DTO.
 *
 * **Validates: Requirements 7.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { ParentLinkageService, type LinkageDTO } from './parentLinkageService.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import AuditLog from '../models/AuditLog.js';
import { normalizePhone } from '../utils/phone.js';
import type { UserRole } from '../types/common.js';
import type { AuditContext } from '../utils/auditContext.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let service: ParentLinkageService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

/** Non-admin viewer roles (Req 7.5). */
const nonAdminRoleArb = fc.constantFrom<UserRole>('teacher', 'faculty', 'student', 'parent');

const auditCtx: AuditContext = {
  userId: '507f1f77bcf86cd799439011',
  role: 'admin',
  ip: '127.0.0.1',
  correlationId: 'pbt-correlation',
};

/** Collect every string value reachable from a DTO for substring scanning. */
function collectStrings(dto: LinkageDTO): string[] {
  return Object.values(dto)
    .filter((v): v is string => typeof v === 'string');
}

// ---------------------------------------------------------------------------
// Property 19
// ---------------------------------------------------------------------------

describe('Property 19: Linkage phone is masked for non-admin viewers', () => {
  it('returns the full linkagePhone only to admin; non-admin viewers get a masked value and never the full phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        digitsArb,
        nonAdminRoleArb,
        async (parentId, studentId, digits, nonAdminRole) => {
          // Isolate each run so prior linkages do not interfere.
          await ParentStudentRelation.deleteMany({});

          const input = `+${digits}`;
          const canonical = normalizePhone(input);

          // Seed a linkage with a known normalized phone.
          await service.link(parentId, studentId, input, auditCtx);

          // --- Admin viewer: full phone exposed (Req 7.5) ---
          const adminList = await service.listForStudent(studentId, 'admin');
          expect(adminList).toHaveLength(1);
          const adminDto = adminList[0]!;
          expect(adminDto.linkagePhone).toBe(canonical);

          // --- Non-admin viewer: masked only, full value never present (Req 7.5) ---
          const nonAdminList = await service.listForStudent(studentId, nonAdminRole);
          expect(nonAdminList).toHaveLength(1);
          const nonAdminDto = nonAdminList[0]!;

          // No full phone field at all.
          expect(nonAdminDto.linkagePhone).toBeUndefined();

          // A masked phone is present.
          expect(typeof nonAdminDto.maskedPhone).toBe('string');
          expect(nonAdminDto.maskedPhone!.length).toBeGreaterThan(0);

          // The full canonical phone never appears anywhere in the DTO.
          for (const value of collectStrings(nonAdminDto)) {
            expect(value.includes(canonical)).toBe(false);
          }

          // The mask reveals at most the final four digits and nothing more of
          // the significant number: stripping the last 4 leaves no run of the
          // original digits exposed.
          const last4 = digits.slice(-4);
          expect(nonAdminDto.maskedPhone!.endsWith(last4)).toBe(true);
          // The leading digits (everything except the final four) are hidden.
          const hiddenPortion = digits.slice(0, -4);
          if (hiddenPortion.length > 0) {
            expect(nonAdminDto.maskedPhone!.includes(hiddenPortion)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
