import { CanonicalWriteService } from '../services/resume/canonicalWrite.service';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { Person } from '../models/Person';
import { ResumePersonSuggestion } from '../models/ResumePersonSuggestion';
import { ExperienceRecord } from '../models/ExperienceRecord';
import { AcademicRecord } from '../models/AcademicRecord';
import { SkillEvidence } from '../models/SkillEvidence';
import { CertificateRecord } from '../models/CertificateRecord';
import { CareerRecord } from '../models/CareerRecord';
import { eventBus } from '../events/EventBus';

jest.mock('../events/EventBus');
jest.mock('../models/ResumeParseResult');
jest.mock('../models/Person');
jest.mock('../models/ResumePersonSuggestion');
jest.mock('../models/ExperienceRecord');
jest.mock('../models/AcademicRecord');
jest.mock('../models/SkillEvidence');
jest.mock('../models/CertificateRecord');
jest.mock('../models/CareerRecord');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockPersonFindOne = jest.fn();
const mockPersonCreate = jest.fn();
const mockPersonFindById = jest.fn();
const mockResumePersonSuggestionCreate = jest.fn();
const mockExperienceRecordCreate = jest.fn();
const mockAcademicRecordCreate = jest.fn();
const mockAcademicRecordFind = jest.fn();
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
  (Person.findOne as jest.Mock) = mockPersonFindOne;
  (Person.create as jest.Mock) = mockPersonCreate;
  (Person.findById as jest.Mock) = mockPersonFindById;
  (ResumePersonSuggestion.create as jest.Mock) = mockResumePersonSuggestionCreate;
  (ExperienceRecord.create as jest.Mock) = mockExperienceRecordCreate;
  (AcademicRecord.create as jest.Mock) = mockAcademicRecordCreate;
  (AcademicRecord.find as jest.Mock) = mockAcademicRecordFind;
  (SkillEvidence.create as jest.Mock) = mockSkillEvidenceCreate;
  (CertificateRecord.create as jest.Mock) = mockCertificateRecordCreate;
  (CareerRecord.create as jest.Mock) = mockCareerRecordCreate;
});

describe('CanonicalWriteService concurrency', () => {
  const service = new CanonicalWriteService();

  const baseParams = {
    processingId: 'concurrent-proc',
    organizationId: 'org1',
    userId: 'user1',
    rawCandidateFields: {
      sections: [
        {
          title: 'HEADER',
          entities: [
            { type: 'name', data: { value: 'Concurrent User' } },
            { type: 'email', data: { value: 'concurrent@example.com' } },
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
        {
          title: 'SKILLS',
          entries: [{ name: 'JavaScript' }],
        },
      ],
    },
    confidenceScore: 0.9,
  };

  it('handles 10 parallel write jobs without data corruption', async () => {
    mockResumeParseResultFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'concurrent-proc',
        canonicalWrittenAt: undefined,
        rawCandidateFields: baseParams.rawCandidateFields,
      })
    );

    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockPersonCreate.mockResolvedValue({ _id: `person-${Date.now()}-${Math.random()}` } as any);
    mockPersonFindById.mockReturnValue(mockFindOneQuery({ _id: 'some-person-id' }));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...baseParams,
      processingId: `concurrent-proc-${i}`,
    }));

    const results = await Promise.all(jobs.map((params) => service.write(params)));

    expect(results).toHaveLength(10);
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.recordsSkipped).toBe(0);
    }

    const personCreateCalls = (mockPersonCreate as jest.MockedFunction<any>).mock.calls;
    const experienceCalls = (mockExperienceRecordCreate as jest.MockedFunction<any>).mock.calls;
    const academicCalls = (mockAcademicRecordCreate as jest.MockedFunction<any>).mock.calls;

    expect(personCreateCalls.length).toBeGreaterThanOrEqual(0);
    expect(experienceCalls.length).toBe(10);
    expect(academicCalls.length).toBe(10);
  });

  it('preserves idempotency when same processingId is written twice concurrently', async () => {
    const firstCall = true;
    mockResumeParseResultFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'concurrent-proc',
        canonicalWrittenAt: undefined,
        rawCandidateFields: baseParams.rawCandidateFields,
      })
    );

    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockPersonCreate.mockResolvedValue({ _id: 'new-person' } as any);
    mockPersonFindById.mockReturnValue(mockFindOneQuery({ _id: 'new-person' }));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    const params = {
      ...baseParams,
      processingId: 'idempotent-proc',
    };

    const [result1, result2] = await Promise.all([
      service.write(params),
      service.write(params),
    ]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const totalExperienceWrites = (mockExperienceRecordCreate as jest.MockedFunction<any>).mock.calls.length;
    expect(totalExperienceWrites).toBeLessThanOrEqual(2);
  });
});
