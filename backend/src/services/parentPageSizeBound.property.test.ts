/**
 * Property-Based Test: Admin parents list page size is bounded.
 *
 * Feature: communication-feedback-and-admin-apis, Property 17: Admin parents page size is bounded
 *
 * Property 17: For any requested `limit`, the number of records returned by the
 * admin parents list is at most `min(requestedLimit, 100)`, and the effective
 * page size (reported in `meta.limit`) never exceeds 100.
 *
 * The corpus is seeded with strictly more than 100 parents so that large
 * requested limits actually exercise the 100-record cap rather than being
 * bounded only by how many records exist.
 *
 * **Validates: Requirements 10.2**
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { parentService } from './parentService.js';
import Parent from '../models/Parent.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// More than 100 records so the cap is genuinely exercised by large limits.
const CORPUS_SIZE = 130;

// The maximum effective page size enforced by parentService.list (Req 10.2).
const MAX_PAGE_SIZE = 100;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Seed a fixed corpus once. insertMany applies schema defaults + timestamps
  // (createdAt is the default sort key) without the per-document bcrypt save
  // hook, keeping 100+ property runs well within the test budget.
  const docs = Array.from({ length: CORPUS_SIZE }, (_, i) => ({
    parentId: `P-${String(i).padStart(4, '0')}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    relationToStudent: 'Other' as const,
  }));
  await Parent.insertMany(docs);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Property 17
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 17: Admin parents page size is bounded
describe('Property 17: Admin parents page size is bounded', () => {
  it('never returns more than min(requestedLimit, 100) records and caps the effective page size at 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Requested limits spanning below, at, and well above the cap.
        fc.integer({ min: 1, max: 500 }),
        async (requestedLimit) => {
          const result = await parentService.list(
            {},
            { page: 1, limit: requestedLimit },
          );

          // The effective page size reported in meta never exceeds 100.
          expect(result.meta.limit).toBeLessThanOrEqual(MAX_PAGE_SIZE);

          // The number of records returned is at most min(requestedLimit, 100).
          const expectedBound = Math.min(requestedLimit, MAX_PAGE_SIZE);
          expect(result.data.length).toBeLessThanOrEqual(expectedBound);

          // And never more than the effective page size itself.
          expect(result.data.length).toBeLessThanOrEqual(result.meta.limit);
        },
      ),
      { numRuns: 100 },
    );
  });
});
