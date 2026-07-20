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
  private started = false;

  constructor() {
  }

  public start(): void {
    if (this.started) {
      return;
    }
    this.initializeSubscriptions();
    this.started = true;
  }

  public stop(): void {
    this.started = false;
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
    const { organizationId, personId, correlationId, sourceDocumentId, repositories, languages } = payload;

    if (!organizationId || !personId) {
      logger.warn('GithubUpdated event missing organizationId or personId', { correlationId });
      return;
    }

    try {
      const repos = Array.isArray(repositories) ? repositories : [];
      const nonForkRepos = repos.filter((repo: any) => !repo.fork);

      if (nonForkRepos.length > 0) {
        for (const repo of nonForkRepos) {
          if (!repo.language) continue;

          await this.evidenceService.ingestEvidence({
            organizationId,
            personId,
            sourceDocumentId,
            skillId: `LANGUAGE-${repo.language}`,
            skillName: repo.language,
            aliases: repo.topics || [],
            primarySource: SkillSource.GITHUB,
            sourceType: 'LANGUAGE',
            payload: {
              language: repo.language,
              repositoryId: String(repo.id),
              repositoryName: repo.name,
              repositoryUrl: repo.html_url,
              owner: repo.owner?.login,
              bytesOfCode: repo.size || 0,
              firstCommitDate: repo.created_at,
              lastCommitDate: repo.pushed_at,
              repositoryVisibility: repo.private ? 'PRIVATE' : 'PUBLIC',
              topics: repo.topics || [],
              description: repo.description,
            },
            confidence: 0.7,
            extractedBy: 'dispatcher',
            correlationId,
            effectiveFrom: repo.created_at ? new Date(repo.created_at) : new Date(),
          });
        }
      } else if (languages && typeof languages === 'object') {
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
              contributionCount: payload.contributions?.[language] || 0,
            },
            confidence: 0.7,
            extractedBy: 'dispatcher',
            correlationId,
            effectiveFrom: new Date(),
          });
        }
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
skillsEventListener.start();
