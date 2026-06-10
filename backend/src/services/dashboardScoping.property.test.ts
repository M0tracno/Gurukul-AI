/**
 * Property-Based Tests: Returned dashboard data is always within the
 * requester's scope.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 3: Returned dashboard data is always within the requester's scope
 *
 * Property 3: For any authenticated user (any role) and any generated dataset,
 * every record returned by a dashboard endpoint belongs to that user's
 * Dashboard_Scope derived from their identity:
 *
 *  - FACULTY scope (Req 2.4): only courses the faculty member owns
 *    (`Course.faculty === facultyId`) and only students enrolled in one of
 *    those owned courses — never another faculty member's courses or students.
 *  - STUDENT scope (Req 2.1, 2.5): only the student's own profile and only
 *    grades/derived figures resolved from that student's own enrollments —
 *    never another student's records.
 *
 * The faculty dashboard is assembled from `facultyMeService` (getCourses /
 * getStudents / getSchedule), so this test exercises both the underlying
 * self-scope service and the assembled `dashboardService` summary. The student
 * dashboard is assembled from the student's own enrollments/marks/attendance.
 *
 * **Validates: Requirements 2.1, 2.4, 2.5**
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

import { dashboardService } from './dashboardService.js';
import { facultyMeService } from './facultyMeService.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Mark from '../models/Mark.js';
import Attendance from '../models/Attendance.js';

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
    Mark.deleteMany({}),
    Attendance.deleteMany({}),
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
    schedule: [],
    credits: 3,
    maxStudents: 30,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
  } as any);
  return _id;
}

async function enroll(studentId: ObjectId, courseId: ObjectId): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Enrollment.collection.insertOne({
    _id,
    student: studentId,
    course: courseId,
    enrollmentDate: new Date(),
    status: 'active',
    grade: 'N/A',
    finalScore: null,
  } as any);
  return _id;
}

async function addMark(enrollmentId: ObjectId): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Mark.collection.insertOne({
    _id,
    enrollment: enrollmentId,
    title: 'Assessment',
    type: 'assignment',
    maxScore: 100,
    score: 80,
    weight: 1,
    submissionDate: new Date(),
    attachments: [],
    aiGenerated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
  return _id;
}

async function addAttendance(
  enrollmentId: ObjectId,
  dayOffset: number,
  status: 'present' | 'absent',
): Promise<void> {
  await Attendance.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    enrollment: enrollmentId,
    // Distinct date per record avoids the { enrollment, date } unique index.
    date: new Date(2024, 0, 1 + dayOffset),
    status,
    recordedAt: new Date(),
  } as any);
}

// ---------------------------------------------------------------------------
// Property 3 — FACULTY scope
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 3: Returned dashboard data is always within the requester's scope
describe('Property 3: Returned dashboard data is always within the requester\'s scope', () => {
  it(
    'confines faculty dashboard data to the requesting faculty member (own courses + their enrolled students only)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // courses owned by faculty A
          fc.integer({ min: 1, max: 3 }), // courses owned by faculty B
          fc.integer({ min: 1, max: 3 }), // students enrolled per course
          async (numCoursesA, numCoursesB, studentsPerCourse) => {
            await resetAll();

            const facultyA = await insertFaculty();
            const facultyB = await insertFaculty();

            // Build faculty A's ownership graph.
            const aCourseIds = new Set<string>();
            const aStudentIds = new Set<string>();
            for (let i = 0; i < numCoursesA; i++) {
              const course = await insertCourse(facultyA);
              aCourseIds.add(String(course));
              for (let j = 0; j < studentsPerCourse; j++) {
                const student = await insertStudent();
                aStudentIds.add(String(student));
                await enroll(student, course);
              }
            }

            // Build faculty B's separate ownership graph (the "out of scope" set).
            const bCourseIds = new Set<string>();
            const bStudentIds = new Set<string>();
            for (let i = 0; i < numCoursesB; i++) {
              const course = await insertCourse(facultyB);
              bCourseIds.add(String(course));
              for (let j = 0; j < studentsPerCourse; j++) {
                const student = await insertStudent();
                bStudentIds.add(String(student));
                await enroll(student, course);
              }
            }

            // Every course returned for A is owned by A, never by B (Req 2.4).
            const courses = await facultyMeService.getCourses(String(facultyA));
            expect(courses.length).toBe(numCoursesA);
            for (const course of courses) {
              expect(aCourseIds.has(course.id)).toBe(true);
              expect(bCourseIds.has(course.id)).toBe(false);
            }

            // Every student returned for A is enrolled in one of A's courses,
            // never one of B's students (Req 2.4).
            const students = await facultyMeService.getStudents(String(facultyA));
            expect(students.length).toBe(aStudentIds.size);
            for (const student of students) {
              expect(aStudentIds.has(student.id)).toBe(true);
              expect(bStudentIds.has(student.id)).toBe(false);
            }

            // The assembled dashboard summary reflects A's scope only.
            const dashboard = await dashboardService.getFacultyDashboard(
              String(facultyA),
            );
            expect(dashboard.profile.id).toBe(String(facultyA));
            expect(dashboard.ownedCourseCount).toBe(numCoursesA);
            expect(dashboard.totalStudents).toBe(aStudentIds.size);
            for (const slot of dashboard.todaysSchedule) {
              expect(aCourseIds.has(slot.courseId)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );

  // -------------------------------------------------------------------------
  // Property 3 — STUDENT scope
  // -------------------------------------------------------------------------

  it(
    'confines student dashboard data to the requesting student (own profile + own grades only)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // active courses for the subject student
          fc.integer({ min: 1, max: 3 }), // marks per enrollment
          fc.integer({ min: 1, max: 3 }), // courses for the other student
          async (subjectCourses, marksPerEnrollment, otherCourses) => {
            await resetAll();

            const faculty = await insertFaculty();
            const subject = await insertStudent();
            const other = await insertStudent();

            // Subject student's own records.
            const subjectMarkIds = new Set<string>();
            let dayOffset = 0;
            for (let i = 0; i < subjectCourses; i++) {
              const course = await insertCourse(faculty);
              const enrollment = await enroll(subject, course);
              for (let m = 0; m < marksPerEnrollment; m++) {
                subjectMarkIds.add(String(await addMark(enrollment)));
              }
              await addAttendance(enrollment, dayOffset++, 'present');
              await addAttendance(enrollment, dayOffset++, 'absent');
            }

            // Another student's records (the "out of scope" set).
            const otherMarkIds = new Set<string>();
            for (let i = 0; i < otherCourses; i++) {
              const course = await insertCourse(faculty);
              const enrollment = await enroll(other, course);
              for (let m = 0; m < marksPerEnrollment; m++) {
                otherMarkIds.add(String(await addMark(enrollment)));
              }
              await addAttendance(enrollment, dayOffset++, 'present');
            }

            const dashboard = await dashboardService.getStudentDashboard(
              String(subject),
            );

            // Identity is the subject's own authoritative record (Req 2.1, 2.5).
            expect(dashboard.profile.id).toBe(String(subject));

            // Active course count reflects the subject's own enrollments only.
            expect(dashboard.activeCourseCount).toBe(subjectCourses);

            // Every surfaced grade belongs to the subject, never the other
            // student (Req 2.1, 2.5).
            for (const grade of dashboard.recentGrades) {
              expect(subjectMarkIds.has(grade.id)).toBe(true);
              expect(otherMarkIds.has(grade.id)).toBe(false);
            }

            // Derived attendance figure stays a well-formed scoped percentage.
            expect(dashboard.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(dashboard.attendanceRate).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
