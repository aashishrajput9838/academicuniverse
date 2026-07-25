import { KnowledgeDispatcher } from '../shared/services/knowledgeDispatcher.service';
import { UaipEvent } from '../events/UaipEvents';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { eventBus } from '../events/EventBus';
import { AuditEntry } from '../models/AuditEntry';
import { DicIntegrationService } from '../services/resume/dicIntegration.service';
import { CanonicalWriteService } from '../services/resume/canonicalWrite.service';
import { Person } from '../models/Person';
import { AcademicRecord } from '../models/AcademicRecord';
import { ExperienceRecord } from '../models/ExperienceRecord';
import { SkillEvidence } from '../models/SkillEvidence';
import { CertificateRecord } from '../models/CertificateRecord';
import { CareerRecord } from '../models/CareerRecord';
import { ResumePersonSuggestion } from '../models/ResumePersonSuggestion';

jest.mock('../events/EventBus');
jest.mock('../models/ResumeParseResult');
jest.mock('../models/AuditEntry');
jest.mock('../models/Person');
jest.mock('../models/AcademicRecord');
jest.mock('../models/ExperienceRecord');
jest.mock('../models/SkillEvidence');
jest.mock('../models/CertificateRecord');
jest.mock('../models/CareerRecord');
jest.mock('../models/ResumePersonSuggestion');
jest.mock('../services/resume/dicIntegration.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockAuditEntryCreate = jest.fn();
const mockPersonFindOne = jest.fn();
const mockPersonCreate = jest.fn();
const mockPersonFindById = jest.fn();
const mockResumePersonSuggestionCreate = jest.fn();
const mockAcademicRecordFind = jest.fn();
const mockExperienceRecordCreate = jest.fn();
const mockAcademicRecordCreate = jest.fn();
const mockSkillEvidenceCreate = jest.fn();
const mockCertificateRecordCreate = jest.fn();
const mockCareerRecordCreate = jest.fn();

const mockFindOneQuery = (doc: any) => {
  const mockQuery: any = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc),
  };
  return mockQuery;
};

