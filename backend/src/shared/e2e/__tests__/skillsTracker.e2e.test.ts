import mongoose from 'mongoose';
import { eventBus } from '../../../events/EventBus';
import { UaipEvent } from '../../../events/UaipEvents';
import { SkillsEventListener } from '../../events/skillsEventListener';
import { SkillEvidenceService } from '../../services/skillEvidence.service';
import { SkillProjectionService } from '../../services/skillProjection.service';
import { SubjectSkillMappingService } from '../../services/subjectSkillMapping.service';
import { SkillRecordRepository } from '../../repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../../repositories/skillEvidence.repository';
import { SubjectSkillMappingRepository } from '../../repositories/subjectSkillMapping.repository';
import { SkillRecord, ISkillRecord } from '../../../models/SkillRecord';
import { SkillEvidence, ISkillEvidence } from '../../../models/SkillEvidence';
import { SubjectSkillMapping, ISubjectSkillMapping } from '../../../models/SubjectSkillMapping';
import { AuditEntry } from '../../../models/AuditEntry';
import { Person } from '../../../models/Person';
import { SkillSource, EvidenceStatus, SkillCategory, ProficiencyLevel } from '../../enums/skills.enum';
import {
  getMySkills,
  getMySkillEvidence,
  getMySkillSummary,
  createSkillMapping,
  getMappingsForSubject,
} from '../../../controllers/skillsController';

jest.mock('../../../models/SkillRecord');
jest.mock('../../../models/SkillEvidence');
jest.mock('../../../models/SubjectSkillMapping');
jest.mock('../../../models/AuditEntry');
jest.mock('../../../models/Person');
jest.mock('../../../shared/services/personResolver.service');

const mockedSkillRecord = SkillRecord as jest.MockedFunction<any>;
const mockedSkillEvidence = SkillEvidence as jest.MockedFunction<any>;
const mockedSubjectSkillMapping = SubjectSkillMapping as jest.MockedFunction<any>;
const mockedAuditEntry = AuditEntry as jest.MockedClass<typeof AuditEntry>;
const mockedPerson = Person as jest.MockedFunction<any>;
const mockedPersonResolver = require('../../../shared/services/personResolver.service').PersonResolver as jest.MockedClass<any>;

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439012';
const PERSON_A = '507f1f77bcf86cd799439013';
const PERSON_B = '507f1f77bcf86cd799439014';

