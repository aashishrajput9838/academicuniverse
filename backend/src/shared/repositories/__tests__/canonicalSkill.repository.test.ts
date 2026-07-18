import mongoose from 'mongoose';
import { CanonicalSkillRepository } from '../canonicalSkill.repository';
import { CanonicalSkill, ICanonicalSkill } from '../../../models/CanonicalSkill';
import { SkillCategory, SkillStatus } from '../../../shared/enums/skills.enum';

jest.mock('../../../models/CanonicalSkill');

const mockedCanonicalSkill = CanonicalSkill as jest.MockedFunction<any>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';

describe('CanonicalSkillRepository', () => {
  let repository: CanonicalSkillRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CanonicalSkillRepository();
  });

  describe('create', () => {
    it('should create a new canonical skill', async () => {
      const mockDoc = { _id: 'cs-1', canonicalId: 'python', canonicalName: 'Python' } as any as ICanonicalSkill;
      mockedCanonicalSkill.create.mockResolvedValue(mockDoc);

      const result = await repository.create({
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.TECHNICAL,
        source: 'INTERNAL',
      });

      expect(result).toBe(mockDoc);
      expect(mockedCanonicalSkill.create).toHaveBeenCalled();
    });
  });

  describe('findByCanonicalId', () => {
    it('should find a canonical skill by id', async () => {
      const mockDoc = { canonicalId: 'python', canonicalName: 'Python' } as any as ICanonicalSkill;
      mockedCanonicalSkill.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByCanonicalId('python');

      expect(result).toBe(mockDoc);
      expect(mockedCanonicalSkill.findOne).toHaveBeenCalledWith({ canonicalId: 'python' });
    });

    it('should return null when not found', async () => {
      mockedCanonicalSkill.findOne.mockResolvedValue(null);

      const result = await repository.findByCanonicalId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find a canonical skill by name (case-insensitive)', async () => {
      const mockDoc = { canonicalId: 'python', canonicalName: 'Python' } as any as ICanonicalSkill;
      mockedCanonicalSkill.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByName('Python');

      expect(result).toBe(mockDoc);
      expect(mockedCanonicalSkill.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ canonicalName: { $regex: expect.any(String), $options: 'i' } })
      );
    });
  });

  describe('upsertByCanonicalId', () => {
    it('should create a new canonical skill when it does not exist', async () => {
      mockedCanonicalSkill.findOne.mockResolvedValueOnce(null);
      const mockDoc = { _id: 'cs-1', canonicalId: 'python' } as any as ICanonicalSkill;
      mockedCanonicalSkill.create.mockResolvedValue(mockDoc);
      mockedCanonicalSkill.findOne.mockResolvedValueOnce(mockDoc);

      const result = await repository.upsertByCanonicalId('python', {
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.TECHNICAL,
        source: 'INTERNAL',
      });

      expect(result).toBe(mockDoc);
      expect(mockedCanonicalSkill.create).toHaveBeenCalled();
    });

    it('should update existing canonical skill when it exists', async () => {
      const existingDoc = { _id: 'cs-1', canonicalId: 'python', canonicalName: 'Python' } as any as ICanonicalSkill;
      mockedCanonicalSkill.findOne.mockResolvedValueOnce(existingDoc).mockResolvedValueOnce(existingDoc);
      mockedCanonicalSkill.updateOne.mockResolvedValue({});

      const result = await repository.upsertByCanonicalId('python', {
        canonicalName: 'Python Advanced',
      });

      expect(result).toBe(existingDoc);
      expect(mockedCanonicalSkill.updateOne).toHaveBeenCalledWith(
        { canonicalId: 'python' },
        { $set: { canonicalName: 'Python Advanced' } }
      );
    });
  });

  describe('findAll', () => {
    it('should return all canonical skills', async () => {
      const skills = [
        { canonicalId: 'python' },
        { canonicalId: 'javascript' },
      ] as any as ICanonicalSkill[];
      mockedCanonicalSkill.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(skills),
      } as any);

      const result = await repository.findAll();

      expect(result).toBe(skills);
      expect(mockedCanonicalSkill.find).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a canonical skill', async () => {
      mockedCanonicalSkill.updateOne.mockResolvedValue({});

      await repository.updateStatus('python', SkillStatus.ARCHIVED);

      expect(mockedCanonicalSkill.updateOne).toHaveBeenCalledWith(
        { canonicalId: 'python' },
        { status: SkillStatus.ARCHIVED }
      );
    });
  });
});
