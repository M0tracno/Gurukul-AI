/**
 * Property-Based Tests for DataTable Operations
 *
 * Feature: admin-portal-overhaul
 *
 * Tests the logical sort, filter, and pagination behavior that consumers
 * implement when using the DataTable component. The DataTable itself is a
 * pure presentation component; these tests verify the data-manipulation
 * invariants that any correct consumer must satisfy.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure logic helpers — the sort/filter/pagination operations consumers perform
// ---------------------------------------------------------------------------

interface Row {
  [key: string]: unknown;
}

/**
 * Sort rows by a given column key in the specified direction.
 * Handles string, number, and null/undefined values.
 */
function sortRows<T extends Row>(rows: T[], columnKey: string, direction: 'asc' | 'desc'): T[] {
  return [...rows].sort((a, b) => {
    const aVal = a[columnKey];
    const bVal = b[columnKey];

    // Nullish values sort to the end regardless of direction
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let comparison: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filter rows: every row in the result must satisfy the filter predicate.
 * A filter matches if the stringified column value contains the filter value
 * (case-insensitive).
 */
function filterRows<T extends Row>(
  rows: T[],
  filters: { columnKey: string; value: string }[],
): T[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const cellVal = String(row[f.columnKey] ?? '').toLowerCase();
      return cellVal.includes(f.value.toLowerCase());
    }),
  );
}

/**
 * Paginate rows: return the subset for the given 1-based page and page size.
 */
function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a row with known sortable/filterable columns. */
const rowArb: fc.Arbitrary<{ id: number; name: string; score: number; status: string }> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  score: fc.integer({ min: 0, max: 1000 }),
  status: fc.constantFrom('active', 'inactive', 'pending', 'blocked'),
});

/** Generates a non-empty dataset of rows. */
const datasetArb = fc.array(rowArb, { minLength: 1, maxLength: 100 });

/** Generates a sortable column key. */
const sortColumnArb = fc.constantFrom('id', 'name', 'score', 'status');

/** Generates a sort direction. */
const directionArb: fc.Arbitrary<'asc' | 'desc'> = fc.constantFrom('asc', 'desc');

/** Generates a page size (positive integer). */
const pageSizeArb = fc.integer({ min: 1, max: 50 });

// ---------------------------------------------------------------------------
// Property 13: Data table sort ordering
// ---------------------------------------------------------------------------

// Feature: admin-portal-overhaul, Property 13: Data table sort ordering
describe('Feature: admin-portal-overhaul, Property 13: Data table sort ordering', () => {
  it('sorted output is a permutation of input rows ordered by the column values', () => {
    fc.assert(
      fc.property(datasetArb, sortColumnArb, directionArb, (rows, columnKey, direction) => {
        const sorted = sortRows(rows, columnKey, direction);

        // 1. The sorted output is a permutation of the input (same length, same elements)
        expect(sorted.length).toBe(rows.length);

        // Verify it's a permutation by checking multiset equality (by id)
        const inputIds = rows.map((r) => r.id).sort((a, b) => a - b);
        const sortedIds = sorted.map((r) => r.id).sort((a, b) => a - b);
        expect(sortedIds).toEqual(inputIds);

        // 2. Adjacent elements respect the sort ordering
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i][columnKey];
          const b = sorted[i + 1][columnKey];

          let comparison: number;
          if (typeof a === 'number' && typeof b === 'number') {
            comparison = a - b;
          } else {
            comparison = String(a).localeCompare(String(b));
          }

          if (direction === 'asc') {
            expect(comparison).toBeLessThanOrEqual(0);
          } else {
            expect(comparison).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Data table filter soundness
// ---------------------------------------------------------------------------

// Feature: admin-portal-overhaul, Property 14: Data table filter soundness
describe('Feature: admin-portal-overhaul, Property 14: Data table filter soundness', () => {
  it('every row in filtered output satisfies the filter predicate', () => {
    fc.assert(
      fc.property(
        datasetArb,
        fc.array(
          fc.record({
            columnKey: fc.constantFrom('name', 'status'),
            value: fc.string({ minLength: 1, maxLength: 5 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        (rows, filters) => {
          const filtered = filterRows(rows, filters);

          // Every row in the output must satisfy ALL filter predicates
          for (const row of filtered) {
            for (const f of filters) {
              const cellValue = String(row[f.columnKey] ?? '').toLowerCase();
              expect(cellValue).toContain(f.value.toLowerCase());
            }
          }

          // The filtered set must be a subset of the original rows
          expect(filtered.length).toBeLessThanOrEqual(rows.length);

          // No row that satisfies the predicate should be excluded
          const expectedFiltered = rows.filter((row) =>
            filters.every((f) => {
              const cellVal = String(row[f.columnKey] ?? '').toLowerCase();
              return cellVal.includes(f.value.toLowerCase());
            }),
          );
          expect(filtered.length).toBe(expectedFiltered.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Data table pagination integrity
// ---------------------------------------------------------------------------

// Feature: admin-portal-overhaul, Property 15: Data table pagination integrity
describe('Feature: admin-portal-overhaul, Property 15: Data table pagination integrity', () => {
  it('each page contains at most N rows and the union of all pages equals the full dataset', () => {
    fc.assert(
      fc.property(datasetArb, pageSizeArb, (rows, pageSize) => {
        const totalPages = Math.ceil(rows.length / pageSize);
        const allPaginatedRows: typeof rows = [];

        for (let page = 1; page <= totalPages; page++) {
          const pageRows = paginateRows(rows, page, pageSize);

          // Each page contains at most N rows
          expect(pageRows.length).toBeLessThanOrEqual(pageSize);

          // Each page (except possibly the last) should contain exactly pageSize rows
          if (page < totalPages) {
            expect(pageRows.length).toBe(pageSize);
          }

          allPaginatedRows.push(...pageRows);
        }

        // The disjoint union of all pages equals the full dataset
        expect(allPaginatedRows.length).toBe(rows.length);

        // Verify exact content match (order preserved)
        for (let i = 0; i < rows.length; i++) {
          expect(allPaginatedRows[i]).toEqual(rows[i]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
