import { Schema, model, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  organizationId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  // raw file data, not selected by default
  fileData?: Buffer;
  // AI raw analysis JSON (stringified)
  aiResult?: string;
  // Normalized structured data (any)
  normalizedData?: any;
  confidenceScore?: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NEEDS_OCR';
}

const DocumentSchema = new Schema<IDocument>({
  organizationId: { type: String, required: true },
  userId: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  fileData: { type: Buffer, select: false },
  aiResult: { type: String },
  normalizedData: { type: Schema.Types.Mixed },
  confidenceScore: { type: Number },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'NEEDS_OCR'], default: 'PENDING' },
});

export const DocumentModel = model<IDocument>('Document', DocumentSchema);
