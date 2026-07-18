import { SkillProjectionService, ProficiencyResult } from '../skillProjection.service';
import { SkillRecordRepository } from '../../repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../../repositories/skillEvidence.repository';
import { AuditEntry } from '../../../models/AuditEntry';
import { ProficiencyLevel, SkillSource, EvidenceStatus } from '../../../shared/enums/skills.enum';

jest.mock('../../repositories/skillRecord.repository');
jest.mock('../../repositories/skillEvidence.repository');
jest.mock('../../../models/AuditEntry');

const mockedSkillRecordRepo = SkillRecordRepository as jest.MockedClass<typeof SkillRecordRepository>;
const mockedEvidenceRepo = SkillEvidenceRepository as jest.MockedClass<typeof SkillEvidenceRepository>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillProjectionService', () => {
  let service: SkillProjectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SkillProjectionService();
  });

  describe('computeProficiency', () => {
    it('should return zero score for empty evidence', () => {
      const result = service.computeProficiency([]);
      expect(result.score).toBe(0);
      expect(result.level).toBe(ProficiencyLevel.BEGINNER);
      expect(result.evidenceCount).toBe(0);
    });

    it('should compute score from single certificate evidence', () => {
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: new Date() }),
      ];

      const result = service.computeProficiency(evidence);

      expect(result.score).toBe(100);
      expect(result.level).toBe(ProficiencyLevel.EXPERT);
      expect(result.evidenceCount).toBe(1);
    });

    it('should compute average across multiple sources', () => {
      const now = new Date();
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now }),
        createEvidence({ confidence: 0.8, primarySource: SkillSource.GITHUB, effectiveFrom: now }),
      ];

      const result = service.computeProficiency(evidence);

      const certBase = 1.0 * 1.0 * 1.0;
      const gitBase = 0.8 * 0.7 * 1.0;
      const expectedScore = Math.round(((certBase + gitBase) / 2) * 100);
      expect(result.score).toBe(expectedScore);
      expect(result.evidenceCount).toBe(2);
    });

    it('should exclude expired evidence', () => {
      const now = new Date();
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now, effectiveTo: new Date('2020-01-01') }),
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now }),
      ];

      const result = service.computeProficiency(evidence);

      expect(result.evidenceCount).toBe(1);
      expect(result.score).toBe(100);
    });

    it('should exclude non-ACTIVE evidence', () => {
      const now = new Date();
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now, status: EvidenceStatus.REVOKED }),
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now }),
      ];

      const result = service.computeProficiency(evidence);

      expect(result.evidenceCount).toBe(1);
      expect(result.score).toBe(100);
    });

    it('should apply recency decay', () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 18 * 30 * 24 * 60 * 60 * 1000);
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: oldDate }),
      ];

      const result = service.computeProficiency(evidence);

      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should derive correct proficiency levels', () => {
      const now = new Date();

      expect(service.computeProficiency([createEvidence({ confidence: 0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.BEGINNER);
      expect(service.computeProficiency([createEvidence({ confidence: 0.25, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.BEGINNER);
      expect(service.computeProficiency([createEvidence({ confidence: 0.26, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.INTERMEDIATE);
      expect(service.computeProficiency([createEvidence({ confidence: 0.50, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.INTERMEDIATE);
      expect(service.computeProficiency([createEvidence({ confidence: 0.51, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.ADVANCED);
      expect(service.computeProficiency([createEvidence({ confidence: 0.75, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.ADVANCED);
      expect(service.computeProficiency([createEvidence({ confidence: 0.76, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.EXPERT);
      expect(service.computeProficiency([createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now })]).level).toBe(ProficiencyLevel.EXPERT);
    });

    it('should clamp score to 0-100', () => {
      const now = new Date();
      const evidence = [
        createEvidence({ confidence: 0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now }),
      ];

      const result = service.computeProficiency(evidence);
      expect(result.score).toBe(0);
    });

    it('should compute firstSeenAt and lastVerifiedAt correctly', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const evidence = [
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: earlier }),
        createEvidence({ confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: now }),
      ];

      const result = service.computeProficiency(evidence);

      expect(result.firstSeenAt.getTime()).toBe(earlier.getTime());
      expect(result.lastVerifiedAt.getTime()).toBe(now.getTime());
    });
  });

  describe('rebuildSkillRecord', () => {
    it('should create new SkillRecord when none exists', async () => {
      const evidence = [
        createEvidence({ skillId: 'SKILL-1', skillName: 'Python', confidence: 1.0, primarySource: SkillSource.CERTIFICATE, effectiveFrom: new Date() }),
      ];

      mockedEvidenceRepo.prototype.findActiveByPersonAndSkill.mockResolvedValue(evidence as any);
      mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue(null);

      const mockRecord = {
        _id: 'skill-1',
        skillId: 'SKILL-1',
        proficiencyLevel: ProficiencyLevel.EXPERT,
        proficiencyScore: 100,
        evidenceCount: 1,
      } as any;

      mockedSkillRecordRepo.prototype.rebuildProjection.mockResolvedValue(mockRecord);

      const result = await service.rebuildSkillRecord(VALID_ORG_ID, VALID_PERSON_ID, 'SKILL-1');

      expect(result).toBe(mockRecord);
      expect(mockedSkillRecordRepo.prototype.rebuildProjection).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          proficiencyLevel: ProficiencyLevel.EXPERT,
          proficiencyScore: 100,
          evidenceCount: 1,
        }),
        VALID_ORG_ID
      );
      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_records',
          action: 'create',
        })
      );
    });

    it('should update existing SkillRecord', async () => {
      const evidence = [
        createEvidence({ skillId: 'SKILL-1', skillName: 'Python', confidence: 0.56, primarySource: SkillSource.GITHUB, effectiveFrom: new Date() }),
      ];

      mockedEvidenceRepo.prototype.findActiveByPersonAndSkill.mockResolvedValue(evidence as any);
      const existing = { _id: 'skill-1', skillId: 'SKILL-1' } as any;
      mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue(existing);

      const updated = { _id: 'skill-1', proficiencyScore: 39 } as any;
      mockedSkillRecordRepo.prototype.rebuildProjection.mockResolvedValue(updated);

      const result = await service.rebuildSkillRecord(VALID_ORG_ID, VALID_PERSON_ID, 'SKILL-1');

      expect(result).toBe(updated);
      expect(mockedSkillRecordRepo.prototype.rebuildProjection).toHaveBeenCalledWith(
        expect.objectContaining({
          proficiencyScore: 39,
        }),
        VALID_ORG_ID
      );
      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_records',
          action: 'update',
        })
      );
    });
  });

  describe('rebuildAllSkillRecords', () => {
    it('should rebuild all skills for a person within an organization', async () => {
      const evidence = [
        createEvidence({ skillId: 'SKILL-1', personId: VALID_PERSON_ID }),
        createEvidence({ skillId: 'SKILL-2', personId: VALID_PERSON_ID }),
      ];

      mockedEvidenceRepo.prototype.findByPerson.mockResolvedValue(evidence as any);
      mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue(null);
      mockedSkillRecordRepo.prototype.rebuildProjection.mockResolvedValue({ _id: 'skill-1' } as any);

      await service.rebuildAllSkillRecords(VALID_ORG_ID, VALID_PERSON_ID);

      expect(mockedSkillRecordRepo.prototype.rebuildProjection).toHaveBeenCalledTimes(2);
      expect(mockedSkillRecordRepo.prototype.rebuildProjection).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ skillId: 'SKILL-1' }),
        VALID_ORG_ID
      );
      expect(mockedSkillRecordRepo.prototype.rebuildProjection).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ skillId: 'SKILL-2' }),
        VALID_ORG_ID
      );
    });
  });
});

function createEvidence(overrides: Partial<any> = {}): any {
  return {
    _id: 'ev-1',
    organizationId: VALID_ORG_ID,
    personId: VALID_PERSON_ID,
    skillId: 'SKILL-1',
    skillName: 'Python',
    aliases: [],
    primarySource: SkillSource.ACADEMIC,
    sourceType: 'TRANSCRIPT',
    payload: {},
    confidence: 1.0,
    extractedBy: 'AI',
    effectiveFrom: new Date(),
    effectiveTo: undefined,
    status: EvidenceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
