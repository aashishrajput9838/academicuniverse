import { createResumeLogger, logStageEntry, logStageExit, scrubPII } from '../../utils/structuredLogging';
import { KnowledgeJobRepository } from '../../shared/repositories/knowledgeJob.repository';
import { ResumeParseResult } from '../../models/ResumeParseResult';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { eventBus } from '../../events/EventBus';

const logger = createResumeLogger('DicIntegrationService');

export interface DicIntegrationInput {
  processingId: string;
  organizationId: string;
  userId: string;
}

export interface DicIntegrationOutput {
  routedToDIC: boolean;
  dicDocumentId?: string;
  action: 'auto_approved' | 'queued_review' | 'needs_reindex' | 'approved' | 'rejected' | 'rollback';
}

export class DicIntegrationService {
  private readonly jobRepo: KnowledgeJobRepository;

  constructor(jobRepo?: KnowledgeJobRepository) {
    this.jobRepo = jobRepo ?? new KnowledgeJobRepository();
  }

   async route(params: DicIntegrationInput): Promise<DicIntegrationOutput> {
     const { processingId, organizationId, userId } = params;
     logStageEntry(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });

    try {
      const result = await ResumeParseResult.findOne({ processingId }).lean().exec();
      if (!result) {
        throw new Error(`ResumeParseResult not found: ${processingId}`);
      }

      if (result.dicRoutedAt) {
        logStageExit(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });
        return {
          routedToDIC: true,
          dicDocumentId: result.dicDocumentId,
          action: result.reviewStatus === 'AUTO_APPROVED' ? 'auto_approved' : 'queued_review',
        };
      }

      const dicDocumentId = `dic-${processingId}`;
      const now = new Date();

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            dicRoutedAt: now,
            dicDocumentId,
          },
        }
      );

       if (result.reviewStatus === 'AUTO_APPROVED') {
         await eventBus.publish(UaipEvent.ResumeDICRouted, {
           processingId,
           organizationId,
           userId,
           action: 'auto_approved',
           dicDocumentId,
           timestamp: new Date(),
         } as UaipEventPayload);

         await this.enqueueCanonicalWrite(processingId, organizationId, userId);

         logStageExit(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });
         return {
           routedToDIC: true,
           dicDocumentId,
           action: 'auto_approved',
         };
       }

       if (result.reviewStatus === 'PENDING_REVIEW') {
         await eventBus.publish(UaipEvent.ResumeDICRouted, {
           processingId,
           organizationId,
           userId,
           action: 'queued_review',
           dicDocumentId,
           timestamp: new Date(),
         } as UaipEventPayload);

         logStageExit(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });
         return {
           routedToDIC: true,
           dicDocumentId,
           action: 'queued_review',
         };
       }

       if (result.reviewStatus === 'NEEDS_REINDEX') {
         await eventBus.publish(UaipEvent.ResumeDICRouted, {
           processingId,
           organizationId,
           userId,
           action: 'needs_reindex',
           dicDocumentId,
           timestamp: new Date(),
         } as UaipEventPayload);

         logStageExit(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });
         return {
           routedToDIC: true,
           dicDocumentId,
           action: 'needs_reindex',
         };
       }

       throw new Error(`Unknown reviewStatus: ${(result as any).reviewStatus}`);
     } catch (err: any) {
       logStageExit(logger, 'dic_integration', { processingId, organizationId, userId, stage: 'dic_integration' });
       await eventBus.publish(UaipEvent.ResumeDICRoutingFailed, {
         processingId,
         organizationId,
         userId,
         errorMessage: err.message,
         reason: 'unknown',
         timestamp: new Date(),
       } as UaipEventPayload);

       throw err;
     }
   }

  async handleReviewAction(params: {
    processingId: string;
    organizationId: string;
    userId: string;
    action: 'APPROVED' | 'REJECTED' | 'ROLLBACK';
  }): Promise<void> {
    const { processingId, organizationId, userId, action } = params;

    const result = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (!result) {
      throw new Error(`ResumeParseResult not found: ${processingId}`);
    }

    try {
      if (action === 'APPROVED') {
        await ResumeParseResult.findOneAndUpdate(
          { processingId },
          { $set: { reviewStatus: 'AUTO_APPROVED' } }
        );

        await eventBus.publish(UaipEvent.ResumeDICRouted, {
          processingId,
          organizationId,
          userId,
          action: 'approved',
          dicDocumentId: result.dicDocumentId,
          timestamp: new Date(),
        } as UaipEventPayload);

        await this.enqueueCanonicalWrite(processingId, organizationId, userId);
      } else if (action === 'REJECTED') {
        await ResumeParseResult.findOneAndUpdate(
          { processingId },
          { $set: { reviewStatus: 'NEEDS_REINDEX' } }
        );

        await eventBus.publish(UaipEvent.ResumeDICRoutingFailed, {
          processingId,
          organizationId,
          userId,
          errorMessage: 'Rejected by DIC reviewer',
          reason: 'unknown',
          timestamp: new Date(),
        } as UaipEventPayload);
      } else if (action === 'ROLLBACK') {
        await ResumeParseResult.findOneAndUpdate(
          { processingId },
          { $set: { reviewStatus: 'PENDING_REVIEW' } }
        );

        await eventBus.publish(UaipEvent.ResumeDICRouted, {
          processingId,
          organizationId,
          userId,
          action: 'rollback',
          dicDocumentId: result.dicDocumentId,
          timestamp: new Date(),
        } as UaipEventPayload);
      }
    } catch (err: any) {
      await eventBus.publish(UaipEvent.ResumeDICRoutingFailed, {
        processingId,
        organizationId,
        userId,
        errorMessage: err.message,
        reason: 'unknown',
        timestamp: new Date(),
      } as UaipEventPayload);

      throw err;
    }
  }

  private async enqueueCanonicalWrite(processingId: string, organizationId: string, userId: string): Promise<void> {
    try {
      await this.jobRepo.create({
        personId: userId,
        sourceDocumentId: processingId,
        domain: 'resume',
        payload: {
          processingId,
          organizationId,
          userId,
          stage: 'canonical_write',
        },
        maxRetries: 3,
      });
    } catch (err: any) {
      logger.error(`Failed to enqueue canonical_write for ${processingId}:`, err.message);
    }
  }
}

export const dicIntegrationService = new DicIntegrationService();
