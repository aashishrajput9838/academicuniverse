// NOTE: Mongoose typings reference missing mongodb types – documented as OUT‑OF‑SCOPE.
import { Schema, model, models } from 'mongoose';

/**
 * Upload metadata for Universal Academic Intelligence Pipeline (UAIP).
 * Each uploaded file receives a unique processingId that tracks the file through
 * the ingestion pipeline. This model stores high‑level information required for
 * audit, status tracking and retry handling.
 */
export interface IUaipUpload {
  /** Unique identifier for the processing pipeline instance (UUID). */
  processingId: string;
  /** Organization that owns the upload. */
  organizationId: string;
  /** User who performed the upload. */
  userId: string;
  /** Original filename supplied by the client. */
  fileName: string;
  /** MIME type of the uploaded file. */
  mimeType: string;
  /** Size in bytes. */
  size: number;
  /** Current pipeline status. */
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR';
  /** Optional error message when status is FAILED or VALIDATION_ERROR. */
  errorMessage?: string;
  /** Timestamp when the upload request was created. */
  createdAt: Date;
  /** Timestamp when the pipeline completed (success or failure). */
  completedAt?: Date;
}

const UaipUploadSchema = new Schema(
  {
    processingId: { type: String, required: true, unique: true },
    organizationId: { type: String, required: true, ref: 'Organization' },
    userId: { type: String, required: true, ref: 'User' },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'VALIDATION_ERROR'],
      default: 'PENDING',
    },
    errorMessage: { type: String, default: undefined },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: false }
);

// Index for quick lookup by processingId and organization scoped queries.
UaipUploadSchema.index({ processingId: 1 }, { unique: true } as any );
UaipUploadSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export const UaipUpload = models.UaipUpload || model<IUaipUpload>('UaipUpload', UaipUploadSchema);
