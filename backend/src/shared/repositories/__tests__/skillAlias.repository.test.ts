import mongoose from 'mongoose';
import { SkillAliasRepository } from '../skillAlias.repository';
import { SkillAlias, ISkillAlias } from '../../../models/SkillAlias';
import { AliasType, AliasStatus } from '../../../shared/enums/skillAlias.enum';

jest.mock('../../../models/SkillAlias');

const mockedSkillAlias = SkillAlias as jest.MockedFunction<any>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const OTHER_ORG_ID = '507f1f77bcf86cd799439012';

describe('SkillAliasRepository', () => {
  let repository: SkillAliasRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SkillAliasRepository();
  });

  describe('create', () => {
    it('should create a new skill alias', async () => {
      const mockDoc = { _id: 'alias-1', alias: 'ACADEMIC-CSE101', canonicalId: 'computer-science' } as any as ISkillAlias;
      mockedSkillAlias.create.mockResolvedValue(mockDoc);

      const result = await repository.create({
        canonicalId: 'computer-science',
        alias: 'ACADEMIC-CSE101',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        source: 'ACADEMIC',
        extractedBy: 'listener',
      });

      expect(result).toBe(mockDoc);
      expect(mockedSkillAlias.create).toHaveBeenCalled();
    });
  });

  describe('findByAlias', () => {
    it('should find an alias by exact match', async () => {
      const mockDoc = { alias: 'ACADEMIC-CSE101', canonicalId: 'computer-science' } as any as ISkillAlias;
      mockedSkillAlias.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByAlias('ACADEMIC-CSE101', AliasType.SKILL_ID, VALID_ORG_ID);

      expect(result).toBe(mockDoc);
      expect(mockedSkillAlias.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ alias: { $regex: expect.any(String), $options: 'i' }, status: 'ACTIVE' })
      );
    });

    it('should return null when alias not found', async () => {
      mockedSkillAlias.findOne.mockResolvedValue(null);

      const result = await repository.findByAlias('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCanonicalId', () => {
    it('should find all active aliases for a canonical skill', async () => {
      const aliases = [
        { alias: 'ACADEMIC-CSE101' },
        { alias: 'CSE101' },
      ] as any as ISkillAlias[];
      mockedSkillAlias.find.mockResolvedValue(aliases);

      const result = await repository.findByCanonicalId('computer-science');

      expect(result).toBe(aliases);
      expect(mockedSkillAlias.find).toHaveBeenCalledWith({ canonicalId: 'computer-science', status: 'ACTIVE' });
    });
  });

  describe('upsert', () => {
    it('should update existing alias when it exists', async () => {
      const existingDoc = { _id: 'alias-1', alias: 'ACADEMIC-CSE101' } as any as ISkillAlias;
      mockedSkillAlias.findOne.mockResolvedValue(existingDoc);
      mockedSkillAlias.updateOne.mockResolvedValue({});
      mockedSkillAlias.findById.mockResolvedValue(existingDoc);

      const result = await repository.upsert({
        canonicalId: 'computer-science',
        alias: 'ACADEMIC-CSE101',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.95,
        source: 'ACADEMIC',
        extractedBy: 'listener',
      });

      expect(result).toBe(existingDoc);
      expect(mockedSkillAlias.updateOne).toHaveBeenCalled();
    });

    it('should create new alias when it does not exist', async () => {
      mockedSkillAlias.findOne.mockResolvedValue(null);
      const mockDoc = { _id: 'alias-2', alias: 'PYTHON' } as any as ISkillAlias;
      mockedSkillAlias.create.mockResolvedValue(mockDoc);

      const result = await repository.upsert({
        canonicalId: 'python',
        alias: 'PYTHON',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        source: 'GITHUB',
        extractedBy: 'listener',
      });

      expect(result).toBe(mockDoc);
      expect(mockedSkillAlias.create).toHaveBeenCalled();
    });
  });

  describe('deprecate', () => {
    it('should deprecate aliases by alias string', async () => {
      mockedSkillAlias.updateMany.mockResolvedValue({});

      await repository.deprecate('ACADEMIC-CSE101', VALID_ORG_ID);

      expect(mockedSkillAlias.updateMany).toHaveBeenCalledWith(
        { alias: 'ACADEMIC-CSE101', organizationId: expect.any(mongoose.Types.ObjectId) },
        { status: AliasStatus.DEPRECATED }
      );
    });
  });

  describe('findByOrganization', () => {
    it('should find all active aliases for an organization', async () => {
      const aliases = [
        { alias: 'ACADEMIC-CSE101' },
      ] as any as ISkillAlias[];
      mockedSkillAlias.find.mockResolvedValue(aliases);

      const result = await repository.findByOrganization(VALID_ORG_ID);

      expect(result).toBe(aliases);
      expect(mockedSkillAlias.find).toHaveBeenCalledWith(
        { organizationId: expect.any(mongoose.Types.ObjectId), status: 'ACTIVE' }
      );
    });
  });
});
