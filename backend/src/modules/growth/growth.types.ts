export enum DocumentSource {
  UPLOAD = 'UPLOAD',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DocumentType {
  MARKSHEET = 'MARKSHEET',
  ATTENDANCE = 'ATTENDANCE',
  RESUME = 'RESUME',
  CERTIFICATE = 'CERTIFICATE',
  RESEARCH_PAPER = 'RESEARCH_PAPER',
  INTERNSHIP_LETTER = 'INTERNSHIP_LETTER',
  PROJECT_REPORT = 'PROJECT_REPORT',
  UNKNOWN = 'UNKNOWN',
}

export interface DocumentMetadata {
  organizationId: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string; // ISO string
  rawUrl: string; // URL to stored raw file
}

export interface ProcessedDocument {
  _id: string;
  metadata: DocumentMetadata;
  inferredType: DocumentType;
  confidence: number; // 0‑1 confidence
  normalizedData: Record<string, any>;
  extractionDetails: Record<string, any>;
  status: DocumentStatus;
  processedAt?: string;
  schemaVersion?: number;
}

export interface UploadDocumentDTO {
  file: Express.Multer.File;
  organizationId: string;
  userId: string;
}
