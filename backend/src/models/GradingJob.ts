import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGradingSubmission {
  submissionId: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  retryCount: number;
  result?: {
    score: number;
    maxScore: number;
    confidence: number;
    explanation: string;
  };
  failureReason?: string;
}

export interface IGradingJob extends Document {
  batchId: string;
  teacherId: Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_failures';
  totalSubmissions: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  concurrency: number;
  submissions: IGradingSubmission[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GradingSubmissionSchema = new Schema<IGradingSubmission>(
  {
    submissionId: {
      type: String,
      required: [true, 'Submission ID is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      enum: {
        values: ['application/pdf', 'image/jpeg', 'image/png'],
        message: '{VALUE} is not an accepted file format',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'processing', 'success', 'failed'],
        message: '{VALUE} is not a valid submission status',
      },
      default: 'pending',
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    result: {
      type: {
        score: {
          type: Number,
          required: true,
          min: [0, 'Score cannot be negative'],
        },
        maxScore: {
          type: Number,
          required: true,
          min: [0, 'Max score cannot be negative'],
        },
        confidence: {
          type: Number,
          required: true,
          min: [0, 'Confidence must be at least 0'],
          max: [1, 'Confidence must be at most 1'],
        },
        explanation: {
          type: String,
          required: true,
          maxlength: [500, 'Explanation must be at most 500 characters'],
        },
      },
      default: undefined,
    },
    failureReason: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
);

const GradingJobSchema = new Schema<IGradingJob>(
  {
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Teacher ID is required'],
      ref: 'Faculty',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'processing', 'completed', 'completed_with_failures'],
        message: '{VALUE} is not a valid job status',
      },
      default: 'pending',
    },
    totalSubmissions: {
      type: Number,
      required: [true, 'Total submissions count is required'],
      min: [1, 'Batch must contain at least 1 submission'],
      max: [200, 'Batch cannot exceed 200 submissions'],
    },
    processedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    concurrency: {
      type: Number,
      default: 5,
      min: [1, 'Concurrency must be at least 1'],
      max: [20, 'Concurrency must be at most 20'],
    },
    submissions: {
      type: [GradingSubmissionSchema],
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying jobs by teacher and status
GradingJobSchema.index({ teacherId: 1, status: 1 });

// Index for looking up jobs by batch ID
GradingJobSchema.index({ batchId: 1 });

const GradingJob: Model<IGradingJob> = mongoose.model<IGradingJob>(
  'GradingJob',
  GradingJobSchema
);

export default GradingJob;
