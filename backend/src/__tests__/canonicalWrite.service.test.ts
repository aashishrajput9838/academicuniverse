import { CanonicalWriteService } from '../services/resume/canonicalWrite.service';
import { UaipEvent } from '../events/UaipEvents';
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

const mockFindOneQuery = (doc: any) => {
  const mockQuery: any = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc),
  };
  return mockQuery;
};

describe('CanonicalWriteService', () => {
  const service = new CanonicalWriteService();

  it('skips if already written', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: new Date(),
      personId: { toString: () => 'person1' },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));

    const output = await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {},
      confidenceScore: 0.9,
    });

    expect(output.success).toBe(true);
    expect(output.recordsWritten).toBe(0);
    expect(output.recordsSkipped).toBe(0);
    expect(mockPersonFindOne).not.toHaveBeenCalled();
  });

  it('reuses existing person on email match', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: {
        sections: [
          {
            title: 'HEADER',
            entities: [
              { type: 'name', data: { value: 'John Doe' } },
              { type: 'email', data: { value: 'john@example.com' } },
            ],
          },
          {
            title: 'EDUCATION',
            entries: [{ institution: 'Uni' }],
          },
        ],
      },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery({ _id: 'person1', primaryEmail: 'john@example.com', primaryName: 'John Doe' }));
    mockPersonFindById.mockReturnValue(mockFindOneQuery({ _id: 'person1' }));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    const output = await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          {
            title: 'HEADER',
            entities: [
              { type: 'name', data: { value: 'John Doe' } },
              { type: 'email', data: { value: 'john@example.com' } },
            ],
          },
          {
            title: 'EXPERIENCE',
            entries: [{ title: 'Engineer', company: 'Acme', startDate: '2020-01-01' }],
          },
          {
            title: 'EDUCATION',
            entries: [{ degree: 'BS', institution: 'Uni', startDate: '2016-01-01', endDate: '2020-01-01' }],
          },
          {
            title: 'SKILLS',
            entries: [{ name: 'Java' }],
          },
          {
            title: 'CERTIFICATIONS',
            entries: [{ title: 'AWS', issuer: 'Amazon', issueDate: '2021-01-01' }],
          },
          {
            title: 'PROJECTS',
            entries: [{ name: 'Proj', description: 'Desc', techStack: ['React'] }],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(output.success).toBe(true);
    expect(output.strategy).toBe('existing_person');
    expect(mockResumePersonSuggestionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ isNewPerson: false })
    );
  });

  it('creates new person when no match found', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: {
        sections: [{ title: 'HEADER', entities: [{ type: 'name', data: { value: 'Jane Doe' } }] }],
      },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockPersonCreate.mockResolvedValue({ _id: 'newperson1' } as any);
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    const output = await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          {
            title: 'HEADER',
            entities: [{ type: 'name', data: { value: 'Jane Doe' } }],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(output.success).toBe(true);
    expect(output.strategy).toBe('new_person');
    expect(mockPersonCreate).toHaveBeenCalled();
    expect(mockResumePersonSuggestionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ isNewPerson: true })
    );
  });

  it('writes ExperienceRecord entries', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: { sections: [{ title: 'HEADER', entities: [] }] },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockPersonCreate.mockResolvedValue({ _id: 'newperson1' } as any);
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          { title: 'HEADER', entities: [] },
          {
            title: 'EXPERIENCE',
            entries: [
              { title: 'Engineer', company: 'Acme', startDate: '2020-01-01' },
              { title: 'Senior Engineer', company: 'Beta', startDate: '2018-01-01', endDate: '2020-01-01' },
            ],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(mockExperienceRecordCreate).toHaveBeenCalledTimes(2);
  });

  it('writes CareerRecord for projects and achievements', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: { sections: [{ title: 'HEADER', entities: [] }] },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockPersonCreate.mockResolvedValue({ _id: 'newperson1' } as any);
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          { title: 'HEADER', entities: [] },
          {
            title: 'PROJECTS',
            entries: [{ name: 'Proj', description: 'Desc', techStack: ['React'] }],
          },
          {
            title: 'ACHIEVEMENTS',
            entries: [{ title: 'Award', description: 'Best', date: '2021-01-01' }],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(mockCareerRecordCreate).toHaveBeenCalledTimes(1);
    const careerPayload = (mockCareerRecordCreate as jest.MockedFunction<any>).mock.calls[0][0];
    expect(careerPayload.projects).toEqual([{ name: 'Proj', description: 'Desc', techStack: ['React'] }]);
    expect(careerPayload.education).toEqual([{ title: 'Award', description: 'Best', date: '2021-01-01' }]);
  });

  it('publishes ResumeCanonicalWritten on success', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: {
        sections: [
          {
            title: 'HEADER',
            entities: [{ type: 'name', data: { value: 'Jane Doe' } }],
          },
        ],
      },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockPersonCreate.mockResolvedValue({ _id: 'newperson1' } as any);
    mockExperienceRecordCreate.mockResolvedValue({});
    mockAcademicRecordCreate.mockResolvedValue({});
    mockSkillEvidenceCreate.mockResolvedValue({});
    mockCertificateRecordCreate.mockResolvedValue({});
    mockCareerRecordCreate.mockResolvedValue({});

    await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          {
            title: 'HEADER',
            entities: [{ type: 'name', data: { value: 'Jane Doe' } }],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeCanonicalWritten,
      expect.objectContaining({
        processingId: 'proc1',
        strategy: 'new_person',
        recordsWritten: expect.any(Number),
      })
    );
  });

  it('publishes ResumeCanonicalWriteFailed on error', async () => {
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(null));

    await expect(
      service.write({
        processingId: 'proc1',
        organizationId: 'org1',
        userId: 'user1',
        rawCandidateFields: {},
        confidenceScore: 0.9,
      })
    ).rejects.toThrow('ResumeParseResult not found');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeCanonicalWriteFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'unknown',
      })
    );
  });

  it('skips duplicate write on duplicate key error', async () => {
    const doc = {
      processingId: 'proc1',
      canonicalWrittenAt: undefined,
      rawCandidateFields: {
        sections: [
          { title: 'HEADER', entities: [] },
          {
            title: 'EXPERIENCE',
            entries: [{ title: 'Engineer', company: 'Acme', startDate: '2020-01-01' }],
          },
        ],
      },
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
    mockAcademicRecordFind.mockReturnValue(mockFindOneQuery([]));
    mockPersonCreate.mockResolvedValue({ _id: 'newperson1' } as any);
    const dupKeyError = new Error('E11000 duplicate key') as any;
    dupKeyError.code = 11000;
    mockExperienceRecordCreate.mockRejectedValue(dupKeyError);
    mockAcademicRecordCreate.mockResolvedValue({});

    const output = await service.write({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      rawCandidateFields: {
        sections: [
          { title: 'HEADER', entities: [] },
          {
            title: 'EXPERIENCE',
            entries: [{ title: 'Engineer', company: 'Acme', startDate: '2020-01-01' }],
          },
        ],
      },
      confidenceScore: 0.9,
    });

    expect(output.success).toBe(true);
    expect(output.recordsWritten).toBe(0);
    expect(output.recordsSkipped).toBe(1);
  });
});
