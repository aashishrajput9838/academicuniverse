import { ResumeConfidenceScorer } from '../services/resume/resumeConfidenceScorer.service';

describe('ResumeConfidenceScorer', () => {
  const scorer = new ResumeConfidenceScorer();

  const baseSections = [
    { title: 'HEADER', order: 0, startLine: 0, endLine: 3 },
    { title: 'EXPERIENCE', order: 1, startLine: 4, endLine: 10 },
    { title: 'EDUCATION', order: 2, startLine: 11, endLine: 15 },
    { title: 'SKILLS', order: 3, startLine: 16, endLine: 20 },
  ];

  const baseEntities = [
    { type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'heuristic' },
    { type: 'email', sourceSection: 'HEADER', data: { email: 'john@example.com' }, extractedBy: 'heuristic' },
    { type: 'experience', sourceSection: 'EXPERIENCE', data: { title: 'Engineer', company: 'Corp' }, extractedBy: 'heuristic' },
    { type: 'education', sourceSection: 'EDUCATION', data: { degree: 'BS', institution: 'University' }, extractedBy: 'heuristic' },
    { type: 'skill', sourceSection: 'SKILLS', data: { name: 'JavaScript' }, extractedBy: 'heuristic' },
  ];

  const baseRawCandidateFields: Record<string, any> = {
    sections: baseSections,
    entities: baseEntities,
    person: { name: 'John Doe', email: 'john@example.com' },
    experience: [{ title: 'Engineer', company: 'Corp' }],
    education: [{ degree: 'BS', institution: 'University' }],
    skills: [{ name: 'JavaScript' }],
  };

  const baseParams = {
    processingId: 'proc1',
    rawCandidateFields: baseRawCandidateFields,
    sectionDetectionStrategy: 'heuristic' as const,
    entityExtractionStrategy: 'heuristic' as const,
    aiProviderUsed: 'none',
    failedOver: false,
    extractionIssues: [],
  };

  describe('sectionScore', () => {
    test('returns 1.0 when all required sections present, ordered, no boundary errors', async () => {
      const result = await scorer.score(baseParams);
      expect(result.confidenceSummary.sectionScore).toBeCloseTo(1.0, 1);
    });

    test('returns lower score when required sections missing', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: [{ title: 'HEADER', order: 0, startLine: 0, endLine: 3 }],
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.sectionScore).toBeLessThan(1.0);
    });

    test('penalizes duplicate section titles', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: [
            ...baseSections,
            { title: 'EXPERIENCE', order: 4, startLine: 20, endLine: 25 },
          ],
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.sectionScore).toBeLessThan(1.0);
    });

    test('penalizes boundary errors', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: [{ title: 'HEADER', order: 0, startLine: 10, endLine: 3 }],
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.sectionScore).toBeLessThan(1.0);
    });
  });

  describe('entityScore', () => {
    test('returns 1.0 when all required entities populated', async () => {
      const result = await scorer.score(baseParams);
      expect(result.confidenceSummary.entityScore).toBeCloseTo(1.0, 1);
    });

    test('returns lower score when required entities missing', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          entities: baseEntities.filter((e) => e.type !== 'email'),
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.entityScore).toBeLessThan(1.0);
    });
  });

  describe('formatScore', () => {
    test('returns 1.0 when all entities have valid formats', async () => {
      const result = await scorer.score(baseParams);
      expect(result.confidenceSummary.formatScore).toBeCloseTo(1.0, 1);
    });

    test('returns lower score when some entities have invalid formats', async () => {
      const entities = [
        ...baseEntities,
        { type: 'email', sourceSection: 'HEADER', data: { email: 'invalid-email' }, extractedBy: 'heuristic' },
      ];
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, entities },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.formatScore).toBeLessThan(1.0);
    });
  });

  describe('aiAgreementScore', () => {
    test('equals entityScore when no AI enhancement used', async () => {
      const result = await scorer.score(baseParams);
      expect(result.confidenceSummary.aiAgreementScore).toBe(result.confidenceSummary.entityScore);
    });

    test('computes agreement when AI entities match heuristic entities', async () => {
      const entities = [
        { type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'heuristic' },
        { type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'ai' },
      ];
      const params = {
        ...baseParams,
        entityExtractionStrategy: 'regex+ner+ai',
        rawCandidateFields: { ...baseRawCandidateFields, entities, aiEnhanced: true },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.aiAgreementScore).toBeGreaterThan(0);
    });

    test('matches heuristic and AI entities semantically by type and sourceSection', async () => {
      const entities = [
        { type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'heuristic' },
        { type: 'email', sourceSection: 'HEADER', data: { email: 'john@example.com' }, extractedBy: 'heuristic' },
        { type: 'name', sourceSection: 'HEADER', data: { name: 'John Doe' }, extractedBy: 'ai' },
        { type: 'email', sourceSection: 'HEADER', data: { email: 'john@example.com' }, extractedBy: 'ai' },
      ];
      const params = {
        ...baseParams,
        entityExtractionStrategy: 'regex+ner+ai',
        rawCandidateFields: { ...baseRawCandidateFields, entities, aiEnhanced: true },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.aiAgreementScore).toBeCloseTo(1.0, 1);
    });
  });

  describe('consistencyScore', () => {
    test('returns 1.0 when all date ranges are valid', async () => {
      const result = await scorer.score(baseParams);
      expect(result.confidenceSummary.consistencyScore).toBeCloseTo(1.0, 1);
    });

    test('returns lower score when date range is invalid', async () => {
      const entities = [
        ...baseEntities,
        {
          type: 'experience',
          sourceSection: 'EXPERIENCE',
          data: { title: 'Engineer', company: 'Corp', startDate: '2022-01-01', endDate: '2020-01-01' },
          extractedBy: 'heuristic',
        },
      ];
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, entities },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.consistencyScore).toBeLessThan(1.0);
    });

    test('returns lower score when duplicate entities exist', async () => {
      const entities = [
        ...baseEntities,
        {
          type: 'skill',
          sourceSection: 'SKILLS',
          data: { name: 'JavaScript' },
          extractedBy: 'heuristic',
        },
      ];
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, entities },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.consistencyScore).toBeLessThan(1.0);
    });

    test('returns lower score when skill alias conflict exists', async () => {
      const entities = [
        ...baseEntities,
        {
          type: 'skill',
          sourceSection: 'SKILLS',
          data: { name: 'JS' },
          extractedBy: 'heuristic',
        },
        {
          type: 'skill',
          sourceSection: 'SKILLS',
          data: { name: 'JavaScript' },
          extractedBy: 'heuristic',
        },
      ];
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, entities },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.consistencyScore).toBeLessThan(1.0);
    });
  });

  describe('penalty caps', () => {
    test('applies 0.5 cap when extractionIssue error exists', async () => {
      const params = {
        ...baseParams,
        extractionIssues: [{ severity: 'error', code: 'TEST', message: 'Test error' }],
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.5);
    });

    test('applies 0.85 cap when failedOver is true', async () => {
      const params = { ...baseParams, failedOver: true };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.85);
    });

    test('applies 0.8 cap when sectionDetectionStrategy is ai-only', async () => {
      const params = { ...baseParams, sectionDetectionStrategy: 'ai-only' };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.8);
    });

    test('applies 0.5 cap when HEADER section is missing', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: baseSections.filter((s) => s.title !== 'HEADER'),
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.5);
    });

    test('applies 0.6 cap when required section is missing', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: baseSections.filter((s) => s.title !== 'EXPERIENCE'),
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.6);
    });

    test('applies most restrictive cap when multiple conditions apply', async () => {
      const params = {
        ...baseParams,
        failedOver: true,
        sectionDetectionStrategy: 'ai-only',
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: baseSections.filter((s) => s.title !== 'EXPERIENCE'),
        },
      };
      const result = await scorer.score(params);
      expect(result.confidenceSummary.penaltyCap).toBe(0.6);
    });
  });

  describe('final score', () => {
    test('clamps score to [0, 1]', async () => {
      const params = {
        ...baseParams,
        extractionIssues: [{ severity: 'error', code: 'TEST', message: 'Test error' }],
      };
      const result = await scorer.score(params);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('reviewStatus thresholds', () => {
    test('returns AUTO_APPROVED when score >= 0.85', async () => {
      const result = await scorer.score(baseParams);
      if (result.confidenceScore >= 0.85) {
        expect(result.reviewStatus).toBe('AUTO_APPROVED');
      }
    });

    test('returns PENDING_REVIEW when score between 0.60 and 0.84', async () => {
      const params = {
        ...baseParams,
        extractionIssues: [{ severity: 'warning', code: 'TEST', message: 'Test warning' }],
      };
      const result = await scorer.score(params);
      if (result.confidenceScore >= 0.6 && result.confidenceScore < 0.85) {
        expect(result.reviewStatus).toBe('PENDING_REVIEW');
      }
    });

    test('returns NEEDS_REINDEX when score < 0.60', async () => {
      const params = {
        ...baseParams,
        extractionIssues: [{ severity: 'error', code: 'TEST', message: 'Test error' }],
        rawCandidateFields: {
          ...baseRawCandidateFields,
          sections: baseSections.filter((s) => s.title !== 'EXPERIENCE'),
        },
      };
      const result = await scorer.score(params);
      if (result.confidenceScore < 0.6) {
        expect(result.reviewStatus).toBe('NEEDS_REINDEX');
      }
    });
  });

  describe('strategy determination', () => {
    test('returns heuristic when no AI used', async () => {
      const result = await scorer.score(baseParams);
      expect(result.strategy).toBe('heuristic');
    });

    test('returns heuristic+ai when heuristic+ai strategy used', async () => {
      const params = {
        ...baseParams,
        sectionDetectionStrategy: 'heuristic+ai',
        entityExtractionStrategy: 'regex+ner+ai',
        rawCandidateFields: { ...baseRawCandidateFields, aiEnhanced: true },
      };
      const result = await scorer.score(params);
      expect(result.strategy).toBe('heuristic+ai');
    });

    test('returns ai-only when ai-only strategy used', async () => {
      const params = {
        ...baseParams,
        sectionDetectionStrategy: 'ai-only',
        rawCandidateFields: { ...baseRawCandidateFields, aiEnhanced: true },
      };
      const result = await scorer.score(params);
      expect(result.strategy).toBe('ai-only');
    });
  });

  describe('idempotency', () => {
    test('skips recomputation when confidenceScore already set', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, confidenceScore: 0.9, reviewStatus: 'AUTO_APPROVED' },
      };
      const result = await scorer.score(params);
      expect(result.confidenceScore).toBe(0.9);
      expect(result.reviewStatus).toBe('AUTO_APPROVED');
    });
  });

  describe('error handling', () => {
    test('handles empty sections gracefully', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, sections: [] },
      };
      const result = await scorer.score(params);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    });

    test('handles empty entities gracefully', async () => {
      const params = {
        ...baseParams,
        rawCandidateFields: { ...baseRawCandidateFields, entities: [] },
      };
      const result = await scorer.score(params);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    });
  });
});
