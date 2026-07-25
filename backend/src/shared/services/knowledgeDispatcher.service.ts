import { CertificateService } from '../services/certificate.service';
import { ExperienceService } from '../services/experience.service';
import { PersonResolver } from './personResolver.service';
import { AcademicRecordService } from './academicRecord.service';
import { AuditEntry } from '../../models/AuditEntry';
import { KnowledgeJobRepository } from '../repositories/knowledgeJob.repository';
import { KnowledgeJobStatus } from '../enums/knowledgeJobStatus.enum';
import { ResumeSectionDetector } from '../../services/resume/resumeSectionDetector.service';
import { ResumeEntityExtractor } from '../../services/resume/resumeEntityExtractor.service';
import { ResumeAIEnhancer } from '../../services/resume/resumeAIEnhancer.service';
import { ResumeConfidenceScorer } from '../../services/resume/resumeConfidenceScorer.service';
import { DicIntegrationService } from '../../services/resume/dicIntegration.service';
import { CanonicalWriteService } from '../../services/resume/canonicalWrite.service';
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
  private aiEnhancer: ResumeAIEnhancer;
  private confidenceScorer: ResumeConfidenceScorer;
  private dicIntegrationService: DicIntegrationService;
  private canonicalWriteService: CanonicalWriteService;

  constructor(aiProvider?: IAIProvider) {
    this.sectionDetector = new ResumeSectionDetector(aiProvider);
    this.entityExtractor = new ResumeEntityExtractor(aiProvider);
    this.aiEnhancer = new ResumeAIEnhancer(aiProvider);
    this.confidenceScorer = new ResumeConfidenceScorer(aiProvider);
    this.dicIntegrationService = new DicIntegrationService();
    this.canonicalWriteService = new CanonicalWriteService();
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
        await this.handleResumeAiEnhancement({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
        });
        break;
      case 'confidence_scoring':
        await this.handleResumeConfidenceScoring({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
        });
        break;
      case 'dic_integration':
        await this.handleResumeDicIntegration({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
        });
        break;
      case 'canonical_write':
        await this.handleResumeCanonicalWrite({
          organizationId,
          personId,
          sourceDocumentId,
          rawConfidence,
          data,
          correlationId,
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
   * Stage 3: AI enhancement handler (Sprint 5).
   */
  private async handleResumeAiEnhancement(params: {
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
      action: 'ai_enhancement_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'ai_enhancement',
        message: 'AI enhancement stage started',
        correlationId,
      },
    });

    const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (existing && (existing as any)?.rawCandidateFields?.aiEnhanced === true) {
      return;
    }

    const entities = (existing as any)?.rawCandidateFields?.entities || [];

    try {
      const result = await this.aiEnhancer.enhance({
        entities,
        rawText: rawContent,
        existing: (existing as any)?.rawCandidateFields || {},
      });

      const skillEntities = result.entities.filter((e: any) => e.type === 'skill');
      const normalizedSkillCount = (existing as any)?.normalizedSkills || 0;
      const skillsActuallyNormalized = result.improvements.fieldsNormalized;

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            entityExtractionStrategy: result.strategy === 'normalized' ? (existing as any)?.entityExtractionStrategy || 'heuristic' : result.strategy,
            aiProviderUsed: result.aiFallbackUsed ? 'gemini' : (existing as any)?.aiProviderUsed || 'none',
            failedOver: result.aiFallbackUsed,
            normalizedSkills: normalizedSkillCount + skillsActuallyNormalized,
            rawCandidateFields: {
              ...((existing as any)?.rawCandidateFields || {}),
              entities: result.entities,
              aiEnhanced: true,
            },
          },
        },
        { upsert: false }
      );

      await eventBus.publish(
        UaipEvent.ResumeAIEnhanced,
        {
          processingId,
          entitiesEnhanced: result.entities.length,
          strategy: result.strategy,
          aiFallbackUsed: result.aiFallbackUsed,
          entityTypes: [...new Set(result.entities.map((e: any) => e.type))],
          improvements: result.improvements,
          reviewStatus: existing?.reviewStatus || 'PENDING_REVIEW',
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );
    } catch (err: any) {
      let reason: 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown' = 'unknown';
      const message = err.message || '';
      if (message === 'no_entities') {
        reason = 'no_entities';
      } else if (message.includes('AI') || message.includes('quota') || message.includes('rate limit')) {
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
          stage: 'ai_enhancement',
          errorMessage: err.message,
          correlationId,
        },
      });

      await eventBus.publish(
        UaipEvent.ResumeAIEnhancementFailed,
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
   * Stage 4: Confidence scoring handler (Sprint 6).
   */
  private async handleResumeConfidenceScoring(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, sourceDocumentId, correlationId, data } = params;
    const jobPayload = (data as any)?.payload || {};
    const processingId = sourceDocumentId;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'confidence_scoring_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'confidence_scoring',
        message: 'Confidence scoring stage started',
        correlationId,
      },
    });

    const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (existing && (existing as any)?.confidenceScore > 0) {
      return;
    }

    const rawCandidateFields = (existing as any)?.rawCandidateFields || {};

    try {
      const result = await this.confidenceScorer.score({
        processingId,
        rawCandidateFields,
        sectionDetectionStrategy: (existing as any)?.sectionDetectionStrategy || 'heuristic',
        entityExtractionStrategy: (existing as any)?.entityExtractionStrategy || 'heuristic',
        aiProviderUsed: (existing as any)?.aiProviderUsed || 'none',
        failedOver: (existing as any)?.failedOver || false,
        extractionIssues: (existing as any)?.extractionIssues || [],
      });

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            confidenceScore: result.confidenceScore,
            reviewStatus: result.reviewStatus,
            rawCandidateFields: {
              ...rawCandidateFields,
              confidenceScore: result.confidenceScore,
              reviewStatus: result.reviewStatus,
              confidenceStrategy: result.strategy,
              confidenceSummary: result.confidenceSummary,
            },
          },
        },
        { upsert: false }
      );

      await eventBus.publish(
        UaipEvent.ResumeConfidenceScored,
        {
          processingId,
          confidenceScore: result.confidenceScore,
          reviewStatus: result.reviewStatus,
          strategy: result.strategy,
          aiFallbackUsed: result.aiFallbackUsed,
          confidenceSummary: result.confidenceSummary,
          improvements: result.improvements,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );

      await eventBus.publish(
        UaipEvent.ResumeParseCompleted,
        {
          processingId,
          documentCategory: 'RESUME',
          confidenceScore: result.confidenceScore,
          reviewStatus: result.reviewStatus,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );
    } catch (err: any) {
      let reason: 'no_sections' | 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown' = 'unknown';
      const message = err.message || '';
      if (message === 'no_sections') {
        reason = 'no_sections';
      } else if (message === 'no_entities') {
        reason = 'no_entities';
      } else if (message.includes('AI') || message.includes('quota') || message.includes('rate limit')) {
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
          stage: 'confidence_scoring',
          errorMessage: err.message,
          correlationId,
        },
      });

      await eventBus.publish(
        UaipEvent.ResumeConfidenceScoringFailed,
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
   * Stage 5: DIC Integration handler (Sprint 7).
   */
  private async handleResumeDicIntegration(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, personId, sourceDocumentId, correlationId, data } = params;
    const jobPayload = (data as any)?.payload || {};
    const processingId = jobPayload.processingId || sourceDocumentId;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'dic_integration_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'dic_integration',
        message: 'DIC integration stage started',
        correlationId,
      },
    });

    try {
      const output = await this.dicIntegrationService.route({
        processingId,
        organizationId,
        userId: personId,
      });

      await eventBus.publish(
        UaipEvent.ResumeDICRouted,
        {
          processingId,
          organizationId,
          userId: personId,
          action: output.action,
          dicDocumentId: output.dicDocumentId,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );
    } catch (err: any) {
      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: 'resume_records',
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain: 'resume',
          stage: 'dic_integration',
          errorMessage: err.message,
          correlationId,
        },
      });

      throw err;
    }
  }

  /**
   * Stage 6: Canonical Write handler (Sprint 7).
   */
  private async handleResumeCanonicalWrite(params: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    data: unknown;
    correlationId?: string;
  }): Promise<void> {
    const { organizationId, personId, sourceDocumentId, correlationId, data } = params;
    const jobPayload = (data as any)?.payload || {};
    const processingId = jobPayload.processingId || sourceDocumentId;

    await AuditEntry.create({
      organizationId,
      recordId: sourceDocumentId,
      collectionName: 'resume_records',
      action: 'canonical_write_started',
      performedBy: 'dispatcher',
      metadata: {
        domain: 'resume',
        stage: 'canonical_write',
        message: 'Canonical write stage started',
        correlationId,
      },
    });

    const result = await ResumeParseResult.findOne({ processingId }).lean().exec();
    if (!result) {
      throw new Error(`ResumeParseResult not found for canonical write: ${processingId}`);
    }

    try {
      const output = await this.canonicalWriteService.write({
        processingId,
        organizationId,
        userId: personId,
        rawCandidateFields: (result as any).rawCandidateFields || {},
        confidenceScore: (result as any).confidenceScore || 0,
      });

      await eventBus.publish(
        UaipEvent.ResumeCanonicalWritten,
        {
          processingId,
          organizationId,
          userId: personId,
          personId: output.personId,
          recordsWritten: output.recordsWritten,
          recordsSkipped: output.recordsSkipped,
          strategy: output.strategy,
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );
    } catch (err: any) {
      await AuditEntry.create({
        organizationId,
        recordId: sourceDocumentId,
        collectionName: 'resume_records',
        action: 'failed',
        performedBy: 'dispatcher',
        metadata: {
          domain: 'resume',
          stage: 'canonical_write',
          errorMessage: err.message,
          correlationId,
        },
      });

      await eventBus.publish(
        UaipEvent.ResumeCanonicalWriteFailed,
        {
          processingId,
          organizationId,
          userId: personId,
          errorMessage: err.message,
          reason: 'unknown',
          timestamp: new Date(),
          correlationId,
        } as UaipEventPayload
      );

      throw err;
    }
  }

  /**
   * Placeholder for unimplemented resume stages (Sprint 6-7).
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
