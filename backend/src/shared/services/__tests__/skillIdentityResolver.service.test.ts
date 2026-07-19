import { SkillIdentityResolver, ResolutionInput, ResolvedSkill } from '../skillIdentityResolver.service';
import { CanonicalSkillRepository } from '../../repositories/canonicalSkill.repository';
import { SkillAliasRepository } from '../../repositories/skillAlias.repository';
import { SkillCategory, SkillStatus } from '../../../shared/enums/skills.enum';
import { AliasType, AliasStatus } from '../../../shared/enums/skillAlias.enum';

jest.mock('../../repositories/canonicalSkill.repository');
jest.mock('../../repositories/skillAlias.repository');

const mockedCanonicalRepo = CanonicalSkillRepository as jest.MockedClass<typeof CanonicalSkillRepository>;
const mockedAliasRepo = SkillAliasRepository as jest.MockedClass<typeof SkillAliasRepository>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';

describe('SkillIdentityResolver', () => {
  let resolver: SkillIdentityResolver;
  let mockCanonicalRepo: jest.Mocked<Partial<CanonicalSkillRepository>>;
  let mockAliasRepo: jest.Mocked<Partial<SkillAliasRepository>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanonicalRepo = {
      create: jest.fn(),
      findByCanonicalId: jest.fn(),
      findByName: jest.fn(),
      upsertByCanonicalId: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockAliasRepo = {
      create: jest.fn(),
      findByAlias: jest.fn(),
      findByCanonicalId: jest.fn(),
      upsert: jest.fn(),
      deprecate: jest.fn(),
      findByOrganization: jest.fn(),
    };

    mockedCanonicalRepo.mockImplementation(() => mockCanonicalRepo as any);
    mockedAliasRepo.mockImplementation(() => mockAliasRepo as any);

    resolver = new SkillIdentityResolver(mockCanonicalRepo as any, mockAliasRepo as any);
  });

  describe('resolve', () => {
    it('should return existing canonical skill when alias exists', async () => {
      const existingAlias = {
        canonicalId: 'python',
        alias: 'LANGUAGE-Python',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.findByAlias!.mockResolvedValue(existingAlias);

      const canonical = {
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(canonical);

      const result = await resolver.resolve({
        rawSkillId: 'LANGUAGE-Python',
        rawSkillName: 'Python',
        source: 'GITHUB',
        organizationId: VALID_ORG_ID,
      });

      expect(result.canonicalId).toBe('python');
      expect(result.canonicalName).toBe('Python');
      expect(result.canonicalCategory).toBe(SkillCategory.LANGUAGE);
      expect(result.isNew).toBe(false);
      expect(result.confidence).toBe(0.9);
      expect(mockCanonicalRepo.upsertByCanonicalId).not.toHaveBeenCalled();
      expect(mockAliasRepo.upsert).not.toHaveBeenCalled();
    });

    it('should create new canonical skill and alias when no match exists', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const newCanonical = {
        canonicalId: 'machine-learning',
        canonicalName: 'Machine Learning',
        canonicalCategory: SkillCategory.TECHNICAL,
        source: 'GITHUB',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.upsertByCanonicalId!.mockResolvedValue(newCanonical);

      const newAlias = {
        canonicalId: 'machine-learning',
        alias: 'RESEARCH-ML Survey',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.85,
        source: 'RESEARCH',
        extractedBy: 'listener',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(newAlias);

      const result = await resolver.resolve({
        rawSkillId: 'RESEARCH-ML Survey',
        rawSkillName: 'Machine Learning',
        source: 'RESEARCH',
        organizationId: VALID_ORG_ID,
        confidence: 0.85,
      });

      expect(result.canonicalId).toBe('machine-learning');
      expect(result.canonicalName).toBe('Machine Learning');
      expect(result.isNew).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(mockCanonicalRepo.upsertByCanonicalId).toHaveBeenCalledWith(
        'machine-learning',
        expect.objectContaining({ canonicalName: 'Machine Learning' })
      );
      expect(mockAliasRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ alias: 'RESEARCH-ML Survey' })
      );
    });

    it('should use provided canonicalId when given', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const newCanonical = {
        canonicalId: 'custom-canonical',
        canonicalName: 'Custom Skill',
        canonicalCategory: SkillCategory.TECHNICAL,
        source: 'MANUAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.upsertByCanonicalId!.mockResolvedValue(newCanonical);

      const newAlias = {
        canonicalId: 'custom-canonical',
        alias: 'CUSTOM-1',
        aliasType: AliasType.SKILL_ID,
        confidence: 1.0,
        source: 'MANUAL',
        extractedBy: 'admin',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(newAlias);

      const result = await resolver.resolve({
        rawSkillId: 'CUSTOM-1',
        rawSkillName: 'Custom Skill',
        source: 'MANUAL',
        canonicalId: 'custom-canonical',
        canonicalCategory: SkillCategory.SOFT,
      });

      expect(result.canonicalId).toBe('custom-canonical');
      expect(mockCanonicalRepo.upsertByCanonicalId).toHaveBeenCalledWith(
        'custom-canonical',
        expect.objectContaining({ canonicalCategory: SkillCategory.SOFT })
      );
    });

    it('should normalize rawSkillName to canonicalId', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const newCanonical = {
        canonicalId: 'data-science-101',
        canonicalName: 'Data Science 101',
        canonicalCategory: SkillCategory.TECHNICAL,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.upsertByCanonicalId!.mockResolvedValue(newCanonical);

      const newAlias = {
        canonicalId: 'data-science-101',
        alias: 'ACADEMIC-DS101',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.8,
        source: 'ACADEMIC',
        extractedBy: 'listener',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(newAlias);

      const result = await resolver.resolve({
        rawSkillId: 'ACADEMIC-DS101',
        rawSkillName: 'Data Science 101',
        source: 'ACADEMIC',
      });

      expect(result.canonicalId).toBe('data-science-101');
      expect(mockCanonicalRepo.upsertByCanonicalId).toHaveBeenCalledWith(
        'data-science-101',
        expect.any(Object)
      );
    });

    it('should handle case-insensitive alias matching', async () => {
      const existingAlias = {
        canonicalId: 'python',
        alias: 'python',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.findByAlias!.mockResolvedValue(existingAlias);

      const canonical = {
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(canonical);

      const result = await resolver.resolve({
        rawSkillId: 'PYTHON',
        rawSkillName: 'Python',
        source: 'GITHUB',
      });

      expect(result.canonicalId).toBe('python');
      expect(result.isNew).toBe(false);
    });
  });

  describe('batchResolve', () => {
    it('should resolve multiple skills in batch', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);
      const pythonCanonical = {
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;

      const javascriptCanonical = {
        canonicalId: 'javascript',
        canonicalName: 'JavaScript',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;

      let callCount = 0;
      mockCanonicalRepo.upsertByCanonicalId!.mockImplementation((canonicalId: string) => {
        callCount++;
        return Promise.resolve(callCount === 1 ? pythonCanonical : javascriptCanonical);
      });

      const newAlias = {
        canonicalId: 'python',
        alias: 'PYTHON',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        source: 'GITHUB',
        extractedBy: 'listener',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(newAlias);

      const inputs: ResolutionInput[] = [
        { rawSkillId: 'PYTHON', rawSkillName: 'Python', source: 'GITHUB' },
        { rawSkillId: 'JAVASCRIPT', rawSkillName: 'JavaScript', source: 'GITHUB' },
      ];

      const results = await resolver.batchResolve(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].canonicalId).toBe('python');
      expect(results[1].canonicalId).toBe('javascript');
    });
  });

  describe('getCanonicalSkill', () => {
    it('should return canonical skill by id', async () => {
      const canonical = { canonicalId: 'python', canonicalName: 'Python' } as any;
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(canonical);

      const result = await resolver.getCanonicalSkill('python');

      expect(result).toBe(canonical);
      expect(mockCanonicalRepo.findByCanonicalId).toHaveBeenCalledWith('python');
    });
  });

  describe('getAliasesForCanonical', () => {
    it('should return all aliases for a canonical skill', async () => {
      const aliases = [
        { alias: 'PYTHON' },
        { alias: 'LANGUAGE-Python' },
      ] as any[];
      mockAliasRepo.findByCanonicalId!.mockResolvedValue(aliases);

      const result = await resolver.getAliasesForCanonical('python');

      expect(result).toBe(aliases);
      expect(mockAliasRepo.findByCanonicalId).toHaveBeenCalledWith('python');
    });
  });

  describe('registerManualAlias', () => {
    it('should register a manual alias for an existing canonical skill', async () => {
      const canonical = { canonicalId: 'python', canonicalName: 'Python' } as any;
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(canonical);

      const alias = {
        canonicalId: 'python',
        alias: 'MANUAL-Python',
        aliasType: AliasType.MANUAL,
        confidence: 1.0,
        source: 'MANUAL',
        extractedBy: 'admin',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(alias);

      const result = await resolver.registerManualAlias(
        'python',
        'MANUAL-Python',
        VALID_ORG_ID,
        'admin',
        'corr-1'
      );

      expect(result).toBe(alias);
      expect(mockAliasRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          canonicalId: 'python',
          alias: 'MANUAL-Python',
          aliasType: AliasType.MANUAL,
          confidence: 1.0,
        })
      );
    });

    it('should throw error when canonical skill does not exist', async () => {
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(null);

      await expect(
        resolver.registerManualAlias('nonexistent', 'MANUAL-X', VALID_ORG_ID, 'admin')
      ).rejects.toThrow('Canonical skill not found: nonexistent');
    });
  });

  describe('concurrent resolution safety', () => {
    it('should recover from duplicate key error by re-reading existing canonical', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const duplicateKeyError = new Error('E11000 duplicate key error') as any;
      duplicateKeyError.code = 11000;

      mockCanonicalRepo.upsertByCanonicalId!.mockRejectedValue(duplicateKeyError);

      const existingCanonical = {
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(existingCanonical);

      const newAlias = {
        canonicalId: 'python',
        alias: 'PYTHON',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        source: 'GITHUB',
        extractedBy: 'listener',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.upsert!.mockResolvedValue(newAlias);

      const result = await resolver.resolve({
        rawSkillId: 'PYTHON',
        rawSkillName: 'Python',
        source: 'GITHUB',
      });

      expect(result.canonicalId).toBe('python');
      expect(result.isNew).toBe(false);
      expect(mockCanonicalRepo.findByCanonicalId).toHaveBeenCalledWith('python');
    });

    it('should recover from duplicate key error on alias creation', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const newCanonical = {
        canonicalId: 'python',
        canonicalName: 'Python',
        canonicalCategory: SkillCategory.LANGUAGE,
        source: 'INTERNAL',
        status: SkillStatus.ACTIVE,
      } as any;
      mockCanonicalRepo.upsertByCanonicalId!.mockResolvedValue(newCanonical);
      mockCanonicalRepo.findByCanonicalId!.mockResolvedValue(newCanonical);

      const duplicateKeyError = new Error('E11000 duplicate key error') as any;
      duplicateKeyError.code = 11000;
      mockAliasRepo.upsert!.mockRejectedValue(duplicateKeyError);

      const existingAlias = {
        canonicalId: 'python',
        alias: 'PYTHON',
        aliasType: AliasType.SKILL_ID,
        confidence: 0.9,
        source: 'GITHUB',
        extractedBy: 'listener',
        status: AliasStatus.ACTIVE,
      } as any;
      mockAliasRepo.findByAlias!.mockResolvedValueOnce(null).mockResolvedValueOnce(existingAlias);

      const result = await resolver.resolve({
        rawSkillId: 'PYTHON',
        rawSkillName: 'Python',
        source: 'GITHUB',
      });

      expect(result.canonicalId).toBe('python');
      expect(result.confidence).toBe(0.9);
    });

    it('should throw for non-duplicate errors', async () => {
      mockAliasRepo.findByAlias!.mockResolvedValue(null);

      const nonDuplicateError = new Error('Network timeout') as any;
      nonDuplicateError.code = 500;
      mockCanonicalRepo.upsertByCanonicalId!.mockRejectedValue(nonDuplicateError);

      await expect(
        resolver.resolve({
          rawSkillId: 'PYTHON',
          rawSkillName: 'Python',
          source: 'GITHUB',
        })
      ).rejects.toThrow('Network timeout');
    });
  });
});
