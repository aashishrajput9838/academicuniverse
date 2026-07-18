import {
  getMySkills,
  getMySkillEvidence,
  getMySkillSummary,
  createSkillMapping,
  getMappingsForSubject,
} from '../skillsController';
import { PersonResolver } from '../../shared/services/personResolver.service';
import { SkillProjectionService } from '../../shared/services/skillProjection.service';
import { SkillEvidenceService } from '../../shared/services/skillEvidence.service';
import { SubjectSkillMappingService } from '../../shared/services/subjectSkillMapping.service';
import { SkillRecordRepository } from '../../shared/repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../../shared/repositories/skillEvidence.repository';

jest.mock('../../shared/services/personResolver.service');
jest.mock('../../shared/services/skillProjection.service');
jest.mock('../../shared/services/skillEvidence.service');
jest.mock('../../shared/services/subjectSkillMapping.service');
jest.mock('../../shared/repositories/skillRecord.repository');
jest.mock('../../shared/repositories/skillEvidence.repository');

const mockedPersonResolver = PersonResolver as jest.MockedClass<typeof PersonResolver>;
const mockedProjectionService = SkillProjectionService as jest.MockedClass<typeof SkillProjectionService>;
const mockedEvidenceService = SkillEvidenceService as jest.MockedClass<typeof SkillEvidenceService>;
const mockedMappingService = SubjectSkillMappingService as jest.MockedClass<typeof SubjectSkillMappingService>;
const mockedSkillRecordRepo = SkillRecordRepository as jest.MockedClass<typeof SkillRecordRepository>;
const mockedEvidenceRepo = SkillEvidenceRepository as jest.MockedClass<typeof SkillEvidenceRepository>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';
const VALID_SKILL_ID = 'ESCO-1234';

