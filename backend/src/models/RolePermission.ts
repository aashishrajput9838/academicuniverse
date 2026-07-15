import mongoose, { Schema, Document } from 'mongoose';

export interface IRolePermission extends Document {
  _id: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  permissionId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
      index: true,
    },
    permissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Permission',
      required: [true, 'Permission ID is required'],
      index: true,
    },
  } as any,
  {
    timestamps: true,
  }
);

// Compound unique index: each role-permission mapping should be unique
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true } as any);

export default mongoose.model<IRolePermission>('RolePermission', rolePermissionSchema);
