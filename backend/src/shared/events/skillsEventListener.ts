import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { SkillEvidenceService } from '../services/skillEvidence.service';
import { SkillProjectionService } from '../services/skillProjection.service';
import { SkillSource } from '../enums/skills.enum';
import { Logger } from '../../utils/logger';

const logger = new Logger('SkillsEventListener');

export class SkillsEventListener {
  private static initialized = false;
  private evidenceService = new SkillEvidenceService();
  private projectionService = new SkillProjectionService();

  constructor() {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions(): void {
    if (SkillsEventListener.initialized) {
      return;
    }

    eventBus.subscribe(UaipEvent.AcademicRecordUpdated, async (payload: any) => {
      await this.handleAcademicRecordUpdated(payload);
    });

    eventBus.subscribe(UaipEvent.CertificateApproved, async (payload: any) => {
      await this.handleCertificateApproved(payload);
    });

    eventBus.subscribe(UaipEvent.GithubUpdated, async (payload: any) => {
      await this.handleGithubUpdated(payload);
    });

    eventBus.subscribe(UaipEvent.ResearchUpdated, async (payload: any) => {
      await this.handleResearchUpdated(payload);
    });

    SkillsEventListener.initialized = true;
  }

  private async handleAcademicRecordUpdated(payload: any): Promise<void> {
    const { organizationId, personId, correlationId, sourceDocumentId } = payload;

    if (!organizationId || !personId) {
      logger.warn('AcademicRecordUpdated event missing organizationId or personId', { correlationId });
      return;
    }

    try {
      const subjectCode = payload.documentSubtype || payload.subjectCode || 'unknown';
      const subjectName = payload.fileName || payload.subjectName || 'Unknown Subject';
      const grade = payload.grade || '';
      const credits = payload.credits || 0;

      await this.evidenceService.ingestEvidence({
        organizationId,
        personId,
        sourceDocumentId,
        skillId: `ACADEMIC-${subjectCode}`,
        skillName: subjectName,
        aliases: [subjectCode],
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        sourceSubtype: subjectCode,
        payload: {
          subjectCode,
          subjectName,
          grade,
          credits,
          semester: payload.semester,
          year: payload.year,
          status: payload.status,
        },
        confidence: payload.confidenceScore ? payload.confidenceScore / 100 : 0.8,
        extractedBy: 'dispatcher',
        correlationId,
        effectiveFrom: new Date(),
      });

      await this.projectionService.rebuildAllSkillRecords(organizationId, personId);
    } catch (err: any) {
      logger.error('Failed to process AcademicRecordUpdated event', {
        error: err.message,
        correlationId,
        organizationId,
        personId,
      });
    }
  }

  private async handleCertificateApproved(payload: any): Promise<void> {
    const { organizationId, personId, correlationId, sourceDocumentId } = payload;

    if (!organizationId || !personId) {
      logger.warn('CertificateApproved event missing organizationId or personId', { correlationId });
      return;
    }

    try {
      const title = payload.fileName || payload.documentSubtype || 'Unknown Certificate';
      const issuer = payload.issuer || 'Unknown Issuer';

      await this.evidenceService.ingestEvidence({
        organizationId,
        personId,
        sourceDocumentId,
        skillId: `CERTIFICATE-${title}`,
        skillName: title,
        aliases: [issuer],
        primarySource: SkillSource.CERTIFICATE,
        sourceType: 'CERTIFICATE',
        payload: {
          title,
          issuer,
          issuedDate: payload.issuedDate,
        },
        confidence: 1.0,
        extractedBy: 'dispatcher',
        correlationId,
        effectiveFrom: new Date(),
      });

      await this.projectionService.rebuildAllSkillRecords(organizationId, personId);
    } catch (err: any) {
      logger.error('Failed to process CertificateApproved event', {
        error: err.message,
        correlationId,
        organizationId,
        personId,
      });
    }
  }

  private async handleGithubUpdated(payload: any): Promise<void> {
    const { organizationId, personId, correlationId, sourceDocumentId } = payload;

    if (!organizationId || !personId) {
      logger.warn('GithubUpdated event missing organizationId or personId', { correlationId });
      return;
    }

    try {
      const languages = payload.languages || {};
      const contributions = payload.contributions || {};

      for (const [language, count] of Object.entries(languages)) {
        await this.evidenceService.ingestEvidence({
          organizationId,
          personId,
          sourceDocumentId,
          skillId: `LANGUAGE-${language}`,
          skillName: language,
          aliases: [],
          primarySource: SkillSource.GITHUB,
          sourceType: 'LANGUAGE',
          payload: {
            language,
            bytesOfCode: count,
            contributionCount: contributions[language] || 0,
          },
          confidence: 0.7,
          extractedBy: 'dispatcher',
          correlationId,
          effectiveFrom: new Date(),
        });
      }

      await this.projectionService.rebuildAllSkillRecords(organizationId, personId);
    } catch (err: any) {
      logger.error('Failed to process GithubUpdated event', {
        error: err.message,
        correlationId,
        organizationId,
        personId,
      });
    }
  }

  private async handleResearchUpdated(payload: any): Promise<void> {
    const { organizationId, personId, correlationId, sourceDocumentId } = payload;

    if (!organizationId || !personId) {
      logger.warn('ResearchUpdated event missing organizationId or personId', { correlationId });
      return;
    }

    try {
      const title = payload.fileName || payload.documentSubtype || 'Unknown Research';
      const abstract = payload.abstract || '';

      await this.evidenceService.ingestEvidence({
        organizationId,
        personId,
        sourceDocumentId,
        skillId: `RESEARCH-${title}`,
        skillName: title,
        aliases: [],
        primarySource: SkillSource.RESEARCH,
        sourceType: 'PAPER',
        payload: {
          title,
          authors: payload.authors,
          journal: payload.journal,
          abstract,
        },
        confidence: 0.85,
        extractedBy: 'dispatcher',
        correlationId,
        effectiveFrom: new Date(),
      });

      await this.projectionService.rebuildAllSkillRecords(organizationId, personId);
    } catch (err: any) {
      logger.error('Failed to process ResearchUpdated event', {
        error: err.message,
        correlationId,
        organizationId,
        personId,
      });
    }
  }
}

export const skillsEventListener = new SkillsEventListener();