describe('SkillsController', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      organizationId: VALID_ORG_ID,
      user: { userId: 'user-456' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockedPersonResolver.mockImplementation(() => ({
      resolve: jest.fn().mockResolvedValue(VALID_PERSON_ID),
    }) as any);
  });

  describe('getMySkills', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq = { organizationId: VALID_ORG_ID };
      await getMySkills(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return skill profile with records', async () => {
      mockedSkillRecordRepo.prototype.findByPerson.mockResolvedValue([
        {
          _id: 'sr-1',
          skillId: VALID_SKILL_ID,
          skillName: 'Python',
          aliases: ['py'],
          skillCategory: 'TECHNICAL',
          proficiencyLevel: 'EXPERT',
          proficiencyScore: 92,
          evidenceCount: 4,
          firstSeenAt: new Date('2023-08-15'),
          lastVerifiedAt: new Date('2024-05-20'),
          status: 'ACTIVE',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-05-20'),
        },
      ] as any);
      mockedMappingService.prototype.getMappingsForSubject.mockResolvedValue([]);

      await getMySkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.profileId).toBe(VALID_PERSON_ID);
      expect(responseBody.data.skills).toHaveLength(1);
      expect(responseBody.data.skills[0].skillId).toBe(VALID_SKILL_ID);
    });

    it('should return empty profile when no records exist', async () => {
      mockedSkillRecordRepo.prototype.findByPerson.mockResolvedValue([]);
      mockedMappingService.prototype.getMappingsForSubject.mockResolvedValue([]);

      await getMySkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.data.skills).toHaveLength(0);
      expect(responseBody.data.categories).toEqual({});
    });
  });

  describe('getMySkillEvidence', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq = { organizationId: VALID_ORG_ID, params: { skillId: VALID_SKILL_ID } };
      await getMySkillEvidence(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when skillId is missing', async () => {
      mockReq = { organizationId: VALID_ORG_ID, user: { userId: 'user-456' }, params: {} };
      await getMySkillEvidence(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when skill not found', async () => {
      mockReq = { organizationId: VALID_ORG_ID, user: { userId: 'user-456' }, params: { skillId: VALID_SKILL_ID } };
      mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue(null);

      await getMySkillEvidence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return evidence for a skill', async () => {
      mockReq = { organizationId: VALID_ORG_ID, user: { userId: 'user-456' }, params: { skillId: VALID_SKILL_ID } };
      mockedSkillRecordRepo.prototype.findBySkill.mockResolvedValue({
        _id: 'sr-1',
        skillId: VALID_SKILL_ID,
        skillName: 'Python',
      } as any);
      mockedEvidenceRepo.prototype.findActiveByPersonAndSkill.mockResolvedValue([
        {
          _id: 'ev-1',
          primarySource: 'ACADEMIC',
          sourceType: 'TRANSCRIPT',
          payload: { grade: 'A' },
          confidence: 0.95,
          extractedBy: 'AI',
          effectiveFrom: new Date('2023-08-15'),
          status: 'ACTIVE',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        } as any,
      ]);

      await getMySkillEvidence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.data.skillId).toBe(VALID_SKILL_ID);
      expect(responseBody.data.evidence).toHaveLength(1);
    });
  });

  describe('getMySkillSummary', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq = { organizationId: VALID_ORG_ID };
      await getMySkillSummary(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return summary with metrics', async () => {
      mockedSkillRecordRepo.prototype.findByPerson.mockResolvedValue([
        {
          _id: 'sr-1',
          skillId: VALID_SKILL_ID,
          skillName: 'Python',
          skillCategory: 'TECHNICAL',
          proficiencyScore: 92,
        } as any,
        {
          _id: 'sr-2',
          skillId: 'K8S-1',
          skillName: 'Kubernetes',
          skillCategory: 'TOOL',
          proficiencyScore: 15,
        } as any,
      ] as any);

      await getMySkillSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.data.totalSkills).toBe(2);
      expect(responseBody.data.topSkills).toHaveLength(1);
      expect(responseBody.data.topSkills[0].skillName).toBe('Python');
      expect(responseBody.data.skillGaps).toHaveLength(1);
      expect(responseBody.data.skillGaps[0].skillName).toBe('Kubernetes');
    });
  });

  describe('createSkillMapping', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq = { organizationId: VALID_ORG_ID, body: {} };
      await createSkillMapping(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for missing required fields', async () => {
      mockReq = { organizationId: VALID_ORG_ID, user: { userId: 'user-456' }, body: { subjectCode: 'CSE101' } };
      await createSkillMapping(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid relevanceWeight', async () => {
      mockReq = {
        organizationId: VALID_ORG_ID,
        user: { userId: 'user-456' },
        body: {
          subjectCode: 'CSE101',
          subjectName: 'Intro to CS',
          skillId: VALID_SKILL_ID,
          skillName: 'Python',
          skillCategory: 'TECHNICAL',
          relevanceWeight: 1.5,
          effectiveFrom: '2023-01-01',
        },
      };
      await createSkillMapping(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create mapping successfully', async () => {
      const mockMapping = {
        _id: 'map-1',
        subjectCode: 'CSE101',
        subjectName: 'Intro to CS',
        skillId: VALID_SKILL_ID,
        skillName: 'Python',
        skillCategory: 'TECHNICAL',
        relevanceWeight: 0.9,
        isCore: true,
        effectiveFrom: new Date('2023-01-01'),
        version: 1,
      } as any;

      mockedMappingService.prototype.upsertMapping.mockResolvedValue(mockMapping);

      mockReq = {
        organizationId: VALID_ORG_ID,
        user: { userId: 'user-456' },
        body: {
          subjectCode: 'CSE101',
          subjectName: 'Intro to CS',
          skillId: VALID_SKILL_ID,
          skillName: 'Python',
          skillCategory: 'TECHNICAL',
          relevanceWeight: 0.9,
          isCore: true,
          effectiveFrom: '2023-01-01',
        },
      };

      await createSkillMapping(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.data.mappingId).toBe('map-1');
      expect(mockedMappingService.prototype.upsertMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: VALID_ORG_ID,
          subjectCode: 'CSE101',
          skillId: VALID_SKILL_ID,
        })
      );
    });
  });

  describe('getMappingsForSubject', () => {
    it('should return 403 when organization context missing', async () => {
      mockReq = { params: { subjectCode: 'CSE101' } };
      await getMappingsForSubject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 when subjectCode missing', async () => {
      mockReq = { organizationId: VALID_ORG_ID, params: {} };
      await getMappingsForSubject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return mappings for a subject', async () => {
      mockReq = { organizationId: VALID_ORG_ID, params: { subjectCode: 'CSE101' } };
      mockedMappingService.prototype.getMappingsForSubject.mockResolvedValue([
        {
          _id: 'map-1',
          subjectCode: 'CSE101',
          subjectName: 'Intro to CS',
          skillId: VALID_SKILL_ID,
          skillName: 'Python',
          skillCategory: 'TECHNICAL',
          relevanceWeight: 0.9,
          isCore: true,
          effectiveFrom: new Date('2023-01-01'),
        } as any,
      ]);

      await getMappingsForSubject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.data.subjectCode).toBe('CSE101');
      expect(responseBody.data.mappings).toHaveLength(1);
    });
  });
});
