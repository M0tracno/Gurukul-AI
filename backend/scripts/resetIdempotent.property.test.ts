/**
 * Property-Based Tests: Demo-only, idempotent data reset.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 25: Reset removes only demo records and is idempotent
 *
 * Property 25: For any mixed dataset of demo (`isDemo: true`) and real records
 * (`isDemo: false` or the field omitted), a successful reset removes exactly the
 * demo records and leaves all real records unchanged. Running the reset again
 * with the same inputs produces the same final data state (idempotence).
 *
 * **Validates: Requirements 10.4, 10.5**
 *
 * The test drives the REAL `performReset` against REAL Mongoose models bound to
 * an in-memory MongoDB, so `deleteMany({ isDemo: true })` is genuinely
 * exercised. Records are inserted via the native driver (`collection.insertOne`)
 * to bypass schema validation/hooks, allowing minimal mixed datasets where the
 * `isDemo` field is `true`, `false`, or entirely absent.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  performReset,
  type ResetOptions,
  type ResetDeps,
  type DemoCollection,
} from './resetDemoData.js';
import Student from '../src/models/Student.js';
import Faculty from '../src/models/Faculty.js';
import Parent from '../src/models/Parent.js';
import ParentStudentRelation from '../src/models/ParentStudentRelation.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

/**
 * Demo collections built from the imported real models. Mirrors
 * `defaultDemoCollections()` but constructed locally so the test owns the
 * model references it inserts/asserts against.
 */
const collections: DemoCollection[] = [
  { name: 'students', model: Student },
  { name: 'faculties', model: Faculty },
  { name: 'parents', model: Parent },
  { name: 'parent_student_relations', model: ParentStudentRelation },
];

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all(collections.map(({ model }) => model.deleteMany({})));
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * How a "real" (non-demo) record encodes its non-demo status: either an
 * explicit `isDemo: false` or the field omitted entirely. Both must survive a
 * reset that targets `{ isDemo: true }`.
 */
const realModeArb = fc.constantFrom<'false' | 'absent'>('false', 'absent');

/**
 * Per-collection dataset shape: a count of demo records and a list of "real"
 * record encodings. Counts can be 0 to cover empty/edge cases.
 */
const collectionDatasetArb = fc.record({
  demoCount: fc.integer({ min: 0, max: 6 }),
  realModes: fc.array(realModeArb, { minLength: 0, maxLength: 6 }),
});

/** One dataset per demo collection, in collection order. */
const datasetArb = fc.array(collectionDatasetArb, {
  minLength: collections.length,
  maxLength: collections.length,
});

// ResetOptions that PASS the guards (Req 10.2/10.3 not the focus here).
const passingOptions: ResetOptions = {
  confirm: true,
  env: 'test',
  allowProdReset: false,
  actor: 'test',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Monotonic counter guaranteeing globally-unique values across the whole run.
// The real collections carry unique indexes (email, studentId, employeeId,
// parentId, ...); native inserts skip schema defaults, so we must supply
// distinct values for every unique-indexed field to avoid duplicate-key errors.
let uid = 0;

/**
 * Build a document carrying unique values for every unique-indexed field used
 * across the demo collections. Surplus fields on a given collection are
 * harmless. `isDemo` is set per the `demo` flag (and omitted entirely when
 * requested) so reset filtering on `{ isDemo: true }` is genuinely exercised.
 */
function makeDoc(opts: { demo: boolean; isDemoMode?: 'false' | 'absent' }) {
  const n = (uid += 1);
  const doc: Record<string, unknown> = {
    tag: opts.demo ? `demo-${n}` : `real-${n}`,
    email: `u${n}@demo.test`,
    studentId: `S${n}`,
    employeeId: `E${n}`,
    parentId: `P${n}`,
    phoneNumber: `+1555${String(n).padStart(7, '0')}`,
    linkagePhone: `+1555${String(n).padStart(7, '0')}`,
  };
  if (opts.demo) {
    doc.isDemo = true;
  } else if (opts.isDemoMode === 'false') {
    doc.isDemo = false;
  }
  // 'absent' mode: leave isDemo off entirely.
  return doc;
}

/** Insert `count` demo documents into a collection via the native driver. */
async function insertDemo(model: DemoCollection['model'], count: number) {
  // The native collection bypasses schema validation/hooks so we can persist
  // minimal documents carrying only the `isDemo` marker.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coll = (model as any).collection;
  for (let i = 0; i < count; i += 1) {
    await coll.insertOne(makeDoc({ demo: true }));
  }
}

/**
 * Insert "real" documents (isDemo:false or omitted) and return their `_id`s so
 * we can assert they remain untouched.
 */
async function insertReal(
  model: DemoCollection['model'],
  modes: Array<'false' | 'absent'>
): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coll = (model as any).collection;
  const ids = new Set<string>();
  for (let i = 0; i < modes.length; i += 1) {
    const res = await coll.insertOne(
      makeDoc({ demo: false, isDemoMode: modes[i] })
    );
    ids.add(String(res.insertedId));
  }
  return ids;
}

