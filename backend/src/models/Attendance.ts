import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttendance extends Document {
  enrollment: Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recordedBy?: Types.ObjectId;
  recordedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    notes: {
      type: String,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Compound index for efficient queries and uniqueness
AttendanceSchema.index({ enrollment: 1, date: 1 }, { unique: true });
// Optimized query index per task spec: { enrollment: 1, date: -1 }
AttendanceSchema.index({ enrollment: 1, date: -1 });

const Attendance: Model<IAttendance> = mongoose.model<IAttendance>(
  'Attendance',
  AttendanceSchema
);

export default Attendance;
