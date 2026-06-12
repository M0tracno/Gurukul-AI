/**
 * Property-Based Tests: Admin parents search returns only matching records.
 *
 * Feature: communication-feedback-and-admin-apis, Property 18: Admin parents search returns only matching records
 *
 * Property 18: For any search term and parent corpus, every returned parent
 * matches the term (case-insensitively) in at least one searchable field
 * (first name, last name, email, phone, or parent id).
 *
 * **Validates: Requirements 10.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { ParentService } from './parentService.js';
import Parent from '../models/Parent.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let service: ParentService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  service = new ParentService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Parent.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Short tokens drawn from a small lowercase alphabet. Restricting to plain
 * alphanumerics (no regex metacharacters) keeps the service's case-insensitive
 * `$regex` substring match equivalent to JavaScript's `String.includes`, which
 * is what the verification below relies on. The small alphabet and short length
 * ensure search terms frequently match seeded fields so the property exercises
 * real (non-empty) result sets.
 */
const tokenArb = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc
    .array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2'), {
      minLength,
      maxLength,
    })
    .map((chars) => chars.join(''));

/**
 * Digits-only tokens for the phone number, which must satisfy the Parent phone
 * validator (digits/spaces/dashes/parens only). Drawn from a small set of
 * digits that overlaps the search-term alphabet so search terms can match phones.
 */
const phoneTokenArb = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc
    .array(fc.constantFrom('0', '1', '2', '3', '4'), { minLength, maxLength })
    .map((chars) => chars.join(''));

/** One parent's searchable content (uniqueness suffixes are added at seed time). */
interface ParentSpec {
  first: string;
  last: string;
  emailLocal: string;
  phoneDigits: string;
  parentIdToken: string;
  hasEmail: boolean;
  hasPhone: boolean;
}

const parentSpecArb: fc.Arbitrary<ParentSpec> = fc.record({
  first: tokenArb(1, 4),
  last: tokenArb(1, 4),
  emailLocal: tokenArb(1, 4),
  phoneDigits: phoneTokenArb(2, 5),
  parentIdToken: tokenArb(1, 4),
  hasEmail: fc.boolean(),
  hasPhone: fc.boolean(),
});

// Keep the corpus at or below the service's max page size (100) so a single
// page returns ALL matches, letting the property check every match for
// soundness.
const corpusArb = fc.array(parentSpecArb, { minLength: 1, maxLength: 30 });

const searchTermArb = tokenArb(1, 3);

// ---------------------------------------------------------------------------
// Property 18
// ---------------------------------------------------------------------------

// Feature: communication-feedback-and-admin-apis, Property 18: Admin parents search returns only matching records
describe('Property 18: Admin parents search returns only matching records', () => {
  it('every returned parent matches the search term (case-insensitively) in at least one searchable field', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, searchTermArb, async (specs, searchTerm) => {
        // Isolate each run so prior corpora do not interfere.
        await Parent.deleteMany({});

        // Seed the corpus. Append the index to the unique fields (parentId,
        // email local part, phone digits) to guarantee uniqueness within the
        // run without removing the random searchable token, which remains a
        // substring of the stored value.
        await Promise.all(
          specs.map((s, i) => {
            const doc: Record<string, unknown> = {
              parentId: `P${s.parentIdToken}${i}`,
              firstName: s.first,
              lastName: s.last,
              relationToStudent: 'Other',
            };
            if (s.hasEmail) {
              doc.email = `${s.emailLocal}${i}@example.com`;
            }
            if (s.hasPhone) {
              // Build a value that satisfies the Parent phone validator
              // (^\+?[\d\s\-()]{10,15}$): a '+' plus 10-13 digits.
              const padded = `${s.phoneDigits}${i}`.padEnd(10, '0').slice(0, 13);
              doc.phoneNumber = `+${padded}`;
            }
            return Parent.create(doc);
          }),
        );

        const result = await service.list(
          { search: searchTerm },
          { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
        );

        const needle = searchTerm.toLowerCase();

        // Soundness: every returned parent matches the term in at least one
        // searchable field (first name, last name, email, phone, parent id).
        for (const parent of result.data) {
          const searchableFields = [
            parent.firstName,
            parent.lastName,
            parent.email ?? '',
            parent.phoneNumber ?? '',
            parent.parentId,
          ];
          const matches = searchableFields.some((field) =>
            field.toLowerCase().includes(needle),
          );
          expect(matches).toBe(true);
        }

        // The returned page never exceeds the total reported in meta.
        expect(result.data.length).toBeLessThanOrEqual(result.meta.total);
      }),
      { numRuns: 100 },
    );
  });
});
