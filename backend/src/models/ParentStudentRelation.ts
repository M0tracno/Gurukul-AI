import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IParentStudentRelation extends Document {
  parentId: Types.ObjectId;
  studentId: Types.ObjectId;
  linkagePhone: string;
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ParentStudentRelationSchema = new Schema<IParentStudentRelation>(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    linkagePhone: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    // Bind explicitly to the existing collection so prior data is preserved.
    collection: 'parent_student_relations',
  }
);

// Idempotent linking: at most one active linkage per (student, normalized phone).
// Partial filter ensures the uniqueness constraint only applies to active links,
// allowing historical/deactivated relations to coexist.
ParentStudentRelationSchema.index(
  { studentId: 1, linkagePhone: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Fast lookups of a parent's active linkages.
ParentStudentRelationSchema.index({ parentId: 1, isActive: 1 });

// Reuse the model if it was already registered (e.g. via the inline schema in
// authorizationService/parentMeService) to avoid OverwriteModelError.
const ParentStudentRelation: Model<IParentStudentRelation> =
  (mongoose.models.ParentStudentRelation as Model<IParentStudentRelation>) ??
  mongoose.model<IParentStudentRelation>(
    'ParentStudentRelation',
    ParentStudentRelationSchema
  );

export default ParentStudentRelation;
