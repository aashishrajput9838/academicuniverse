import { SkillEvidenceService } from '../skillEvidence.service';
import { SkillEvidenceRepository } from '../../repositories/skillEvidence.repository';
import { AuditEntry } from '../../../models/AuditEntry';
import { SkillSource, EvidenceStatus } from '../../../shared/enums/skills.enum';

jest.mock('../../repositories/skillEvidence.repository');
jest.mock('../../../models/AuditEntry');

const mockedRepo = SkillEvidenceRepository as jest.MockedClass<typeof SkillEvidenceRepository>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillEvidenceService', () => {
  let service: SkillEvidenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SkillEvidenceService();
  });

  describe('ingestEvidence', () => {
    it('should create evidence with defaults', async () => {
      const mockEvidence = {
        _id: 'ev-1',
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'SKILL-1',
        skillName: 'Python',
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A' },
        confidence: 0.9,
        extractedBy: 'AI',
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestEvidence({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'SKILL-1',
        skillName: 'Python',
        aliases: [],
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A' },
        confidence: 0.9,
        extractedBy: 'AI',
      });

      expect(result).toBe(mockEvidence);
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          status: EvidenceStatus.ACTIVE,
          effectiveFrom: expect.any(Date),
        }),
        VALID_ORG_ID
      );
      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_evidence',
          action: 'create',
          performedBy: 'AI',
        })
      );
    });

    it('should use provided effectiveFrom and effectiveTo', async () => {
      const effectiveFrom = new Date('2023-08-15');
      const effectiveTo = new Date('2024-05-20');
      const mockEvidence = {
        _id: 'ev-1',
        effectiveFrom,
        effectiveTo,
        status: EvidenceStatus.ACTIVE,
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);

      await service.ingestEvidence({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'SKILL-1',
        skillName: 'Python',
        aliases: [],
        primarySource: SkillSource.CERTIFICATE,
        sourceType: 'CERT',
        payload: {},
        confidence: 1.0,
        extractedBy: 'MANUAL',
        effectiveFrom,
        effectiveTo,
      });

      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveFrom,
          effectiveTo,
        }),
        VALID_ORG_ID
      );
    });
  });

  describe('revokeEvidence', () => {
    it('should revoke evidence and create audit entry', async () => {
      mockedRepo.prototype.revoke.mockResolvedValue(undefined);

      await service.revokeEvidence('ev-1', VALID_ORG_ID, 'Duplicate entry');

      expect(mockedRepo.prototype.revoke).toHaveBeenCalledWith('ev-1', VALID_ORG_ID);
      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 'ev-1',
          collectionName: 'skill_evidence',
          action: 'update',
          performedBy: 'system',
          metadata: expect.objectContaining({
            errorMessage: 'Duplicate entry',
          }),
        })
      );
    });
  });
});
