import mongoose, { Schema, Document, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IFaculty extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
  department: string;
  title: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  active: boolean;
  isAdmin: boolean;
  role: 'faculty' | 'admin';
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  deletedAt?: Date;
  createdAt: Date;

  // Virtuals
  fullName: string;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const FacultySchema = new Schema<IFaculty>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
    },
    title: {
      type: String,
      default: 'Instructor',
    },
    phone: {
      type: String,
    },
    bio: {
      type: String,
    },
    avatar: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['faculty', 'admin'],
      default: 'faculty',
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for full name
FacultySchema.virtual('fullName').get(function (this: IFaculty) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual field for courses
FacultySchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'faculty',
  justOne: false,
});

// Encrypt password using bcrypt and sync role with isAdmin
FacultySchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Ensure role is 'admin' when isAdmin is true
  if (this.isModified('isAdmin') && this.isAdmin === true) {
    this.role = 'admin';
  }
});

// Match user entered password to hashed password in database
FacultySchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

const Faculty: Model<IFaculty> = mongoose.model<IFaculty>(
  'Faculty',
  FacultySchema
);

export default Faculty;
