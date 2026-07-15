import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentResume extends Document {
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  filledData: any;
  generatedDocxUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentResumeSchema = new Schema<IStudentResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ResumeTemplate',
      required: true,
    },
    filledData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    generatedDocxUrl: {
      type: String,
      default: '',
    },
  } as any,
  { timestamps: true }
);

export default mongoose.model<IStudentResume>('StudentResume', StudentResumeSchema);
