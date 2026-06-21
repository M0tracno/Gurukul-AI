/**
 * Property 19: List results are sound with respect to filters and exclude passwords
 * Property 20: Pagination is bounded and reports accurate metadata
 * Property 21: Out-of-range page size and conflicting filters are rejected with 400
 *
 * These three properties cover the admin list/search/filter/pagination surface
 * implemented by `studentService.list` and `facultyService.list`.
 *
 * Feature: secure-admin-user-management, Property 19: List results are sound with respect to filters and exclude passwords
 * Feature: secure-admin-user-management, Property 20: Pagination is bounded and reports accurate metadata
 * Feature: secure-admin-user-management, Property 21: Out-of-range page size and conflicting filters are rejected with 400
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import Student from '../../src/models/Student.js';
import Faculty from '../../src/models/Faculty.js';
import { studentService } from '../../src/services/studentService.js';
import { facultyService } from '../../src/services/facultyService.js';
import type { StudentFilters } from '../../src/services/studentService.js';
import type { FacultyFilters } from '../../src/services/facultyService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
  await Faculty.deleteMany({});
});

/**
 * Recursively determine whether any object/array (at any depth) contains a key
 * named exactly `password` (case-insensitive). List responses must never carry
 * any password material (Requirement 10.1).
 */
function containsPasswordField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsPasswordField);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase() === 'password') {
        return true;
      }
      if (containsPasswordField(val)) {
        return true;
      }
    }
  }
  return false;
}

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

// Small, overlapping pools so generated search terms match some records and
// miss others — this is what gives the filter-soundness property teeth.
const NAME_POOL = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Anna', 'Frank'];
const GRADE_POOL = ['9th', '10th', '11th', '12th'];
const DEPARTMENT_POOL = ['Mathematics', 'Science', 'History', 'Arts'];
// Single-letter search terms; 'x'/'z' deliberately miss most records.
const SEARCH_POOL = ['a', 'e', 'o', 'r', 'x', 'z'];

interface GenStudent {
  firstName: string;
  lastName: string;
  grade: string;
  active: boolean;
}

interface GenFaculty {
  firstName: string;
  lastName: string;
  department: string;
  active: boolean;
}

const studentRecordArb: fc.Arbitrary<GenStudent> = fc.record({
  firstName: fc.constantFrom(...NAME_POOL),
  lastName: fc.constantFrom(...NAME_POOL),
  grade: fc.constantFrom(...GRADE_POOL),
  active: fc.boolean(),
});

const facultyRecordArb: fc.Arbitrary<GenFaculty> = fc.record({
  firstName: fc.constantFrom(...NAME_POOL),
  lastName: fc.constantFrom(...NAME_POOL),
  department: fc.constantFrom(...DEPARTMENT_POOL),
  active: fc.boolean(),
});

/** Insert generated students directly for speed; returns the plaintext map. */
async function seedStudents(records: GenStudent[]): Promise<void> {
  if (records.length === 0) {
    return;
  }
  const docs = records.map((r) => {
    const suffix = uniqueSuffix();
    return {
      firstName: r.firstName,
      lastName: r.lastName,
      email: `stu${suffix.replace(/[^a-z0-9]/gi, '')}@school.edu`,
      password: 'seedPassword123',
      studentId: `STU-${suffix}`,
      grade: r.grade,
      active: r.active,
      deletedAt: null,
    };
  });
  await Student.insertMany(docs);
}

async function seedFaculty(records: GenFaculty[]): Promise<void> {
  if (records.length === 0) {
    return;
  }
  const docs = records.map((r) => {
    const suffix = uniqueSuffix();
    return {
      firstName: r.firstName,
      lastName: r.lastName,
      email: `fac${suffix.replace(/[^a-z0-9]/gi, '')}@school.edu`,
      password: 'seedPassword123',
      employeeId: `EMP-${suffix}`,
      department: r.department,
      active: r.active,
      isAdmin: false,
      role: 'faculty',
      deletedAt: null,
    };
  });
  await Faculty.insertMany(docs);
}

const searchFilterArb = fc.option(fc.constantFrom(...SEARCH_POOL), { nil: undefined });
const activeFilterArb = fc.option(fc.boolean(), { nil: undefined });

