import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeTemplate extends Document {
  templateName: string;
  type: string; // 'section', 'department', or 'global'
  target: string; // The specific section or department name, e.g., 'CSE-A', 'CSE'
  fileUrl: string;
  organizationId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeTemplateSchema = new Schema<IResumeTemplate>(
  {
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['section', 'department', 'global'],
      required: true,
    },
    target: {
      type: String,
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IResumeTemplate>('ResumeTemplate', ResumeTemplateSchema);
