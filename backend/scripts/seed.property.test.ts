/**
 * Property-Based Tests: Seed Idempotence and Relational Integrity
 *
 * Feature: admin-portal-overhaul, Property 11: Seed idempotence
 * Feature: admin-portal-overhaul, Property 12: Seed relational integrity
 *
 * Property 11: For any database already containing Seed_Data, re-running the
 * seed routine SHALL leave every collection's record count unchanged (no
 * duplicates created).
 * **Validates: Requirements 6.5**
 *
 * Property 12: For any seeding run against an empty database, every created
 * Parent SHALL be linked to at least one Student and every created Student
 * SHALL be linked to at least one Course.
 * **Validates: Requirements 6.3**
 */

import mongoose, { Schema, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Inline schemas (mirrors seedAllUsers.js schemas, bound to the same collections)
// ---------------------------------------------------------------------------

const FacultySchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    employeeId: { type: String, unique: true },
    department: String,
    title: String,
    role: { type: String, enum: ['faculty', 'admin'], default: 'faculty' },
    isAdmin: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'faculties', strict: false },
);

const StudentSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    studentId: { type: String, unique: true },
    grade: String,
    parentName: String,
    parentEmail: String,
    parentPhone: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'students', strict: false },
);

const ParentSchema = new Schema(
  {
    parentId: { type: String, unique: true },
    firstName: String,
    lastName: String,
    phoneNumber: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    relationToStudent: {
      type: String,
      enum: ['Father', 'Mother', 'Guardian', 'Other'],
      default: 'Other',
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'parents', strict: false },
);

const ParentStudentRelationSchema = new Schema(
  {
    parentId: { type: Schema.Types.ObjectId, ref: 'Parent' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'parent_student_relations', strict: false },
);

const CourseSchema = new Schema(
  {
    title: String,
    code: { type: String, unique: true },
    description: String,
    faculty: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    startDate: Date,
    endDate: Date,
    schedule: [{ day: String, startTime: String, endTime: String, room: String }],
    credits: Number,
    maxStudents: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'courses', strict: false },
);

const EnrollmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student' },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    enrollmentDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'completed', 'withdrawn', 'failed'],
      default: 'active',
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', 'I', 'W', 'N/A'],
      default: 'N/A',
    },
    finalScore: { type: Number, default: null },
  },
  { collection: 'enrollments', strict: false },
);

const MarkSchema = new Schema(
  {
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
    title: String,
    type: {
      type: String,
      enum: ['assignment', 'quiz', 'exam', 'project', 'participation', 'other'],
      default: 'assignment',
    },
    maxScore: Number,
    score: Number,
    weight: { type: Number, default: 1 },
    feedback: String,
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'marks', strict: false },
);

const AttendanceSchema = new Schema(
  {
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
    date: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    notes: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    recordedAt: { type: Date, default: Date.now },
  },
  { collection: 'attendances', strict: false },
);

