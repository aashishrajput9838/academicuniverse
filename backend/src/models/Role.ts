import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  organizationId: mongoose.Types.ObjectId;
  description: string;
  isSuperAdmin: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Role description is required'],
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
      description: 'System roles cannot be deleted',
    },
  } as any,
  {
    timestamps: true,
  }
);

// Compound unique index: role name must be unique per organization
roleSchema.index({ name: 1, organizationId: 1 }, { unique: true } as any);

export default mongoose.model<IRole>('Role', roleSchema);
