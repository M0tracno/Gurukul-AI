import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAuditLogActor {
  userId: Types.ObjectId;
  role: string;
  ip: string;
}

export interface IAuditLogTarget {
  resource: string;
  resourceId?: string;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'role_modification'
  | 'failed_auth'
  | 'account_locked'
  | 'admin_override';

export interface IAuditLog extends Document {
  timestamp: Date;
  actor: IAuditLogActor;
  action: AuditAction;
  target: IAuditLogTarget;
  metadata?: Record<string, unknown>;
  correlationId: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now,
    },
    actor: {
      userId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Actor user ID is required'],
      },
      role: {
        type: String,
        required: [true, 'Actor role is required'],
        trim: true,
      },
      ip: {
        type: String,
        required: [true, 'Actor IP address is required'],
        trim: true,
      },
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: [
          'login',
          'logout',
          'password_change',
          'role_modification',
          'failed_auth',
          'account_locked',
          'admin_override',
        ],
        message: '{VALUE} is not a valid audit action',
      },
    },
    target: {
      resource: {
        type: String,
        required: [true, 'Target resource is required'],
        trim: true,
      },
      resourceId: {
        type: String,
        trim: true,
        default: undefined,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    correlationId: {
      type: String,
      required: [true, 'Correlation ID is required'],
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

// Index for time-based queries (descending for recent-first)
AuditLogSchema.index({ timestamp: -1 });

// Index for querying audit logs by actor
AuditLogSchema.index({ 'actor.userId': 1 });

// Index for looking up logs by correlation ID
AuditLogSchema.index({ correlationId: 1 });

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  AuditLogSchema
);

export default AuditLog;
