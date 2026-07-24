import { CertificateService } from '../services/certificate.service';
import { ExperienceService } from '../services/experience.service';
import { PersonResolver } from './personResolver.service';
import { AcademicRecordService } from './academicRecord.service';
import { AuditEntry } from '../../models/AuditEntry';
import { KnowledgeJobRepository } from '../repositories/knowledgeJob.repository';
import { KnowledgeJobStatus } from '../enums/knowledgeJobStatus.enum';
import { ResumeSectionDetector } from '../../services/resume/resumeSectionDetector.service';
import { ResumeEntityExtractor } from '../../services/resume/resumeEntityExtractor.service';
import { ResumeParseResult } from '../../models/ResumeParseResult';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { IAIProvider } from '../../core/ai/ai.provider';
import { eventBus } from '../../events/EventBus';

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
  private sectionDetector: ResumeSectionDetector;
  private entityExtractor: ResumeEntityExtractor;

  constructor(aiProvider?: IAIProvider) {
    this.sectionDetector = new ResumeSectionDetector(aiProvider);
    this.entityExtractor = new ResumeEntityExtractor(aiProvider);
  }

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
          await this.routeResumeStage({
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
   * Route resume jobs by stage.
   * Permanent architecture for Sprint 3-7.
   */
  private async routeResumeStage(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }  ): Promise<void> {
    const { organizationId, personId, sourceDocumentId, rawConfidence, correlationId, data } = params;
    const stage = (data as any)?.stage;

    switch (stage) {
      case 'section_detection':
        await this.handleResumeSectionDetection({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
        });
        break;
      case 'entity_extraction':
        await this.handleResumeEntityExtraction({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
        });
        break;
      case 'ai_enhancement':
        await this.handleUnimplementedResumeStage({
          organizationId,
          sourceDocumentId,
          correlationId,
          stage,
        });
        break;
      case 'confidence_scoring':
        await this.handleUnimplementedResumeStage({
          organizationId,
          sourceDocumentId,
          correlationId,
          stage,
        });
        break;
      default:
        await AuditEntry.create({
          organizationId,
          recordId: sourceDocumentId,
          collectionName: 'resume_records',
          action: 'failed',
          performedBy: 'dispatcher',
          metadata: {
            domain: 'resume',
            rawConfidence: params.rawConfidence,
            errorMessage: `Unknown resume stage: ${stage}`,
            correlationId,
          },
        });
        throw new Error(`Unknown resume stage: ${stage}`);
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

  /**
   * Stage 1: Section detection handler (Sprint 3).
   */
  private async handleResumeSectionDetection(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, sourceDocumentId, correlationId, data } = params;
    const jobPayload = (data as any)?.payload || {};
    const rawContent = typeof jobPayload.rawContent === 'string' ? jobPayload.rawContent : '';
    const mimeType = typeof jobPayload.mimeType === 'string' ? jobPayload.mimeType : '';
    const processingId = sourceDocumentId;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'section_detection_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'section_detection',
        message: 'Section detection stage started',
        correlationId,
      },
    });

    const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (existing && (existing as any).sectionsDetected > 0) {
      return;
    }

    try {
      const result = await this.sectionDetector.detect({
        rawText: rawContent,
        mimeType,
      });

      const mappedSections = result.sections.map((s) => ({
        title: s.title,
        order: s.order,
        startLine: s.startLine,
        endLine: s.endLine,
        rawText: s.rawText,
        entities: s.entities || [],
        entries: s.entries || [],
        repeatable: s.repeatable || false,
      }));

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            sectionsDetected: result.sections.length,
            sectionDetectionStrategy: result.strategy,
            aiProviderUsed: result.aiFallbackUsed ? 'gemini' : 'none',
            failedOver: false,
            rawCandidateFields: {
              ...((existing as any)?.rawCandidateFields || {}),
              sections: mappedSections,
            },
          },
        },
        { upsert: false }
      );

      if (result.sections.length > 0) {
        await eventBus.publish(
          UaipEvent.ResumeSectionDetected,
          {
            processingId,
            sectionsDetected: result.sections.length,
            strategy: result.strategy,
            aiFallbackUsed: result.aiFallbackUsed,
            timestamp: new Date(),
            correlationId,
          } as UaipEventPayload
        );
      } else {
        await eventBus.publish(
          UaipEvent.ResumeSectionDetectionFailed,
          {
            processingId,
            reason: 'No sections detected',
            strategy: result.strategy,
            timestamp: new Date(),
            correlationId,
          } as UaipEventPayload
        );
      }
    } catch (err: any) {
      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: 'resume_records',
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain: 'resume',
          stage: 'section_detection',
          errorMessage: err.message,
          correlationId,
        },
      });

      await eventBus.publish(
        UaipEvent.ResumeSectionDetectionFailed,
        {
          processingId,
          errorMessage: err.message,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );

      throw err;
    }
  }

  /**
   * Stage 2: Entity extraction handler (Sprint 4).
   */
  private async handleResumeEntityExtraction(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, sourceDocumentId, correlationId, data } = params;
    const jobPayload = (data as any)?.payload || {};
    const rawContent = typeof jobPayload.rawContent === 'string' ? jobPayload.rawContent : '';
    const processingId = sourceDocumentId;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'entity_extraction_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'entity_extraction',
        message: 'Entity extraction stage started',
        correlationId,
      },
    });

    const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (existing && (existing as any).entitiesExtracted > 0) {
      return;
    }

    const sections = (existing as any)?.rawCandidateFields?.sections || [];

    try {
      const result = await this.entityExtractor.extract({
        sections,
        rawText: rawContent,
      });

      const mappedEntities = result.entities.map((e) => ({
        type: e.type,
        confidence: e.confidence,
        sourceSection: e.sourceSection,
        data: e.data,
        extractedBy: e.extractedBy,
        reviewStatus: e.reviewStatus,
        mergedFrom: e.mergedFrom,
      }));

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            entitiesExtracted: result.entities.length,
            entityExtractionStrategy: result.strategy,
            aiProviderUsed: result.aiFallbackUsed ? 'gemini' : (existing as any)?.aiProviderUsed || 'none',
            failedOver: result.aiFallbackUsed,
            rawCandidateFields: {
              ...((existing as any)?.rawCandidateFields || {}),
              entities: mappedEntities,
              person: mappedEntities.find((e: any) => e.type === 'person')?.data || (existing as any)?.rawCandidateFields?.person,
              experience: mappedEntities.filter((e: any) => e.type === 'experience').map((e: any) => e.data),
              education: mappedEntities.filter((e: any) => e.type === 'education').map((e: any) => e.data),
              skills: mappedEntities.filter((e: any) => e.type === 'skill').map((e: any) => e.data),
              projects: mappedEntities.filter((e: any) => e.type === 'project').map((e: any) => e.data),
              certifications: mappedEntities.filter((e: any) => e.type === 'certification').map((e: any) => e.data),
              achievements: mappedEntities.filter((e: any) => e.type === 'achievement').map((e: any) => e.data),
              languages: mappedEntities.filter((e: any) => e.type === 'language').map((e: any) => e.data),
            },
          },
        },
        { upsert: false }
      );

      await eventBus.publish(
        UaipEvent.ResumeEntityExtracted,
        {
          processingId,
          entitiesExtracted: result.entities.length,
          strategy: result.strategy,
          aiFallbackUsed: result.aiFallbackUsed,
          entityTypes: [...new Set(result.entities.map((e) => e.type))],
          confidenceSummary: {
            min: result.entities.length > 0 ? Math.min(...result.entities.map((e) => e.confidence)) : 0,
            max: result.entities.length > 0 ? Math.max(...result.entities.map((e) => e.confidence)) : 0,
            average: result.entities.length > 0 ? result.entities.reduce((sum, e) => sum + e.confidence, 0) / result.entities.length : 0,
            belowThreshold: result.entities.filter((e) => e.confidence < 0.5).length,
          },
          reviewStatus: existing?.reviewStatus || 'PENDING_REVIEW',
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );
    } catch (err: any) {
      let reason: 'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown' = 'unknown';
      const message = err.message || '';
      if (message.includes('AI') || message.includes('quota') || message.includes('rate limit')) {
        reason = 'ai_exhausted';
      } else if (message.includes('JSON') || message.includes('parse') || message.includes('malformed')) {
        reason = 'malformed_response';
      }

      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: 'resume_records',
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain: 'resume',
          stage: 'entity_extraction',
          errorMessage: err.message,
          correlationId,
        },
      });

      await eventBus.publish(
        UaipEvent.ResumeEntityExtractionFailed,
        {
          processingId,
          errorMessage: err.message,
          reason,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );

      throw err;
    }
  }

  /**
   * Placeholder for unimplemented resume stages (Sprint 5-6).
   */
  private async handleUnimplementedResumeStage(params: {
    organizationId: string;
    sourceDocumentId: string;
    correlationId?: string;
    stage: string;
  }): Promise<void> {
    const { organizationId, sourceDocumentId, correlationId, stage } = params;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'failed',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage,
        errorMessage: `${stage} not yet implemented`,
        correlationId,
      },
    });
    throw new Error(`${stage} not yet implemented`);
  }
}