describe('Property 19: List results are sound with respect to filters and exclude passwords', () => {
  it('every returned student satisfies the applied search/active/grade filters and exposes no password field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(studentRecordArb, { minLength: 1, maxLength: 12 }),
        searchFilterArb,
        activeFilterArb,
        fc.option(fc.constantFrom(...GRADE_POOL), { nil: undefined }),
        async (records, search, active, grade) => {
          await Student.deleteMany({});
          await seedStudents(records);

          const filters: StudentFilters = {};
          if (search !== undefined) filters.search = search;
          if (active !== undefined) filters.active = active;
          if (grade !== undefined) filters.grade = grade;

          const result = await studentService.list(filters, {
            page: 1,
            limit: 100,
          });

          // No password material anywhere in the response (Requirement 10.1).
          expect(containsPasswordField(result)).toBe(false);

          for (const entry of result.data) {
            if (active !== undefined) {
              expect(entry.active).toBe(active); // Requirement 10.3
            }
            if (grade !== undefined) {
              expect(entry.grade).toBe(grade); // Requirement 10.4
            }
            if (search !== undefined) {
              // Requirement 10.2: case-insensitive name/email match.
              const re = new RegExp(search, 'i');
              const matches =
                re.test(entry.firstName) ||
                re.test(entry.lastName) ||
                re.test(entry.email);
              expect(matches).toBe(true);
            }
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);

  it('every returned faculty satisfies the applied search/active/department filters and exposes no password field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(facultyRecordArb, { minLength: 1, maxLength: 12 }),
        searchFilterArb,
        activeFilterArb,
        fc.option(fc.constantFrom(...DEPARTMENT_POOL), { nil: undefined }),
        async (records, search, active, department) => {
          await Faculty.deleteMany({});
          await seedFaculty(records);

          const filters: FacultyFilters = {};
          if (search !== undefined) filters.search = search;
          if (active !== undefined) filters.active = active;
          if (department !== undefined) filters.department = department;

          const result = await facultyService.list(filters, {
            page: 1,
            limit: 100,
          });

          expect(containsPasswordField(result)).toBe(false);

          for (const entry of result.data) {
            if (active !== undefined) {
              expect(entry.active).toBe(active); // Requirement 10.3
            }
            if (department !== undefined) {
              expect(entry.department).toBe(department); // Requirement 10.4
            }
            if (search !== undefined) {
              const re = new RegExp(search, 'i');
              const matches =
                re.test(entry.firstName) ||
                re.test(entry.lastName) ||
                re.test(entry.email);
              expect(matches).toBe(true);
            }
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});

describe('Property 20: Pagination is bounded and reports accurate metadata', () => {
  it('students: page never exceeds the requested size and meta reports the true total and page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(studentRecordArb, { minLength: 0, maxLength: 25 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 6 }),
        async (records, limit, page) => {
          await Student.deleteMany({});
          await seedStudents(records);

          const total = records.length;
          const result = await studentService.list({}, { page, limit });

          // Requirement 10.6: page size is an upper bound on results.
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // Accurate metadata.
          expect(result.meta.total).toBe(total);
          expect(result.meta.page).toBe(page);
          expect(result.meta.limit).toBe(limit);
          expect(result.meta.totalPages).toBe(Math.ceil(total / limit));

          // The page holds exactly the slice that should be present.
          const expectedOnPage = Math.max(
            0,
            Math.min(limit, total - (page - 1) * limit),
          );
          expect(result.data.length).toBe(expectedOnPage);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);

  it('faculty: page never exceeds the requested size and meta reports the true total and page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(facultyRecordArb, { minLength: 0, maxLength: 25 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 6 }),
        async (records, limit, page) => {
          await Faculty.deleteMany({});
          await seedFaculty(records);

          const total = records.length;
          const result = await facultyService.list({}, { page, limit });

          expect(result.data.length).toBeLessThanOrEqual(limit);
          expect(result.meta.total).toBe(total);
          expect(result.meta.page).toBe(page);
          expect(result.meta.limit).toBe(limit);
          expect(result.meta.totalPages).toBe(Math.ceil(total / limit));

          const expectedOnPage = Math.max(
            0,
            Math.min(limit, total - (page - 1) * limit),
          );
          expect(result.data.length).toBe(expectedOnPage);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});

describe('Property 21: Out-of-range page size and conflicting filters are rejected with 400', () => {
  // page sizes outside the inclusive 1..100 window, including 0.
  const badLimitArb = fc.oneof(
    fc.constant(0),
    fc.integer({ min: 101, max: 500 }),
  );

  it('students: out-of-range page size is rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        badLimitArb,
        fc.integer({ min: 1, max: 5 }),
        async (limit, page) => {
          await expect(
            studentService.list({}, { page, limit }),
          ).rejects.toMatchObject({
            // AppError carries the HTTP status (Requirement 10.7).
            statusCode: 400,
          } as Partial<AppError>);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);

  it('faculty: out-of-range page size is rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        badLimitArb,
        fc.integer({ min: 1, max: 5 }),
        async (limit, page) => {
          await expect(
            facultyService.list({}, { page, limit }),
          ).rejects.toMatchObject({
            statusCode: 400,
          } as Partial<AppError>);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);

  it('students: combining grade and department filters is rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...GRADE_POOL),
        fc.constantFrom(...DEPARTMENT_POOL),
        fc.integer({ min: 1, max: 100 }),
        async (grade, department, limit) => {
          await expect(
            studentService.list({ grade, department }, { page: 1, limit }),
          ).rejects.toMatchObject({
            statusCode: 400,
          } as Partial<AppError>);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);

  it('faculty: combining grade and department filters is rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...GRADE_POOL),
        fc.constantFrom(...DEPARTMENT_POOL),
        fc.integer({ min: 1, max: 100 }),
        async (grade, department, limit) => {
          await expect(
            facultyService.list({ grade, department }, { page: 1, limit }),
          ).rejects.toMatchObject({
            statusCode: 400,
          } as Partial<AppError>);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});
