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
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR' | 'DELETED';
  /** Optional error message when status is FAILED or VALIDATION_ERROR. */
  errorMessage?: string;
  /** SHA-256 hash of the physical file content. */
  fileHash?: string;
  /** GridFS file identifier for the uploaded binary. */
  storageId?: string;
  /** Timestamp when the upload request was created. */
  createdAt: Date;
  /** Timestamp when the pipeline completed (success or failure). */
  completedAt?: Date;
  /** Timestamp when the document was soft-deleted. */
  deletedAt?: Date;
  /** User who soft-deleted the document. */
  deletedBy?: string;
  /** Original hash retained for audit after fileHash is released for a re-upload. */
  deletedFileHash?: string;
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
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'VALIDATION_ERROR', 'DELETED'],
      default: 'PENDING',
    },
    errorMessage: { type: String, default: undefined },
    fileHash: { type: String, required: false },
    storageId: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    deletedFileHash: { type: String },
  },
  { timestamps: false }
);

// Index for quick lookup by processingId and organization scoped queries.
UaipUploadSchema.index({ processingId: 1 }, { unique: true } as any );
UaipUploadSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
UaipUploadSchema.index({ organizationId: 1, fileHash: 1 }, { unique: true, sparse: true } as any);

export const UaipUpload = models.UaipUpload || model<IUaipUpload>('UaipUpload', UaipUploadSchema);
