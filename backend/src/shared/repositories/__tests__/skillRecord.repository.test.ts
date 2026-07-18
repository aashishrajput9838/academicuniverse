import mongoose from 'mongoose';
import { SkillRecordRepository } from '../skillRecord.repository';
import { SkillRecord, ISkillRecord } from '../../../models/SkillRecord';
import { toObjectId } from '../../../utils/mongooseHelpers';
import { SkillCategory } from '../../../shared/enums/skills.enum';

jest.mock('../../../models/SkillRecord');

const mockedSkillRecord = SkillRecord as jest.MockedFunction<any>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillRecordRepository', () => {
  let repository: SkillRecordRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SkillRecordRepository();
  });

  describe('upsert', () => {
    it('should create a new skill record when none exists', async () => {
      const mockDoc = { _id: 'skill-1', skillId: 'SKILL-1', personId: VALID_PERSON_ID } as any as ISkillRecord;
      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue(mockDoc);

      const result = await repository.upsert(
        { organizationId: VALID_ORG_ID, personId: VALID_PERSON_ID, skillId: 'SKILL-1', skillName: 'Python' },
        VALID_ORG_ID
      );

      expect(result.doc).toBe(mockDoc);
      expect(result.action).toBe('create');
      expect(mockedSkillRecord.findOne).toHaveBeenCalled();
      expect(mockedSkillRecord.create).toHaveBeenCalled();
    });

    it('should update existing skill record when one exists', async () => {
      const existingDoc = { _id: 'skill-1', skillId: 'SKILL-1', personId: VALID_PERSON_ID } as any as ISkillRecord;
      const updatedDoc = { _id: 'skill-1', skillId: 'SKILL-1', personId: VALID_PERSON_ID, proficiencyScore: 95 } as any as ISkillRecord;

      mockedSkillRecord.findOne.mockResolvedValue(existingDoc);
      mockedSkillRecord.updateOne.mockResolvedValue({});
      mockedSkillRecord.findById.mockResolvedValue(updatedDoc);

      const result = await repository.upsert(
        { organizationId: VALID_ORG_ID, personId: VALID_PERSON_ID, skillId: 'SKILL-1', proficiencyScore: 95 },
        VALID_ORG_ID
      );

      expect(result.doc).toBe(updatedDoc);
      expect(result.action).toBe('update');
      expect(mockedSkillRecord.updateOne).toHaveBeenCalled();
      expect(mockedSkillRecord.findById).toHaveBeenCalled();
    });
  });

  describe('findByPerson', () => {
    it('should return skills for a person without organization filter', async () => {
      const skills = [{ _id: '1', skillId: 'SKILL-1' }] as ISkillRecord[];
      mockedSkillRecord.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(skills),
      } as any);

      const result = await repository.findByPerson(VALID_PERSON_ID);

      expect(result).toBe(skills);
      expect(mockedSkillRecord.find).toHaveBeenCalled();
    });

    it('should return skills for a person with organization filter', async () => {
      const skills = [{ _id: '1', skillId: 'SKILL-1' }] as ISkillRecord[];
      mockedSkillRecord.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(skills),
      } as any);

      const result = await repository.findByPerson(VALID_PERSON_ID, VALID_ORG_ID);

      expect(result).toBe(skills);
      expect(mockedSkillRecord.find).toHaveBeenCalled();
    });
  });

  describe('findByPersonAndCategory', () => {
    it('should filter by category', async () => {
      const skills = [{ _id: '1', skillId: 'SKILL-1', skillCategory: SkillCategory.TECHNICAL }] as ISkillRecord[];
      mockedSkillRecord.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(skills),
      } as any);

      const result = await repository.findByPersonAndCategory(VALID_PERSON_ID, SkillCategory.TECHNICAL, VALID_ORG_ID);

      expect(result).toBe(skills);
      expect(mockedSkillRecord.find).toHaveBeenCalled();
    });
  });

  describe('findBySkill', () => {
    it('should find a specific skill for a person', async () => {
      const skill = { _id: '1', skillId: 'SKILL-1' } as ISkillRecord;
      mockedSkillRecord.findOne.mockResolvedValue(skill);

      const result = await repository.findBySkill(VALID_PERSON_ID, 'SKILL-1', VALID_ORG_ID);

      expect(result).toBe(skill);
      expect(mockedSkillRecord.findOne).toHaveBeenCalled();
    });
  });

  describe('archiveSkill', () => {
    it('should archive all records for a skill in an organization', async () => {
      mockedSkillRecord.updateMany.mockResolvedValue({});

      await repository.archiveSkill('SKILL-1', VALID_ORG_ID);

      expect(mockedSkillRecord.updateMany).toHaveBeenCalledWith(
        { organizationId: expect.any(mongoose.Types.ObjectId), skillId: 'SKILL-1' },
        { status: 'ARCHIVED' }
      );
    });
  });

  describe('mergeSkills', () => {
    it('should merge source skill into target skill when target exists', async () => {
      const sourceRecord = { _id: 'src-1', organizationId: toObjectId(VALID_ORG_ID), personId: toObjectId(VALID_PERSON_ID), skillId: 'SRC', evidenceCount: 3 } as any;
      const targetRecord = { _id: 'tgt-1' } as ISkillRecord;

      mockedSkillRecord.find.mockResolvedValue([sourceRecord]);
      mockedSkillRecord.findOne.mockResolvedValue(targetRecord);
      mockedSkillRecord.updateOne.mockResolvedValue({});

      await repository.mergeSkills('SRC', 'TGT', VALID_ORG_ID);

      expect(mockedSkillRecord.updateOne).toHaveBeenCalledTimes(2);
      expect(mockedSkillRecord.updateOne).toHaveBeenNthCalledWith(1,
        { _id: 'tgt-1' },
        { $inc: { evidenceCount: 3 }, $set: { lastVerifiedAt: expect.any(Date), status: 'ACTIVE' } }
      );
      expect(mockedSkillRecord.updateOne).toHaveBeenNthCalledWith(2,
        { _id: 'src-1' },
        { status: 'SUPERSEDED', supersededBy: 'tgt-1' }
      );
    });

    it('should rename skill when target does not exist', async () => {
      const sourceRecord = { _id: 'src-1', organizationId: toObjectId(VALID_ORG_ID), personId: toObjectId(VALID_PERSON_ID), skillId: 'SRC' } as any;

      mockedSkillRecord.find.mockResolvedValue([sourceRecord]);
      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.updateOne.mockResolvedValue({});

      await repository.mergeSkills('SRC', 'TGT', VALID_ORG_ID);

      expect(mockedSkillRecord.updateOne).toHaveBeenCalledWith(
        { _id: 'src-1' },
        { skillId: 'TGT', status: 'ACTIVE' }
      );
    });
  });
});
