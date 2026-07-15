import { Schema, model, Document, Types } from 'mongoose';

export interface IDocumentRegistry extends Document {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId; // optional for personalized entries
  documentType: string;
  enabled: boolean;
  uploadCount: number;
  lastSeen: Date;
  sourceExamples: string[]; // last few example filenames
}

const DocumentRegistrySchema = new Schema<IDocumentRegistry>({
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  documentType: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  uploadCount: { type: Number, default: 1 },
  lastSeen: { type: Date, default: Date.now },
  sourceExamples: { type: [String], default: [] },
} as any);

// Ensure unique combination to avoid duplicates
DocumentRegistrySchema.index({ organizationId: 1, userId: 1, documentType: 1 }, { unique: true } as any);

export const DocumentRegistry = model<IDocumentRegistry>('DocumentRegistry', DocumentRegistrySchema);
