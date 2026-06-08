import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMessageAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface IMessageMetadata {
  parentRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  teacherSubject?: string;
  teacherDepartment?: string;
}

export interface IMessage extends Document {
  conversationId: string;
  subject: string;
  content: string;
  senderId: Types.ObjectId;
  senderModel: 'Parent' | 'Faculty';
  senderName: string;
  recipientId: Types.ObjectId;
  recipientModel: 'Parent' | 'Faculty';
  recipientName: string;
  studentId: Types.ObjectId;
  studentName: string;
  isRead: boolean;
  readAt?: Date;
  messageType: 'general' | 'academic' | 'behavioral' | 'attendance' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  threadId?: string;
  replyToMessageId?: Types.ObjectId;
  attachments: IMessageAttachment[];
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  persistedAt?: Date;
  deliveredAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  metadata?: IMessageMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(): Promise<IMessage>;
}

export interface IMessageModel extends Model<IMessage> {
  getConversation(
    parentId: string | Types.ObjectId,
    teacherId: string | Types.ObjectId,
    studentId: string | Types.ObjectId,
    options?: { sortDesc?: boolean; limit?: number; skip?: number }
  ): mongoose.Query<IMessage[], IMessage>;

  getUserConversations(
    userId: string | Types.ObjectId,
    userType: 'parent' | 'teacher',
    options?: { limit?: number }
  ): mongoose.Aggregate<unknown[]>;
}

const MessageSchema = new Schema<IMessage, IMessageModel>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Message subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot be longer than 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot be longer than 2000 characters'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'senderModel',
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['Parent', 'Faculty'],
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['Parent', 'Faculty'],
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    messageType: {
      type: String,
      enum: ['general', 'academic', 'behavioral', 'attendance', 'urgent'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    threadId: {
      type: String,
      index: true,
    },
    replyToMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        mimeType: String,
      },
    ],
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },
    persistedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      parentRelationship: {
        type: String,
        enum: ['Father', 'Mother', 'Guardian', 'Other'],
      },
      teacherSubject: String,
      teacherDepartment: String,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// Compound indexes for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ studentId: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ isRead: 1, recipientId: 1 });
MessageSchema.index({ messageType: 1, priority: 1 });

// Pre-save middleware to generate conversationId and threadId
MessageSchema.pre('save', function () {
  // Generate conversationId if not exists
  if (!this.conversationId) {
    const parentId =
      this.senderModel === 'Parent' ? this.senderId : this.recipientId;
    const facultyId =
      this.senderModel === 'Faculty' ? this.senderId : this.recipientId;
    this.conversationId = `parent_${parentId}_teacher_${facultyId}_student_${this.studentId}`;
  }

  // Generate threadId if this is a new conversation thread
  if (!this.threadId && !this.replyToMessageId) {
    this.threadId = `thread_${this.conversationId}_${Date.now()}`;
  }
});

// Static method to get conversation between parent and teacher about a student
MessageSchema.statics.getConversation = function (
  parentId: string | Types.ObjectId,
  teacherId: string | Types.ObjectId,
  studentId: string | Types.ObjectId,
  options: { sortDesc?: boolean; limit?: number; skip?: number } = {}
) {
  const conversationId = `parent_${parentId}_teacher_${teacherId}_student_${studentId}`;

  const query = {
    conversationId,
    isDeleted: false,
  };

  return this.find(query)
    .sort({ createdAt: options.sortDesc ? -1 : 1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get all conversations for a user
MessageSchema.statics.getUserConversations = function (
  userId: string | Types.ObjectId,
  userType: 'parent' | 'teacher',
  options: { limit?: number } = {}
) {
  const query: Record<string, unknown> = {
    isDeleted: false,
  };

  if (userType === 'parent') {
    query.$or = [
      { senderId: userId, senderModel: 'Parent' },
      { recipientId: userId, recipientModel: 'Parent' },
    ];
  } else if (userType === 'teacher') {
    query.$or = [
      { senderId: userId, senderModel: 'Faculty' },
      { recipientId: userId, recipientModel: 'Faculty' },
    ];
  }

  return this.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        latestMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: [
                      '$recipientId',
                      new mongoose.Types.ObjectId(userId as string),
                    ],
                  },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { 'latestMessage.createdAt': -1 } },
    { $limit: options.limit || 20 },
  ]);
};

// Instance method to mark message as read
MessageSchema.methods.markAsRead = function (this: IMessage): Promise<IMessage> {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save() as unknown as Promise<IMessage>;
  }
  return Promise.resolve(this);
};

// Virtual for formatted conversation participants
MessageSchema.virtual('participants').get(function () {
  return {
    parent: {
      id: this.senderModel === 'Parent' ? this.senderId : this.recipientId,
      name:
        this.senderModel === 'Parent' ? this.senderName : this.recipientName,
    },
    teacher: {
      id: this.senderModel === 'Faculty' ? this.senderId : this.recipientId,
      name:
        this.senderModel === 'Faculty' ? this.senderName : this.recipientName,
    },
    student: {
      id: this.studentId,
      name: this.studentName,
    },
  };
});

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret) {
    const result = { ...ret };
    delete (result as Record<string, unknown>).isDeleted;
    delete (result as Record<string, unknown>).__v;
    return result;
  },
});

const Message = mongoose.model<IMessage, IMessageModel>(
  'Message',
  MessageSchema
);

export default Message;
