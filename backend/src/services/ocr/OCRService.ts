import { eventBus } from '../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { OCRFactory } from './OCRFactory';
import { logger } from '../../utils/logger';
import { MongoOcrIdempotencyRepository } from './repositories/MongoOcrIdempotencyRepository';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';

export class OCRService {
  private static idempotencyRepo = new MongoOcrIdempotencyRepository();
  private static completedOcr = new Map<string, string>();
  private static pendingOcr = new Map<string, { resolve: (text: string) => void; reject: (err: any) => void }>();

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

  // Static method for test cleanup to clear idempotency records
  public static async clearCache(): Promise<void> {
    await MongoOcrIdempotencyRepository.clearAll();
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

    // Record processing start to ensure idempotency and prevent duplicate OCR execution
    await OCRService.idempotencyRepo.record(processingId);
    try {
      logger.info(`OCRService: Starting OCR processing for ${processingId} using default TESSERACT provider`);
      const provider = OCRFactory.getProvider('TESSERACT');
      const ocrText = await provider.process(storageId, mimeType || '');

      logger.info(`OCRService: OCR completed for ${processingId}. Text length: ${ocrText.length} chars`);
      if (ocrText.length > 0) {
        logger.debug(`OCRService: First 1000 chars of OCR output for ${processingId}:\n${ocrText.slice(0, 1000)}`);
      }

      // Save raw OCR content to KnowledgeRecord
      await KnowledgeRecordModel.updateOne(
        { processingId },
        { $set: { rawContent: ocrText } }
      );

      OCRService.completedOcr.set(processingId, ocrText);
      if (OCRService.pendingOcr.has(processingId)) {
        const entry = OCRService.pendingOcr.get(processingId)!;
        OCRService.pendingOcr.delete(processingId);
        entry.resolve(ocrText);
      }

      await eventBus.publish(UaipEvent.OCR_COMPLETED, { processingId, ocrText, timestamp: new Date() });
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
      // Delete the idempotency record so that a retry is possible
      await OCRService.idempotencyRepo.delete(processingId);
    }
  }

}
