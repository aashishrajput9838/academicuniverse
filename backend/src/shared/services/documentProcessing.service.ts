import { UploadDocumentDTO, ProcessedDocumentDTO, DocumentStatus } from '../document/document.types';
import { DocumentStorageService } from './documentStorage.service';
import { DocumentRepository } from '../repositories/document.repository';
import { IDocument } from '../../models/Document';
import { Logger } from '../../utils/logger';
import { aiProvider } from '../../core/ai'; // uses factory and failover internally
import { OCRService } from './ocr.service';

const logger = new Logger('DocumentProcessingService');

/**
 * High‑level service that orchestrates the universal document pipeline.
 * It is completely agnostic of the calling module (Growth, Career, etc.).
 * All AI interactions are routed through a single provider abstraction.
 */
export class DocumentProcessingService {
  private storageService = new DocumentStorageService();
  private repo = new DocumentRepository();
  private ocrService = new OCRService();

  /**
   * Entry point for an uploaded document.
   * Stores the raw file, runs AI analysis (with OCR fallback), and persists results.
   */
  async handleUpload(dto: UploadDocumentDTO): Promise<ProcessedDocumentDTO> {
    // 1️⃣ Persist raw file and metadata
    const savedDoc = await this.storageService.saveDocument(dto);
    const docId = savedDoc._id.toString();

    // 2️⃣ Run AI analysis (single call)
    const aiResult = await this.runAIAnalysis(savedDoc);

    // 3️⃣ If AI signals OCR fallback, perform OCR and retry analysis
    let finalResult = aiResult;
    if (aiResult.status === 'NEEDS_OCR') {
      logger.info('AI requested OCR fallback', { documentId: docId });
      const ocrText = await this.ocrService.extractText(savedDoc.fileData as Buffer);
      const ocrAiResult = await this.runAIAnalysis(savedDoc, ocrText);
      finalResult = ocrAiResult;
    }

    // 4️⃣ Persist AI result and normalized data
    await this.repo.saveAIResult(
      docId,
      finalResult,
      finalResult.normalizedData,
      finalResult.confidenceScore ?? 0,
      finalResult.status as IDocument['status'],
    );

    return {
      documentId: docId,
      status: finalResult.status as DocumentStatus,
      confidenceScore: finalResult.confidenceScore,
      normalizedData: finalResult.normalizedData,
    };
  }

  /**
   * Retrieves document status and any stored normalized data.
   */
  async getDocumentStatus(id: string): Promise<IDocument | null> {
    return this.repo.findById(id);
  }

  /**
   * Helper that builds a prompt and invokes the AI provider.
   * If `ocrText` is provided it replaces the raw file content in the prompt.
   */
  private async runAIAnalysis(doc: IDocument, ocrText?: string) {
    const promptBase = `You are a document intelligence engine. Analyze the following document and return a JSON with the fields:
    - documentType (string)
    - extractedData (object)
    - normalizedData (object)
    - confidenceScore (number 0‑100)
    - status (SUCCESS | NEEDS_OCR | FAILED)
    `;

    let prompt = promptBase;
    if (ocrText) {
      prompt += `\nOCR extracted text:\n${ocrText}`;
    } else {
      // Include minimal file metadata; we avoid sending the binary itself.
      prompt += `\nFile name: ${doc.fileName}\nMIME type: ${doc.mimeType}\nSize: ${doc.size} bytes`;
    }

    try {
      const result = await aiProvider.generateJSON<any>(prompt);
      // Expect the provider to return an object matching our shape.
      return result;
    } catch (err) {
      logger.error('AI analysis failed', { error: err, documentId: doc._id.toString() });
      // Return a failure payload to be stored.
      return {
        status: 'FAILED',
        confidenceScore: 0,
        normalizedData: null,
        extractedData: null,
        documentType: null,
      };
    }
  }
}
