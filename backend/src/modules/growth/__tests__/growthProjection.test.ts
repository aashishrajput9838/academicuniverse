import { GrowthProjectionService } from '../growthProjection.service';
import { Person } from '../../../models/Person';
import { SkillRecord } from '../../../models/SkillRecord';
import { SkillCategory } from '../../../shared/enums/skills.enum';
import Mark from '../../../models/Mark';
import { EzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import User from '../../../models/User';
import { AcademicRecord } from '../../../models/AcademicRecord';
import { CertificateRecord } from '../../../models/CertificateRecord';
import { ExperienceRecord } from '../../../models/ExperienceRecord';

jest.mock('../../../models/Person');
jest.mock('../../../models/SkillRecord');
jest.mock('../../../models/Mark');
jest.mock('../../../models/EzoneAcademicProfile');
jest.mock('../../../models/User');
jest.mock('../../../models/AcademicRecord');
jest.mock('../../../models/CertificateRecord');
jest.mock('../../../models/ExperienceRecord');
jest.mock('../../../services/githubService', () => ({
  getProjectStats: jest.fn().mockResolvedValue({ total: 10, completed: 5 }),
}));

const mockedPerson = Person as jest.MockedFunction<any>;
const mockedSkillRecord = SkillRecord as jest.MockedFunction<any>;
const mockedMark = Mark as jest.MockedFunction<any>;
const mockedEzoneAcademicProfile = EzoneAcademicProfile as jest.MockedFunction<any>;
const mockedUser = User as jest.MockedFunction<any>;
const mockedAcademicRecord = AcademicRecord as jest.MockedFunction<any>;
const mockedCertificateRecord = CertificateRecord as jest.MockedFunction<any>;
const mockedExperienceRecord = ExperienceRecord as jest.MockedFunction<any>;

const ORG_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const PERSON_ID = '507f1f77bcf86cd799439013';

const mockQueryChain = (result: any) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
  lean: jest.fn().mockResolvedValue(result),
  sort: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

describe('GrowthProjectionService - Skills Metrics', () => {
  let service: GrowthProjectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GrowthProjectionService();
  });

  describe('getSkillsMetrics', () => {
    it('should return EMPTY when person does not exist', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain(null));

      const result = await (service as any).getSkillsMetrics(USER_ID, ORG_ID);

      expect(result.skills.state).toBe('EMPTY');
      expect(result.skills.value.totalSkills).toBe(0);
      expect(result.skills.value.averageProficiency).toBe(0);
      expect(result.skills.value.topSkills).toEqual([]);
      expect(result.skills.value.weakestSkills).toEqual([]);
      expect(result.skills.reasonCode).toBe('NO_DATA');
    });

    it('should return EMPTY when no skill records exist', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain({ _id: PERSON_ID }));
      mockedSkillRecord.find.mockReturnValue(mockQueryChain([]));

      const result = await (service as any).getSkillsMetrics(USER_ID, ORG_ID);

      expect(result.skills.state).toBe('EMPTY');
      expect(result.skills.value.totalSkills).toBe(0);
      expect(result.skills.value.technicalSkills).toBe(0);
      expect(result.skills.value.softSkills).toBe(0);
      expect(result.skills.value.languageSkills).toBe(0);
      expect(result.skills.value.toolSkills).toBe(0);
    });

    it('should return AVAILABLE with correct metrics when skill records exist', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain({ _id: PERSON_ID }));
      mockedSkillRecord.find.mockReturnValue(mockQueryChain([
        {
          _id: 'sr-1',
          skillId: 'ESCO-1234',
          skillName: 'Python',
          skillCategory: SkillCategory.TECHNICAL,
          proficiencyScore: 90,
          evidenceCount: 4,
          status: 'ACTIVE',
          updatedAt: new Date('2024-05-20'),
          createdAt: new Date('2024-01-10'),
        } as any,
        {
          _id: 'sr-2',
          skillId: 'ESCO-5678',
          skillName: 'Communication',
          skillCategory: SkillCategory.SOFT,
          proficiencyScore: 75,
          evidenceCount: 2,
          status: 'ACTIVE',
          updatedAt: new Date('2024-05-15'),
          createdAt: new Date('2024-02-01'),
        } as any,
        {
          _id: 'sr-3',
          skillId: 'LANG-1',
          skillName: 'TypeScript',
          skillCategory: SkillCategory.LANGUAGE,
          proficiencyScore: 85,
          evidenceCount: 3,
          status: 'ACTIVE',
          updatedAt: new Date('2024-05-18'),
          createdAt: new Date('2024-03-01'),
        } as any,
        {
          _id: 'sr-4',
          skillId: 'TOOL-1',
          skillName: 'Docker',
          skillCategory: SkillCategory.TOOL,
          proficiencyScore: 60,
          evidenceCount: 1,
          status: 'ACTIVE',
          updatedAt: new Date('2024-04-01'),
          createdAt: new Date('2024-01-15'),
        } as any,
      ]));

      const result = await (service as any).getSkillsMetrics(USER_ID, ORG_ID);

      expect(result.skills.state).toBe('AVAILABLE');
      expect(result.skills.value.totalSkills).toBe(4);
      expect(result.skills.value.averageProficiency).toBeCloseTo(77.5, 1);
      expect(result.skills.value.technicalSkills).toBe(1);
      expect(result.skills.value.softSkills).toBe(1);
      expect(result.skills.value.languageSkills).toBe(1);
      expect(result.skills.value.toolSkills).toBe(1);
      expect(result.skills.value.topSkills).toHaveLength(4);
      expect(result.skills.value.topSkills[0].skillId).toBe('ESCO-1234');
      expect(result.skills.value.topSkills[0].proficiencyScore).toBe(90);
      expect(result.skills.value.weakestSkills).toHaveLength(4);
      expect(result.skills.value.weakestSkills[0].skillId).toBe('TOOL-1');
      expect(result.skills.value.weakestSkills[0].proficiencyScore).toBe(60);
      expect(result.skills.value.lastProjectionAt).toBe('2024-05-20T00:00:00.000Z');
    });

    it('should categorize DOMAIN_SPECIFIC skills correctly', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain({ _id: PERSON_ID }));
      mockedSkillRecord.find.mockReturnValue(mockQueryChain([
        {
          _id: 'sr-1',
          skillId: 'DOMAIN-1',
          skillName: 'Machine Learning',
          skillCategory: 'DOMAIN_SPECIFIC',
          proficiencyScore: 88,
          evidenceCount: 5,
          status: 'ACTIVE',
          updatedAt: new Date('2024-05-20'),
          createdAt: new Date('2024-01-10'),
        } as any,
      ]));

      const result = await (service as any).getSkillsMetrics(USER_ID, ORG_ID);

      expect(result.skills.state).toBe('AVAILABLE');
      expect(result.skills.value.totalSkills).toBe(1);
      expect(result.skills.value.averageProficiency).toBe(88);
      expect(result.skills.value.technicalSkills).toBe(0);
      expect(result.skills.value.softSkills).toBe(0);
      expect(result.skills.value.languageSkills).toBe(0);
      expect(result.skills.value.toolSkills).toBe(0);
    });
  });

  describe('buildProjection', () => {
    it('should include skills metrics in the projection', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain({ _id: PERSON_ID }));
      mockedMark.find.mockReturnValue(mockQueryChain([]));
      mockedEzoneAcademicProfile.findOne.mockReturnValue(mockQueryChain(null));
      mockedUser.findOne.mockReturnValue(mockQueryChain({ githubUsername: 'testuser' }));
      mockedSkillRecord.find.mockReturnValue(mockQueryChain([
        {
          _id: 'sr-1',
          skillId: 'ESCO-1234',
          skillName: 'Python',
          skillCategory: SkillCategory.TECHNICAL,
          proficiencyScore: 90,
          evidenceCount: 4,
          status: 'ACTIVE',
          updatedAt: new Date('2024-05-20'),
          createdAt: new Date('2024-01-10'),
        } as any,
      ]));
      mockedAcademicRecord.find.mockReturnValue(mockQueryChain([]));
      mockedCertificateRecord.find.mockReturnValue(mockQueryChain([]));
      mockedExperienceRecord.find.mockReturnValue(mockQueryChain([]));

      const projection = await service.buildProjection(USER_ID, ORG_ID);

      expect(projection.projectionVersion).toBe(2);
      expect(projection.metrics.skills).toBeDefined();
      expect(projection.metrics.skills.state).toBe('AVAILABLE');
      expect(projection.metrics.skills.value.totalSkills).toBe(1);
      expect(projection.metrics.skills.value.averageProficiency).toBe(90);
      expect(projection.sources.skillsTracker).toBeDefined();
      expect(projection.sources.skillsTracker.state).toBe('AVAILABLE');
      expect(projection.sourceVersions.skillsTracker).toBe('2024-05-20T00:00:00.000Z');
    });

    it('should include EMPTY skills metrics when no skills exist', async () => {
      mockedPerson.findOne.mockReturnValue(mockQueryChain({ _id: PERSON_ID }));
      mockedMark.find.mockReturnValue(mockQueryChain([]));
      mockedEzoneAcademicProfile.findOne.mockReturnValue(mockQueryChain(null));
      mockedUser.findOne.mockReturnValue(mockQueryChain({ githubUsername: 'testuser' }));
      mockedSkillRecord.find.mockReturnValue(mockQueryChain([]));
      mockedAcademicRecord.find.mockReturnValue(mockQueryChain([]));
      mockedCertificateRecord.find.mockReturnValue(mockQueryChain([]));
      mockedExperienceRecord.find.mockReturnValue(mockQueryChain([]));

      const projection = await service.buildProjection(USER_ID, ORG_ID);

      expect(projection.metrics.skills.state).toBe('EMPTY');
      expect(projection.metrics.skills.value.totalSkills).toBe(0);
      expect(projection.sources.skillsTracker.state).toBe('EMPTY');
    });
  });
});
