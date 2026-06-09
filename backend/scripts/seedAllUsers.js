import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/*
 * Idempotent relational seed routine (Requirements 6.1, 6.2, 6.3, 6.5).
 *
 * This script builds a connected graph of demo data:
 *   - Admin / Teacher / Student / Parent accounts
 *   - Courses owned by teachers
 *   - Enrollments linking each Student to at least one Course
 *   - Marks and Attendance records referencing enrollments
 *   - Parent <-> Student links (parent_student_relations collection)
 *   - Messages between parents and teachers about students
 *   - System metrics that reference the seeded population
 *
 * Every write upserts by a stable natural key (email, employeeId, studentId,
 * course code, parentId, the {student, course} pair, etc.) so re-running the
 * script never creates duplicate records (Requirement 6.5).
 *
 * The script is plain ESM and runs via `node scripts/seedAllUsers.js`, so it
 * cannot import the TypeScript Mongoose models directly. Instead it declares
 * inline schemas that mirror the real models' field names and bind to the same
 * MongoDB collections, guaranteeing the seeded data lands where the running
 * application reads it.
 */

const SALT_ROUNDS = 12;

// ─── Inline Schemas (bound to the real application collections) ───────────────

const FacultySchema = new mongoose.Schema(
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
  { timestamps: true, collection: 'faculties', strict: false }
);

const StudentSchema = new mongoose.Schema(
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
  { timestamps: true, collection: 'students', strict: false }
);

const ParentSchema = new mongoose.Schema(
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
  { timestamps: true, collection: 'parents', strict: false }
);

const ParentStudentRelationSchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'parent_student_relations', strict: false }
);

const CourseSchema = new mongoose.Schema(
  {
    title: String,
    code: { type: String, unique: true },
    description: String,
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    startDate: Date,
    endDate: Date,
    schedule: [{ day: String, startTime: String, endTime: String, room: String }],
    credits: Number,
    maxStudents: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'courses', strict: false }
);

const EnrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
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
  { collection: 'enrollments', strict: false }
);

const MarkSchema = new mongoose.Schema(
  {
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
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
  { timestamps: true, collection: 'marks', strict: false }
);

const AttendanceSchema = new mongoose.Schema(
  {
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
    date: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    recordedAt: { type: Date, default: Date.now },
  },
  { collection: 'attendances', strict: false }
);

const MessageSchema = new mongoose.Schema(
  {
    conversationId: String,
    subject: String,
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    senderModel: { type: String, enum: ['Parent', 'Faculty'] },
    senderName: String,
    recipientId: mongoose.Schema.Types.ObjectId,
    recipientModel: { type: String, enum: ['Parent', 'Faculty'] },
    recipientName: String,
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
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
  { timestamps: true, collection: 'messages', strict: false }
);

const SystemMetricSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    label: String,
    value: Number,
    unit: String,
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'system_metrics', strict: false }
);

const Faculty =
  mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
const Student =
  mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Parent = mongoose.models.Parent || mongoose.model('Parent', ParentSchema);
