import mongoose from 'mongoose';
import { SkillEvidenceRepository } from '../skillEvidence.repository';
import { SkillEvidence, ISkillEvidence } from '../../../models/SkillEvidence';
import { SkillSource } from '../../../shared/enums/skills.enum';

jest.mock('../../../models/SkillEvidence');

const mockedSkillEvidence = SkillEvidence as jest.MockedFunction<any>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('SkillEvidenceRepository', () => {
  let repository: SkillEvidenceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SkillEvidenceRepository();
  });

  describe('create', () => {
    it('should create a new evidence document', async () => {
      const mockDoc = { _id: 'ev-1', skillId: 'SKILL-1' } as ISkillEvidence;
      mockedSkillEvidence.create.mockResolvedValue(mockDoc);

      const result = await repository.create(
        { organizationId: VALID_ORG_ID, personId: VALID_PERSON_ID, skillId: 'SKILL-1', skillName: 'Python', primarySource: SkillSource.ACADEMIC, sourceType: 'TRANSCRIPT', payload: {}, confidence: 0.9, extractedBy: 'AI', effectiveFrom: new Date() },
        VALID_ORG_ID
      );

      expect(result).toBe(mockDoc);
      expect(mockedSkillEvidence.create).toHaveBeenCalled();
    });
  });

  describe('findActiveByPersonAndSkill', () => {
    it('should return active evidence for a person and skill', async () => {
      const evidence = [{ _id: 'ev-1', status: 'ACTIVE' }] as ISkillEvidence[];
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(evidence),
      } as any);

      const result = await repository.findActiveByPersonAndSkill(VALID_PERSON_ID, 'SKILL-1', VALID_ORG_ID);

      expect(result).toBe(evidence);
      expect(mockedSkillEvidence.find).toHaveBeenCalled();
    });
  });

  describe('findByPerson', () => {
    it('should return all evidence for a person', async () => {
      const evidence = [{ _id: 'ev-1' }, { _id: 'ev-2' }] as ISkillEvidence[];
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(evidence),
      } as any);

      const result = await repository.findByPerson(VALID_PERSON_ID, VALID_ORG_ID);

      expect(result).toBe(evidence);
      expect(mockedSkillEvidence.find).toHaveBeenCalled();
    });
  });

  describe('findByDocument', () => {
    it('should return evidence linked to a source document', async () => {
      const evidence = [{ _id: '507f1f77bcf86cd799439020', sourceDocumentId: '507f1f77bcf86cd799439021' }] as any as ISkillEvidence[];
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(evidence),
      } as any);

      const result = await repository.findByDocument('507f1f77bcf86cd799439021', VALID_ORG_ID);

      expect(result).toBe(evidence);
      expect(mockedSkillEvidence.find).toHaveBeenCalled();
    });
  });

  describe('supersede', () => {
    it('should mark evidence as superseded', async () => {
      mockedSkillEvidence.updateOne.mockResolvedValue({});

      await repository.supersede('507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021', VALID_ORG_ID);

      expect(mockedSkillEvidence.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(mongoose.Types.ObjectId), organizationId: expect.any(mongoose.Types.ObjectId) },
        { status: 'SUPERSEDED', supersededBy: expect.any(mongoose.Types.ObjectId) }
      );
    });
  });

  describe('revoke', () => {
    it('should mark evidence as revoked', async () => {
      mockedSkillEvidence.updateOne.mockResolvedValue({});

      await repository.revoke('507f1f77bcf86cd799439020', VALID_ORG_ID);

      expect(mockedSkillEvidence.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(mongoose.Types.ObjectId), organizationId: expect.any(mongoose.Types.ObjectId) },
        { status: 'REVOKED' }
      );
    });
  });
});