/** Snapshot the current set of `_id`s present in a collection. */
async function idSet(model: DemoCollection['model']): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = await (model as any).collection
    .find({}, { projection: { _id: 1 } })
    .toArray();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Set(docs.map((d: any) => String(d._id)));
}

/** Count documents matching `{ isDemo: true }` via the native driver. */
async function demoCount(model: DemoCollection['model']): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (model as any).collection.countDocuments({ isDemo: true });
}

// ---------------------------------------------------------------------------
// Property 25
// ---------------------------------------------------------------------------

describe('Property 25: Reset removes only demo records and is idempotent', () => {
  it('removes only demo records, leaves real records unchanged, and is idempotent across re-runs', async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, async (datasets) => {
        // Fresh DB each run so prior iterations cannot interfere.
        await Promise.all(collections.map(({ model }) => model.deleteMany({})));

        // --- Arrange: seed a mixed demo/real dataset per collection ---
        const expectedDeleted: Record<string, number> = {};
        const realIdsByCollection: Record<string, Set<string>> = {};

        for (let c = 0; c < collections.length; c += 1) {
          const { name, model } = collections[c]!;
          const { demoCount: dCount, realModes } = datasets[c]!;

          await insertDemo(model, dCount);
          const realIds = await insertReal(model, realModes);

          expectedDeleted[name] = dCount;
          realIdsByCollection[name] = realIds;
        }

        const writeAudit = jest.fn(async () => {});
        const deps: ResetDeps = {
          collections,
          resolveEnv: () => 'test',
          writeAudit,
        };

        // --- Act: first reset ---
        const first = await performReset(passingOptions, deps);

        // Guards passed → not aborted.
        expect(first.aborted).toBe(false);
        expect(first.resolvedEnv).toBe('test');

        // --- Assert: only demo removed, real untouched (Req 10.4) ---
        let expectedTotal = 0;
        for (const { name, model } of collections) {
          // Returned per-collection counts equal demo records deleted.
          expect(first.counts[name]).toBe(expectedDeleted[name]);
          expectedTotal += expectedDeleted[name]!;

          // No demo records remain.
          expect(await demoCount(model)).toBe(0);

          // Every real record is still present, ids unchanged & counts intact.
          const remaining = await idSet(model);
          const expectedReal = realIdsByCollection[name]!;
          expect(remaining.size).toBe(expectedReal.size);
          for (const id of expectedReal) {
            expect(remaining.has(id)).toBe(true);
          }
        }
        expect(first.totalDeleted).toBe(expectedTotal);

        // Snapshot the post-reset state for the idempotence comparison.
        const stateAfterFirst: Record<string, Set<string>> = {};
        for (const { name, model } of collections) {
          stateAfterFirst[name] = await idSet(model);
        }

        // --- Act: second reset (same inputs) ---
        const second = await performReset(passingOptions, deps);

        // --- Assert: idempotent — no further changes (Req 10.5) ---
        expect(second.aborted).toBe(false);
        expect(second.totalDeleted).toBe(0);

        for (const { name, model } of collections) {
          // Second run deletes nothing.
          expect(second.counts[name]).toBe(0);

          // Still zero demo records.
          expect(await demoCount(model)).toBe(0);

          // Final state identical to the state after the first reset.
          const finalState = await idSet(model);
          const priorState = stateAfterFirst[name]!;
          expect(finalState.size).toBe(priorState.size);
          for (const id of priorState) {
            expect(finalState.has(id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
