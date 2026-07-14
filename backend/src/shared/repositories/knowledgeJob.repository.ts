import { KnowledgeJobModel, IKnowledgeJob } from '../../models/KnowledgeJob';
import { KnowledgeJobStatus } from '../enums/knowledgeJobStatus.enum';

export class KnowledgeJobRepository {
  /** Create a new KnowledgeJob */
  async create(params: {
    personId: string;
    sourceDocumentId: string;
    domain: string;
    payload: unknown;
    maxRetries?: number;
  }): Promise<IKnowledgeJob> {
    const job = new KnowledgeJobModel({
      personId: params.personId,
      sourceDocumentId: params.sourceDocumentId,
      domain: params.domain,
      payload: params.payload,
      status: KnowledgeJobStatus.PENDING,
      maxRetries: params.maxRetries ?? 3,
    });
    return await job.save();
  }

  /** Find jobs that are pending or scheduled for retry */
  async findPending(now: Date = new Date()): Promise<IKnowledgeJob[]> {
    return KnowledgeJobModel.find({
      status: { $in: [KnowledgeJobStatus.PENDING, KnowledgeJobStatus.RETRYING] },
      $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: { $exists: false } }],
    }).exec();
  }

  /** Mark a job as running */
  async markRunning(id: string): Promise<IKnowledgeJob | null> {
    return KnowledgeJobModel.findByIdAndUpdate(
      id,
      { status: KnowledgeJobStatus.RUNNING, startedAt: new Date(), lastAttemptAt: new Date() },
      { new: true }
    ).exec();
  }

  /** Mark a job as completed */
  async markCompleted(id: string): Promise<IKnowledgeJob | null> {
    return KnowledgeJobModel.findByIdAndUpdate(
      id,
      { status: KnowledgeJobStatus.COMPLETED, completedAt: new Date() },
      { new: true }
    ).exec();
  }

  /** Mark a job as permanently failed */
  async markFailed(id: string, errorMsg: string): Promise<IKnowledgeJob | null> {
    return KnowledgeJobModel.findByIdAndUpdate(
      id,
      {
        status: KnowledgeJobStatus.FAILED,
        lastError: errorMsg,
        completedAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  /** Schedule a retry after a back‑off */
  async scheduleRetry(id: string, nextAttempt: Date, errorMsg: string, retryCount: number): Promise<IKnowledgeJob | null> {
    return KnowledgeJobModel.findByIdAndUpdate(
      id,
      {
        status: KnowledgeJobStatus.RETRYING,
        nextRetryAt: nextAttempt,
        lastError: errorMsg,
        retryCount,
        lastAttemptAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  /** Delete a job (e.g., after successful processing and archival) */
  async delete(id: string): Promise<void> {
    await KnowledgeJobModel.findByIdAndDelete(id).exec();
  }
}