const MessageSchema = new Schema(
  {
    conversationId: String,
    subject: String,
    content: String,
    senderId: Schema.Types.ObjectId,
    senderModel: { type: String, enum: ['Parent', 'Faculty'] },
    senderName: String,
    recipientId: Schema.Types.ObjectId,
    recipientModel: { type: String, enum: ['Parent', 'Faculty'] },
    recipientName: String,
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    isRead: { type: Boolean, default: false },
    messageType: {
      type: String,
      enum: ['general', 'academic', 'behavioral', 'attendance', 'urgent'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'delivered',
    },
  },
  { timestamps: true, collection: 'messages', strict: false },
);

const SystemMetricSchema = new Schema(
  {
    key: { type: String, unique: true },
    label: String,
    value: Number,
    unit: String,
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'system_metrics', strict: false },
);

// ---------------------------------------------------------------------------
// Model factory (creates fresh models per test connection)
// ---------------------------------------------------------------------------

function getModels() {
  const Faculty = mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
  const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
  const Parent = mongoose.models.Parent || mongoose.model('Parent', ParentSchema);
  const ParentStudentRelation =
    mongoose.models.ParentStudentRelation ||
    mongoose.model('ParentStudentRelation', ParentStudentRelationSchema);
  const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
  const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
  const Mark = mongoose.models.Mark || mongoose.model('Mark', MarkSchema);
  const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
  const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
  const SystemMetric =
    mongoose.models.SystemMetric || mongoose.model('SystemMetric', SystemMetricSchema);

  return {
    Faculty,
    Student,
    Parent,
    ParentStudentRelation,
    Course,
    Enrollment,
    Mark,
    Attendance,
    Message,
    SystemMetric,
  };
}

// ---------------------------------------------------------------------------
// Seed routine (mirrors seedAllUsers.js logic for testing)
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 4; // Reduced for test speed

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Idempotent upsert: find by filter; create only when absent.
 */
async function upsert(
  model: Model<any>,
  filter: Record<string, unknown>,
  buildDoc: () => Promise<Record<string, unknown>>,
) {
  const existing = await model.findOne(filter);
  if (existing) return existing;
  return model.create(await buildDoc());
}

/**
 * Run the full seed graph — produces the same relational structure as
 * seedAllUsers.js against whatever mongoose connection is active.
 */
async function runSeed() {
  const {
    Faculty,
    Student,
    Parent,
    ParentStudentRelation,
    Course,
    Enrollment,
    Mark,
    Attendance,
    Message,
    SystemMetric,
  } = getModels();

  // ── Accounts ──
  const admin = await upsert(Faculty, { email: 'admin@gurukul.edu' }, async () => ({
    firstName: 'Krishna',
    lastName: 'Admin',
    email: 'admin@gurukul.edu',
    password: await hash('Admin@2024'),
    employeeId: 'ADM001',
    department: 'Administration',
    title: 'Administrator',
    role: 'admin',
    isAdmin: true,
    active: true,
  }));

  const teacher1 = await upsert(Faculty, { email: 'teacher@gurukul.edu' }, async () => ({
    firstName: 'Dronacharya',
    lastName: 'Singh',
    email: 'teacher@gurukul.edu',
    password: await hash('Teacher@2024'),
    employeeId: 'FAC001',
    department: 'Computer Science',
    title: 'Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  }));

  const teacher2 = await upsert(Faculty, { email: 'teacher2@gurukul.edu' }, async () => ({
    firstName: 'Vishwamitra',
    lastName: 'Rao',
    email: 'teacher2@gurukul.edu',
    password: await hash('Teacher@2024'),
    employeeId: 'FAC002',
    department: 'Mathematics',
    title: 'Associate Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  }));

  const student1 = await upsert(Student, { email: 'student@gurukul.edu' }, async () => ({
    firstName: 'Arjun',
    lastName: 'Sharma',
    email: 'student@gurukul.edu',
    password: await hash('Student@2024'),
    studentId: 'STU001',
    grade: '10',
    parentName: 'Rajesh Sharma',
    parentEmail: 'parent@gurukul.edu',
    parentPhone: '9876543210',
    active: true,
  }));

  const student2 = await upsert(Student, { email: 'student2@gurukul.edu' }, async () => ({
    firstName: 'Bhima',
    lastName: 'Patel',
    email: 'student2@gurukul.edu',
    password: await hash('Student@2024'),
    studentId: 'STU002',
    grade: '10',
    parentName: 'Sunita Patel',
    parentEmail: 'parent2@gurukul.edu',
    parentPhone: '9876543211',
    active: true,
  }));

  const parent1 = await upsert(Parent, { parentId: 'PAR001' }, async () => ({
    parentId: 'PAR001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phoneNumber: '9876543210',
    email: 'parent@gurukul.edu',
    password: await hash('Parent@2024'),
    relationToStudent: 'Father',
    isActive: true,
    isVerified: true,
  }));

  const parent2 = await upsert(Parent, { parentId: 'PAR002' }, async () => ({
    parentId: 'PAR002',
    firstName: 'Sunita',
    lastName: 'Patel',
    phoneNumber: '9876543211',
    email: 'parent2@gurukul.edu',
    password: await hash('Parent@2024'),
    relationToStudent: 'Mother',
    isActive: true,
    isVerified: true,
  }));

  // ── Parent → Student links ──
  const relationPairs: [any, any][] = [
    [parent1, student1],
    [parent2, student2],
  ];
  for (const [parent, student] of relationPairs) {
    await upsert(
      ParentStudentRelation,
      { parentId: parent._id, studentId: student._id },
      async () => ({
        parentId: parent._id,
        studentId: student._id,
        isActive: true,
      }),
    );
  }

  // ── Courses ──
  const now = new Date();
  const courseStart = new Date(now.getFullYear(), 0, 1);
  const courseEnd = new Date(now.getFullYear(), 11, 31);

  const cs101 = await upsert(Course, { code: 'CS101' }, async () => ({
    title: 'Introduction to Programming',
    code: 'CS101',
    description: 'Foundations of programming using modern languages.',
    faculty: teacher1._id,
    startDate: courseStart,
    endDate: courseEnd,
    schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'A101' }],
    credits: 4,
    maxStudents: 30,
    active: true,
  }));

  const cs201 = await upsert(Course, { code: 'CS201' }, async () => ({
    title: 'Data Structures',
    code: 'CS201',
    description: 'Core data structures and algorithmic thinking.',
    faculty: teacher1._id,
    startDate: courseStart,
    endDate: courseEnd,
    schedule: [{ day: 'Wednesday', startTime: '11:00', endTime: '12:30', room: 'A102' }],
    credits: 4,
    maxStudents: 30,
    active: true,
  }));

  const ma101 = await upsert(Course, { code: 'MA101' }, async () => ({
    title: 'Calculus I',
    code: 'MA101',
    description: 'Limits, derivatives, and integrals.',
    faculty: teacher2._id,
    startDate: courseStart,
    endDate: courseEnd,
    schedule: [{ day: 'Tuesday', startTime: '09:00', endTime: '10:30', room: 'B201' }],
    credits: 3,
    maxStudents: 30,
    active: true,
  }));

  // ── Enrollments ──
  const enrollmentPairs: [any, any, string, number][] = [
    [student1, cs101, 'A', 88],
    [student1, ma101, 'B', 79],
    [student2, cs101, 'B', 82],
    [student2, cs201, 'A', 91],
  ];
  const enrollments: { enrollment: any; student: any; course: any }[] = [];
  for (const [student, course, grade, finalScore] of enrollmentPairs) {
    const enrollment = await upsert(
      Enrollment,
      { student: student._id, course: course._id },
      async () => ({
        student: student._id,
        course: course._id,
        enrollmentDate: courseStart,
        status: 'active',
        grade,
        finalScore,
      }),
    );
    enrollments.push({ enrollment, student, course });
  }

  // ── Marks ──
  const markTemplates = [
    { title: 'Quiz 1', type: 'quiz', maxScore: 20, score: 17, weight: 0.2 },
    { title: 'Midterm Exam', type: 'exam', maxScore: 100, score: 84, weight: 0.4 },
  ];
  for (const { enrollment } of enrollments) {
    for (const tmpl of markTemplates) {
      await upsert(Mark, { enrollment: enrollment._id, title: tmpl.title }, async () => ({
        enrollment: enrollment._id,
        ...tmpl,
        feedback: 'Good effort — keep practicing.',
        aiGenerated: false,
      }));
    }
  }

  // ── Attendance ──
  const attendanceDays = [
    { offset: 7, status: 'present' },
    { offset: 6, status: 'present' },
    { offset: 5, status: 'late' },
    { offset: 4, status: 'absent' },
  ];
  for (const { enrollment, course } of enrollments) {
    for (const { offset, status } of attendanceDays) {
      const date = new Date(now);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - offset);
      await upsert(Attendance, { enrollment: enrollment._id, date }, async () => ({
        enrollment: enrollment._id,
        date,
        status,
        recordedBy: course.faculty,
        recordedAt: date,
      }));
    }
  }

  // ── Messages ──
  const messagePairs = [
    { parent: parent1, teacher: teacher1, student: student1 },
    { parent: parent2, teacher: teacher1, student: student2 },
  ];
  for (const { parent, teacher, student } of messagePairs) {
    const conversationId = `parent_${parent._id}_teacher_${teacher._id}_student_${student._id}`;
    const subject = `Progress update for ${student.firstName}`;
    await upsert(Message, { conversationId, subject }, async () => ({
      conversationId,
      subject,
      content: `Hello, update on ${student.firstName}'s performance.`,
      senderId: teacher._id,
      senderModel: 'Faculty',
      senderName: `${teacher.firstName} ${teacher.lastName}`,
      recipientId: parent._id,
      recipientModel: 'Parent',
      recipientName: `${parent.firstName} ${parent.lastName}`,
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`,
      isRead: false,
      messageType: 'academic',
      priority: 'normal',
      deliveryStatus: 'delivered',
    }));
  }

  // ── System metrics ──
  const [facultyCount, studentCount, parentCount, courseCount, enrollmentCount] =
    await Promise.all([
      Faculty.countDocuments(),
      Student.countDocuments(),
      Parent.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
    ]);
  const metricRows = [
    { key: 'total_faculty', label: 'Total Faculty', value: facultyCount, unit: 'accounts' },
    { key: 'total_students', label: 'Total Students', value: studentCount, unit: 'accounts' },
    { key: 'total_parents', label: 'Total Parents', value: parentCount, unit: 'accounts' },
    { key: 'total_courses', label: 'Total Courses', value: courseCount, unit: 'courses' },
    { key: 'total_enrollments', label: 'Total Enrollments', value: enrollmentCount, unit: 'enrollments' },
  ];
  for (const row of metricRows) {
    await SystemMetric.updateOne(
      { key: row.key },
      { $set: { ...row, capturedAt: new Date() } },
      { upsert: true },
    );
  }
}

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Drop all collections between tests for isolation
  const collections = await mongoose.connection.db!.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
});

// ---------------------------------------------------------------------------
// Helper: collect document counts across all seeded collections
// ---------------------------------------------------------------------------

async function getCollectionCounts(): Promise<Record<string, number>> {
  const { Faculty, Student, Parent, ParentStudentRelation, Course, Enrollment, Mark, Attendance, Message, SystemMetric } = getModels();
  return {
    faculties: await Faculty.countDocuments(),
    students: await Student.countDocuments(),
    parents: await Parent.countDocuments(),
    parentStudentRelations: await ParentStudentRelation.countDocuments(),
    courses: await Course.countDocuments(),
    enrollments: await Enrollment.countDocuments(),
    marks: await Mark.countDocuments(),
    attendances: await Attendance.countDocuments(),
    messages: await Message.countDocuments(),
    systemMetrics: await SystemMetric.countDocuments(),
  };
}

// ---------------------------------------------------------------------------
// Property 11: Seed idempotence
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 11: Seed idempotence
describe('Property 11: Seed idempotence', () => {
  it('re-running the seed routine N times leaves every collection record count unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of additional seed runs (1–5 extra runs after the initial seed)
        fc.integer({ min: 1, max: 5 }),
        async (extraRuns) => {
          // Clean the database
          const collections = await mongoose.connection.db!.collections();
          for (const col of collections) {
            await col.deleteMany({});
          }

          // Run the seed for the first time against an empty database
          await runSeed();

          // Capture counts after the initial seed
          const initialCounts = await getCollectionCounts();

          // Re-run the seed `extraRuns` times (simulates repeated invocations)
          for (let i = 0; i < extraRuns; i++) {
            await runSeed();
          }

          // Capture counts after all re-runs
          const finalCounts = await getCollectionCounts();

          // Property: Every collection's count must remain unchanged (no duplicates)
          for (const [collection, initialCount] of Object.entries(initialCounts)) {
            expect(finalCounts[collection]).toBe(initialCount);
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);
});

// ---------------------------------------------------------------------------
// Property 12: Seed relational integrity
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 12: Seed relational integrity
describe('Property 12: Seed relational integrity', () => {
  it('every Parent is linked to at least one Student and every Student is linked to at least one Course', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Use a constant arbitrary — the seed is deterministic, but we still run
        // multiple iterations to test across independent clean-state runs
        fc.constant(null),
        async () => {
          const { Student, Parent, ParentStudentRelation, Enrollment } = getModels();

          // Clean the database
          const collections = await mongoose.connection.db!.collections();
          for (const col of collections) {
            await col.deleteMany({});
          }

          // Seed an empty database
          await runSeed();

          // ── Every Parent is linked to at least one Student ──
          const allParents = await Parent.find({});
          expect(allParents.length).toBeGreaterThan(0);

          for (const parent of allParents) {
            const relations = await ParentStudentRelation.find({ parentId: parent._id });
            expect(relations.length).toBeGreaterThanOrEqual(1);

            // Each linked student must actually exist
            for (const rel of relations) {
              const student = await Student.findById(rel.studentId);
              expect(student).not.toBeNull();
            }
          }

          // ── Every Student is linked to at least one Course (via Enrollment) ──
          const allStudents = await Student.find({});
          expect(allStudents.length).toBeGreaterThan(0);

          for (const student of allStudents) {
            const enrollments = await Enrollment.find({ student: student._id });
            expect(enrollments.length).toBeGreaterThanOrEqual(1);

            // Each enrollment's course field must be a valid ObjectId
            for (const enrollment of enrollments) {
              expect(enrollment.course).toBeTruthy();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);
});
