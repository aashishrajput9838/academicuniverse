import { SubjectSkillMappingService } from '../subjectSkillMapping.service';
import { SubjectSkillMappingRepository } from '../../repositories/subjectSkillMapping.repository';
import { AuditEntry } from '../../../models/AuditEntry';
import { SkillCategory } from '../../../shared/enums/skills.enum';

jest.mock('../../repositories/subjectSkillMapping.repository');
jest.mock('../../../models/AuditEntry');

const mockedRepo = SubjectSkillMappingRepository as jest.MockedClass<typeof SubjectSkillMappingRepository>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';

describe('SubjectSkillMappingService', () => {
  let service: SubjectSkillMappingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubjectSkillMappingService();
  });

  describe('upsertMapping', () => {
    it('should create mapping with normalized dates', async () => {
      const mockDoc = {
        _id: 'map-1',
        subjectCode: 'CSE101',
        skillId: 'SKILL-1',
        version: 1,
      } as any;

      mockedRepo.prototype.upsert.mockResolvedValue({ doc: mockDoc, action: 'create' } as any);

      const result = await service.upsertMapping({
        organizationId: VALID_ORG_ID,
        subjectCode: 'CSE101',
        subjectName: 'Intro to CS',
        skillId: 'SKILL-1',
        skillName: 'Python',
        skillCategory: SkillCategory.TECHNICAL,
        relevanceWeight: 0.9,
        isCore: true,
        effectiveFrom: '2022-01-01',
        version: 1,
        createdBy: 'faculty-1',
      });

      expect(result).toBe(mockDoc);
      expect(mockedRepo.prototype.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectCode: 'CSE101',
          skillId: 'SKILL-1',
          relevanceWeight: 0.9,
          isCore: true,
          version: 1,
        }),
        VALID_ORG_ID
      );
      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'subject_skill_mappings',
          action: 'create',
          performedBy: 'faculty-1',
        })
      );
    });

    it('should throw on invalid effectiveFrom', async () => {
      await expect(
        service.upsertMapping({
          organizationId: VALID_ORG_ID,
          subjectCode: 'CSE101',
          subjectName: 'Intro to CS',
          skillId: 'SKILL-1',
          skillName: 'Python',
          skillCategory: SkillCategory.TECHNICAL,
          relevanceWeight: 0.9,
          isCore: true,
          effectiveFrom: 'invalid-date',
        })
      ).rejects.toThrow('Invalid effectiveFrom date');
    });
  });

  describe('getMappingsForSubject', () => {
    it('should return mappings without date filter', async () => {
      const mappings = [
        { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 2, effectiveFrom: new Date('2022-01-01') },
        { _id: 'map-2', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 1, effectiveFrom: new Date('2021-01-01') },
      ] as any;

      mockedRepo.prototype.findBySubject.mockResolvedValue(mappings);

      const result = await service.getMappingsForSubject('CSE101', VALID_ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(2);
      expect(mockedRepo.prototype.findBySubject).toHaveBeenCalledWith('CSE101', VALID_ORG_ID, undefined);
    });

    it('should filter by date and resolve version conflicts', async () => {
      const atDate = new Date('2023-06-01');
      const mappings = [
        { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 2, effectiveFrom: new Date('2022-01-01') },
        { _id: 'map-2', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 1, effectiveFrom: new Date('2023-01-01') },
        { _id: 'map-3', subjectCode: 'CSE101', skillId: 'SKILL-2', version: 1, effectiveFrom: new Date('2022-01-01') },
      ] as any;

      mockedRepo.prototype.findBySubject.mockResolvedValue(mappings);

      const result = await service.getMappingsForSubject('CSE101', VALID_ORG_ID, atDate);

      expect(result).toHaveLength(2);
      expect(result.find(m => m.skillId === 'SKILL-1')?.version).toBe(2);
      expect(result.find(m => m.skillId === 'SKILL-2')?.version).toBe(1);
    });

    it('should resolve ties by effectiveFrom when versions are equal', async () => {
      const atDate = new Date('2023-06-01');
      const mappings = [
        { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 1, effectiveFrom: new Date('2022-01-01') },
        { _id: 'map-2', subjectCode: 'CSE101', skillId: 'SKILL-1', version: 1, effectiveFrom: new Date('2023-01-01') },
      ] as any;

      mockedRepo.prototype.findBySubject.mockResolvedValue(mappings);

      const result = await service.getMappingsForSubject('CSE101', VALID_ORG_ID, atDate);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('map-2');
    });
  });

  describe('getMappingsForSkill', () => {
    it('should return mappings for a skill', async () => {
      const mappings = [
        { _id: 'map-1', skillId: 'SKILL-1', subjectCode: 'CSE101' },
      ] as any;

      mockedRepo.prototype.findBySkill.mockResolvedValue(mappings);

      const result = await service.getMappingsForSkill('SKILL-1', VALID_ORG_ID);

      expect(result).toBe(mappings);
      expect(mockedRepo.prototype.findBySkill).toHaveBeenCalledWith('SKILL-1', VALID_ORG_ID);
    });
  });
});
