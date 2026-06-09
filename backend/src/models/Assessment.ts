import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IQuestion {
  questionId: string;
  prompt: string;
  type: 'objective' | 'subjective';
  maxScore: number;
  options?: string[];
  answerKey?: string;
}

export interface IAssessment extends Document {
  courseId: Types.ObjectId;
  teacherId: Types.ObjectId;
  title: string;
  questions: IQuestion[];
  opensAt: Date;
  closesAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionId: {
      type: String,
      required: [true, 'Question ID is required'],
      trim: true,
    },
    prompt: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: {
        values: ['objective', 'subjective'],
        message: '{VALUE} is not a valid question type',
      },
    },
    maxScore: {
      type: Number,
      required: [true, 'Max score is required'],
      min: [0, 'Max score cannot be negative'],
    },
    options: {
      type: [String],
      default: undefined,
    },
    answerKey: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Teacher ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    questions: {
      type: [QuestionSchema],
      required: true,
      validate: {
        validator: (questions: IQuestion[]) => questions.length > 0,
        message: 'Assessment must contain at least one question',
      },
    },
    opensAt: {
      type: Date,
      required: [true, 'Opens-at date is required'],
    },
    closesAt: {
      type: Date,
      required: [true, 'Closes-at date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying assessments by course and teacher
AssessmentSchema.index({ courseId: 1, teacherId: 1 });

// Index for querying assessments by submission window
AssessmentSchema.index({ opensAt: 1, closesAt: 1 });

const Assessment: Model<IAssessment> = mongoose.model<IAssessment>(
  'Assessment',
  AssessmentSchema
);

export default Assessment;
