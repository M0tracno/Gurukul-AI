import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOtpChallenge extends Document {
  relationId: Types.ObjectId;
  parentId: Types.ObjectId;
  studentId: Types.ObjectId;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt?: Date | null;
  lastSentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpChallengeSchema = new Schema<IOtpChallenge>(
  {
    relationId: {
      type: Schema.Types.ObjectId,
      ref: 'ParentStudentRelation',
      required: [true, 'Relation ID is required'],
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
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
      trim: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      required: [true, 'Last sent timestamp is required'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically removes documents when expiresAt is reached
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for resolving the latest active (unconsumed, unexpired) challenge per linkage
OtpChallengeSchema.index({ relationId: 1, consumedAt: 1, expiresAt: 1 });

const OtpChallenge: Model<IOtpChallenge> = mongoose.model<IOtpChallenge>(
  'OtpChallenge',
  OtpChallengeSchema
);

export default OtpChallenge;
