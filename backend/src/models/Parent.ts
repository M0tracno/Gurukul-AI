import mongoose, { Schema, Document, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IParent extends Document {
  parentId: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  address?: string;
  occupation?: string;
  relationToStudent: 'Father' | 'Mother' | 'Guardian' | 'Other';
  isActive: boolean;
  lastLogin?: Date;
  otpHash?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  firebaseUid?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  deletedAt?: Date;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  fullName: string;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const ParentSchema = new Schema<IParent>(
  {
    parentId: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v: string) {
          return !v || /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
        },
        message: 'Please enter a valid phone number',
      },
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v: string) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    address: {
      type: String,
      trim: true,
    },
    occupation: {
      type: String,
      trim: true,
    },
    relationToStudent: {
      type: String,
      enum: ['Father', 'Mother', 'Guardian', 'Other'],
      default: 'Other',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    otpHash: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    firebaseUid: {
      type: String,
      sparse: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'parents',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ParentSchema.index({ isActive: 1 });
ParentSchema.index({ isVerified: 1 });

// Virtual for full name
ParentSchema.virtual('fullName').get(function (this: IParent) {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
ParentSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password
ParentSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const Parent: Model<IParent> = mongoose.model<IParent>('Parent', ParentSchema);

export default Parent;
