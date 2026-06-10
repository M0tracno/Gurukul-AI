/**
 * Property-Based Test: Demo-data reset guards
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 24: Data reset is fully guarded against unintended mutation
 *
 * Property 24: For any combination of reset options and resolved environment,
 * the Data_Reset_Mechanism SHALL perform NO mutation (no `deleteMany`, no audit
 * write) unless ALL guards hold simultaneously:
 *   - the explicit `confirm` flag is present, AND
 *   - the target environment is explicitly named AND equals the resolved
 *     environment, AND
 *   - when the resolved environment is `production`, the production override
 *     (`allowProdReset`) is present.
 *
 * **Validates: Requirements 10.2, 10.3**
 *
 * No real MongoDB is used: collections expose a spy `deleteMany` and `writeAudit`
 * is a spy, so we can assert that an aborted run touches neither.
 */

import * as fc from 'fast-check';

import {
  evaluateGuards,
  performReset,
  PRODUCTION_ENV,
  type DemoCollection,
  type ResetOptions,
  type ResetDeps,
} from './resetDemoData.js';

// ---------------------------------------------------------------------------
// Spy infrastructure (no Mongo): deleteMany / writeAudit count their calls.
// ---------------------------------------------------------------------------

interface SpyCollection extends DemoCollection {
  /** Number of times deleteMany was invoked on this collection. */
  deleteCalls: () => number;
}

const DELETED_PER_COLLECTION = 3;

/** Build a set of demo collections whose deleteMany is a counting spy. */
function makeSpyCollections(names: string[]): {
  collections: SpyCollection[];
  totalDeleteCalls: () => number;
} {
  let calls = 0;
  const collections: SpyCollection[] = names.map((name) => {
    let localCalls = 0;
    return {
      name,
      model: {
        deleteMany: (async () => {
          calls += 1;
          localCalls += 1;
          return { deletedCount: DELETED_PER_COLLECTION };
        }) as unknown as DemoCollection['model']['deleteMany'],
      },
      deleteCalls: () => localCalls,
    };
  });
  return { collections, totalDeleteCalls: () => calls };
}

/** A writeAudit spy that records how many times it was invoked. */
function makeAuditSpy(): { writeAudit: ResetDeps['writeAudit']; auditCalls: () => number } {
  let calls = 0;
  return {
    writeAudit: async () => {
      calls += 1;
    },
    auditCalls: () => calls,
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

// Environment names the resolver might report, including `production`.
const ENV_NAMES = [PRODUCTION_ENV, 'development', 'test', 'staging', 'qa'];

// How the supplied --env relates to the resolved environment.
type EnvKind = 'undefined' | 'match' | 'mismatch';

/** Compute the env string the caller supplies, given the resolved env + kind. */
function buildSuppliedEnv(resolvedEnv: string, kind: EnvKind, raw: string): string | undefined {
  if (kind === 'undefined') return undefined;
  if (kind === 'match') return resolvedEnv;
  // mismatch: guarantee it differs from the resolved environment.
  return raw === resolvedEnv ? `${raw}-other` : raw;
}

/** Independent reference implementation of the guard decision. */
function expectedAllowed(options: ResetOptions, resolvedEnv: string): boolean {
  if (!options.confirm) return false;
  if (!options.env) return false;
  if (options.env !== resolvedEnv) return false;
  if (resolvedEnv === PRODUCTION_ENV && !options.allowProdReset) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Property 24
// ---------------------------------------------------------------------------
// Feature: personalized-role-dashboards-and-verified-access, Property 24: Data reset is fully guarded against unintended mutation
describe('Property 24: Data reset is fully guarded against unintended mutation', () => {
  it('never mutates or audits unless confirm + matching named env + (prod override) all hold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          confirm: fc.boolean(),
          resolvedEnv: fc.constantFrom(...ENV_NAMES),
          envKind: fc.constantFrom<EnvKind>('undefined', 'match', 'mismatch'),
          rawEnv: fc.constantFrom(...ENV_NAMES, 'random-env'),
          allowProdReset: fc.boolean(),
          actor: fc.string(),
          collectionNames: fc.uniqueArray(
            fc.constantFrom('students', 'faculties', 'parents', 'relations'),
            { minLength: 1, maxLength: 4 },
          ),
        }),
        async (gen) => {
          const env = buildSuppliedEnv(gen.resolvedEnv, gen.envKind, gen.rawEnv);
          const options: ResetOptions = {
            confirm: gen.confirm,
            env,
            allowProdReset: gen.allowProdReset,
            actor: gen.actor,
          };

          const expected = expectedAllowed(options, gen.resolvedEnv);

          // 1) The pure guard decision must agree with the reference impl.
          expect(evaluateGuards(options, gen.resolvedEnv).allowed).toBe(expected);

          // 2) Drive performReset against spies and assert mutation behaviour.
          const { collections, totalDeleteCalls } = makeSpyCollections(gen.collectionNames);
          const { writeAudit, auditCalls } = makeAuditSpy();

          const result = await performReset(options, {
            collections,
            resolveEnv: () => gen.resolvedEnv,
            writeAudit,
          });

          expect(result.resolvedEnv).toBe(gen.resolvedEnv);

          if (!expected) {
            // Guarded: absolutely no mutation and no audit write.
            expect(result.aborted).toBe(true);
            expect(totalDeleteCalls()).toBe(0);
            for (const col of collections) {
              expect(col.deleteCalls()).toBe(0);
            }
            expect(auditCalls()).toBe(0);
            expect(result.totalDeleted).toBe(0);
          } else {
            // Allowed: deleteMany ran for every collection; audit written once.
            expect(result.aborted).toBe(false);
            expect(totalDeleteCalls()).toBe(collections.length);
            for (const col of collections) {
              expect(col.deleteCalls()).toBe(1);
            }
            expect(auditCalls()).toBe(1);
            expect(result.totalDeleted).toBe(collections.length * DELETED_PER_COLLECTION);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('production specifically requires the override even when confirm + matching env are present', () => {
    const base: ResetOptions = {
      confirm: true,
      env: PRODUCTION_ENV,
      allowProdReset: false,
      actor: 'tester',
    };

    // Production without override -> blocked.
    expect(evaluateGuards(base, PRODUCTION_ENV).allowed).toBe(false);
    // Production with override -> allowed.
    expect(evaluateGuards({ ...base, allowProdReset: true }, PRODUCTION_ENV).allowed).toBe(true);
    // Non-production ignores the override.
    expect(evaluateGuards({ ...base, env: 'development' }, 'development').allowed).toBe(true);
  });
});
