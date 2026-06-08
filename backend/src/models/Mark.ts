import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttachment {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

export interface IMark extends Document {
  enrollment: Types.ObjectId;
  title: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project' | 'participation' | 'other';
  maxScore: number;
  score: number;
  weight: number;
  dueDate?: Date;
  submissionDate?: Date;
  feedback?: string;
  attachments: IAttachment[];
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  percentage: number;
}

const MarkSchema = new Schema<IMark>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['assignment', 'quiz', 'exam', 'project', 'participation', 'other'],
      default: 'assignment',
    },
    maxScore: {
      type: Number,
      required: [true, 'Maximum score is required'],
      min: [0, 'Maximum score cannot be negative'],
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
    },
    weight: {
      type: Number,
      default: 1,
      min: [0, 'Weight cannot be negative'],
    },
    dueDate: {
      type: Date,
    },
    submissionDate: {
      type: Date,
    },
    feedback: {
      type: String,
    },
    attachments: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient queries
MarkSchema.index({ enrollment: 1, type: 1 });

// Virtual field for percentage score
MarkSchema.virtual('percentage').get(function (this: IMark) {
  if (this.maxScore === 0) return 0;
  return Math.round((this.score / this.maxScore) * 100);
});

const Mark: Model<IMark> = mongoose.model<IMark>('Mark', MarkSchema);

export default Mark;
