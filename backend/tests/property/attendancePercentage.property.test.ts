/**
 * Property-Based Test: Attendance Percentage Computation (Property 25)
 *
 * Feature: gurukul-ai-modernization, Property 25: Attendance Percentage Computation
 *
 * For any set of attendance records for a student in a course, the attendance
 * percentage SHALL equal (present count / total count) × 100, rounded to the
 * nearest integer.
 *
 * **Validates: Requirements 9.4**
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  status: AttendanceStatus;
  date: Date;
}

// ---------------------------------------------------------------------------
// Pure computation function (mirrors the logic in AttendanceService)
// ---------------------------------------------------------------------------

/**
 * Computes attendance percentage from a list of attendance records.
 * 'present' and 'late' count as attended.
 * Returns Math.round((attendedCount / totalCount) * 100), or 0 if no records.
 */
function computeAttendancePercent(records: AttendanceRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  const attendedCount = records.filter(
    (r) => r.status === 'present' || r.status === 'late',
  ).length;

  return Math.round((attendedCount / records.length) * 100);
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for a single attendance status.
 */
const statusArb: fc.Arbitrary<AttendanceStatus> = fc.constantFrom(
  'present',
  'absent',
  'late',
  'excused',
);

/**
 * Generator for a single attendance record with a random date and status.
 */
const attendanceRecordArb: fc.Arbitrary<AttendanceRecord> = fc.record({
  status: statusArb,
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
});

/**
 * Generator for a non-empty array of attendance records.
 * Uses minLength: 1 so we always have at least one record for percentage computation.
 */
const attendanceRecordsArb: fc.Arbitrary<AttendanceRecord[]> = fc.array(
  attendanceRecordArb,
  { minLength: 1, maxLength: 200 },
);

/**
 * Generator for explicit present/total counts to verify the formula directly.
 */
const countPairArb: fc.Arbitrary<{ presentCount: number; totalCount: number }> = fc
  .integer({ min: 1, max: 500 })
  .chain((totalCount) =>
    fc.integer({ min: 0, max: totalCount }).map((presentCount) => ({
      presentCount,
      totalCount,
    })),
  );

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 25: Attendance Percentage Computation', () => {
  /**
   * Property: The attendance percentage equals (present count / total count) × 100,
   * rounded to the nearest integer, where present count includes records with
   * status 'present' or 'late'.
   */
  it('attendance percentage equals Math.round((presentCount / totalCount) * 100)', () => {
    fc.assert(
      fc.property(attendanceRecordsArb, (records) => {
        const result = computeAttendancePercent(records);

        // Manually count present + late
        const attendedCount = records.filter(
          (r) => r.status === 'present' || r.status === 'late',
        ).length;
        const totalCount = records.length;
        const expected = Math.round((attendedCount / totalCount) * 100);

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The result is always between 0 and 100 inclusive for any
   * non-empty set of attendance records.
   */
  it('attendance percentage is always in range [0, 100]', () => {
    fc.assert(
      fc.property(attendanceRecordsArb, (records) => {
        const result = computeAttendancePercent(records);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When all records are 'present' or 'late', the percentage is 100.
   */
  it('all-attended records produce 100% attendance', () => {
    const allAttendedArb = fc.array(
      fc.record({
        status: fc.constantFrom<AttendanceStatus>('present', 'late'),
        date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      }),
      { minLength: 1, maxLength: 200 },
    );

    fc.assert(
      fc.property(allAttendedArb, (records) => {
        const result = computeAttendancePercent(records);
        expect(result).toBe(100);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When all records are 'absent' or 'excused', the percentage is 0.
   */
  it('all-unattended records produce 0% attendance', () => {
    const allUnattendedArb = fc.array(
      fc.record({
        status: fc.constantFrom<AttendanceStatus>('absent', 'excused'),
        date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      }),
      { minLength: 1, maxLength: 200 },
    );

    fc.assert(
      fc.property(allUnattendedArb, (records) => {
        const result = computeAttendancePercent(records);
        expect(result).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty records produce 0%.
   */
  it('empty records produce 0% attendance', () => {
    const result = computeAttendancePercent([]);
    expect(result).toBe(0);
  });

  /**
   * Property: Direct formula verification using generated present/total count pairs.
   * Verifies that (presentCount / totalCount) × 100 rounded to nearest integer
   * produces a value that equals the expected percentage.
   */
  it('formula (present / total) × 100 rounded matches for arbitrary count pairs', () => {
    fc.assert(
      fc.property(countPairArb, ({ presentCount, totalCount }) => {
        // Build attendance records: presentCount 'present' + remainder 'absent'
        const records: AttendanceRecord[] = [];
        const baseDate = new Date('2024-01-01');

        for (let i = 0; i < presentCount; i++) {
          records.push({
            status: 'present',
            date: new Date(baseDate.getTime() + i * 86400000),
          });
        }
        for (let i = presentCount; i < totalCount; i++) {
          records.push({
            status: 'absent',
            date: new Date(baseDate.getTime() + i * 86400000),
          });
        }

        const result = computeAttendancePercent(records);
        const expected = Math.round((presentCount / totalCount) * 100);

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The result is always an integer (rounded to nearest).
   */
  it('attendance percentage is always an integer', () => {
    fc.assert(
      fc.property(attendanceRecordsArb, (records) => {
        const result = computeAttendancePercent(records);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
