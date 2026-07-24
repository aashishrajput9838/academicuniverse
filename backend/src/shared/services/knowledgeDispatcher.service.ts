import { CertificateService } from '../services/certificate.service';
import { ExperienceService } from '../services/experience.service';
import { PersonResolver } from './personResolver.service';
import { AcademicRecordService } from './academicRecord.service';
import { AuditEntry } from '../../models/AuditEntry';
import { KnowledgeJobRepository } from '../repositories/knowledgeJob.repository';
import { KnowledgeJobStatus } from '../enums/knowledgeJobStatus.enum';

/**
 * KnowledgeDispatcher orchestrates updates to the Knowledge Layer.
 *
 * Errors are now persisted as KnowledgeJob documents for durable retry handling.
 */
export class KnowledgeDispatcher {
  private personResolver = new PersonResolver();
  private academicService = new AcademicRecordService();
  private certificateService = new CertificateService();
  private experienceService = new ExperienceService();
  private jobRepo = new KnowledgeJobRepository();

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
    domain: 'academic' | 'certificate' | 'experience' | string;
    data: unknown; // normalized domain‑specific data
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
      // Person resolution failed – record audit and persist a retry job
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
      await this.jobRepo.create({
        personId: authUserId,
        sourceDocumentId,
        domain,
        payload: data,
        maxRetries: 3,
      });
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
            subjectCode: (data as any).subjectCode,
            subjectName: (data as any).subjectName,
            semester: (data as any).semester,
            year: (data as any).year,
            grade: (data as any).grade,
            credits: (data as any).credits,
            status: (data as any).status,
            correlationId,
          });
          break;
        case 'certificate':
          await this.certificateService.merge({
            organizationId,
            personId,
            sourceDocumentId,
            rawConfidence,
            title: (data as any).title,
            issuer: (data as any).issuer,
            issuedDate: (data as any).issuedDate,
            correlationId,
          });
          break;
        case 'experience':
          await this.experienceService.merge({
            organizationId,
            personId,
            sourceDocumentId,
            rawConfidence,
            title: (data as any).title,
            company: (data as any).company,
            startDate: (data as any).startDate,
            endDate: (data as any).endDate,
            correlationId,
          });
          break;
        case 'resume':
          await this.handleResumeDomain({
            organizationId,
            personId,
            sourceDocumentId,
            rawConfidence,
            data,
            correlationId,
          });
          break;
        default:
          // Unsupported domain – audit and schedule retry via repository
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
          await this.jobRepo.create({
            personId,
            sourceDocumentId,
            domain,
            payload: data,
            maxRetries: 3,
          });
          break;
      }
    } catch (err: any) {
      // Domain merge failed – audit and persist a retry job
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
      await this.jobRepo.create({
        personId,
        sourceDocumentId,
        domain,
        payload: data,
        maxRetries: 3,
      });
    }
  }

  /**
   * STUB: Sprint 7 will implement full ResumeService.merge().
   * For Sprint 2, this stub ensures the queue can process resume jobs
   * without failing, while clearly signaling incomplete implementation.
   */
  private async handleResumeDomain(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, sourceDocumentId, correlationId } = params;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'stubbed',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        rawConfidence: params.rawConfidence,
        message: 'ResumeService.merge() not yet implemented (Sprint 7 stub)',
        correlationId,
      },
    });
  }
}