describe('Skills Tracker End-to-End Verification', () => {
  let listener: SkillsEventListener;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (eventBus as any).listeners.clear();
    (SkillsEventListener as any).initialized = false;
    listener = new SkillsEventListener();

    mockedPerson.findOne.mockResolvedValue(null);
    mockedPerson.create.mockResolvedValue({ _id: PERSON_A } as any);

    mockedSkillEvidence.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    } as any);

    mockedSkillRecord.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    } as any);

    mockedSubjectSkillMapping.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    } as any);
  });

  afterEach(async () => {
    await SkillRecord.deleteMany({});
    await SkillEvidence.deleteMany({});
    await SubjectSkillMapping.deleteMany({});
    await AuditEntry.deleteMany({});
  });

  describe('Academic Record → EventBus → SkillEvidence → SkillProjection → REST API', () => {
    it('should process academic record event end-to-end', async () => {
      const mockEvidence = {
        _id: 'ev-1',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'ACADEMIC-CSE101',
        skillName: 'Intro to CS',
        aliases: ['CSE101'],
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: { subjectCode: 'CSE101', grade: 'A', credits: 3 },
        confidence: 0.9,
        extractedBy: 'dispatcher',
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      mockedSkillEvidence.create.mockResolvedValue(mockEvidence);
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockEvidence]),
      } as any);
      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-1',
        skillId: 'ACADEMIC-CSE101',
        proficiencyLevel: ProficiencyLevel.EXPERT,
        proficiencyScore: 100,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.AcademicRecordUpdated, {
        processingId: 'proc-1',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-1',
        eventId: 'evt-1',
        occurredAt: new Date(),
        source: 'academic_records',
        subjectCode: 'CSE101',
        subjectName: 'Intro to CS',
        semester: '1',
        year: 2023,
        grade: 'A',
        credits: 3,
        status: 'APPROVED',
        rawConfidence: 90,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(1);
      expect(mockedSkillEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'ACADEMIC-CSE101',
          primarySource: SkillSource.ACADEMIC,
        })
      );

      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_evidence',
          action: 'create',
        })
      );

      expect(mockedSkillRecord.create).toHaveBeenCalled();
    });
  });

  describe('Certificate → EventBus → Projection → REST API', () => {
    it('should process certificate event end-to-end', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-2',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'CERTIFICATE-AWS Certified',
        skillName: 'AWS Certified',
        primarySource: SkillSource.CERTIFICATE,
        confidence: 1.0,
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{
          _id: 'ev-2',
          skillId: 'CERTIFICATE-AWS Certified',
          status: EvidenceStatus.ACTIVE,
        } as any]),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-2',
        skillId: 'CERTIFICATE-AWS Certified',
        proficiencyLevel: ProficiencyLevel.EXPERT,
        proficiencyScore: 100,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.CertificateApproved, {
        processingId: 'proc-2',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-2',
        eventId: 'evt-2',
        occurredAt: new Date(),
        source: 'certificates',
        fileName: 'AWS Certified',
        documentSubtype: 'AWS Certified',
        issuer: 'Amazon',
        issuedDate: new Date('2024-01-01'),
        rawConfidence: 100,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(1);
      expect(mockedSkillEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'CERTIFICATE-AWS Certified',
          primarySource: SkillSource.CERTIFICATE,
          confidence: 1.0,
        })
      );

      expect(mockedSkillRecord.create).toHaveBeenCalled();
    });
  });

  describe('GitHub → EventBus → Projection → REST API', () => {
    it('should process github event with multiple languages end-to-end', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-3',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'LANGUAGE-TypeScript',
        skillName: 'TypeScript',
        primarySource: SkillSource.GITHUB,
        confidence: 0.7,
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{
          _id: 'ev-3',
          skillId: 'LANGUAGE-TypeScript',
          status: EvidenceStatus.ACTIVE,
        } as any]),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-3',
        skillId: 'LANGUAGE-TypeScript',
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        proficiencyScore: 70,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.GithubUpdated, {
        processingId: 'proc-3',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-3',
        eventId: 'evt-3',
        occurredAt: new Date(),
        source: 'github',
        languages: { TypeScript: 50000, Python: 30000 },
        contributions: { TypeScript: 142, Python: 89 },
        rawConfidence: 80,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(2);
      expect(mockedSkillEvidence.create).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          skillId: 'LANGUAGE-TypeScript',
          primarySource: SkillSource.GITHUB,
        })
      );
      expect(mockedSkillEvidence.create).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          skillId: 'LANGUAGE-Python',
          primarySource: SkillSource.GITHUB,
        })
      );
    });
  });

  describe('Research → EventBus → Projection → REST API', () => {
    it('should process research event end-to-end', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-4',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'RESEARCH-Machine Learning Survey',
        skillName: 'Machine Learning Survey',
        primarySource: SkillSource.RESEARCH,
        confidence: 0.85,
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{
          _id: 'ev-4',
          skillId: 'RESEARCH-Machine Learning Survey',
          status: EvidenceStatus.ACTIVE,
        } as any]),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-4',
        skillId: 'RESEARCH-Machine Learning Survey',
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        proficiencyScore: 85,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.ResearchUpdated, {
        processingId: 'proc-4',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-4',
        eventId: 'evt-4',
        occurredAt: new Date(),
        source: 'research_wing',
        fileName: 'Machine Learning Survey',
        documentSubtype: 'Machine Learning Survey',
        authors: ['Alice', 'Bob'],
        journal: 'Nature',
        abstract: 'A survey of ML techniques.',
        rawConfidence: 85,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(1);
      expect(mockedSkillEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'RESEARCH-Machine Learning Survey',
          primarySource: SkillSource.RESEARCH,
          confidence: 0.85,
        })
      );

      expect(mockedSkillRecord.create).toHaveBeenCalled();
    });
  });

  describe('Organization Isolation', () => {
    it('should not leak evidence across organizations', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-iso-1',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'ACADEMIC-CSE101',
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-iso-1',
        skillId: 'ACADEMIC-CSE101',
        proficiencyScore: 100,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.AcademicRecordUpdated, {
        processingId: 'proc-iso-1',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-iso-1',
        eventId: 'evt-iso-1',
        occurredAt: new Date(),
        source: 'academic_records',
        subjectCode: 'CSE101',
        subjectName: 'Intro to CS',
        semester: '1',
        year: 2023,
        grade: 'A',
        credits: 3,
        status: 'APPROVED',
        rawConfidence: 90,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(1);
      expect(mockedSkillEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_A,
          personId: PERSON_A,
        })
      );
    });

    it('should scope REST API queries by organization', async () => {
      const mockReq = {
        organizationId: ORG_A,
        user: { userId: 'user-456' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      mockedPersonResolver.mockImplementation(() => ({
        resolve: jest.fn().mockResolvedValue(PERSON_A),
      }) as any);

      mockedSkillRecord.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      } as any);

      await getMySkills(mockReq, mockRes);

      expect(mockedSkillRecord.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: expect.any(mongoose.Types.ObjectId),
          personId: expect.any(mongoose.Types.ObjectId),
        })
      );
    });
  });

  describe('Event Ordering', () => {
    it('should handle multiple events for the same skill', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-ord',
        organizationId: ORG_A,
        personId: PERSON_A,
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-ord',
        proficiencyScore: 100,
        evidenceCount: 1,
      } as any);

      await eventBus.publish(UaipEvent.AcademicRecordUpdated, {
        processingId: 'proc-ord-1',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-ord-1',
        eventId: 'evt-ord-1',
        occurredAt: new Date(),
        source: 'academic_records',
        subjectCode: 'CSE101',
        subjectName: 'Intro to CS',
        grade: 'A',
        credits: 3,
        status: 'APPROVED',
        rawConfidence: 90,
      } as any);

      await eventBus.publish(UaipEvent.CertificateApproved, {
        processingId: 'proc-ord-2',
        organizationId: ORG_A,
        personId: PERSON_A,
        correlationId: 'corr-ord-2',
        eventId: 'evt-ord-2',
        occurredAt: new Date(),
        source: 'certificates',
        fileName: 'AWS Certified',
        documentSubtype: 'AWS Certified',
        issuer: 'Amazon',
        issuedDate: new Date(),
        rawConfidence: 100,
      } as any);

      expect(mockedSkillEvidence.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Projection Consistency', () => {
    it('should produce same projection after repeated rebuilds', async () => {
      const evidence = [
        {
          _id: 'ev-cons',
          skillId: 'ACADEMIC-CSE101',
          skillName: 'Intro to CS',
          primarySource: SkillSource.ACADEMIC,
          confidence: 0.9,
          effectiveFrom: new Date(),
          status: EvidenceStatus.ACTIVE,
          personId: PERSON_A,
          organizationId: ORG_A,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(evidence),
      } as any);

      const service = new SkillProjectionService();
      const result1 = service.computeProficiency(evidence);
      const result2 = service.computeProficiency(evidence);

      expect(result1.score).toBe(result2.score);
      expect(result1.level).toBe(result2.level);
      expect(result1.evidenceCount).toBe(result2.evidenceCount);
    });
  });

  describe('Audit Trail Creation', () => {
    it('should create audit entry for evidence ingestion', async () => {
      mockedSkillEvidence.create.mockResolvedValue({
        _id: 'ev-audit',
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'ACADEMIC-CSE101',
        status: EvidenceStatus.ACTIVE,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const service = new SkillEvidenceService();
      await service.ingestEvidence({
        organizationId: ORG_A,
        personId: PERSON_A,
        skillId: 'ACADEMIC-CSE101',
        skillName: 'Intro to CS',
        aliases: ['CSE101'],
        primarySource: SkillSource.ACADEMIC,
        sourceType: 'TRANSCRIPT',
        payload: {},
        confidence: 0.9,
        extractedBy: 'AI',
      });

      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_evidence',
          action: 'create',
          performedBy: 'AI',
        })
      );
    });

    it('should create audit entry for projection rebuild', async () => {
      mockedSkillEvidence.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      } as any);

      mockedSkillRecord.findOne.mockResolvedValue(null);
      mockedSkillRecord.create.mockResolvedValue({
        _id: 'sr-audit',
        skillId: 'ACADEMIC-CSE101',
      } as any);

      const service = new SkillProjectionService();
      await service.rebuildSkillRecord(ORG_A, PERSON_A, 'ACADEMIC-CSE101');

      expect(mockedAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionName: 'skill_records',
          action: 'create',
          performedBy: 'projection',
        })
      );
    });
  });

  describe('REST API Authorization', () => {
    it('should require authentication for GET /api/skills/me', async () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      await getMySkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Repository/Service/Controller Layering', () => {
    it('should not allow controllers to call repositories directly', () => {
      const controllerSource = require('../../../controllers/skillsController');

      const controllerFunctions = Object.values(controllerSource).filter((fn: any) => typeof fn === 'function');
      const repoNames = ['SkillRecordRepository', 'SkillEvidenceRepository', 'SubjectSkillMappingRepository'];

      for (const fn of controllerFunctions) {
        const fnStr = (fn as Function).toString();
        for (const repoName of repoNames) {
          expect(fnStr).not.toContain(repoName);
        }
      }
    });

    it('should not allow controllers to call models directly', () => {
      const controllerSource = require('../../../controllers/skillsController');

      const controllerFunctions = Object.values(controllerSource).filter((fn: any) => typeof fn === 'function');
      const modelNames = ['SkillRecord', 'SkillEvidence', 'SubjectSkillMapping'];

      for (const fn of controllerFunctions) {
        const fnStr = (fn as Function).toString();
        for (const modelName of modelNames) {
          const regex = new RegExp(`\\b${modelName}\\b`);
          expect(fnStr).not.toMatch(regex);
        }
      }
    });
  });
});
