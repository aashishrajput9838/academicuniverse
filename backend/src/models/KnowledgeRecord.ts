import { Schema, model, Document } from 'mongoose';

export interface TargetModuleRecommendation {
  id: string;
  name?: string;
  confidence: number;
  reason?: string;
}

export interface KnowledgeRecord extends Document {
  processingId: string; // reference to UaipUpload
  documentCategory: string; // e.g., TRANSCRIPT, SYLLABUS, CERTIFICATE, MARKSHEET, etc.
  documentSubtype?: string; // optional finer grain
  language: string; // ISO code, e.g., 'en'
  isScanned: boolean;
  parserStrategy: string; // e.g., 'PDF_PARSER', 'IMAGE_PARSER'
  confidenceScore: number; // 0.0 - 1.0
  inferredSchemaVersion?: string; // reference to SchemaTemplate version
  extractedFields?: Record<string, any>; // optional snapshot of extracted data
  rawContent?: string; // raw parsed text or tables JSON string
  summary?: string; // AI generated human-readable summary
  suggestedModule?: string; // legacy: e.g., 'AcademicRecord', 'CertificateRecord', etc.
  primaryTargetModule?: TargetModuleRecommendation; // AI-driven primary module recommendation
  secondaryTargetModules?: TargetModuleRecommendation[]; // AI-driven secondary module recommendations
  extractedEntities?: Record<string, any>; // raw unstructured entities from AI
  candidateFields?: Record<string, any>; // structured entities for human-in-the-loop review
  rawAiOutput?: string; // raw JSON string from AI for debugging
  /** Lifecycle status for retention without physically deleting the record. */
  status?: 'ACTIVE' | 'DELETED';
  deletedAt?: Date;
  deletedBy?: string;
  reviewStatus?: 'NOT_READY' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  version?: number;
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
  rawContent: { type: String },
  summary: { type: String },
  suggestedModule: { type: String },
  primaryTargetModule: { type: Schema.Types.Mixed },
  secondaryTargetModules: [Schema.Types.Mixed],
  extractedEntities: { type: Schema.Types.Mixed },
  candidateFields: { type: Schema.Types.Mixed },
  rawAiOutput: { type: String },
  status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE', index: true },
  deletedAt: { type: Date },
  deletedBy: { type: String },
  reviewStatus: { type: String, enum: ['NOT_READY', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'], default: 'PENDING_REVIEW' },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

export const KnowledgeRecordModel = model<KnowledgeRecord>('KnowledgeRecord', KnowledgeRecordSchema);

