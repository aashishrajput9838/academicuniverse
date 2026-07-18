import mongoose from 'mongoose';
import { SubjectSkillMappingRepository } from '../subjectSkillMapping.repository';
import { SubjectSkillMapping, ISubjectSkillMapping } from '../../../models/SubjectSkillMapping';
import { SkillCategory } from '../../../shared/enums/skills.enum';

jest.mock('../../../models/SubjectSkillMapping');

const mockedSubjectSkillMapping = SubjectSkillMapping as jest.MockedFunction<any>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';

describe('SubjectSkillMappingRepository', () => {
  let repository: SubjectSkillMappingRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SubjectSkillMappingRepository();
  });

  describe('upsert', () => {
    it('should create a new mapping when none exists', async () => {
      const mockDoc = { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1' } as ISubjectSkillMapping;
      mockedSubjectSkillMapping.findOne.mockResolvedValue(null);
      mockedSubjectSkillMapping.create.mockResolvedValue(mockDoc);

      const result = await repository.upsert(
        { organizationId: VALID_ORG_ID, subjectCode: 'CSE101', skillId: 'SKILL-1', skillName: 'Python', skillCategory: SkillCategory.TECHNICAL, relevanceWeight: 0.9, isCore: true, effectiveFrom: new Date() },
        VALID_ORG_ID
      );

      expect(result.doc).toBe(mockDoc);
      expect(result.action).toBe('create');
      expect(mockedSubjectSkillMapping.findOne).toHaveBeenCalled();
      expect(mockedSubjectSkillMapping.create).toHaveBeenCalled();
    });

    it('should update existing mapping when one exists', async () => {
      const existingDoc = { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1' } as ISubjectSkillMapping;
      const updatedDoc = { _id: 'map-1', subjectCode: 'CSE101', skillId: 'SKILL-1', relevanceWeight: 0.95 } as ISubjectSkillMapping;

      mockedSubjectSkillMapping.findOne.mockResolvedValue(existingDoc);
      mockedSubjectSkillMapping.updateOne.mockResolvedValue({});
      mockedSubjectSkillMapping.findById.mockResolvedValue(updatedDoc);

      const result = await repository.upsert(
        { organizationId: VALID_ORG_ID, subjectCode: 'CSE101', skillId: 'SKILL-1', skillName: 'Python', skillCategory: SkillCategory.TECHNICAL, relevanceWeight: 0.95, isCore: true, effectiveFrom: new Date() },
        VALID_ORG_ID
      );

      expect(result.doc).toBe(updatedDoc);
      expect(result.action).toBe('update');
      expect(mockedSubjectSkillMapping.updateOne).toHaveBeenCalled();
      expect(mockedSubjectSkillMapping.findById).toHaveBeenCalled();
    });
  });

  describe('findBySubject', () => {
    it('should return mappings for a subject without date filter', async () => {
      const mappings = [{ _id: 'map-1', subjectCode: 'CSE101' }] as ISubjectSkillMapping[];
      mockedSubjectSkillMapping.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mappings),
      } as any);

      const result = await repository.findBySubject('CSE101', VALID_ORG_ID);

      expect(result).toBe(mappings);
      expect(mockedSubjectSkillMapping.find).toHaveBeenCalled();
    });

    it('should filter mappings by validity date', async () => {
      const atDate = new Date('2023-08-15');
      const mappings = [{ _id: 'map-1', subjectCode: 'CSE101' }] as ISubjectSkillMapping[];
      mockedSubjectSkillMapping.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mappings),
      } as any);

      const result = await repository.findBySubject('CSE101', VALID_ORG_ID, atDate);

      expect(result).toBe(mappings);
      expect(mockedSubjectSkillMapping.find).toHaveBeenCalled();
    });
  });

  describe('findBySkill', () => {
    it('should return mappings for a skill', async () => {
      const mappings = [{ _id: 'map-1', skillId: 'SKILL-1' }] as ISubjectSkillMapping[];
      mockedSubjectSkillMapping.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mappings),
      } as any);

      const result = await repository.findBySkill('SKILL-1', VALID_ORG_ID);

      expect(result).toBe(mappings);
      expect(mockedSubjectSkillMapping.find).toHaveBeenCalled();
    });
  });

  describe('findValidMappings', () => {
    it('should return all valid mappings for an organization without date', async () => {
      const mappings = [{ _id: 'map-1' }] as ISubjectSkillMapping[];
      mockedSubjectSkillMapping.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mappings),
      } as any);

      const result = await repository.findValidMappings(VALID_ORG_ID);

      expect(result).toBe(mappings);
      expect(mockedSubjectSkillMapping.find).toHaveBeenCalled();
    });

    it('should filter valid mappings by date', async () => {
      const atDate = new Date('2023-08-15');
      const mappings = [{ _id: 'map-1' }] as ISubjectSkillMapping[];
      mockedSubjectSkillMapping.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mappings),
      } as any);

      const result = await repository.findValidMappings(VALID_ORG_ID, atDate);

      expect(result).toBe(mappings);
      expect(mockedSubjectSkillMapping.find).toHaveBeenCalled();
    });
  });

  describe('bulkUpsert', () => {
    it('should upsert multiple mappings', async () => {
      mockedSubjectSkillMapping.findOne.mockResolvedValue(null);
      mockedSubjectSkillMapping.create.mockResolvedValue({ _id: 'map-1' } as ISubjectSkillMapping);

      const mappings = [
        { organizationId: VALID_ORG_ID, subjectCode: 'CSE101', skillId: 'SKILL-1', skillName: 'Python', skillCategory: SkillCategory.TECHNICAL, relevanceWeight: 0.9, isCore: true, effectiveFrom: new Date() },
        { organizationId: VALID_ORG_ID, subjectCode: 'CSE102', skillId: 'SKILL-2', skillName: 'JS', skillCategory: SkillCategory.TECHNICAL, relevanceWeight: 0.8, isCore: false, effectiveFrom: new Date() },
      ];

      await repository.bulkUpsert(mappings, VALID_ORG_ID);

      expect(mockedSubjectSkillMapping.create).toHaveBeenCalledTimes(2);
    });
  });
});
