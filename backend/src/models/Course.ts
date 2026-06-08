import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IScheduleItem {
  day:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';
  startTime: string;
  endTime: string;
  room?: string;
}

export interface ICourse extends Document {
  title: string;
  code: string;
  description: string;
  faculty: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  schedule: IScheduleItem[];
  credits: number;
  maxStudents: number;
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;

  // Virtuals
  enrolledCount: number;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
    },
    faculty: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    schedule: [
      {
        day: {
          type: String,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
        },
        startTime: String,
        endTime: String,
        room: String,
      },
    ],
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [0, 'Credits cannot be negative'],
    },
    maxStudents: {
      type: Number,
      default: 30,
    },
    active: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for enrollments
CourseSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  justOne: false,
});

// Virtual field for enrolled students count
CourseSchema.virtual('enrolledCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  count: true,
});

const Course: Model<ICourse> = mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
