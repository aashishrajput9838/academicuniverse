import mongoose, { Document, Schema } from 'mongoose';

export interface IModuleVisibility extends Document {
  key: string;
  name: string;
  description?: string;
  category: string;
  isEnabled: boolean;
  isVisible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleVisibilitySchema = new Schema<IModuleVisibility>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9][a-z0-9-]*$/,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  isEnabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

ModuleVisibilitySchema.index({ category: 1, sortOrder: 1 });

export const ModuleVisibility = mongoose.model<IModuleVisibility>('ModuleVisibility', ModuleVisibilitySchema);
