import { Schema, model, Document } from 'mongoose';

export interface KnowledgeRecord extends Document {
  processingId: string; // reference to UaipUpload
  documentCategory: string; // e.g., TRANSCRIPT, SYLLABUS, CERTIFICATE
  documentSubtype?: string; // optional finer grain
  language: string; // ISO code, e.g., 'en'
  isScanned: boolean;
  parserStrategy: string; // e.g., 'PDF_PARSER', 'IMAGE_PARSER'
  confidenceScore: number; // 0.0 - 1.0
  inferredSchemaVersion?: string; // reference to SchemaTemplate version
  extractedFields?: Record<string, any>; // optional snapshot of extracted data
  createdAt: Date;
}

const KnowledgeRecordSchema = new Schema<KnowledgeRecord>({
  processingId: { type: String, required: true, index: true },
  documentCategory: { type: String, required: true },
  documentSubtype: { type: String },
  language: { type: String, required: true },
  isScanned: { type: Boolean, required: true },
  parserStrategy: { type: String, required: true },
  confidenceScore: { type: Number, required: true },
  inferredSchemaVersion: { type: String },
  extractedFields: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export const KnowledgeRecordModel = model<KnowledgeRecord>('KnowledgeRecord', KnowledgeRecordSchema);
