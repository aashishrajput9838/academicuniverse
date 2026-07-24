import { ResumeJob } from '../../models/ResumeJob';
import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeQueueService');

export class ResumeQueueService {
  /**
   * Enqueue a new resume parsing job.
   * Sprint 1 scope: only enqueue. Processing happens in Sprint 2+.
   */
  async enqueue(params: {
    processingId: string;
    organizationId: string;
    userId: string;
    storageId: string;
    fileName: string;
    mimeType: string;
    size: number;
    fileHash: string;
  }): Promise<void> {
    const job = new ResumeJob({
      processingId: params.processingId,
      organizationId: params.organizationId,
      userId: params.userId,
      storageId: params.storageId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      size: params.size,
      fileHash: params.fileHash,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
    });

    await job.save();
    logger.info(`Resume job enqueued`, { processingId: params.processingId, fileName: params.fileName });
  }

  /**
   * Find a job by processingId.
   */
  async findByProcessingId(processingId: string): Promise<any | null> {
    return ResumeJob.findOne({ processingId }).lean().exec();
  }
}

export const resumeQueueService = new ResumeQueueService();
