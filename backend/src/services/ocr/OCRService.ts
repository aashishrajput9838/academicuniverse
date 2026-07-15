import { eventBus } from '../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { OCRFactory } from './OCRFactory';
import { logger } from '../../utils/logger';
import { MongoOcrIdempotencyRepository } from './repositories/MongoOcrIdempotencyRepository';

export class OCRService {
  private static idempotencyRepo = new MongoOcrIdempotencyRepository();
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
      logger.info(`OCRService: OCR completed for ${processingId}`);
      await eventBus.publish(UaipEvent.OCR_COMPLETED, { processingId, ocrText, timestamp: new Date() });
    } catch (err: any) {
      logger.error(`OCRService: OCR processing failed for ${processingId}`, { error: err });
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
