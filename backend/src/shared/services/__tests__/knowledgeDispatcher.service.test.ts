import { KnowledgeDispatcher } from '../knowledgeDispatcher.service';
import { UaipEvent } from '../../../events/UaipEvents';
import { ResumeParseResult } from '../../../models/ResumeParseResult';
import { ResumeSectionDetector } from '../../../services/resume/resumeSectionDetector.service';
import { ResumeAIEnhancer } from '../../../services/resume/resumeAIEnhancer.service';
import { ResumeConfidenceScorer } from '../../../services/resume/resumeConfidenceScorer.service';
import { AuditEntry } from '../../../models/AuditEntry';

jest.mock('../../../events/EventBus');
jest.mock('../../../models/ResumeParseResult');
jest.mock('../../../models/AuditEntry');
jest.mock('../../../services/resume/resumeSectionDetector.service');
jest.mock('../../../services/resume/resumeAIEnhancer.service');
jest.mock('../../../services/resume/resumeConfidenceScorer.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockResumeSectionDetectorDetect = jest.fn();
const mockResumeAIEnhancerEnhance = jest.fn();
const mockResumeConfidenceScorerScore = jest.fn();
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
  (ResumeConfidenceScorer as jest.MockedClass<typeof ResumeConfidenceScorer>).mockImplementation(() => ({
    score: mockResumeConfidenceScorerScore,
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

describe('KnowledgeDispatcher confidence scoring', () => {
  test('invokes ResumeConfidenceScorer and persists results', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        reviewStatus: 'PENDING_REVIEW',
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'heuristic',
        aiProviderUsed: 'none',
        failedOver: false,
        extractionIssues: [],
        rawCandidateFields: {
          sections: [{ title: 'HEADER', order: 0, startLine: 0, endLine: 3 }],
          entities: [{ type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'heuristic' }],
        },
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeConfidenceScorerScore.mockResolvedValue({
      confidenceScore: 0.92,
      reviewStatus: 'AUTO_APPROVED',
      strategy: 'heuristic',
      aiFallbackUsed: false,
      confidenceSummary: {
        sectionScore: 1.0,
        entityScore: 1.0,
        formatScore: 1.0,
        aiAgreementScore: 1.0,
        consistencyScore: 1.0,
        rawScore: 1.0,
        penaltyCap: 1.0,
        finalScore: 0.92,
      },
      improvements: { fieldsNormalized: 0, fieldsCorrected: 0 },
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeConfidenceScoring({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'confidence_scoring',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockResumeConfidenceScorerScore).toHaveBeenCalledWith(
      expect.objectContaining({
        processingId: 'proc1',
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'heuristic',
        aiProviderUsed: 'none',
        failedOver: false,
      })
    );

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          confidenceScore: 0.92,
          reviewStatus: 'AUTO_APPROVED',
          rawCandidateFields: expect.objectContaining({
            confidenceScore: 0.92,
            reviewStatus: 'AUTO_APPROVED',
            confidenceStrategy: 'heuristic',
            confidenceSummary: expect.any(Object),
          }),
        }),
      }),
      { upsert: false }
    );

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeConfidenceScored,
      expect.objectContaining({
        processingId: 'proc1',
        confidenceScore: 0.92,
        reviewStatus: 'AUTO_APPROVED',
        strategy: 'heuristic',
        correlationId: 'corr1',
      })
    );
  });

  test('skips processing if confidenceScore already set', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        confidenceScore: 0.85,
        reviewStatus: 'AUTO_APPROVED',
        rawCandidateFields: {},
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeConfidenceScoring({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'confidence_scoring',
        },
      },
    });

    expect(mockResumeConfidenceScorerScore).not.toHaveBeenCalled();
    expect(mockEventBusPublish).not.toHaveBeenCalled();
  });

  test('publishes ResumeConfidenceScoringFailed on error', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        reviewStatus: 'PENDING_REVIEW',
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'heuristic',
        aiProviderUsed: 'none',
        failedOver: false,
        extractionIssues: [],
        rawCandidateFields: {},
      }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeConfidenceScorerScore.mockRejectedValue(new Error('no_sections'));

    const dispatcher = new KnowledgeDispatcher();
    await expect(
      (dispatcher as any).handleResumeConfidenceScoring({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'confidence_scoring',
          },
        },
      })
    ).rejects.toThrow('no_sections');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeConfidenceScoringFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'no_sections',
        errorMessage: 'no_sections',
      })
    );
  });
});
