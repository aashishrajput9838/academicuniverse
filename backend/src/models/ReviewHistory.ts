import { Schema, model, Document, Types } from 'mongoose';

/**
 * ReviewHistory — immutable audit trail for every action taken on a KnowledgeRecord.
 * Each save-draft / submit / approve / reject / rollback creates a new document.
 * Nothing is ever overwritten or deleted.
 */
export interface IReviewHistory extends Document {
  processingId: string;         // FK → KnowledgeRecord.processingId
  organizationId: string;       // tenant isolation
  reviewerId: string;           // userId from JWT
  reviewerRole: string;         // STUDENT | FACULTY | ADMIN
  action: 'DRAFT_SAVED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ROLLBACK';
  version: number;              // snapshot version at time of action
  candidateFieldsBefore?: Record<string, any>; // fields before edit
  candidateFieldsAfter?: Record<string, any>;  // fields after edit
  rejectionReason?: string;
  canonicalCollection?: string; // populated on APPROVED
  canonicalRecordIds?: string[]; // populated on APPROVED
  timestamp: Date;
}

const ReviewHistorySchema = new Schema<IReviewHistory>(
  {
    processingId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    reviewerId: { type: String, required: true },
    reviewerRole: { type: String, required: true },
    action: {
      type: String,
      enum: ['DRAFT_SAVED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ROLLBACK'],
      required: true,
    },
    version: { type: Number, required: true },
    candidateFieldsBefore: { type: Schema.Types.Mixed },
    candidateFieldsAfter: { type: Schema.Types.Mixed },
    rejectionReason: { type: String },
    canonicalCollection: { type: String },
    canonicalRecordIds: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Compound index: fetch complete review history for a document ordered by time
ReviewHistorySchema.index({ processingId: 1, timestamp: -1 });
ReviewHistorySchema.index({ organizationId: 1, reviewerId: 1, timestamp: -1 });

export const ReviewHistory = model<IReviewHistory>('ReviewHistory', ReviewHistorySchema);
