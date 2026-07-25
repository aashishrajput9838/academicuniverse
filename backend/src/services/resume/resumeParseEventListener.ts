import { createResumeLogger, logStageEntry, logStageExit, scrubPII } from '../../utils/structuredLogging';
import { KnowledgeJobRepository } from '../../shared/repositories/knowledgeJob.repository';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { eventBus } from '../../events/EventBus';
import { ResumeParseResult } from '../../models/ResumeParseResult';

const logger = createResumeLogger('ResumeParseEventListener');

export class ResumeParseEventListener {
  private readonly knowledgeJobRepo: KnowledgeJobRepository;

  constructor(jobRepo?: KnowledgeJobRepository) {
    this.knowledgeJobRepo = jobRepo ?? new KnowledgeJobRepository();
    this.start();
  }

  start() {
    eventBus.subscribe(UaipEvent.ResumeParseCompleted, this.handleResumeParseCompleted.bind(this));
  }

   private async handleResumeParseCompleted(payload: UaipEventPayload): Promise<void> {
     const processingId = payload.processingId;
     logStageEntry(logger, 'resume_parse', { processingId, stage: 'resume_parse' });
     if (!processingId) {
       logStageExit(logger, 'resume_parse', { processingId, stage: 'resume_parse' });
       return;
     }

     try {
       const result = await ResumeParseResult.findOne({ processingId }).lean().exec();
       if (!result) {
         logStageExit(logger, 'resume_parse', { processingId, stage: 'resume_parse' });
         return;
       }

       try {
         await this.knowledgeJobRepo.create({
           personId: (payload as any).userId || processingId,
           sourceDocumentId: processingId,
           domain: 'resume',
           payload: {
             processingId,
             organizationId: (payload as any).organizationId,
             userId: (payload as any).userId,
             stage: 'dic_integration',
           },
           maxRetries: 3,
         });
       } catch (queueError: any) {
         logger.error(`ResumeParseEventListener: Failed to enqueue dic_integration job for ${processingId}:`, queueError);
       }
       logStageExit(logger, 'resume_parse', { processingId, stage: 'resume_parse' });
     } catch (err: any) {
       logger.error(`ResumeParseEventListener: Error handling ResumeParseCompleted for ${processingId}:`, err.message);
       logStageExit(logger, 'resume_parse', { processingId, stage: 'resume_parse' });
     }
   }
}

export const resumeParseEventListener = new ResumeParseEventListener();
