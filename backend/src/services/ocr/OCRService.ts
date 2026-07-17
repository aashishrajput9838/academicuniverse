import { eventBus } from '../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { OCRFactory } from './OCRFactory';
import { logger } from '../../utils/logger';
import { MongoOcrIdempotencyRepository } from './repositories/MongoOcrIdempotencyRepository';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { DocumentExtractionEngine } from './DocumentExtractionEngine';
import { PdfTextExtractor } from './extractors/PdfTextExtractor';
import { SharpImagePreprocessor } from './preprocessing/SharpImagePreprocessor';
import { OcrQualityScorer } from './quality/OcrQualityScorer';

export class OCRService {
  private static idempotencyRepo = new MongoOcrIdempotencyRepository();
  private static completedOcr = new Map<string, string>();
  private static pendingOcr = new Map<string, { resolve: (text: string) => void; reject: (err: any) => void }>();
  private static extractionEngine: DocumentExtractionEngine;

  public static setExtractionEngine(engine: DocumentExtractionEngine): void {
    OCRService.extractionEngine = engine;
  }

  public static async waitForOcr(processingId: string, timeoutMs: number = 300000): Promise<string> {
    if (OCRService.completedOcr.has(processingId)) {
      return OCRService.completedOcr.get(processingId)!;
    }

    if (OCRService.pendingOcr.has(processingId)) {
      return new Promise((resolve, reject) => {
        const entry = OCRService.pendingOcr.get(processingId)!;
        entry.resolve = resolve;
        entry.reject = reject;
        setTimeout(() => {
          if (OCRService.pendingOcr.has(processingId) && OCRService.pendingOcr.get(processingId)!.resolve === resolve) {
            OCRService.pendingOcr.delete(processingId);
            reject(new Error(`OCR wait timeout for ${processingId}`));
          }
        }, timeoutMs);
      });
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (OCRService.pendingOcr.has(processingId) && OCRService.pendingOcr.get(processingId)!.resolve === resolve) {
          OCRService.pendingOcr.delete(processingId);
          reject(new Error(`OCR wait timeout for ${processingId}`));
        }
      }, timeoutMs);
      OCRService.pendingOcr.set(processingId, {
        resolve: (text: string) => {
          clearTimeout(timer);
          resolve(text);
        },
        reject: (err: any) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }

  public static async clearCache(): Promise<void> {
    await MongoOcrIdempotencyRepository.clearAll();
  }

  public static async clearProcessingId(processingId: string): Promise<void> {
    await OCRService.idempotencyRepo.delete(processingId);
  }

  constructor() {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions(): void {
    eventBus.subscribe(UaipEvent.Parsed, async (payload: UaipEventPayload) => {
      await this.handleParsedEvent(payload);
    });
  }

  public async handleParsedEvent(payload: UaipEventPayload): Promise<void> {
    const { processingId, storageId, mimeType, isScanned } = payload;

    if (!processingId) {
      logger.error('OCRService: Received Parsed event without processingId');
      return;
    }

    const alreadyProcessed = await OCRService.idempotencyRepo.has(processingId);
    if (alreadyProcessed) {
      logger.info(`OCRService: Already processed processingId: ${processingId}. Skipping duplicate execution.`);
      return;
    }

    const isImage = mimeType?.startsWith('image/');
    const needsOcr = isImage || isScanned === true;

    if (!needsOcr) {
      logger.info(`OCRService: OCR not required for processingId: ${processingId} (MIME: ${mimeType}, isScanned: ${isScanned})`);
      return;
    }

    if (!storageId) {
      logger.error(`OCRService: storageId is missing for processingId: ${processingId}`);
      await eventBus.publish(UaipEvent.OCR_FAILED, {
        processingId,
        ocrErrorMessage: 'Missing storageId for binary retrieval',
        timestamp: new Date(),
      });
      return;
    }

    await OCRService.idempotencyRepo.record(processingId);
    try {
      logger.info(`OCRService: Starting OCR processing for ${processingId}`);

      const engine = OCRService.extractionEngine || this.createDefaultEngine();
      const buffer = await this.getBuffer(storageId);
      const result = await engine.extract(buffer, mimeType || '', storageId);

      logger.info(`OCRService: OCR completed for ${processingId}. Text length: ${result.text.length} chars, source: ${result.source}, quality: ${(result.qualityScore * 100).toFixed(1)}%`);
      if (result.text.length > 0) {
        logger.debug(`OCRService: First 1000 chars of OCR output for ${processingId}:\n${result.text.slice(0, 1000)}`);
      } else {
        logger.warn(`OCRService: OCR returned empty text for ${processingId}. rawContent will be empty.`);
      }

      await KnowledgeRecordModel.updateOne(
        { processingId },
        { $set: { rawContent: result.text } }
      );

      OCRService.completedOcr.set(processingId, result.text);
      if (OCRService.pendingOcr.has(processingId)) {
        const entry = OCRService.pendingOcr.get(processingId)!;
        OCRService.pendingOcr.delete(processingId);
        entry.resolve(result.text);
      }

      await eventBus.publish(UaipEvent.OCR_COMPLETED, { processingId, ocrText: result.text, timestamp: new Date() });
    } catch (err: any) {
      logger.error(`OCRService: OCR processing failed for ${processingId}`, { error: err });
      
      OCRService.completedOcr.set(processingId, '');
      if (OCRService.pendingOcr.has(processingId)) {
        const entry = OCRService.pendingOcr.get(processingId)!;
        OCRService.pendingOcr.delete(processingId);
        entry.reject(err);
      }

      await eventBus.publish(UaipEvent.OCR_FAILED, {
        processingId,
        ocrErrorMessage: err.message || 'Unknown OCR error',
        timestamp: new Date(),
      });
      await OCRService.idempotencyRepo.delete(processingId);
    }
  }

  private async getBuffer(storageId: string): Promise<Buffer> {
    const { GridFSProvider } = await import('../../storage/GridFSProvider');
    return new GridFSProvider().getFile(storageId);
  }

  private createDefaultEngine(): DocumentExtractionEngine {
    const pdfTextExtractor = new PdfTextExtractor();
    const imagePreprocessor = new SharpImagePreprocessor();
    const primaryEngine = OCRFactory.getEngine('TESSERACT');
    const fallbackEngine = OCRFactory.getEngine('PADDLEOCR');
    const qualityScorer = new OcrQualityScorer();

    return new DocumentExtractionEngine(
      pdfTextExtractor,
      imagePreprocessor,
      primaryEngine,
      fallbackEngine,
      qualityScorer,
    );
  }
}
