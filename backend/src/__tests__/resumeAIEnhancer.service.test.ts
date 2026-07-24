import { ResumeAIEnhancer } from '../services/resume/resumeAIEnhancer.service';
import { ResumeEntity } from '../models/ResumeEntity';

describe('ResumeAIEnhancer', () => {
  const enhancer = new ResumeAIEnhancer();

  const basePerson: ResumeEntity = {
    type: 'person',
    confidence: 0.8,
    sourceSection: 'HEADER',
    data: { name: 'john doe', email: 'JOHN.DOE@EXAMPLE.COM' },
    extractedBy: 'heuristic',
  };

  const baseExperience: ResumeEntity = {
    type: 'experience',
    confidence: 0.75,
    sourceSection: 'EXPERIENCE',
    data: { title: 'senior backend engineer', company: 'techcorp inc.', startDate: '2021-06-01', endDate: 'Present', current: true },
    extractedBy: 'heuristic',
  };

  const baseEducation: ResumeEntity = {
    type: 'education',
    confidence: 0.8,
    sourceSection: 'EDUCATION',
    data: { degree: 'B.Tech', institution: 'abc university', startDate: '2015-06-01', endDate: '2019-05-01' },
    extractedBy: 'heuristic',
  };

  const baseSkill: ResumeEntity = {
    type: 'skill',
    confidence: 0.85,
    sourceSection: 'SKILLS',
    data: { name: 'js' },
    extractedBy: 'heuristic',
  };

  const baseProject: ResumeEntity = {
    type: 'project',
    confidence: 0.7,
    sourceSection: 'PROJECTS',
    data: { name: 'microservices migration' },
    extractedBy: 'heuristic',
  };

  const baseCertification: ResumeEntity = {
    type: 'certification',
    confidence: 0.8,
    sourceSection: 'CERTIFICATIONS',
    data: { title: 'aws solutions architect', issuer: 'amazon web services', issueDate: '2022-06-01' },
    extractedBy: 'heuristic',
  };

  const baseAchievement: ResumeEntity = {
    type: 'achievement',
    confidence: 0.75,
    sourceSection: 'ACHIEVEMENTS',
    data: { title: 'employee of the year 2023' },
    extractedBy: 'heuristic',
  };

  const baseLanguage: ResumeEntity = {
    type: 'language',
    confidence: 0.8,
    sourceSection: 'LANGUAGES',
    data: { name: 'english', proficiency: 'native' },
    extractedBy: 'heuristic',
  };

  describe('normalization', () => {
    test('normalizes person name to Title Case and email to lowercase', async () => {
      const result = await enhancer.enhance({ entities: [basePerson] });
      expect(result.strategy).toBe('normalized');
      expect(result.entities[0].data.name).toBe('John Doe');
      expect(result.entities[0].data.email).toBe('john.doe@example.com');
      expect(result.improvements.fieldsNormalized).toBeGreaterThanOrEqual(2);
    });

    test('normalizes experience dates to ISO 8601', async () => {
      const entity: ResumeEntity = {
        type: 'experience',
        confidence: 0.8,
        sourceSection: 'EXPERIENCE',
        data: { title: 'Engineer', company: 'Corp', startDate: '06/01/2021', endDate: 'Present', current: true },
        extractedBy: 'heuristic',
      };
      const result = await enhancer.enhance({ entities: [entity] });
      expect(result.entities[0].data.startDate).toBe('2021-06-01');
      expect(result.entities[0].data.current).toBe(true);
    });

    test('expands education degree abbreviations', async () => {
      const result = await enhancer.enhance({ entities: [baseEducation] });
      expect(result.entities[0].data.degree).toBe('Bachelor of Technology');
      expect(result.improvements.fieldsNormalized).toBeGreaterThanOrEqual(1);
    });

    test('normalizes skill name to canonical form', async () => {
      const result = await enhancer.enhance({ entities: [baseSkill] });
      expect(result.entities[0].data.name).toBe('JavaScript');
    });

    test('normalizes project name to Title Case', async () => {
      const result = await enhancer.enhance({ entities: [baseProject] });
      expect(result.entities[0].data.name).toBe('Microservices Migration');
    });

    test('normalizes certification title and issuer', async () => {
      const result = await enhancer.enhance({ entities: [baseCertification] });
      expect(result.entities[0].data.title).toBe('AWS Solutions Architect');
      expect(result.entities[0].data.issuer).toBe('Amazon Web Services');
    });

    test('normalizes achievement title', async () => {
      const result = await enhancer.enhance({ entities: [baseAchievement] });
      expect(result.entities[0].data.title).toBe('Employee Of The Year 2023');
    });

    test('normalizes language name and proficiency', async () => {
      const result = await enhancer.enhance({ entities: [baseLanguage] });
      expect(result.entities[0].data.name).toBe('English');
      expect(result.entities[0].data.proficiency).toBe('native');
    });
  });

  describe('AI enrichment', () => {
    test('triggers AI fallback when confidence is below threshold', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify({ data: { ...basePerson.data, phone: '+15550199' } })
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const lowConfidenceEntity: ResumeEntity = { ...basePerson, confidence: 0.6 };
      const result = await enhancerWithAi.enhance({ entities: [lowConfidenceEntity] });

      expect(result.strategy).toBe('ai-only');
      expect(result.aiFallbackUsed).toBe(true);
      expect(mockAiProvider.generateJSON).toHaveBeenCalledTimes(1);
    });

    test('validates AI response and preserves original on malformed response', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue('not a json object'),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const result = await enhancerWithAi.enhance({ entities: [basePerson] });

      expect(result.strategy).toBe('normalized');
      expect(result.entities[0].data.name).toBe('John Doe');
      expect(result.aiFallbackUsed).toBe(false);
    });

    test('completes missing critical fields via AI', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify({ data: { ...baseExperience.data, description: 'Built REST APIs and microservices' } })
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const noDescription: ResumeEntity = {
        type: 'experience',
        confidence: 0.6,
        sourceSection: 'EXPERIENCE',
        data: { title: 'Engineer', company: 'Corp', startDate: '2021-06-01' },
        extractedBy: 'heuristic',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const result = await enhancerWithAi.enhance({ entities: [noDescription] });

      expect(result.strategy).toBe('ai-only');
      expect(result.improvements.fieldsAdded).toBeGreaterThanOrEqual(1);
    });
  });

  describe('idempotency', () => {
    test('skips enhancement if rawCandidateFields.aiEnhanced is true', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(JSON.stringify({ data: { phone: '+15550199' } })),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const lowConfidence: ResumeEntity = { ...basePerson, confidence: 0.5 };
      const existing = { aiEnhanced: true };

      const result = await enhancerWithAi.enhance({
        entities: [lowConfidence],
        existing,
      });

      expect(result.strategy).toBe('normalized');
      expect(result.aiFallbackUsed).toBe(false);
      expect(mockAiProvider.generateJSON).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('throws no_entities error when entities array is empty', async () => {
      await expect(enhancer.enhance({ entities: [] })).rejects.toThrow('no_entities');
    });

    test('preserves normalized entity when AI provider throws', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockRejectedValue(new Error('AI quota exceeded')),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const lowConfidence: ResumeEntity = { ...basePerson, confidence: 0.5 };
      const result = await enhancerWithAi.enhance({ entities: [lowConfidence] });

      expect(result.strategy).toBe('normalized');
      expect(result.entities[0].data.name).toBe('John Doe');
    });
  });

  describe('improvements metadata', () => {
    test('populates fieldsAdded, fieldsNormalized, fieldsCorrected correctly', async () => {
      const entity: ResumeEntity = {
        type: 'experience',
        confidence: 0.75,
        sourceSection: 'EXPERIENCE',
        data: { title: 'engineer', company: 'corp', startDate: '06/01/2021', endDate: 'Present', current: undefined },
        extractedBy: 'heuristic',
      };

      const result = await enhancer.enhance({ entities: [entity] });
      expect(result.improvements.fieldsNormalized).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validation triggers', () => {
    test('triggers AI fallback for invalid email', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(JSON.stringify({ data: { ...basePerson.data, email: 'valid@example.com' } })),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const invalidEmail: ResumeEntity = {
        ...basePerson,
        confidence: 0.8,
        data: { ...basePerson.data, email: 'not-an-email' },
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const result = await enhancerWithAi.enhance({ entities: [invalidEmail] });

      expect(result.strategy).toBe('ai-only');
      expect(mockAiProvider.generateJSON).toHaveBeenCalledTimes(1);
    });

    test('triggers AI fallback for invalid date', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(JSON.stringify({ data: { ...baseEducation.data, startDate: '2020-01-01' } })),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const invalidDate: ResumeEntity = {
        ...baseEducation,
        confidence: 0.8,
        data: { ...baseEducation.data, startDate: 'not-a-date' },
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const result = await enhancerWithAi.enhance({ entities: [invalidDate] });

      expect(result.strategy).toBe('ai-only');
      expect(mockAiProvider.generateJSON).toHaveBeenCalledTimes(1);
    });
  });

  describe('GPA normalization', () => {
    test('converts GPA from 10-point scale to 4.0', async () => {
      const entity: ResumeEntity = {
        type: 'education',
        confidence: 0.8,
        sourceSection: 'EDUCATION',
        data: { degree: 'B.Tech', institution: 'ABC University', gpa: 8.5 },
        extractedBy: 'heuristic',
      };
      const result = await enhancer.enhance({ entities: [entity] });
      expect(result.entities[0].data.gpa).toBeCloseTo(3.4, 1);
    });
  });

  describe('strategy aggregation', () => {
    test('returns ai-only when all entities require AI', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(JSON.stringify({ data: { phone: '+15550199' } })),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const lowConfidence: ResumeEntity = { ...basePerson, confidence: 0.5 };
      const result = await enhancerWithAi.enhance({ entities: [lowConfidence] });

      expect(result.strategy).toBe('ai-only');
    });

    test('returns normalized+ai when only some entities require AI', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(JSON.stringify({ data: { phone: '+15550199' } })),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const enhancerWithAi = new ResumeAIEnhancer(mockAiProvider as any);
      const lowConfidence: ResumeEntity = { ...basePerson, confidence: 0.5 };
      const result = await enhancerWithAi.enhance({ entities: [lowConfidence, baseSkill] });

      expect(result.strategy).toBe('normalized+ai');
      expect(result.aiFallbackUsed).toBe(true);
    });

    test('returns normalized when no entity requires AI', async () => {
      const result = await enhancer.enhance({ entities: [basePerson, baseSkill] });
      expect(result.strategy).toBe('normalized');
      expect(result.aiFallbackUsed).toBe(false);
    });
  });
});
