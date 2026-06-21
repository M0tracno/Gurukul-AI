import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Feedback constants.
 *
 * These mirror the centralized configuration described in the design document
 * (RATING_MIN/RATING_MAX/COMMENT_MAX_LENGTH). They are defined locally here so
 * the model is self-contained; once the shared feedback/analytics config module
 * exists, these can be re-exported from there without changing the schema.
 */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const COMMENT_MAX_LENGTH = 2000;

export interface IFeedbackReply {
  responderId: Types.ObjectId; // Faculty
  responderModel: 'Faculty';
  message: string; // <= COMMENT_MAX_LENGTH
  createdAt: Date;
}

export interface IFeedback extends Document {
  authorId: Types.ObjectId; // refPath: authorModel
  authorModel: 'Student' | 'Parent';
  authorRole: 'student' | 'parent';
  targetType: 'teacher' | 'course';
  targetModel: 'Faculty' | 'Course'; // refPath for targetId, derived from targetType
  targetId: Types.ObjectId; // refPath: targetModel ('Faculty' when teacher, 'Course' when course)
  rating: number; // integer within [RATING_MIN, RATING_MAX]
  comment: string; // <= COMMENT_MAX_LENGTH
  replies: IFeedbackReply[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IFeedbackModel = Model<IFeedback>;

const FeedbackReplySchema = new Schema<IFeedbackReply>(
  {
    responderId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'replies.responderModel',
    },
    responderModel: {
      type: String,
      required: true,
      enum: ['Faculty'],
      default: 'Faculty',
    },
    message: {
      type: String,
      required: [true, 'Reply message is required'],
      trim: true,
      maxlength: [
        COMMENT_MAX_LENGTH,
        `Reply cannot be longer than ${COMMENT_MAX_LENGTH} characters`,
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const FeedbackSchema = new Schema<IFeedback, IFeedbackModel>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'authorModel',
    },
    authorModel: {
      type: String,
      required: true,
      enum: ['Student', 'Parent'],
    },
    authorRole: {
      type: String,
      required: true,
      enum: ['student', 'parent'],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['teacher', 'course'],
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['Faculty', 'Course'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [RATING_MIN, `Rating cannot be less than ${RATING_MIN}`],
      max: [RATING_MAX, `Rating cannot be greater than ${RATING_MAX}`],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [
        COMMENT_MAX_LENGTH,
        `Comment cannot be longer than ${COMMENT_MAX_LENGTH} characters`,
      ],
    },
    replies: {
      type: [FeedbackReplySchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
);

// Compound indexes for efficient querying
// Feedback addressed to a teacher/course, recent-first (Requirements 8.1, 8.4).
FeedbackSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
// A user's own feedback, recent-first (Requirements 7.1, 7.4).
FeedbackSchema.index({ authorId: 1, createdAt: -1 });

// Derive targetModel from targetType so refPath population resolves correctly.
FeedbackSchema.pre('validate', function (this: IFeedback) {
  if (this.targetType === 'teacher') {
    this.targetModel = 'Faculty';
  } else if (this.targetType === 'course') {
    this.targetModel = 'Course';
  }
});

// Strip internal fields from serialized output.
FeedbackSchema.set('toJSON', {
  transform: function (_doc, ret) {
    const result = { ...ret };
    delete (result as Record<string, unknown>).isDeleted;
    delete (result as Record<string, unknown>).__v;
    return result;
  },
});

const Feedback = mongoose.model<IFeedback, IFeedbackModel>(
  'Feedback',
  FeedbackSchema
);

export default Feedback;