beforeEach(() => {
  jest.clearAllMocks();
  (eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (AuditEntry.create as jest.Mock) = mockAuditEntryCreate;
  (Person.findOne as jest.Mock) = mockPersonFindOne;
  (Person.create as jest.Mock) = mockPersonCreate;
  (Person.findById as jest.Mock) = mockPersonFindById;
  (ResumePersonSuggestion.create as jest.Mock) = mockResumePersonSuggestionCreate;
  (AcademicRecord.find as jest.Mock) = mockAcademicRecordFind;
  (ExperienceRecord.create as jest.Mock) = mockExperienceRecordCreate;
  (AcademicRecord.create as jest.Mock) = mockAcademicRecordCreate;
  (SkillEvidence.create as jest.Mock) = mockSkillEvidenceCreate;
  (CertificateRecord.create as jest.Mock) = mockCertificateRecordCreate;
  (CareerRecord.create as jest.Mock) = mockCareerRecordCreate;
});

describe('Sprint 8 Milestone 4 — Production Readiness Validation', () => {
  describe('Graceful degradation when DIC is unavailable', () => {
    test('dispatcher catches DIC failure and audits without crashing', async () => {
      (DicIntegrationService as jest.MockedClass<typeof DicIntegrationService>).mockImplementation(() => ({
        route: jest.fn().mockRejectedValue(new Error('DIC service unavailable')),
        handleReviewAction: jest.fn(),
      } as any));

      mockResumeParseResultFindOne.mockReturnValue(
        mockFindOneQuery({
          processingId: 'proc1',
          reviewStatus: 'AUTO_APPROVED',
          dicRoutedAt: undefined,
          dicDocumentId: undefined,
          rawCandidateFields: {},
          confidenceScore: 0.9,
        })
      );
      mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

      const dispatcher = new KnowledgeDispatcher();

      await expect(
        (dispatcher as any).handleResumeDicIntegration({
          organizationId: 'org1',
          personId: 'person1',
          sourceDocumentId: 'proc1',
          rawConfidence: 0.9,
          data: {
            payload: {
              processingId: 'proc1',
              stage: 'dic_integration',
            },
          },
        })
      ).rejects.toThrow('DIC service unavailable');

      expect(mockAuditEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org1',
          collectionName: 'resume_records',
          action: 'failed',
          performedBy: 'dispatcher',
          metadata: expect.objectContaining({
            domain: 'resume',
            stage: 'dic_integration',
            errorMessage: 'DIC service unavailable',
          }),
        })
      );
    });
  });

  describe('Cross-tenant data isolation under load', () => {
    test('findExistingPerson does not return person from different organization when emails match', async () => {
      mockResumeParseResultFindOne.mockReturnValue(
        mockFindOneQuery({
          processingId: 'proc1',
          canonicalWrittenAt: undefined,
          rawCandidateFields: {
            sections: [
              {
                title: 'HEADER',
                entities: [
                  { type: 'name', data: { value: 'Shared Email User' } },
                  { type: 'email', data: { value: 'shared@example.com' } },
                ],
              },
              {
                title: 'EXPERIENCE',
                entries: [{ title: 'Engineer', company: 'Corp', startDate: '2020-01-01' }],
              },
              {
                title: 'EDUCATION',
                entries: [{ degree: 'BS', institution: 'Uni', startDate: '2016-01-01', endDate: '2020-01-01' }],
              },
            ],
          },
        })
      );

      const org1Person = Person.findOne as jest.Mock;
      org1Person.mockImplementation((query: any) => {
        if (query.organizationId === 'org1' && query.primaryEmail === 'shared@example.com') {
          return mockFindOneQuery(null);
        }
        if (query.organizationId === 'org2' && query.primaryEmail === 'shared@example.com') {
          return mockFindOneQuery({ _id: 'person-org2', primaryEmail: 'shared@example.com', primaryName: 'Org2 User' });
        }
        return mockFindOneQuery(null);
      });

      mockPersonFindById.mockReturnValue(mockFindOneQuery({ _id: 'new-person' }));
      mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
      mockPersonCreate.mockResolvedValue({ _id: 'new-person' } as any);
      mockResumePersonSuggestionCreate.mockResolvedValue({} as any);
      mockExperienceRecordCreate.mockResolvedValue({});
      mockAcademicRecordCreate.mockResolvedValue({});
      mockSkillEvidenceCreate.mockResolvedValue({});
      mockCertificateRecordCreate.mockResolvedValue({});
      mockCareerRecordCreate.mockResolvedValue({});

      const service = new CanonicalWriteService();

      const result = await service.write({
        processingId: 'proc1',
        organizationId: 'org1',
        userId: 'user1',
        rawCandidateFields: {
          sections: [
            {
              title: 'HEADER',
              entities: [
                { type: 'name', data: { value: 'Shared Email User' } },
                { type: 'email', data: { value: 'shared@example.com' } },
              ],
            },
            {
              title: 'EXPERIENCE',
              entries: [{ title: 'Engineer', company: 'Corp', startDate: '2020-01-01' }],
            },
            {
              title: 'EDUCATION',
              entries: [{ degree: 'BS', institution: 'Uni', startDate: '2016-01-01', endDate: '2020-01-01' }],
            },
          ],
        },
        confidenceScore: 0.9,
      });

      expect(result.strategy).toBe('new_person');
      expect(mockPersonFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org1' })
      );
    });

    test('concurrent canonical writes across organizations remain isolated', async () => {
      mockResumeParseResultFindOne.mockReturnValue(
        mockFindOneQuery({
          processingId: 'proc1',
          canonicalWrittenAt: undefined,
          rawCandidateFields: {
            sections: [
              {
                title: 'HEADER',
                entities: [
                  { type: 'name', data: { value: 'User' } },
                  { type: 'email', data: { value: 'user@example.com' } },
                ],
              },
              {
                title: 'EXPERIENCE',
                entries: [{ title: 'Engineer', company: 'Corp', startDate: '2020-01-01' }],
              },
              {
                title: 'EDUCATION',
                entries: [{ degree: 'BS', institution: 'Uni', startDate: '2016-01-01', endDate: '2020-01-01' }],
              },
            ],
          },
        })
      );

      const org1Calls: any[] = [];
      const org2Calls: any[] = [];

      mockPersonFindOne.mockImplementation((query: any) => {
        if (query.organizationId === 'org1') {
          org1Calls.push(query);
          return mockFindOneQuery(null);
        }
        if (query.organizationId === 'org2') {
          org2Calls.push(query);
          return mockFindOneQuery(null);
        }
        return mockFindOneQuery(null);
      });

      mockPersonCreate.mockResolvedValue({ _id: 'new-person' } as any);
      mockPersonFindById.mockReturnValue(mockFindOneQuery({ _id: 'new-person' }));
      mockResumePersonSuggestionCreate.mockResolvedValue({} as any);
      mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
      mockExperienceRecordCreate.mockResolvedValue({});
      mockAcademicRecordCreate.mockResolvedValue({});
      mockSkillEvidenceCreate.mockResolvedValue({});
      mockCertificateRecordCreate.mockResolvedValue({});
      mockCareerRecordCreate.mockResolvedValue({});

      const service = new CanonicalWriteService();

      const params = {
        processingId: 'proc1',
        userId: 'user1',
        rawCandidateFields: {
          sections: [
            {
              title: 'HEADER',
              entities: [
                { type: 'name', data: { value: 'User' } },
                { type: 'email', data: { value: 'user@example.com' } },
              ],
            },
            {
              title: 'EXPERIENCE',
              entries: [{ title: 'Engineer', company: 'Corp', startDate: '2020-01-01' }],
            },
            {
              title: 'EDUCATION',
              entries: [{ degree: 'BS', institution: 'Uni', startDate: '2016-01-01', endDate: '2020-01-01' }],
            },
          ],
        },
        confidenceScore: 0.9,
      };

      const [result1, result2] = await Promise.all([
        service.write({ ...params, organizationId: 'org1', processingId: 'org1-proc' }),
        service.write({ ...params, organizationId: 'org2', processingId: 'org2-proc' }),
      ]);

      expect(result1.strategy).toBe('new_person');
      expect(result2.strategy).toBe('new_person');

      for (const call of org1Calls) {
        expect(call.organizationId).toBe('org1');
      }
      for (const call of org2Calls) {
        expect(call.organizationId).toBe('org2');
      }
    });
  });
});
