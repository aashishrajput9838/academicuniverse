import { Schema, model, Document, Types } from 'mongoose';

export interface IReviewAuditLog extends Document {
  processingId: string;
  organizationId: Types.ObjectId;
  action: 'PERSON_OVERRIDE';
  actorId: string;
  actorRole: string;
  previousSuggestedPersonId?: Types.ObjectId;
  newSuggestedPersonId: Types.ObjectId;
  previousMatchBasis?: string[];
  newMatchBasis: string[];
  previousVersion: number;
  newVersion: number;
  previousStatus?: string;
  newStatus: string;
  idempotencyKey?: string;
  timestamp: Date;
}

const ReviewAuditLogSchema = new Schema<IReviewAuditLog>({
  processingId: { type: String, required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true } as any,
  action: { type: String, enum: ['PERSON_OVERRIDE'], required: true },
  actorId: { type: String, required: true },
  actorRole: { type: String, required: true },
  previousSuggestedPersonId: { type: Schema.Types.ObjectId, ref: 'Person' },
  newSuggestedPersonId: { type: Schema.Types.ObjectId, ref: 'Person', required: true } as any,
  previousMatchBasis: [{ type: String }],
  newMatchBasis: [{ type: String, required: true }],
  previousVersion: { type: Number, required: true },
  newVersion: { type: Number, required: true },
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  idempotencyKey: { type: String, index: true, sparse: true },
  timestamp: { type: Date, default: Date.now, index: true },
} as any, { timestamps: false });

ReviewAuditLogSchema.index({ processingId: 1, timestamp: -1 });

export const ReviewAuditLog = model<IReviewAuditLog>('ReviewAuditLog', ReviewAuditLogSchema);
