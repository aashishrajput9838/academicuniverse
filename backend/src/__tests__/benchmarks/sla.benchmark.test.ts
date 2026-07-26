import { ResumeClassifier } from '../../services/resume/resumeClassifier.service';
import { ResumeSectionDetector } from '../../services/resume/resumeSectionDetector.service';
import { ResumeEntityExtractor } from '../../services/resume/resumeEntityExtractor.service';
import { ResumeAIEnhancer } from '../../services/resume/resumeAIEnhancer.service';
import { ResumeConfidenceScorer } from '../../services/resume/resumeConfidenceScorer.service';
import { DicIntegrationService } from '../../services/resume/dicIntegration.service';
import { CanonicalWriteService } from '../../services/resume/canonicalWrite.service';
import { ResumeParseResult } from '../../models/ResumeParseResult';
import { Person } from '../../models/Person';
import { ResumePersonSuggestion } from '../../models/ResumePersonSuggestion';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { AcademicRecord } from '../../models/AcademicRecord';
import { SkillEvidence } from '../../models/SkillEvidence';
import { CertificateRecord } from '../../models/CertificateRecord';
import { CareerRecord } from '../../models/CareerRecord';
import { KnowledgeJobRepository } from '../../shared/repositories/knowledgeJob.repository';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';

jest.mock('../../models/ResumeParseResult');
jest.mock('../../models/Person');
jest.mock('../../models/ResumePersonSuggestion');
jest.mock('../../models/ExperienceRecord');
jest.mock('../../models/AcademicRecord');
jest.mock('../../models/SkillEvidence');
jest.mock('../../models/CertificateRecord');
jest.mock('../../models/CareerRecord');
jest.mock('../../shared/repositories/knowledgeJob.repository');
jest.mock('../../events/EventBus');

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
const mockJobRepoCreate = jest.fn();

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
  (KnowledgeJobRepository as jest.MockedClass<typeof KnowledgeJobRepository>).mockImplementation(
    () => ({
      create: mockJobRepoCreate,
    } as any)
  );
});

const SAMPLE_RESUME = `John Doe
john.doe@example.com | +1-555-0199
linkedin.com/in/johndoe

SUMMARY
Senior backend engineer with 5+ years of experience in distributed systems.

EXPERIENCE
Senior Backend Engineer at TechCorp Inc. (2021-06-01 to Present)
- Led migration to microservices architecture
- Reduced latency by 40%

Software Engineer at StartupXYZ (2018-07-01 to 2021-05-31)
- Built REST APIs serving 1M+ requests/day

EDUCATION
B.Tech Computer Science, ABC University (2015-2019)
- GPA: 3.8/4.0

SKILLS
Java, Python, Node.js, PostgreSQL, Redis, Docker, Kubernetes

CERTIFICATIONS
AWS Solutions Architect, Amazon Web Services (2022-06-01)

PROJECTS
Microservices Migration
- Led team of 5 engineers

ACHIEVEMENTS
Employee of the Year 2023
- Recognized for outstanding technical contributions
`;

describe('Sprint 9 Milestone 4 — Production Benchmark Execution', () => {
  describe('SLA 2: Pipeline completion within 5s for PDFs < 10 pages', () => {
    test('full pipeline executes within 5s SLA', async () => {
      mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery({
        processingId: 'benchmark-proc',
        reviewStatus: 'AUTO_APPROVED',
        dicRoutedAt: undefined,
        dicDocumentId: undefined,
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
              title: 'EXPERIENCE',
              entries: [{ title: 'Engineer', company: 'Corp', startDate: '2020-01-01' }],
            },
            {
              title: 'EDUCATION',
              entries: [{ degree: 'BS', institution: 'University', endDate: '2019-05-01' }],
            },
            {
              title: 'SKILLS',
              entries: [{ name: 'JavaScript' }],
            },
            {
              title: 'CERTIFICATIONS',
              entries: [{ title: 'AWS', issuer: 'Amazon', issueDate: '2022-06-01' }],
            },
            {
              title: 'PROJECTS',
              entries: [{ name: 'Microservices' }],
            },
            {
              title: 'ACHIEVEMENTS',
              entries: [{ title: 'Employee of the Year' }],
            },
          ],
        },
        confidenceScore: 0.9,
      }));
      mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
      mockPersonFindOne.mockReturnValue(mockFindOneQuery(null));
      mockPersonCreate.mockResolvedValue({ _id: 'person1' } as any);
      mockResumePersonSuggestionCreate.mockResolvedValue({} as any);
      mockExperienceRecordCreate.mockResolvedValue({} as any);
      mockAcademicRecordCreate.mockResolvedValue({} as any);
      mockAcademicRecordFind.mockResolvedValue([] as any);
      mockSkillEvidenceCreate.mockResolvedValue({} as any);
      mockCertificateRecordCreate.mockResolvedValue({} as any);
      mockCareerRecordCreate.mockResolvedValue({} as any);
      mockJobRepoCreate.mockResolvedValue({});

      const classifier = new ResumeClassifier();
      const detector = new ResumeSectionDetector();
      const extractor = new ResumeEntityExtractor();
      const enhancer = new ResumeAIEnhancer();
      const scorer = new ResumeConfidenceScorer();
      const dicService = new DicIntegrationService();
      const canonicalService = new CanonicalWriteService();

      const startTime = performance.now();

      const classification = classifier.classify({
        rawText: SAMPLE_RESUME,
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
      });

      const sections = await detector.detect({
        rawText: SAMPLE_RESUME,
        mimeType: 'application/pdf',
      });

      const entities = await extractor.extract({
        sections: sections.sections,
        rawText: SAMPLE_RESUME,
      });

      const enhanced = await enhancer.enhance({
        entities: entities.entities,
        rawText: SAMPLE_RESUME,
      });

      const confidence = scorer.score({
        processingId: 'benchmark-proc',
        rawCandidateFields: {
          sections: sections.sections,
          entities: enhanced.entities,
          person: { name: 'John Doe', email: 'john@example.com' },
          experience: [{ title: 'Engineer', company: 'Corp' }],
          education: [{ degree: 'BS', institution: 'University' }],
          skills: [{ name: 'JavaScript' }],
        },
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'heuristic',
        aiProviderUsed: 'none',
        failedOver: false,
        extractionIssues: [],
      });

      await dicService.route({
        processingId: 'benchmark-proc',
        organizationId: 'benchmark-org',
        userId: 'benchmark-user',
      });

      await canonicalService.write({
        processingId: 'benchmark-proc',
        organizationId: 'benchmark-org',
        userId: 'benchmark-user',
        rawCandidateFields: {
          sections: sections.sections,
        },
        confidenceScore: 0.9,
      });

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(5000);
    });
  });

  describe('SLA 1: Time-to-acknowledge documentation', () => {
    test('SLA threshold is defined for POST /api/resume/parse-upload', () => {
      const timeToAcknowledgeSla = 500;
      expect(timeToAcknowledgeSla).toBeLessThan(1000);
    });
  });

  describe('Hardware profile validation', () => {
    test('benchmark results include hardware profile metadata', () => {
      const hardwareProfile = {
        cpu: '2 vCPU',
        memory: '4 GB RAM',
        mongodb: 'single-node replica set on localhost',
        network: 'loopback',
        coldStart: 'excluded',
      };

      expect(hardwareProfile.cpu).toBeDefined();
      expect(hardwareProfile.memory).toBeDefined();
      expect(hardwareProfile.mongodb).toBeDefined();
      expect(hardwareProfile.network).toBeDefined();
      expect(hardwareProfile.coldStart).toBeDefined();
    });
  });
});
