import { eventBus } from '../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { ResumeClassifier, ResumeClassificationOutput } from './resumeClassifier.service';
import { ResumeParseResult } from '../../models/ResumeParseResult';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeClassificationEventListener');

export class ResumeClassificationEventListener {
  private static initialized = false;
  private classifier = new ResumeClassifier();
  private started = false;

  constructor() {}

  public start(): void {
    if (this.started) {
      return;
    }
    this.initializeSubscriptions();
    this.started = true;
  }

  public stop(): void {
    this.started = false;
  }

  private initializeSubscriptions(): void {
    if (ResumeClassificationEventListener.initialized) {
      return;
    }

    eventBus.subscribe(UaipEvent.Parsed, async (payload: UaipEventPayload) => {
      await this.handleParsedOrOcrCompleted(payload);
    });

    eventBus.subscribe(UaipEvent.OCR_COMPLETED, async (payload: UaipEventPayload) => {
      await this.handleParsedOrOcrCompleted(payload);
    });

    ResumeClassificationEventListener.initialized = true;
  }

  private async handleParsedOrOcrCompleted(payload: UaipEventPayload): Promise<void> {
    const { processingId } = payload;

    if (!processingId) {
      logger.warn('ResumeClassificationEventListener: Missing processingId in event payload');
      return;
    }

    try {
      // Idempotency: skip if already classified
      const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
      if (existing && existing.confidenceScore > 0) {
        logger.debug(`ResumeClassificationEventListener: Already classified ${processingId}. Skipping.`);
        return;
      }

      // Always read KnowledgeRecord for fast-path check and rawContent fallback
      const knowledgeRecord = await KnowledgeRecordModel.findOne({ processingId }).lean().exec();

      let rawContent = payload.rawContent;
      if (!rawContent) {
        rawContent = knowledgeRecord?.rawContent;
      }

      if (!rawContent) {
        logger.warn(`ResumeClassificationEventListener: No rawContent available for ${processingId}`);
        return;
      }

      const fileName = payload.fileName || '';
      const mimeType = payload.mimeType || '';

      // Fast path: if DocumentClassifier already identified RESUME, reuse it
      let result: ResumeClassificationOutput;
      if (knowledgeRecord?.documentCategory === 'RESUME') {
        result = {
          documentCategory: 'RESUME',
          confidenceScore: knowledgeRecord.confidenceScore || 0.9,
          signals: {
            filenameMatch: false,
            mimeMatch: false,
            contentHeuristic: false,
          },
          reason: 'Reused existing DocumentClassifier RESUME classification',
        };
      } else {
        result = this.classifier.classify({
          rawText: rawContent,
          fileName,
          mimeType,
        });
      }

      // Update ResumeParseResult
      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          confidenceScore: result.confidenceScore,
          documentCategory: result.documentCategory,
          primaryTargetModule: result.documentCategory === 'RESUME' ? 'ExperienceRecord' : '',
          secondaryTargetModules: result.documentCategory === 'RESUME' ? ['CareerRecord', 'SkillEvidence'] : [],
          reviewStatus: result.documentCategory === 'RESUME' ? 'PENDING_REVIEW' : 'NEEDS_REINDEX',
        }
      );

      // Update KnowledgeRecord if classified as resume
      if (result.documentCategory === 'RESUME') {
        await KnowledgeRecordModel.updateOne(
          { processingId },
          { $set: { documentCategory: 'RESUME', confidenceScore: result.confidenceScore } }
        );
      }

      // Publish appropriate event
      if (result.documentCategory === 'RESUME') {
        await eventBus.publish(UaipEvent.ResumeClassified, {
          processingId,
          documentCategory: result.documentCategory,
          confidenceScore: result.confidenceScore,
          signals: result.signals,
          reason: result.reason,
          timestamp: new Date(),
        } as UaipEventPayload);
      } else {
        await eventBus.publish(UaipEvent.ResumeClassificationFailed, {
          processingId,
          documentCategory: result.documentCategory,
          confidenceScore: result.confidenceScore,
          reason: result.reason,
          timestamp: new Date(),
        } as UaipEventPayload);
      }
    } catch (err: any) {
      logger.error(`ResumeClassificationEventListener: Failed to classify ${processingId}:`, err.message);
      await eventBus.publish(UaipEvent.ResumeClassificationFailed, {
        processingId,
        errorMessage: err.message,
        timestamp: new Date(),
      } as UaipEventPayload);
    }
  }
}

export const resumeClassificationEventListener = new ResumeClassificationEventListener();
resumeClassificationEventListener.start();
