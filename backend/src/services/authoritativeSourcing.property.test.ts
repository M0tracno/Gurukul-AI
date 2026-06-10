/**
 * Property-Based Tests: Dashboards source identity from authoritative records
 * and reflect updates through references.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 6: Dashboards source identity from authoritative records and reflect updates through references
 *
 * Property 6: For any generated Student/Faculty record and related documents,
 * dashboard responses return identity/profile values equal to the CURRENT
 * authoritative record (never hardcoded), resolve related items through
 * reference ids rather than copied identity fields, and after an update to the
 * authoritative record subsequent responses reflect the new value.
 *
 *  - Authoritative identity (Req 3.1): getStudentDashboard returns profile
 *    fields exactly equal to the stored authoritative Student record.
 *  - Reference resolution (Req 3.3): facultyMeService.getStudents resolves the
 *    enrolled student through the Enrollment -> Course (faculty) reference
 *    chain and joins back to the authoritative Student record.
 *  - Update reflection (Req 3.2): updating the authoritative Student record is
 *    reflected in a subsequent getStudentDashboard response, proving the
 *    record is re-read each time (not cached/duplicated).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
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

// ---------------------------------------------------------------------------
// MongoDB memory server setup (native-driver inserts, like auditEvents test)
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
  await Promise.all([
    Student.deleteMany({}),
    Faculty.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
  ]);
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A human name fragment: 1–12 letters with a leading capital. */
const nameArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 65, max: 90 }), // A–Z
    fc.array(fc.integer({ min: 97, max: 122 }), { minLength: 0, maxLength: 11 }), // a–z
  )
  .map(
    ([head, rest]) =>
      String.fromCharCode(head) + rest.map((c) => String.fromCharCode(c)).join(''),
  );

/** A grade label (e.g. "9", "10", "Grade-11"). */
const gradeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('9', '10', '11', '12', 'K', 'Grade-7', 'Grade-8'),
  fc.integer({ min: 1, max: 12 }).map((n) => String(n)),
);

/**
 * Insert an authoritative Student via the native driver, bypassing the bcrypt
 * password-hashing save hook. Returns the ObjectId.
 */
async function insertStudent(
  firstName: string,
  lastName: string,
  grade: string,
): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  const suffix = _id.toHexString();
  await Student.collection.insertOne({
    _id,
    firstName,
    lastName,
    email: `student.${suffix}@example.com`,
    password: 'placeholder-hash',
    studentId: `S-${suffix}`,
    grade,
    active: true,
    deletedAt: null,
    isDemo: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
  });
  return _id;
}

/** Insert an authoritative Faculty via the native driver. */
async function insertFaculty(): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  const suffix = _id.toHexString();
  await Faculty.collection.insertOne({
    _id,
    firstName: 'Prof',
    lastName: suffix.slice(0, 6),
    email: `faculty.${suffix}@example.com`,
    password: 'placeholder-hash',
    employeeId: `E-${suffix}`,
    department: 'Science',
    title: 'Instructor',
    active: true,
    isAdmin: false,
    role: 'faculty',
    deletedAt: null,
    isDemo: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
  });
  return _id;
}

/** Insert a Course owned by the given faculty via the native driver. */
async function insertCourse(
  facultyId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  const suffix = _id.toHexString();
  await Course.collection.insertOne({
    _id,
    title: `Course ${suffix.slice(0, 6)}`,
    code: `C-${suffix}`,
    description: 'A generated course',
    faculty: facultyId,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-01'),
    schedule: [],
    credits: 3,
    maxStudents: 30,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
  });
  return _id;
}

/** Enroll a student in a course via the native driver. */
async function insertEnrollment(
  studentId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId,
): Promise<void> {
  await Enrollment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    student: studentId,
    course: courseId,
    status: 'active',
    enrollmentDate: new Date(),
    grade: 'N/A',
    finalScore: null,
  });
}

// ---------------------------------------------------------------------------
// Property 6
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 6: Dashboards source identity from authoritative records and reflect updates through references
describe('Property 6: Dashboards source identity from authoritative records and reflect updates through references', () => {
  it(
    'returns authoritative identity, resolves related items via references, and reflects updates',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nameArb,
          nameArb,
          gradeArb,
          nameArb,
          async (firstName, lastName, grade, updatedFirstName) => {
            // The update must change the value to prove re-reading (Req 3.2).
            fc.pre(updatedFirstName !== firstName);

            // Isolate each run.
            await Promise.all([
              Student.deleteMany({}),
              Faculty.deleteMany({}),
              Course.deleteMany({}),
              Enrollment.deleteMany({}),
            ]);

            // ---- 1) Authoritative identity (Req 3.1) ----
            const studentId = await insertStudent(firstName, lastName, grade);

            const dashboard = await dashboardService.getStudentDashboard(
              String(studentId),
            );

            // Profile equals the stored authoritative record (not hardcoded).
            expect(dashboard.profile.id).toBe(String(studentId));
            expect(dashboard.profile.firstName).toBe(firstName);
            expect(dashboard.profile.lastName).toBe(lastName);
            expect(dashboard.profile.grade).toBe(grade);
            expect(dashboard.profile.fullName).toBe(`${firstName} ${lastName}`);

            // ---- 2) Reference resolution (Req 3.3) ----
            // Faculty F owns Course C; the student is enrolled via an
            // Enrollment that references C. getStudents must resolve the
            // student through the Enrollment -> Course(faculty) chain and join
            // back to the authoritative Student record.
            const facultyId = await insertFaculty();
            const courseId = await insertCourse(facultyId);
            await insertEnrollment(studentId, courseId);

            const facultyStudents = await facultyMeService.getStudents(
              String(facultyId),
            );

            const resolved = facultyStudents.find(
              (s) => s.id === String(studentId),
            );
            expect(resolved).toBeDefined();
            // The resolved record carries the authoritative Student's fields,
            // proving it was joined back to the source record (Req 3.1/3.3).
            expect(resolved!.firstName).toBe(firstName);
            expect(resolved!.lastName).toBe(lastName);
            expect(resolved!.grade).toBe(grade);
            expect(resolved!.studentId).toBe(`S-${studentId.toHexString()}`);

            // A faculty member who owns no courses resolves no students,
            // confirming resolution is via the reference chain, not identity
            // copies (Req 3.3).
            const otherFaculty = await insertFaculty();
            const otherFacultyStudents = await facultyMeService.getStudents(
              String(otherFaculty),
            );
            expect(
              otherFacultyStudents.some((s) => s.id === String(studentId)),
            ).toBe(false);

            // ---- 3) Update reflection (Req 3.2) ----
            await Student.updateOne(
              { _id: studentId },
              { $set: { firstName: updatedFirstName } },
            );

            const updatedDashboard = await dashboardService.getStudentDashboard(
              String(studentId),
            );

            // Subsequent response reflects the NEW authoritative value,
            // proving the record is re-read (not cached/duplicated).
            expect(updatedDashboard.profile.firstName).toBe(updatedFirstName);
            expect(updatedDashboard.profile.fullName).toBe(
              `${updatedFirstName} ${lastName}`,
            );
            // Unchanged authoritative fields remain consistent.
            expect(updatedDashboard.profile.lastName).toBe(lastName);
            expect(updatedDashboard.profile.grade).toBe(grade);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
