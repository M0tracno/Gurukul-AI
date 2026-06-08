import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Inline Schemas (simplified versions matching real models) ────────────────

const FacultySchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  employeeId: String,
  department: String,
  role: { type: String, default: 'faculty' },
  title: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const StudentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  studentId: { type: String, unique: true },
  grade: String,
  active: { type: Boolean, default: true },
  parentPhone: String,
}, { timestamps: true });

const ParentSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  email: String,
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
}, { timestamps: true });

const Faculty = mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Parent = mongoose.models.Parent || mongoose.model('Parent', ParentSchema);

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

const users = [
  {
    model: Faculty,
    label: 'Admin',
    data: {
      firstName: 'Krishna',
      lastName: 'Admin',
      email: 'admin@gurukul.edu',
      employeeId: 'ADM001',
      department: 'Administration',
      role: 'admin',
      isActive: true,
    },
    password: 'Admin@2024',
  },
  {
    model: Faculty,
    label: 'Faculty',
    data: {
      firstName: 'Dronacharya',
      lastName: 'Singh',
      email: 'teacher@gurukul.edu',
      employeeId: 'FAC001',
      department: 'Computer Science',
      role: 'faculty',
      isActive: true,
    },
    password: 'Teacher@2024',
  },
  {
    model: Student,
    label: 'Student',
    data: {
      firstName: 'Arjun',
      lastName: 'Sharma',
      email: 'student@gurukul.edu',
      studentId: 'STU001',
      grade: '10',
      active: true,
      parentPhone: '9876543210',
    },
    password: 'Student@2024',
  },
];

// ─── Seed Logic ──────────────────────────────────────────────────────────────

async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI or MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    let studentDoc = null;

    for (const { model, label, data, password } of users) {
      const existing = await model.findOne({ email: data.email });
      if (existing) {
        console.log(`⏭️  ${label} (${data.email}) already exists — skipping`);
        if (label === 'Student') studentDoc = existing;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const doc = await model.create({ ...data, password: hashedPassword });
      console.log(`✅ ${label} created: ${data.email}`);

      if (label === 'Student') studentDoc = doc;
    }

    // Seed Parent linked to the student
    if (studentDoc) {
      const existingParent = await Parent.findOne({ phone: '9876543210' });
      if (existingParent) {
        console.log('⏭️  Parent (9876543210) already exists — skipping');
      } else {
        await Parent.create({
          name: 'Rajesh Sharma',
          phone: '9876543210',
          email: 'parent@gurukul.edu',
          studentIds: [studentDoc._id],
          isActive: true,
          isVerified: true,
        });
        console.log('✅ Parent created: 9876543210 (linked to student)');
      }
    }

    console.log('\n🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