const ParentStudentRelation =
  mongoose.models.ParentStudentRelation ||
  mongoose.model('ParentStudentRelation', ParentStudentRelationSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Enrollment =
  mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
const Mark = mongoose.models.Mark || mongoose.model('Mark', MarkSchema);
const Attendance =
  mongoose.models.Attendance ||
  mongoose.model('Attendance', AttendanceSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const SystemMetric =
  mongoose.models.SystemMetric ||
  mongoose.model('SystemMetric', SystemMetricSchema);

// ─── Idempotent upsert helpers ────────────────────────────────────────────────

/** Track per-collection insert counts for the run summary. */
const stats = {};
function note(label, created) {
  if (!stats[label]) stats[label] = { created: 0, skipped: 0 };
  if (created) stats[label].created += 1;
  else stats[label].skipped += 1;
}

/**
 * Find a document by a stable natural-key filter; create it only when absent.
 * Re-runs return the existing document without mutating it, so no duplicates
 * are ever created (Requirement 6.5).
 */
async function upsert(model, label, filter, buildDoc) {
  const existing = await model.findOne(filter);
  if (existing) {
    note(label, false);
    return existing;
  }
  const created = await model.create(await buildDoc());
  note(label, true);
  return created;
}

async function hash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// ─── Seed graph definition ────────────────────────────────────────────────────

const DEMO_PASSWORDS = {
  admin: 'Admin@2024',
  teacher: 'Teacher@2024',
  student: 'Student@2024',
  parent: 'Parent@2024',
};

async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI or MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // ── Accounts ───────────────────────────────────────────────────────────
    const admin = await upsert(
      Faculty,
      'Faculty (Admin)',
      { email: 'admin@gurukul.edu' },
      async () => ({
        firstName: 'Krishna',
        lastName: 'Admin',
        email: 'admin@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.admin),
        employeeId: 'ADM001',
        department: 'Administration',
        title: 'Administrator',
        role: 'admin',
        isAdmin: true,
        active: true,
      })
    );

    const teacher1 = await upsert(
      Faculty,
      'Faculty (Teacher)',
      { email: 'teacher@gurukul.edu' },
      async () => ({
        firstName: 'Dronacharya',
        lastName: 'Singh',
        email: 'teacher@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.teacher),
        employeeId: 'FAC001',
        department: 'Computer Science',
        title: 'Professor',
        role: 'faculty',
        isAdmin: false,
        active: true,
      })
    );

    const teacher2 = await upsert(
      Faculty,
      'Faculty (Teacher)',
      { email: 'teacher2@gurukul.edu' },
      async () => ({
        firstName: 'Vishwamitra',
        lastName: 'Rao',
        email: 'teacher2@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.teacher),
        employeeId: 'FAC002',
        department: 'Mathematics',
        title: 'Associate Professor',
        role: 'faculty',
        isAdmin: false,
        active: true,
      })
    );

    const student1 = await upsert(
      Student,
      'Student',
      { email: 'student@gurukul.edu' },
      async () => ({
        firstName: 'Arjun',
        lastName: 'Sharma',
        email: 'student@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.student),
        studentId: 'STU001',
        grade: '10',
        parentName: 'Rajesh Sharma',
        parentEmail: 'parent@gurukul.edu',
        parentPhone: '9876543210',
        active: true,
      })
    );

    const student2 = await upsert(
      Student,
      'Student',
      { email: 'student2@gurukul.edu' },
      async () => ({
        firstName: 'Bhima',
        lastName: 'Patel',
        email: 'student2@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.student),
        studentId: 'STU002',
        grade: '10',
        parentName: 'Sunita Patel',
        parentEmail: 'parent2@gurukul.edu',
        parentPhone: '9876543211',
        active: true,
      })
    );

    const parent1 = await upsert(
      Parent,
      'Parent',
      { parentId: 'PAR001' },
      async () => ({
        parentId: 'PAR001',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        phoneNumber: '9876543210',
        email: 'parent@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.parent),
        relationToStudent: 'Father',
        isActive: true,
        isVerified: true,
      })
    );

    const parent2 = await upsert(
      Parent,
      'Parent',
      { parentId: 'PAR002' },
      async () => ({
        parentId: 'PAR002',
        firstName: 'Sunita',
        lastName: 'Patel',
        phoneNumber: '9876543211',
        email: 'parent2@gurukul.edu',
        password: await hash(DEMO_PASSWORDS.parent),
        relationToStudent: 'Mother',
        isActive: true,
        isVerified: true,
      })
    );

    // ── Parent → Student links (Requirement 6.3) ─────────────────────────────
    // Every Parent is linked to at least one Student via parent_student_relations.
    const relationPairs = [
      [parent1, student1],
      [parent2, student2],
    ];
    for (const [parent, student] of relationPairs) {
      await upsert(
        ParentStudentRelation,
        'ParentStudentRelation',
        { parentId: parent._id, studentId: student._id },
        async () => ({
          parentId: parent._id,
          studentId: student._id,
          isActive: true,
        })
      );
    }

    // ── Courses (owned by teachers) ──────────────────────────────────────────
    const now = new Date();
    const courseStart = new Date(now.getFullYear(), 0, 1);
    const courseEnd = new Date(now.getFullYear(), 11, 31);

    const cs101 = await upsert(Course, 'Course', { code: 'CS101' }, async () => ({
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

    const cs201 = await upsert(Course, 'Course', { code: 'CS201' }, async () => ({
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

    const ma101 = await upsert(Course, 'Course', { code: 'MA101' }, async () => ({
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

    // ── Enrollments (each Student → at least one Course, Requirement 6.3) ─────
    const enrollmentPairs = [
      [student1, cs101, 'A', 88],
      [student1, ma101, 'B', 79],
      [student2, cs101, 'B', 82],
      [student2, cs201, 'A', 91],
    ];
    const enrollments = [];
    for (const [student, course, grade, finalScore] of enrollmentPairs) {
      const enrollment = await upsert(
        Enrollment,
        'Enrollment',
        { student: student._id, course: course._id },
        async () => ({
          student: student._id,
          course: course._id,
          enrollmentDate: courseStart,
          status: 'active',
          grade,
          finalScore,
        })
      );
      enrollments.push({ enrollment, student, course });
    }

    // ── Marks (reference enrollments) ────────────────────────────────────────
    const markTemplates = [
      { title: 'Quiz 1', type: 'quiz', maxScore: 20, score: 17, weight: 0.2 },
      { title: 'Midterm Exam', type: 'exam', maxScore: 100, score: 84, weight: 0.4 },
    ];
    for (const { enrollment } of enrollments) {
      for (const tmpl of markTemplates) {
        await upsert(
          Mark,
          'Mark',
          { enrollment: enrollment._id, title: tmpl.title },
          async () => ({
            enrollment: enrollment._id,
            ...tmpl,
            feedback: 'Good effort — keep practicing.',
            aiGenerated: false,
          })
        );
      }
    }

    // ── Attendance (reference enrollments) ───────────────────────────────────
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
        await upsert(
          Attendance,
          'Attendance',
          { enrollment: enrollment._id, date },
          async () => ({
            enrollment: enrollment._id,
            date,
            status,
            recordedBy: course.faculty,
            recordedAt: date,
          })
        );
      }
    }

    // ── Messages (Parent ↔ Teacher about a Student) ──────────────────────────
    const messagePairs = [
      { parent: parent1, teacher: teacher1, student: student1 },
      { parent: parent2, teacher: teacher1, student: student2 },
    ];
    for (const { parent, teacher, student } of messagePairs) {
      const conversationId = `parent_${parent._id}_teacher_${teacher._id}_student_${student._id}`;
      const subject = `Progress update for ${student.firstName}`;
      await upsert(
        Message,
        'Message',
        { conversationId, subject },
        async () => ({
          conversationId,
          subject,
          content: `Hello, I wanted to share an update on ${student.firstName}'s recent performance. Please reach out with any questions.`,
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
        })
      );
    }

    // ── System metrics (reference the seeded population) ──────────────────────
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
      // Metrics reflect the current population, so refresh the value on re-run
      // while still upserting by the stable `key` (no duplicate rows created).
      await SystemMetric.updateOne(
        { key: row.key },
        { $set: { ...row, capturedAt: new Date() } },
        { upsert: true }
      );
      note('SystemMetric', false);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n📊 Seed summary (created / skipped):');
    for (const [label, { created, skipped }] of Object.entries(stats)) {
      console.log(`   • ${label}: +${created} created, ${skipped} existing`);
    }

    console.log('\n🔑 Demo logins:');
    console.log('   Admin   → admin@gurukul.edu    / Admin@2024');
    console.log('   Teacher → teacher@gurukul.edu  / Teacher@2024');
    console.log('   Student → student@gurukul.edu  / Student@2024');
    console.log('   Parent  → parent@gurukul.edu   / Parent@2024 (phone 9876543210)');

    console.log('\n🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
