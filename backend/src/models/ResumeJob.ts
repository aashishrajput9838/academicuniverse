import { Schema, model, Document } from 'mongoose';

export interface IResumeJob extends Document {
  processingId: string;
  organizationId: string;
  userId: string;
  storageId: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileHash: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'NEEDS_OCR';
  errorMessage?: string;
  nextRetryAt?: Date;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeJobSchema = new Schema<IResumeJob>({
  processingId: { type: String, required: true, unique: true, index: true },
  organizationId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  storageId: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  fileHash: { type: String, required: true, index: true },
  status: { type: String, required: true, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'NEEDS_OCR'], default: 'PENDING' },
  errorMessage: { type: String },
  nextRetryAt: { type: Date },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  startedAt: { type: Date },
  lastAttemptAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

ResumeJobSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
ResumeJobSchema.index({ status: 1, nextRetryAt: 1 });

export const ResumeJob = model<IResumeJob>('ResumeJob', ResumeJobSchema);
