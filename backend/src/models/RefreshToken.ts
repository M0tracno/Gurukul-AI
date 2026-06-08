import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  userModel: 'Student' | 'Faculty' | 'Parent' | 'Admin';
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: [true, 'User model is required'],
      enum: {
        values: ['Student', 'Faculty', 'Parent', 'Admin'],
        message: '{VALUE} is not a valid user model',
      },
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      trim: true,
    },
    familyId: {
      type: String,
      required: [true, 'Family ID is required'],
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for looking up tokens by user and family
RefreshTokenSchema.index({ userId: 1, familyId: 1 });

// TTL index: MongoDB automatically removes documents when expiresAt is reached
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema
);

export default RefreshToken;
