/**
 * Property-Based Test: Reset operations are audited with counts
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 26: Reset operations are audited with counts
 *
 * Property 26: When the Data_Reset_Mechanism removes records, THE System SHALL
 * write a `data_reset` Audit_Log entry recording the operation, the actor, the
 * resolved environment, and the per-collection counts of affected records. An
 * aborted run (guards not satisfied) writes NO audit entry.
 *
 * **Validates: Requirements 10.7**
 *
 * Two complementary angles are exercised:
 *   1. A `writeAudit` SPY confirms `performReset` calls the audit writer exactly
 *      once on a guard-passing run with an entry carrying the actor, resolved
 *      environment, per-collection counts, and total — and NOT at all on an
 *      aborted run.
 *   2. The REAL `defaultWriteAudit` is driven against an in-memory MongoDB to
 *      confirm a persisted `data_reset` AuditLog is created with the action,
 *      actor, resolved environment (target.resourceId), and per-collection
 *      counts/total in metadata.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import {
  performReset,
  defaultWriteAudit,
  type DemoCollection,
  type ResetDeps,
  type ResetOptions,
  type ResetAuditEntry,
} from './resetDemoData.js';
import AuditLog from '../src/models/AuditLog.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** A non-empty set of distinct, logical collection names. */
const collectionNamesArb = fc
  .uniqueArray(
    fc
      .stringMatching(/^[a-z][a-z0-9_]{0,19}$/)
      .filter((s) => s.length > 0),
    { minLength: 1, maxLength: 6 }
  )
  .filter((names) => names.length > 0);

/** Per-collection deleted counts keyed by collection name. */
const countsArb = collectionNamesArb.chain((names) =>
  fc
    .tuple(
      ...names.map(() => fc.integer({ min: 0, max: 5000 }))
    )
    .map((values) => {
      const counts: Record<string, number> = {};
      names.forEach((name, i) => {
        counts[name] = values[i]!;
      });
      return counts;
    })
);

/** Actor identifier recorded in the audit metadata. */
const actorArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((acc, n) => acc + n, 0);
}

/**
 * Build injected demo collections whose `deleteMany` reports the generated
 * deletedCount for that collection. No real database is required for the
 * entry-shape assertion.
 */
function fakeCollections(counts: Record<string, number>): DemoCollection[] {
  return Object.entries(counts).map(([name, deletedCount]) => ({
    name,
    model: {
      deleteMany: async () => ({ deletedCount }) as never,
    },
  }));
}

// ---------------------------------------------------------------------------
// Angle 1: writeAudit spy (no MongoDB needed)
// ---------------------------------------------------------------------------
// Feature: personalized-role-dashboards-and-verified-access, Property 26: Reset operations are audited with counts
describe('Property 26: Reset operations are audited with counts (writeAudit spy)', () => {
  it('a guard-passing run calls writeAudit exactly once with actor, environment, per-collection counts, and total', async () => {
    await fc.assert(
      fc.asyncProperty(countsArb, actorArb, async (counts, actor) => {
        const recorded: ResetAuditEntry[] = [];

        const options: ResetOptions = {
          confirm: true,
          env: 'test',
          allowProdReset: false,
          actor,
        };
        const deps: ResetDeps = {
          collections: fakeCollections(counts),
          resolveEnv: () => 'test',
          writeAudit: async (entry) => {
            recorded.push(entry);
          },
        };

        const result = await performReset(options, deps);

        // The run proceeded (guards satisfied) and audited exactly once.
        expect(result.aborted).toBe(false);
        expect(recorded).toHaveLength(1);

        const entry = recorded[0]!;
        expect(entry.actor).toBe(actor);
        expect(entry.environment).toBe('test');

        // Per-collection affected counts mirror each collection's deletedCount.
        expect(entry.counts).toEqual(counts);
        for (const [name, deleted] of Object.entries(counts)) {
          expect(entry.counts[name]).toBe(deleted);
        }

        // Total equals the sum of per-collection counts.
        expect(entry.totalDeleted).toBe(sumCounts(counts));
      }),
      { numRuns: 120 }
    );
  });

  it('an aborted run (confirm:false) does NOT call writeAudit', async () => {
    await fc.assert(
      fc.asyncProperty(countsArb, actorArb, async (counts, actor) => {
        const recorded: ResetAuditEntry[] = [];

        const options: ResetOptions = {
          confirm: false, // guard fails → abort
          env: 'test',
          allowProdReset: false,
          actor,
        };
        const deps: ResetDeps = {
          collections: fakeCollections(counts),
          resolveEnv: () => 'test',
          writeAudit: async (entry) => {
            recorded.push(entry);
          },
        };

        const result = await performReset(options, deps);

        // No mutation, no audit write on an aborted run.
        expect(result.aborted).toBe(true);
        expect(recorded).toHaveLength(0);
      }),
      { numRuns: 120 }
    );
  });
});

// ---------------------------------------------------------------------------
// Angle 2: real defaultWriteAudit against in-memory MongoDB
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await AuditLog.deleteMany({});
});

// Feature: personalized-role-dashboards-and-verified-access, Property 26: Reset operations are audited with counts
describe('Property 26: Reset operations are audited with counts (persisted AuditLog)', () => {
  it('defaultWriteAudit persists a data_reset entry with actor, environment, and per-collection counts', async () => {
    await fc.assert(
      fc.asyncProperty(countsArb, actorArb, async (counts, actor) => {
        await AuditLog.deleteMany({});

        const environment = 'test';
        const totalDeleted = sumCounts(counts);
        const entry: ResetAuditEntry = {
          actor,
          environment,
          counts,
          totalDeleted,
        };

        await defaultWriteAudit(entry);

        const log = await AuditLog.findOne({ action: 'data_reset' }).lean();
        expect(log).not.toBeNull();

        // Operation/action recorded.
        expect(log!.action).toBe('data_reset');

        // Actor present (system sentinel + role).
        expect(log!.actor).toBeTruthy();
        expect(log!.actor.userId).toBeTruthy();
        expect(log!.actor.role).toBe('system');

        // Resolved environment recorded on the target.
        expect(log!.target.resource).toBe('demo_data');
        expect(log!.target.resourceId).toBe(environment);

        // Per-collection counts and total preserved in metadata.
        const metadata = log!.metadata as Record<string, unknown>;
        expect(metadata.actor).toBe(actor);
        expect(metadata.environment).toBe(environment);
        expect(metadata.counts).toEqual(counts);
        expect(metadata.totalDeleted).toBe(totalDeleted);
      }),
      { numRuns: 100 }
    );
  }, 120000);
});
