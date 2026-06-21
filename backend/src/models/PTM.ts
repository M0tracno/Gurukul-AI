import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PTMStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface IPTM extends Document {
  teacherId: Types.ObjectId;
  parentId: Types.ObjectId;
  studentId: Types.ObjectId;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: PTMStatus;
  participants: Types.ObjectId[];
  recordingEnabled: boolean;
  recordingRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PTMSchema = new Schema<IPTM>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Teacher ID is required'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: [true, 'Parent ID is required'],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    scheduledStart: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
    },
    scheduledEnd: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['scheduled', 'active', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid PTM status',
      },
      default: 'scheduled',
    },
    participants: {
      type: [Schema.Types.ObjectId],
      required: true,
      validate: {
        validator: (participants: Types.ObjectId[]) => participants.length >= 2,
        message: 'PTM must have at least two participants',
      },
    },
    recordingEnabled: {
      type: Boolean,
      default: false,
    },
    recordingRef: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Index for conflict detection: query overlapping PTMs for the same teacher
PTMSchema.index({ teacherId: 1, scheduledStart: 1, scheduledEnd: 1 });

// Index for querying PTMs by participant
PTMSchema.index({ participants: 1 });

// Index for querying PTMs by status
PTMSchema.index({ status: 1 });

const PTM: Model<IPTM> = mongoose.model<IPTM>('PTM', PTMSchema);

export default PTM;
