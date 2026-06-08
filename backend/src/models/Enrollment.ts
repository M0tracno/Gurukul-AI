import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEnrollment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollmentDate: Date;
  status: 'active' | 'completed' | 'withdrawn' | 'failed';
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'I' | 'W' | 'N/A';
  finalScore: number | null;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
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
    finalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure a student can only be enrolled once in a course
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Virtual field for attendance records
EnrollmentSchema.virtual('attendanceRecords', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'enrollment',
  justOne: false,
});

// Virtual field for marks/assignments
EnrollmentSchema.virtual('marks', {
  ref: 'Mark',
  localField: '_id',
  foreignField: 'enrollment',
  justOne: false,
});

const Enrollment: Model<IEnrollment> = mongoose.model<IEnrollment>(
  'Enrollment',
  EnrollmentSchema
);

export default Enrollment;
