/**
 * Property-Based Tests: Empty scope returns a successful empty collection.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 22: Empty scope returns a successful empty collection
 *
 * Property 22: For any authenticated user whose Dashboard_Scope contains no
 * records, the dashboard endpoint responds 200 with `{ success: true, data: [] }`.
 *
 * The success envelope (`success(data)` from `utils/envelope.ts`) is exactly
 * the `{ success: true, data }` shape controllers return with HTTP 200. This
 * test exercises the list-returning self-scope reads that genuinely produce
 * collections and confirms that, for an empty scope, the wrapped envelope
 * deep-equals `{ success: true, data: [] }`:
 *
 *  - FACULTY self-scope (Req 9.1): a faculty member who owns NO courses gets
 *    empty arrays from `getCourses` / `getStudents` / `getSchedule`, even when
 *    OTHER faculty own courses with enrolled students (proving emptiness is
 *    per-requester, not global). `success(result)` === `{ success: true, data: [] }`.
 *  - PARENT scope (Req 9.1): a parent with no active linkage gets
 *    `{ children: [] }` from `getParentDashboard`, wrapped as
 *    `{ success: true, data: { children: [] } }`.
 *
 * **Validates: Requirements 9.1**
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

import { facultyMeService } from './facultyMeService.js';
import { dashboardService } from './dashboardService.js';
import { success } from '../utils/envelope.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

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
  await resetAll();
});

async function resetAll(): Promise<void> {
  await Promise.all([
    Faculty.deleteMany({}),
    Student.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
    mongoose.connection.collection('parent_student_relations').deleteMany({}),
  ]);
}

// ---------------------------------------------------------------------------
// Native-driver insert helpers.
//
// Inserting via the native driver bypasses the bcrypt password-hashing save
// hooks on Student/Faculty — identity/ownership is all these properties need,
// and this keeps 100+ runs well within the test budget. Every record uses a
// fresh ObjectId so values are unique within a run (collections are cleared
// between runs).
// ---------------------------------------------------------------------------

type ObjectId = mongoose.Types.ObjectId;

async function insertFaculty(): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Faculty.collection.insertOne({
    _id,
    firstName: 'Fac',
    lastName: 'Ulty',
    email: `${_id}@example.com`,
    password: 'placeholder',
    employeeId: `E-${_id}`,
    department: 'Science',
    title: 'Instructor',
    active: true,
    isAdmin: false,
    role: 'faculty',
    isDemo: false,
    failedLoginAttempts: 0,
    deletedAt: null,
    createdAt: new Date(),
  } as any);
  return _id;
}

async function insertStudent(): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Student.collection.insertOne({
    _id,
    firstName: 'Stu',
    lastName: 'Dent',
    email: `${_id}@example.com`,
    password: 'placeholder',
    studentId: `S-${_id}`,
    grade: '10',
    active: true,
    isDemo: false,
    failedLoginAttempts: 0,
    deletedAt: null,
    createdAt: new Date(),
  } as any);
  return _id;
}

async function insertCourse(facultyId: ObjectId): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Course.collection.insertOne({
    _id,
    title: 'Course',
    code: `C-${_id}`,
    description: 'desc',
    faculty: facultyId,
    startDate: new Date(),
    endDate: new Date(),
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '10:00', room: 'R1' },
    ],
    credits: 3,
    maxStudents: 30,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
  } as any);
  return _id;
}

async function enroll(studentId: ObjectId, courseId: ObjectId): Promise<void> {
  await Enrollment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    student: studentId,
    course: courseId,
    enrollmentDate: new Date(),
    status: 'active',
    grade: 'N/A',
    finalScore: null,
  } as any);
}

/**
 * Seed a non-empty ownership graph for OTHER faculty so the subject's empty
 * scope is proven to be per-requester rather than a globally empty database.
 */
async function seedOtherFaculty(
  otherFacultyCount: number,
  coursesPerFaculty: number,
  studentsPerCourse: number,
): Promise<void> {
  for (let f = 0; f < otherFacultyCount; f++) {
    const faculty = await insertFaculty();
    for (let c = 0; c < coursesPerFaculty; c++) {
      const course = await insertCourse(faculty);
      for (let s = 0; s < studentsPerCourse; s++) {
        const student = await insertStudent();
        await enroll(student, course);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Property 22 — FACULTY empty self-scope
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 22: Empty scope returns a successful empty collection
describe('Property 22: Empty scope returns a successful empty collection', () => {
  it(
    'wraps an empty faculty self-scope as { success: true, data: [] } even when other faculty own courses',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // other faculty owning courses
          fc.integer({ min: 1, max: 3 }), // courses per other faculty
          fc.integer({ min: 1, max: 3 }), // students per course
          async (otherFacultyCount, coursesPerFaculty, studentsPerCourse) => {
            await resetAll();

            // The subject faculty member owns NO courses.
            const subject = await insertFaculty();

            // Other faculty DO own courses with enrolled students, so the DB
            // is non-empty: emptiness must be scoped to the requester.
            await seedOtherFaculty(
              otherFacultyCount,
              coursesPerFaculty,
              studentsPerCourse,
            );

            const courses = await facultyMeService.getCourses(String(subject));
            const students = await facultyMeService.getStudents(String(subject));
            const schedule = await facultyMeService.getSchedule(String(subject));

            // Each list-returning read yields an empty collection.
            expect(courses).toEqual([]);
            expect(students).toEqual([]);
            expect(schedule).toEqual([]);

            // The success envelope around each empty collection is exactly
            // the 200 body `{ success: true, data: [] }` (Req 9.1).
            expect(success(courses)).toEqual({ success: true, data: [] });
            expect(success(students)).toEqual({ success: true, data: [] });
            expect(success(schedule)).toEqual({ success: true, data: [] });
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );

  // -------------------------------------------------------------------------
  // Property 22 — PARENT empty scope (no active linkage)
  // -------------------------------------------------------------------------

  it(
    'wraps an unlinked parent dashboard as { success: true, data: { children: [] } }',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 3 }), // unrelated students present in the DB
          async (unrelatedStudents) => {
            await resetAll();

            // Populate unrelated students so the DB is non-empty; none are
            // linked to the subject parent.
            for (let i = 0; i < unrelatedStudents; i++) {
              await insertStudent();
            }

            // A parent with no active ParentStudentRelation linkage.
            const parentId = new mongoose.Types.ObjectId();

            const dashboard = await dashboardService.getParentDashboard(
              String(parentId),
            );

            // Empty child collection for an empty scope.
            expect(dashboard).toEqual({ children: [] });

            // The success envelope is exactly the 200 body (Req 9.1).
            expect(success(dashboard)).toEqual({
              success: true,
              data: { children: [] },
            });
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
