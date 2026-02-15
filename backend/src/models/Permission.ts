import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Permission description is required'],
    },
    category: {
      type: String,
      enum: ['MARKS', 'REPORTS', 'PROFILE', 'ADMIN', 'RESEARCH', 'CHATBOT'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPermission>('Permission', permissionSchema);
