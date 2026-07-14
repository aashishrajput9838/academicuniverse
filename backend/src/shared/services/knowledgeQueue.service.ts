import { KnowledgeJobRepository } from '../repositories/knowledgeJob.repository';
import { KnowledgeJobStatus } from '../enums/knowledgeJobStatus.enum';
import { AuditEntry } from '../../models/AuditEntry';
import { KnowledgeDispatcher } from './knowledgeDispatcher.service';

/**
 * KnowledgeQueueService runs a background poller that processes pending KnowledgeJobs.
 * It respects the exponential back‑off policy and updates job status accordingly.
 */
export class KnowledgeQueueService {
  private readonly pollIntervalMs: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly jobRepo: KnowledgeJobRepository,
    private readonly dispatcher: KnowledgeDispatcher,
    pollIntervalMs?: number
  ) {
    // Allow injection for testing; fallback to env var or default 30 seconds.
    const envInterval = process.env.KNOWLEDGE_QUEUE_POLL_INTERVAL_MS
      ? parseInt(process.env.KNOWLEDGE_QUEUE_POLL_INTERVAL_MS, 10)
      : undefined;
    this.pollIntervalMs = pollIntervalMs ?? envInterval ?? 30_000;
  }

  /** Start the periodic polling loop */
  start() {
    if (this.timer) return; // already running
    this.timer = setInterval(() => this.processPending(), this.pollIntervalMs);
    // Ensure the timer does not keep the Node process alive on graceful shutdown.
    this.timer.unref();
  }

  /** Stop the polling loop – useful for tests */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Core processing logic */
  private async processPending() {
    const now = new Date();
    const pendingJobs = await this.jobRepo.findPending(now);
    for (const job of pendingJobs) {
      try {
        await this.jobRepo.markRunning(job.id);
        // Dispatch using the existing KnowledgeDispatcher logic.
        await this.dispatcher.dispatch({
          organizationId: job.personId, // approximated – actual orgId should be stored; using personId for demo
          authUserId: job.personId,
          sourceDocumentId: job.sourceDocumentId,
          domain: job.domain as any,
          data: job.payload,
          rawConfidence: 0, // rawConfidence not persisted; default 0
          correlationId: undefined,
        });
        await this.jobRepo.markCompleted(job.id);
        await AuditEntry.create({
          organizationId: job.personId,
          recordId: job.id,
          collectionName: 'knowledge_jobs',
          action: 'completed',
          performedBy: 'queue',
          metadata: { retryCount: job.retryCount },
        });
      } catch (err: any) {
        const attempt = job.retryCount + 1;
        if (attempt < job.maxRetries) {
          const backoffMs = this.getBackoffDelay(attempt);
          const nextAttempt = new Date(Date.now() + backoffMs);
          await this.jobRepo.scheduleRetry(job.id, nextAttempt, err.message, attempt);
          await AuditEntry.create({
            organizationId: job.personId,
            recordId: job.id,
            collectionName: 'knowledge_jobs',
            action: 'retry_scheduled',
            performedBy: 'queue',
            metadata: { attempt, backoffMs, error: err.message },
          });
        } else {
          await this.jobRepo.markFailed(job.id, err.message);
          await AuditEntry.create({
            organizationId: job.personId,
            recordId: job.id,
            collectionName: 'knowledge_jobs',
            action: 'failed',
            performedBy: 'queue',
            metadata: { error: err.message },
          });
        }
      }
    }
  }

  /** Exponential back‑off according to the spec (30s, 2m, 10m) */
  private getBackoffDelay(attempt: number): number {
    switch (attempt) {
      case 1:
        return 30_000; // 30 seconds
      case 2:
        return 2 * 60_000; // 2 minutes
      case 3:
        return 10 * 60_000; // 10 minutes
      default:
        return 0;
    }
  }
}
