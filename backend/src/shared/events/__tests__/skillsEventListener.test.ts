import { SkillsEventListener } from '../skillsEventListener';
import { eventBus } from '../../../events/EventBus';
import { UaipEvent } from '../../../events/UaipEvents';
import { SkillEvidenceService } from '../../services/skillEvidence.service';
import { SkillProjectionService } from '../../services/skillProjection.service';

jest.mock('../../services/skillEvidence.service');
jest.mock('../../services/skillProjection.service');

const mockedEvidenceService = SkillEvidenceService as jest.MockedClass<typeof SkillEvidenceService>;
const mockedProjectionService = SkillProjectionService as jest.MockedClass<typeof SkillProjectionService>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillsEventListener', () => {
  let listener: SkillsEventListener;
  let subscribeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (SkillsEventListener as any).initialized = false;
    subscribeSpy = jest.spyOn(eventBus, 'subscribe').mockImplementation(() => {});
    listener = new SkillsEventListener();
  });

  afterEach(() => {
    subscribeSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should subscribe to all required events on first instantiation', () => {
      const subscribeCalls = subscribeSpy.mock.calls;
      const events = subscribeCalls.map((call: any) => call[0]);

      expect(events).toContain(UaipEvent.AcademicRecordUpdated);
      expect(events).toContain(UaipEvent.CertificateApproved);
      expect(events).toContain(UaipEvent.GithubUpdated);
      expect(events).toContain(UaipEvent.ResearchUpdated);
      expect(subscribeCalls.length).toBe(4);
    });

    it('should not re-subscribe on subsequent instantiations', () => {
      new SkillsEventListener();
      new SkillsEventListener();

      expect(subscribeSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('handleAcademicRecordUpdated', () => {
    it('should skip if organizationId or personId is missing', async () => {
      await (listener as any).handleAcademicRecordUpdated({
        correlationId: 'corr-1',
        sourceDocumentId: 'doc-1',
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).not.toHaveBeenCalled();
      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).not.toHaveBeenCalled();
    });

    it('should ingest evidence and rebuild projections', async () => {
      mockedEvidenceService.prototype.ingestEvidence.mockResolvedValue({ _id: 'ev-1' } as any);
      mockedProjectionService.prototype.rebuildAllSkillRecords.mockResolvedValue(undefined);

      await (listener as any).handleAcademicRecordUpdated({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        correlationId: 'corr-1',
        sourceDocumentId: 'doc-1',
        documentSubtype: 'CSE101',
        fileName: 'Intro to CS',
        grade: 'A',
        credits: 3,
        semester: '1',
        year: 2023,
        status: 'PASS',
        confidenceScore: 95,
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: VALID_ORG_ID,
          personId: VALID_PERSON_ID,
          skillId: 'ACADEMIC-CSE101',
          skillName: 'Intro to CS',
          primarySource: 'ACADEMIC',
          sourceType: 'TRANSCRIPT',
          confidence: 0.95,
        })
      );
      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).toHaveBeenCalledWith(VALID_ORG_ID, VALID_PERSON_ID);
    });

    it('should handle errors gracefully', async () => {
      mockedEvidenceService.prototype.ingestEvidence.mockRejectedValue(new Error('DB error'));

      await (listener as any).handleAcademicRecordUpdated({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        correlationId: 'corr-1',
      });

      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).not.toHaveBeenCalled();
    });
  });

  describe('handleCertificateApproved', () => {
    it('should ingest certificate evidence and rebuild projections', async () => {
      mockedEvidenceService.prototype.ingestEvidence.mockResolvedValue({ _id: 'ev-1' } as any);
      mockedProjectionService.prototype.rebuildAllSkillRecords.mockResolvedValue(undefined);

      await (listener as any).handleCertificateApproved({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        correlationId: 'corr-2',
        sourceDocumentId: 'doc-2',
        documentSubtype: 'AWS Certification',
        issuer: 'Amazon',
        issuedDate: '2024-01-01',
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: VALID_ORG_ID,
          personId: VALID_PERSON_ID,
          skillId: 'CERTIFICATE-AWS Certification',
          skillName: 'AWS Certification',
          primarySource: 'CERTIFICATE',
          sourceType: 'CERTIFICATE',
          confidence: 1.0,
        })
      );
      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).toHaveBeenCalledWith(VALID_ORG_ID, VALID_PERSON_ID);
    });
  });

  describe('handleGithubUpdated', () => {
    it('should ingest language evidence for each language and rebuild projections', async () => {
      mockedEvidenceService.prototype.ingestEvidence.mockResolvedValue({ _id: 'ev-1' } as any);
      mockedProjectionService.prototype.rebuildAllSkillRecords.mockResolvedValue(undefined);

      await (listener as any).handleGithubUpdated({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        correlationId: 'corr-3',
        sourceDocumentId: 'doc-3',
        languages: { TypeScript: 50000, Python: 30000 },
        contributions: { TypeScript: 142, Python: 89 },
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenCalledTimes(2);
      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          skillId: 'LANGUAGE-TypeScript',
          skillName: 'TypeScript',
          primarySource: 'GITHUB',
          sourceType: 'LANGUAGE',
        })
      );
      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          skillId: 'LANGUAGE-Python',
          skillName: 'Python',
          primarySource: 'GITHUB',
          sourceType: 'LANGUAGE',
        })
      );
      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).toHaveBeenCalledWith(VALID_ORG_ID, VALID_PERSON_ID);
    });

    it('should skip if organizationId or personId is missing', async () => {
      await (listener as any).handleGithubUpdated({
        correlationId: 'corr-3',
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).not.toHaveBeenCalled();
    });
  });

  describe('handleResearchUpdated', () => {
    it('should ingest research evidence and rebuild projections', async () => {
      mockedEvidenceService.prototype.ingestEvidence.mockResolvedValue({ _id: 'ev-1' } as any);
      mockedProjectionService.prototype.rebuildAllSkillRecords.mockResolvedValue(undefined);

      await (listener as any).handleResearchUpdated({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        correlationId: 'corr-4',
        sourceDocumentId: 'doc-4',
        documentSubtype: 'Machine Learning Survey',
        authors: ['Alice', 'Bob'],
        journal: 'Nature',
        abstract: 'A survey of ML techniques.',
      });

      expect(mockedEvidenceService.prototype.ingestEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: VALID_ORG_ID,
          personId: VALID_PERSON_ID,
          skillId: 'RESEARCH-Machine Learning Survey',
          skillName: 'Machine Learning Survey',
          primarySource: 'RESEARCH',
          sourceType: 'PAPER',
          confidence: 0.85,
        })
      );
      expect(mockedProjectionService.prototype.rebuildAllSkillRecords).toHaveBeenCalledWith(VALID_ORG_ID, VALID_PERSON_ID);
    });
  });
});
