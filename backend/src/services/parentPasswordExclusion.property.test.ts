/**
 * Property-Based Test: Admin parents responses never expose passwords.
 *
 * Feature: communication-feedback-and-admin-apis, Property 19: Admin parents responses never expose passwords
 *
 * Property 19: For any parent corpus, no record returned by the admin parents
 * list contains a password (or password hash) field.
 *
 * The `Parent` schema marks `password` as `select: false`, and
 * `parentService.list` maps each document through `toParentResponse`, which
 * explicitly omits the password (Requirement 10.4). This test seeds parents
 * that DO carry a password value (a bcrypt-style hash), then asserts that no
 * record returned by the list — across varied search/active filters and
 * pagination — carries a `password` key or surfaces the seeded hash value in
 * any field.
 *
 * **Validates: Requirements 10.4**
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { parentService } from './parentService.js';
import Parent from '../models/Parent.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Parent.deleteMany({});
});

// ---------------------------------------------------------------------------
// Native-driver insert helper.
//
// Inserting via the native driver bypasses the bcrypt password-hashing save
// hook (and the `select: false` projection only applies on reads), so we can
// store an arbitrary password/hash value directly. This lets the property
// prove that the LIST output excludes it regardless of what is persisted.
// Each record uses a fresh ObjectId so values are unique within a run.
// ---------------------------------------------------------------------------

const RELATIONS = ['Father', 'Mother', 'Guardian', 'Other'] as const;

// Monotonic counter ensuring every seeded parent gets a unique phone number,
// which the schema enforces with a unique sparse index. (Uniqueness, not the
// specific value, is all this property requires.)
let phoneCounter = 1;

interface SeedParent {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  relationToStudent: (typeof RELATIONS)[number];
  isActive: boolean;
}

async function insertParent(p: SeedParent): Promise<void> {
  const _id = new mongoose.Types.ObjectId();
  await Parent.collection.insertOne({
    _id,
    parentId: `P-${_id}`,
    firstName: p.firstName,
    lastName: p.lastName,
    email: `${_id}@example.com`,
    phoneNumber: `+${(phoneCounter++).toString().padStart(11, '0')}`,
    password: p.password,
    relationToStudent: p.relationToStudent,
    isActive: p.isActive,
    isVerified: false,
    failedLoginAttempts: 0,
    deletedAt: null,
    isDemo: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
}

// A generator for a single parent record that always carries a non-empty
// password (a bcrypt-style hash) so the exclusion has something to exclude.
const parentArb = fc.record<SeedParent>({
  firstName: fc.string({ minLength: 1, maxLength: 12 }),
  lastName: fc.string({ minLength: 1, maxLength: 12 }),
  email: fc.constant(''), // overridden with a unique value at insert time
  password: fc.string({ minLength: 6, maxLength: 60 }).map((s) => `$2b$12$${s}`),
  relationToStudent: fc.constantFrom(...RELATIONS),
  isActive: fc.boolean(),
});

/**
 * Recursively determine whether any key named `password` (or a value equal to
 * one of the forbidden secrets) appears anywhere in a returned record.
 */
function exposesSecret(value: unknown, forbidden: Set<string>): boolean {
  if (typeof value === 'string') {
    return forbidden.has(value);
  }
  if (Array.isArray(value)) {
    return value.some((v) => exposesSecret(v, forbidden));
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase() === 'password') {
        return true;
      }
      if (exposesSecret(v, forbidden)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Property 19
// ---------------------------------------------------------------------------

// Feature: communication-feedback-and-admin-apis, Property 19: Admin parents responses never expose passwords
describe('Property 19: Admin parents responses never expose passwords', () => {
  it(
    'never returns a password (or password hash) field for any parent in the list',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(parentArb, { minLength: 1, maxLength: 6 }),
          fc.option(fc.constantFrom(true, false), { nil: undefined }),
          // Constrain the search term to alphanumerics: Property 19 only needs
          // the list exercised across filters, and regex-special characters
          // (whose handling is Property 18's concern) would otherwise produce
          // invalid `$regex` patterns unrelated to password exclusion.
          fc.option(
            fc
              .string({ maxLength: 4 })
              .map((s) => s.replace(/[^a-zA-Z0-9]/g, '')),
            { nil: undefined },
          ),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 150 }),
          async (parents, active, search, page, limit) => {
            await Parent.deleteMany({});

            const seededPasswords = new Set<string>();
            for (const p of parents) {
              seededPasswords.add(p.password);
              await insertParent(p);
            }

            const result = await parentService.list(
              { active, search },
              { page, limit },
            );

            // Every returned record must omit the password key entirely and
            // must not surface any seeded password/hash value in any field.
            for (const record of result.data) {
              expect(
                Object.prototype.hasOwnProperty.call(record, 'password'),
              ).toBe(false);
              expect(exposesSecret(record, seededPasswords)).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
