// src/events/UaipEvents.ts
export enum UaipEvent {
  Uploaded = "UPLOADED",
  Classified = "CLASSIFIED",
  Parsed = "PARSED",
  ParseFailed = "PARSE_FAILED",
  OCR_COMPLETED = "OCR_COMPLETED",
  OCR_FAILED = "OCR_FAILED",
  // future events can be added here
}

export interface UaipEventPayload {
  processingId: string;
  documentCategory?: string;
  documentSubtype?: string;
  language?: string;
  isScanned?: boolean;
  parserStrategy?: string;
  confidenceScore?: number;
  rawContent?: string; // added for parsing stage
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  timestamp?: Date;
  errorMessage?: string; // for ParseFailed
  // OCR fields
  ocrText?: string;
  ocrErrorMessage?: string;
  storageId?: string; // to locate file for OCR
  userId?: string;
  organizationId?: string;
  // other fields may be added by future stages
}
