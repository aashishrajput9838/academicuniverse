import { Types } from 'mongoose';
import { PersonResolver } from './personResolver.service';
import { AcademicRecordService } from './academicRecord.service';
import { AuditEntry } from '../../models/AuditEntry';

/**
 * KnowledgeDispatcher orchestrates updates to the Knowledge Layer.
 *
 * It receives a payload from the DocumentProcessingService, resolves the
 * canonical Person, forwards the data to the appropriate domain service, and
 * records structured audit entries.  In case of any error it records a failure
 * audit entry, stores the error on the payload, and pushes the payload onto an
 * in‑memory retry queue (MVP placeholder).
 */
export class KnowledgeDispatcher {
  private personResolver = new PersonResolver();
  private academicService = new AcademicRecordService();

  /**
   * Simple in‑memory retry queue – MVP placeholder. In production this should be
   * replaced with a durable queue (e.g., RabbitMQ, SQS, or a DB‑backed job table).
   */
  private retryQueue: any[] = [];

  /**
   * Dispatch a knowledge payload.
   * @param payload - The payload coming from DocumentProcessingService.
   */
  async dispatch(payload: {
    organizationId: string;
    authUserId: string; // authenticated user identifier
    email?: string; // optional primary email from auth context
    name?: string; // optional display name from auth context
    sourceDocumentId: string;
    domain: 'academic' | string;
    data: any; // normalized domain‑specific data
    rawConfidence: number;
    correlationId?: string;
  }): Promise<void> {
    const {
      organizationId,
      authUserId,
      email,
      name,
      sourceDocumentId,
      domain,
      data,
      rawConfidence,
      correlationId,
    } = payload;

    let personId: string;
    try {
      // Resolve (or create) the canonical Person first
      personId = await this.personResolver.resolve(authUserId, organizationId, email, name);
    } catch (err: any) {
      // Person resolution failed – record audit and requeue
      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: 'documents',
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain,
          rawConfidence,
          errorMessage: `Person resolution error: ${err.message}`,
          correlationId,
        },
      });
      this.retryQueue.push(payload);
      return; // exit early – downstream domain services are not invoked
    }

    try {
      switch (domain) {
        case 'academic':
          await this.academicService.merge({
            organizationId,
            personId,
            sourceDocumentId,
            rawConfidence,
            subjectCode: data.subjectCode,
            subjectName: data.subjectName,
            semester: data.semester,
            year: data.year,
            grade: data.grade,
            credits: data.credits,
            status: data.status,
            correlationId,
          });
          break;
        default:
          // For unknown domains we treat it as a no‑op but still audit
          await AuditEntry.create({
            organizationId,
            recordId: sourceDocumentId,
            collectionName: 'documents',
            action: 'failed',
            performedBy: 'dispatcher',
            metadata: {
              domain,
              rawConfidence,
              errorMessage: `Unsupported domain: ${domain}`,
              correlationId,
            },
          });
          this.retryQueue.push(payload);
      }
    } catch (err: any) {
      // Domain merge failed – record audit entry and enqueue for retry
      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: `${domain}_records`,
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain,
          rawConfidence,
          errorMessage: err.message,
          correlationId,
        },
      });
      this.retryQueue.push(payload);
    }
  }

  /**
   * Returns the current in‑memory retry queue.  This method is for debugging/
   * inspection only – in production the queue would be external.
   */
  getRetryQueue() {
    return this.retryQueue;
  }
}
