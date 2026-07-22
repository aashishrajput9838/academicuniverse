import { ConfidenceScorerService } from '../services/confidenceScorer.service';
import { Milestone2Result, DetectedSection, ExtractedEntity, ExtractionIssue } from '../services/milestone2.types';

const createSection = (overrides: Partial<DetectedSection> = {}): DetectedSection => ({
  id: 'test-id',
  title: 'Test Section',
  order: 0,
  repeatable: false,
  fields: [],
  ...overrides,
});

const createEntity = (overrides: Partial<ExtractedEntity> = {}): ExtractedEntity => ({
  type: 'email',
  value: 'test@example.com',
  confidence: 0.9,
  ...overrides,
});

describe('ConfidenceScorerService', () => {
  let service: ConfidenceScorerService;

  beforeEach(() => {
    service = new ConfidenceScorerService();
  });

  it('scores high confidence with clear sections and entities', () => {
    const result: Milestone2Result = {
      sections: [
        createSection({ title: 'Experience', fields: [{ key: 'company', label: 'Company', type: 'text', required: true, aiEnhanceable: true }] }),
        createSection({ title: 'Education', fields: [{ key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true }] }),
      ],
      entities: [createEntity({ type: 'email', confidence: 0.95 }), createEntity({ type: 'phone', confidence: 0.9 })],
      confidence: 0,
      formattingMetadata: {
        styles: { 'Arial|12|b||000000': {} },
        headingLevels: { 'experience': 1, 'education': 1 },
        bulletMarker: '-',
        dateFormat: 'MMM YYYY',
      },
      extractionIssues: [],
    };

    const score = service.score(result);
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it('scores low confidence with no sections', () => {
    const result: Milestone2Result = {
      sections: [],
      entities: [],
      confidence: 0,
      formattingMetadata: {
        styles: {},
        headingLevels: {},
        bulletMarker: '',
        dateFormat: 'unknown',
      },
      extractionIssues: [],
    };

    const score = service.score(result);
    expect(score).toBeLessThan(0.5);
  });

  it('penalizes duplicate sections', () => {
    const result: Milestone2Result = {
      sections: [
        createSection({ title: 'Skills' }),
        createSection({ title: 'Skills' }),
      ],
      entities: [],
      confidence: 0,
      formattingMetadata: {
        styles: {},
        headingLevels: {},
        bulletMarker: '',
        dateFormat: 'unknown',
      },
      extractionIssues: [],
    };

    const score = service.score(result);
    expect(score).toBeLessThan(0.7);
  });

  it('respects extractionIssues severity', () => {
    const result: Milestone2Result = {
      sections: [createSection()],
      entities: [],
      confidence: 0,
      formattingMetadata: {
        styles: {},
        headingLevels: {},
        bulletMarker: '',
        dateFormat: 'unknown',
      },
      extractionIssues: [
        { severity: 'error', message: 'AI timeout' },
      ],
    };

    const score = service.score(result);
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it('adds warning when confidence < 0.4', () => {
    const result: Milestone2Result = {
      sections: [],
      entities: [],
      confidence: 0,
      formattingMetadata: {
        styles: {},
        headingLevels: {},
        bulletMarker: '',
        dateFormat: 'unknown',
      },
      extractionIssues: [],
    };

    service.score(result);
    expect(result.extractionIssues.some(i => i.message.includes('Low extraction confidence'))).toBe(true);
  });

  it('returns value between 0 and 1', () => {
    const testCases = [
      {
        sections: [createSection()],
        entities: [createEntity()],
        formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'MMM YYYY' },
      } as unknown as Milestone2Result,
      {
        sections: [],
        entities: [],
        formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '', dateFormat: 'unknown' },
      } as unknown as Milestone2Result,
      {
        sections: Array(10).fill(createSection()),
        entities: Array(20).fill(createEntity()),
        formattingMetadata: {
          styles: { 'style1': {} },
          headingLevels: { 'section1': 1 },
          bulletMarker: '-',
          dateFormat: 'YYYY-MM',
        },
      } as unknown as Milestone2Result,
    ];

    for (const testCase of testCases) {
      const score = service.score({ ...testCase, confidence: 0, extractionIssues: [] });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
