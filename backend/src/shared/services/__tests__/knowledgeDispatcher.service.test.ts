import { KnowledgeDispatcher } from '../knowledgeDispatcher.service';
import { UaipEvent } from '../../../events/UaipEvents';
import { ResumeParseResult } from '../../../models/ResumeParseResult';
import { ResumeSectionDetector } from '../../../services/resume/resumeSectionDetector.service';
import { ResumeAIEnhancer } from '../../../services/resume/resumeAIEnhancer.service';
import { AuditEntry } from '../../../models/AuditEntry';

jest.mock('../../../events/EventBus');
jest.mock('../../../models/ResumeParseResult');
jest.mock('../../../models/AuditEntry');
jest.mock('../../../services/resume/resumeSectionDetector.service');
jest.mock('../../../services/resume/resumeAIEnhancer.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockResumeSectionDetectorDetect = jest.fn();
const mockResumeAIEnhancerEnhance = jest.fn();
const mockAuditEntryCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (require('../../../events/EventBus').eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (ResumeSectionDetector as jest.MockedClass<typeof ResumeSectionDetector>).mockImplementation(() => ({
    detect: mockResumeSectionDetectorDetect,
  } as any));
  (ResumeAIEnhancer as jest.MockedClass<typeof ResumeAIEnhancer>).mockImplementation(() => ({
    enhance: mockResumeAIEnhancerEnhance,
  } as any));
  (AuditEntry.create as jest.Mock) = mockAuditEntryCreate;
});

describe('KnowledgeDispatcher section detection', () => {
  test('invokes ResumeSectionDetector and persists results', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeSectionDetectorDetect.mockResolvedValue({
      sections: [
        { title: 'SUMMARY', order: 0, startLine: 0, endLine: 2, rawText: 'Summary' },
        { title: 'EXPERIENCE', order: 1, startLine: 3, endLine: 5, rawText: 'Experience' },
      ],
      strategy: 'heuristic',
      aiFallbackUsed: false,
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'Summary\nExperience',
          mimeType: 'application/pdf',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockResumeSectionDetectorDetect).toHaveBeenCalledWith({
      rawText: 'Summary\nExperience',
      mimeType: 'application/pdf',
    });

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          sectionsDetected: 2,
          sectionDetectionStrategy: 'heuristic',
          aiProviderUsed: 'none',
          failedOver: false,
          rawCandidateFields: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ title: 'SUMMARY' }),
              expect.objectContaining({ title: 'EXPERIENCE' }),
            ]),
          }),
        }),
      }),
      { upsert: false }
    );

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetected,
      expect.objectContaining({
        processingId: 'proc1',
        sectionsDetected: 2,
        strategy: 'heuristic',
        correlationId: 'corr1',
      })
    );
  });

  test('publishes ResumeSectionDetectionFailed when no sections detected', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeSectionDetectorDetect.mockResolvedValue({
      sections: [],
      strategy: 'heuristic',
      aiFallbackUsed: false,
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'random text',
          mimeType: 'text/plain',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetectionFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'No sections detected',
        strategy: 'heuristic',
        correlationId: 'corr1',
      })
    );
  });

  test('skips processing if sections already detected', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ sectionsDetected: 2 }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'Summary',
          mimeType: 'application/pdf',
        },
      },
    });

    expect(mockResumeSectionDetectorDetect).not.toHaveBeenCalled();
    expect(mockEventBusPublish).not.toHaveBeenCalled();
  });

  test('publishes ResumeSectionDetectionFailed on detector error', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    mockResumeSectionDetectorDetect.mockRejectedValue(new Error('Detector error'));

    const dispatcher = new KnowledgeDispatcher();
    await expect(
      (dispatcher as any).handleResumeSectionDetection({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'section_detection',
            rawContent: 'Summary',
            mimeType: 'application/pdf',
          },
        },
      })
    ).rejects.toThrow('Detector error');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetectionFailed,
      expect.objectContaining({
        processingId: 'proc1',
        errorMessage: 'Detector error',
      })
    );
  });
});

describe('KnowledgeDispatcher AI enhancement', () => {
  test('invokes ResumeAIEnhancer and persists results', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        reviewStatus: 'PENDING_REVIEW',
        aiProviderUsed: 'none',
        normalizedSkills: 0,
        rawCandidateFields: {
          entities: [
            { type: 'skill', data: { name: 'JavaScript' } },
          ],
        },
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeAIEnhancerEnhance.mockResolvedValue({
      entities: [
        { type: 'skill', data: { name: 'JavaScript' }, confidence: 0.9, sourceSection: 'SKILLS', extractedBy: 'heuristic' },
      ],
      strategy: 'normalized',
      aiFallbackUsed: false,
      improvements: { fieldsAdded: 0, fieldsNormalized: 1, fieldsCorrected: 0 },
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeAiEnhancement({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'ai_enhancement',
          rawContent: 'JavaScript',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockResumeAIEnhancerEnhance).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: expect.arrayContaining([
          expect.objectContaining({ type: 'skill' }),
        ]),
        rawText: 'JavaScript',
        existing: expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({ type: 'skill' }),
          ]),
        }),
      })
    );

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          normalizedSkills: 1,
          rawCandidateFields: expect.objectContaining({
            aiEnhanced: true,
          }),
        }),
      }),
      { upsert: false }
    );

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeAIEnhanced,
      expect.objectContaining({
        processingId: 'proc1',
        strategy: 'normalized',
        aiFallbackUsed: false,
        correlationId: 'corr1',
      })
    );
  });

  test('skips processing if aiEnhanced is already true', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        rawCandidateFields: { aiEnhanced: true },
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeAiEnhancement({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'ai_enhancement',
          rawContent: 'text',
        },
      },
    });

    expect(mockResumeAIEnhancerEnhance).not.toHaveBeenCalled();
    expect(mockEventBusPublish).not.toHaveBeenCalled();
  });

  test('publishes ResumeAIEnhancementFailed on error', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        reviewStatus: 'PENDING_REVIEW',
        rawCandidateFields: {},
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeAIEnhancerEnhance.mockRejectedValue(new Error('AI quota exceeded'));

    const dispatcher = new KnowledgeDispatcher();
    await expect(
      (dispatcher as any).handleResumeAiEnhancement({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'ai_enhancement',
            rawContent: 'text',
          },
        },
      })
    ).rejects.toThrow('AI quota exceeded');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeAIEnhancementFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'ai_exhausted',
        errorMessage: 'AI quota exceeded',
      })
    );
  });
});
