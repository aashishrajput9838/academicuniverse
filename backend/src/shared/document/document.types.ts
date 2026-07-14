export interface UploadDocumentDTO {
  file: Express.Multer.File;
  organizationId: string;
  userId: string;
}

export interface ProcessedDocumentDTO {
  documentId: string;
  status: DocumentStatus;
  confidenceScore?: number;
  normalizedData?: any;
}

export type DocumentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'NEEDS_OCR';
