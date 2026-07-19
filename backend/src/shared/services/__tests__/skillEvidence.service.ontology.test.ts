import { SkillEvidenceService } from '../skillEvidence.service';
import { SkillEvidenceRepository } from '../../repositories/skillEvidence.repository';
import { AuditEntry } from '../../../models/AuditEntry';
import { SkillSource, EvidenceStatus } from '../../../shared/enums/skills.enum';
import { SkillIdentityResolver, ResolvedSkill } from '../skillIdentityResolver.service';
import { ontologyResolutionMetrics } from '../ontologyResolutionMetrics.service';

jest.mock('../../repositories/skillEvidence.repository');
jest.mock('../../../models/AuditEntry');
jest.mock('../skillIdentityResolver.service');
jest.mock('../ontologyResolutionMetrics.service');

const mockedRepo = SkillEvidenceRepository as jest.MockedClass<typeof SkillEvidenceRepository>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;
const mockedResolver = SkillIdentityResolver as jest.MockedClass<typeof SkillIdentityResolver>;
const mockedMetrics = ontologyResolutionMetrics as jest.Mocked<typeof ontologyResolutionMetrics>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillEvidenceService - Ontology Integration', () => {
  let service: SkillEvidenceService;
  let mockResolve: jest.MockedFunction<SkillIdentityResolver['resolve']>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.USE_ONTOLOGY_RESOLUTION;
    mockResolve = jest.fn();
    mockedResolver.mockImplementation(() => ({
      resolve: mockResolve,
    } as any));
    mockedMetrics.reset.mockClear();
    mockedMetrics.recordSuccess.mockClear();
    mockedMetrics.recordFailure.mockClear();
    mockedMetrics.recordFallback.mockClear();
    service = new SkillEvidenceService();
  });

  describe('ingestEvidence', () => {
    it('should behave identically when feature flag is OFF', async () => {
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
      expect(mockResolve).not.toHaveBeenCalled();
      expect(mockedMetrics.recordSuccess).not.toHaveBeenCalled();
      expect(mockedMetrics.recordFailure).not.toHaveBeenCalled();
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          payload: { grade: 'A' },
        }),
        VALID_ORG_ID
      );
    });

    it('should resolve canonical skill when feature flag is ON', async () => {
      process.env.USE_ONTOLOGY_RESOLUTION = 'true';

      const mockEvidence = {
        _id: 'ev-1',
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'SKILL-1',
        skillName: 'Python',
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A', canonicalId: 'python', canonicalName: 'Python' },
        confidence: 0.9,
        extractedBy: 'AI',
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);
      mockResolve.mockResolvedValue({
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: 'LANGUAGE' as any,
        confidence: 0.9,
        aliasType: 'SKILL_ID' as any,
        isNew: false,
        source: 'INTERNAL',
      } as ResolvedSkill);

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

      expect(mockResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          rawSkillId: 'SKILL-1',
          rawSkillName: 'Python',
          source: SkillSource.ACADEMIC,
          organizationId: VALID_ORG_ID,
        })
      );
      expect(mockedMetrics.recordSuccess).toHaveBeenCalled();
      expect(mockedMetrics.recordFailure).not.toHaveBeenCalled();
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          payload: expect.objectContaining({
            canonicalId: 'python',
            canonicalName: 'Python',
            ontologyResolutionEnabled: true,
            ontologyResolutionSucceeded: true,
          }),
        }),
        VALID_ORG_ID
      );
    });

    it('should fallback to raw skillId when resolver fails', async () => {
      process.env.USE_ONTOLOGY_RESOLUTION = 'true';

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
      mockResolve.mockRejectedValue(new Error('Database connection failed'));

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

      expect(mockResolve).toHaveBeenCalled();
      expect(mockedMetrics.recordFailure).toHaveBeenCalled();
      expect(mockedMetrics.recordFallback).toHaveBeenCalled();
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          payload: expect.objectContaining({
            ontologyResolutionEnabled: true,
            ontologyResolutionSucceeded: false,
          }),
        }),
        VALID_ORG_ID
      );
    });

    it('should handle duplicate concurrent resolution gracefully', async () => {
      process.env.USE_ONTOLOGY_RESOLUTION = 'true';

      const mockEvidence = {
        _id: 'ev-1',
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'SKILL-1',
        skillName: 'Python',
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A', canonicalId: 'python', canonicalName: 'Python' },
        confidence: 0.9,
        extractedBy: 'AI',
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);

      mockResolve.mockResolvedValue({
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: 'LANGUAGE' as any,
        confidence: 0.9,
        aliasType: 'SKILL_ID' as any,
        isNew: false,
        source: 'INTERNAL',
      } as ResolvedSkill);

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

      expect(mockResolve).toHaveBeenCalledTimes(1);
      expect(mockedMetrics.recordFailure).not.toHaveBeenCalled();
      expect(mockedMetrics.recordSuccess).toHaveBeenCalled();
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
          payload: expect.objectContaining({
            ontologyResolutionEnabled: true,
            ontologyResolutionSucceeded: true,
          }),
        }),
        VALID_ORG_ID
      );
    });

    it('should resolve organization-specific alias', async () => {
      process.env.USE_ONTOLOGY_RESOLUTION = 'true';

      const mockEvidence = {
        _id: 'ev-1',
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'ORG-SPECIFIC-101',
        skillName: 'Custom Course',
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A', canonicalId: 'org-specific-101', canonicalName: 'Custom Course' },
        confidence: 0.9,
        extractedBy: 'AI',
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);
      mockResolve.mockResolvedValue({
        canonicalId: 'org-specific-101',
        canonicalName: 'Custom Course',
        canonicalCategory: 'DOMAIN_SPECIFIC' as any,
        confidence: 0.85,
        aliasType: 'SKILL_ID' as any,
        isNew: true,
        source: 'INTERNAL',
      } as ResolvedSkill);

      const result = await service.ingestEvidence({
        organizationId: VALID_ORG_ID,
        personId: VALID_PERSON_ID,
        skillId: 'ORG-SPECIFIC-101',
        skillName: 'Custom Course',
        aliases: [],
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { grade: 'A' },
        confidence: 0.9,
        extractedBy: 'AI',
      });

      expect(mockResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          rawSkillId: 'ORG-SPECIFIC-101',
          rawSkillName: 'Custom Course',
          organizationId: VALID_ORG_ID,
        })
      );
      expect(mockedMetrics.recordSuccess).toHaveBeenCalled();
      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            canonicalId: 'org-specific-101',
          }),
        }),
        VALID_ORG_ID
      );
    });

    it('should not modify skillId in evidence', async () => {
      process.env.USE_ONTOLOGY_RESOLUTION = 'true';

      const mockEvidence = {
        _id: 'ev-1',
        skillId: 'SKILL-1',
        skillName: 'Python',
        payload: { canonicalId: 'python' },
      } as any;

      mockedRepo.prototype.create.mockResolvedValue(mockEvidence as any);
      mockResolve.mockResolvedValue({
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: 'LANGUAGE' as any,
        confidence: 0.9,
        aliasType: 'SKILL_ID' as any,
        isNew: false,
        source: 'INTERNAL',
      } as ResolvedSkill);

      await service.ingestEvidence({
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

      expect(mockedRepo.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'SKILL-1',
        }),
        VALID_ORG_ID
      );
    });
  });
});
