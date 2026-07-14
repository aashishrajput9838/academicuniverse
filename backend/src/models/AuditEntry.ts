import { Schema, model, Document } from 'mongoose';

export interface IAuditEntry extends Document {
  organizationId: string; // tenant identifier (string for simplicity)
  recordId: string; // the _id of the domain record that was affected
  collectionName: string; // e.g., 'academic_records'
  action: 'create' | 'update' | 'failed';
  performedBy: string; // usually 'system' or 'dispatcher'
  timestamp: Date;
  metadata: {
    domain: string;
    rawConfidence?: number;
    errorMessage?: string;
    correlationId?: string;
  };
}

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    organizationId: { type: String, required: true },
    recordId: { type: String, required: true },
    collectionName: { type: String, required: true },
    action: { type: String, enum: ['create', 'update', 'failed'], required: true },
    performedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      domain: { type: String, required: true },
      rawConfidence: { type: Number },
      errorMessage: { type: String },
      correlationId: { type: String },
    },
  },
  { timestamps: false }
);

export const AuditEntry = model<IAuditEntry>('AuditEntry', AuditEntrySchema);
