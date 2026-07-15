// src/services/classification/DocumentClassifier.ts
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { logStage } from '../../utils/stageLogger';
import { v4 as uuidv4 } from 'uuid';

export type DocumentCategory = 'TRANSCRIPT' | 'SYLLABUS' | 'CERTIFICATE' | 'UNKNOWN';
export type DocumentSubtype = string | undefined;
export type DocumentType = 'PDF' | 'IMAGE' | 'EXCEL' | 'CSV' | 'TXT' | 'UNKNOWN';

export interface ClassificationResult {
  processingId: string;
  documentCategory: DocumentCategory;
  documentSubtype?: DocumentSubtype;
  language: string;
  isScanned: boolean;
  parserStrategy: string;
  confidenceScore: number;
}

/**
 * Simple language detection – looks for common characters.
 * Very naive, returns 'en' fallback.
 */
function detectLanguage(buffer: Buffer): string {
  const sample = buffer.toString('utf8', 0, 200).toLowerCase();
  if (/[а-яё]/.test(sample)) return 'ru';
  if (/[äöüß]/.test(sample)) return 'de';
  if (/[áéíóúñ]/.test(sample)) return 'es';
  return 'en';
}

/**
 * Determines if a PDF is scanned (image based) by checking for /Font entries.
 */
function isScannedPdf(buffer: Buffer): boolean {
  const header = buffer.slice(0, 1024).toString('utf8');
  // scanned PDFs often lack /Font objects and contain /Image
  return /\/Image/.test(header) && !/\/Font/.test(header);
}

/**
 * Map MIME to document type and parser strategy.
 */
function mapMimeToDocType(mime: string): { type: DocumentType; parser: string } {
  switch (mime) {
    case 'application/pdf':
      return { type: 'PDF', parser: 'PDF_PARSER' };
    case 'image/png':
    case 'image/jpeg':
      return { type: 'IMAGE', parser: 'IMAGE_PARSER' };
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return { type: 'EXCEL', parser: 'EXCEL_PARSER' };
    case 'text/csv':
    case 'application/csv':
      return { type: 'CSV', parser: 'CSV_PARSER' };
    case 'text/plain':
      return { type: 'TXT', parser: 'TXT_PARSER' };
    default:
      return { type: 'UNKNOWN', parser: 'UNKNOWN_PARSER' };
  }
}

/**
 * Very naive category inference based on filename patterns.
 */
function inferCategory(filename: string, docType: DocumentType): DocumentCategory {
  const lower = filename.toLowerCase();
  if (lower.includes('transcript')) return 'TRANSCRIPT';
  if (lower.includes('syllabus')) return 'SYLLABUS';
  if (lower.includes('certificate')) return 'CERTIFICATE';
  return 'UNKNOWN';
}

/**
 * Main classifier class – stateless.
 */
export class DocumentClassifier {
  async classify(params: { processingId: string; mime: string; originalName: string; buffer: Buffer }): Promise<ClassificationResult> {
    const start = Date.now();
    const { processingId, mime, originalName, buffer } = params;
    logStage({ processingId, stage: 'Classification', timestamp: new Date().toISOString(), status: 'START' });

    const { type, parser } = mapMimeToDocType(mime);
    const language = detectLanguage(buffer);
    const isScanned = type === 'PDF' ? isScannedPdf(buffer) : type === 'IMAGE';
    const confidence = type === 'UNKNOWN' ? 0.0 : 0.9; // simple confidence heuristic
    const category = inferCategory(originalName, type);
    const subtype = undefined; // placeholder for future fine‑grained detection

    const result: ClassificationResult = {
      processingId,
      documentCategory: category,
      documentSubtype: subtype,
      language,
      isScanned,
      parserStrategy: parser,
      confidenceScore: confidence,
    };

    // Persist KnowledgeRecord (idempotent – upsert based on processingId)
    await KnowledgeRecordModel.updateOne(
      { processingId },
      {
        $setOnInsert: {
          processingId,
          documentCategory: category,
          documentSubtype: subtype,
          language,
          isScanned,
          parserStrategy: parser,
          confidenceScore: confidence,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Publish event
    await eventBus.publish(UaipEvent.Classified, result);

    const duration = Date.now() - start;
    logStage({ processingId, stage: 'Classification', timestamp: new Date().toISOString(), durationMs: duration, status: 'SUCCESS' });
    return result;
  }
}

// Export a singleton for DI convenience
export const documentClassifier = new DocumentClassifier();
