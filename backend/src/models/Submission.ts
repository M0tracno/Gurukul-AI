import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAnswer {
  questionId: string;
  response: string;
}

export interface IGradedAnswer {
  questionId: string;
  score: number;
  maxScore: number;
  confidence?: number;
  feedback?: string;
  overriddenByTeacher: boolean;
}

export type GradingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ISubmission extends Document {
  assessmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  answers: IAnswer[];
  submittedAt: Date;
  gradingJobId?: Types.ObjectId;
  gradingStatus: GradingStatus;
  gradedAnswers?: IGradedAnswer[];
  finalized: boolean;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: String,
      required: [true, 'Question ID is required'],
      trim: true,
    },
    response: {
      type: String,
      required: [true, 'Answer response is required'],
    },
  },
  { _id: false }
);

const GradedAnswerSchema = new Schema<IGradedAnswer>(
  {
    questionId: {
      type: String,
      required: [true, 'Question ID is required'],
      trim: true,
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
    },
    maxScore: {
      type: Number,
      required: [true, 'Max score is required'],
      min: [0, 'Max score cannot be negative'],
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence must be at least 0'],
      max: [1, 'Confidence must be at most 1'],
      default: undefined,
    },
    feedback: {
      type: String,
      default: undefined,
    },
    overriddenByTeacher: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false }
);

const SubmissionSchema = new Schema<ISubmission>(
  {
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID is required'],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    answers: {
      type: [AnswerSchema],
      required: true,
    },
    submittedAt: {
      type: Date,
      required: [true, 'Submitted-at date is required'],
      default: Date.now,
    },
    gradingJobId: {
      type: Schema.Types.ObjectId,
      ref: 'GradingJob',
      default: undefined,
    },
    gradingStatus: {
      type: String,
      required: true,
      enum: {
        values: ['queued', 'processing', 'completed', 'failed'],
        message: '{VALUE} is not a valid grading status',
      },
      default: 'queued',
    },
    gradedAnswers: {
      type: [GradedAnswerSchema],
      default: undefined,
    },
    finalized: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying submissions by assessment and student
SubmissionSchema.index({ assessmentId: 1, studentId: 1 });

// Index for querying submissions by grading status
SubmissionSchema.index({ gradingStatus: 1 });

const Submission: Model<ISubmission> = mongoose.model<ISubmission>(
  'Submission',
  SubmissionSchema
);

export default Submission;
