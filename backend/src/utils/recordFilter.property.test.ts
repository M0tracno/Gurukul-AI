/**
 * Property-Based Tests: Active-listing membership and historical reference resolution
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 7: Active-listing membership and historical reference resolution
 *
 * Property 7: For any set of records, a record appears in an active-member
 * listing if and only if its `active` flag is true and it satisfies every
 * additional listing predicate; independently, a reference pointing at an
 * inactive record still resolves and returns that record's data.
 *
 * **Validates: Requirements 3.4, 3.5**
 */

import * as fc from 'fast-check';
import { isListable } from './recordFilter.js';

// A minimal authoritative-record shape for the property: an id, an `active`
// flag, and an arbitrary payload that reference resolution must always return.
interface TestRecord {
  id: string;
  active?: boolean;
  payload: string;
}

// A predicate paired with its expected outcome so the test can independently
// compute the ground-truth "all predicates hold" without trusting isListable.
interface SpecPredicate {
  outcome: boolean;
  fn: (r: TestRecord) => boolean;
}

// Generator for a single record with a random active flag and payload.
const recordArb: fc.Arbitrary<TestRecord> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12 }),
  // active is true, false, or absent (undefined) to exercise the strict `=== true` rule.
  active: fc.oneof(
    fc.constant<boolean | undefined>(true),
    fc.constant<boolean | undefined>(false),
    fc.constant<boolean | undefined>(undefined),
  ),
  payload: fc.string({ maxLength: 24 }),
});

// Generator for an array of predicates with known outcomes. Each predicate
// ignores the record and simply returns its predetermined boolean, which lets
// us model "random predicate outcomes" while keeping ground truth explicit.
const predicatesArb: fc.Arbitrary<SpecPredicate[]> = fc.array(
  fc.boolean().map<SpecPredicate>((outcome) => ({
    outcome,
    fn: () => outcome,
  })),
  { maxLength: 6 },
);

// Feature: personalized-role-dashboards-and-verified-access, Property 7: Active-listing membership and historical reference resolution
describe('Property 7: Active-listing membership and historical reference resolution', () => {
  it('lists a record iff active === true AND every predicate holds', () => {
    fc.assert(
      fc.property(recordArb, predicatesArb, (record, specPredicates) => {
        const predicates = specPredicates.map((p) => p.fn);

        const expected =
          record.active === true && specPredicates.every((p) => p.outcome);

        expect(isListable(record, predicates)).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('excludes any inactive record from listings regardless of predicate outcomes', () => {
    fc.assert(
      fc.property(
        recordArb.filter((r) => r.active !== true),
        predicatesArb,
        (inactiveRecord, specPredicates) => {
          const predicates = specPredicates.map((p) => p.fn);
          // An inactive (or active-absent) record is never listable, even when
          // every additional predicate would pass.
          expect(isListable(inactiveRecord, predicates)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('requires all predicates to hold even when the record is active (Req 3.5)', () => {
    fc.assert(
      fc.property(
        recordArb.map((r) => ({ ...r, active: true as const })),
        // At least one predicate, with at least one guaranteed false outcome.
        fc
          .array(fc.boolean(), { minLength: 1, maxLength: 6 })
          .map((outcomes) => {
            // Force at least one false so the listing must be excluded.
            const withFalse = [...outcomes];
            withFalse[0] = false;
            return withFalse;
          }),
        (activeRecord, outcomes) => {
          const predicates = outcomes.map((o) => () => o);
          // Active but failing a criterion => excluded.
          expect(isListable(activeRecord, predicates)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('resolves references to inactive records and returns their data (Req 3.4)', () => {
    // Reference resolution is a findById-style lookup that ignores `active`.
    // It must NOT use isListable: a historical reference to an inactive record
    // still resolves and returns that record's data.
    const findById = (records: TestRecord[], id: string): TestRecord | undefined =>
      records.find((r) => r.id === id);

    fc.assert(
      fc.property(
        // A non-empty set of records with unique ids.
        fc
          .uniqueArray(recordArb, {
            minLength: 1,
            maxLength: 20,
            selector: (r) => r.id,
          }),
        fc.nat(),
        (records, idx) => {
          const target = records[idx % records.length];

          // Reference resolution always finds the record and returns its data,
          // independent of the record's active flag.
          const resolved = findById(records, target.id);
          expect(resolved).toBeDefined();
          expect(resolved?.payload).toBe(target.payload);

          // Even when the target is inactive (so isListable would exclude it
          // from a listing), the reference still resolves to its data.
          if (target.active !== true) {
            expect(isListable(target, [])).toBe(false);
            expect(resolved?.payload).toBe(target.payload);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
