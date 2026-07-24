import { ResumeEntityExtractor } from '../services/resume/resumeEntityExtractor.service';

describe('ResumeEntityExtractor', () => {
  const extractor = new ResumeEntityExtractor();

  const sections = [
    {
      title: 'HEADER',
      order: 0,
      startLine: 0,
      endLine: 3,
      rawText: 'John Doe\njohn.doe@example.com | +1-555-0199\nlinkedin.com/in/johndoe',
    },
    {
      title: 'EXPERIENCE',
      order: 1,
      startLine: 4,
      endLine: 10,
      rawText: `Senior Backend Engineer at TechCorp Inc. (2021-06-01 to Present)
- Led migration to microservices architecture
- Reduced latency by 40%
Software Engineer at StartupXYZ (2019-01-01 to 2021-05-01)
- Built REST APIs`,
    },
    {
      title: 'EDUCATION',
      order: 2,
      startLine: 11,
      endLine: 14,
      rawText: `B.Tech Computer Science, ABC University (2015-2019)
GPA: 8.5/10`,
    },
    {
      title: 'SKILLS',
      order: 3,
      startLine: 15,
      endLine: 16,
      rawText: 'Java, Python, Node.js, PostgreSQL, Redis, Docker, Kubernetes',
    },
    {
      title: 'PROJECTS',
      order: 4,
      startLine: 17,
      endLine: 20,
      rawText: `Microservices Migration
- Led team of 5 engineers
- Designed event-driven architecture`,
    },
    {
      title: 'CERTIFICATIONS',
      order: 5,
      startLine: 21,
      endLine: 22,
      rawText: 'AWS Solutions Architect from Amazon Web Services (2022-06-01)',
    },
    {
      title: 'ACHIEVEMENTS',
      order: 6,
      startLine: 23,
      endLine: 24,
      rawText: 'Employee of the Year 2023\nBest Paper Award at TechConf',
    },
    {
      title: 'LANGUAGES',
      order: 7,
      startLine: 25,
      endLine: 26,
      rawText: 'English (native), Hindi (fluent), Spanish (basic)',
    },
    {
      title: 'SUMMARY',
      order: 8,
      startLine: 27,
      endLine: 28,
      rawText: 'Senior backend engineer with 5+ years of experience.',
    },
  ];

  const emptyHeader = {
    title: 'HEADER',
    order: 0,
    startLine: 0,
    endLine: 1,
    rawText: '',
  };

  describe('extract()', () => {
    test('extracts person entities from HEADER', async () => {
      const result = await extractor.extract({
        sections: [sections[0]],
        rawText: sections[0].rawText,
      });

      expect(result.strategy).toBe('heuristic');
      expect(result.aiFallbackUsed).toBe(false);
      expect(result.entities.length).toBeGreaterThanOrEqual(3);

      const personEntities = result.entities.filter((e) => e.type === 'person');
      expect(personEntities.length).toBeGreaterThanOrEqual(3);
      expect(personEntities.map((e) => (e.data as any).name)).toContain('John Doe');
      expect(personEntities.map((e) => (e.data as any).email)).toContain('john.doe@example.com');
    });

    test('extracts experience entities from EXPERIENCE', async () => {
      const result = await extractor.extract({
        sections: [sections[1]],
        rawText: sections[1].rawText,
      });

      const experienceEntities = result.entities.filter((e) => e.type === 'experience');
      expect(experienceEntities.length).toBe(2);
      expect(experienceEntities[0].data.title).toBe('Senior Backend Engineer');
      expect(experienceEntities[0].data.company).toBe('TechCorp Inc.');
      expect(experienceEntities[1].data.title).toBe('Software Engineer');
    });

    test('extracts education entities from EDUCATION', async () => {
      const result = await extractor.extract({
        sections: [sections[2]],
        rawText: sections[2].rawText,
      });

      const educationEntities = result.entities.filter((e) => e.type === 'education');
      expect(educationEntities.length).toBe(1);
      expect(educationEntities[0].data.degree).toBe('B.Tech');
      expect(educationEntities[0].data.institution).toContain('ABC University');
    });

    test('extracts skill entities from SKILLS', async () => {
      const result = await extractor.extract({
        sections: [sections[3]],
        rawText: sections[3].rawText,
      });

      const skillEntities = result.entities.filter((e) => e.type === 'skill');
      expect(skillEntities.length).toBeGreaterThanOrEqual(5);
      expect(skillEntities.map((e) => (e.data as any).name)).toContain('Java');
      expect(skillEntities.map((e) => (e.data as any).name)).toContain('Python');
    });

    test('extracts project entities from PROJECTS', async () => {
      const result = await extractor.extract({
        sections: [sections[4]],
        rawText: sections[4].rawText,
      });

      const projectEntities = result.entities.filter((e) => e.type === 'project');
      expect(projectEntities.length).toBe(1);
      expect(projectEntities[0].data.name).toBe('Microservices Migration');
    });

    test('extracts certification entities from CERTIFICATIONS', async () => {
      const result = await extractor.extract({
        sections: [sections[5]],
        rawText: sections[5].rawText,
      });

      const certEntities = result.entities.filter((e) => e.type === 'certification');
      expect(certEntities.length).toBe(1);
      expect(certEntities[0].data.title).toBe('AWS Solutions Architect');
      expect(certEntities[0].data.issuer).toBe('Amazon Web Services');
    });

    test('extracts achievement entities from ACHIEVEMENTS', async () => {
      const result = await extractor.extract({
        sections: [sections[6]],
        rawText: sections[6].rawText,
      });

      const achievementEntities = result.entities.filter((e) => e.type === 'achievement');
      expect(achievementEntities.length).toBe(2);
    });

    test('extracts language entities from LANGUAGES', async () => {
      const result = await extractor.extract({
        sections: [sections[7]],
        rawText: sections[7].rawText,
      });

      const languageEntities = result.entities.filter((e) => e.type === 'language');
      expect(languageEntities.length).toBe(3);
      expect(languageEntities.map((e) => (e.data as any).name)).toContain('English');
      expect(languageEntities.map((e) => (e.data as any).name)).toContain('Hindi');
    });

    test('returns empty for SUMMARY section', async () => {
      const result = await extractor.extract({
        sections: [sections[8]],
        rawText: sections[8].rawText,
      });

      expect(result.entities.length).toBe(0);
    });

    test('returns empty for empty sections and rawText', async () => {
      const result = await extractor.extract({
        sections: [],
        rawText: '',
      });

      expect(result.entities.length).toBe(0);
      expect(result.strategy).toBe('heuristic');
    });

    test('deduplicates entities across sections', async () => {
      const result = await extractor.extract({
        sections,
        rawText: sections.map((s) => s.rawText).join('\n'),
      });

      const skillEntities = result.entities.filter((e) => e.type === 'skill');
      const names = skillEntities.map((e) => (e.data as any).name?.toLowerCase());
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    test('filters entities below confidence threshold', async () => {
      const result = await extractor.extract({
        sections,
        rawText: sections.map((s) => s.rawText).join('\n'),
      });

      const lowConfidence = result.entities.filter((e) => e.confidence < 0.4);
      expect(lowConfidence.length).toBe(0);
    });

    test('assigns reviewStatus based on confidence', async () => {
      const result = await extractor.extract({
        sections,
        rawText: sections.map((s) => s.rawText).join('\n'),
      });

      const autoEntities = result.entities.filter((e) => e.reviewStatus === 'auto');
      const pendingEntities = result.entities.filter((e) => e.reviewStatus === 'pending');

      for (const entity of autoEntities) {
        expect(entity.confidence).toBeGreaterThanOrEqual(0.7);
      }
      for (const entity of pendingEntities) {
        expect(entity.confidence).toBeLessThan(0.7);
      }
    });

    test('sets mergedFrom when duplicates are found', async () => {
      const dupSections = [
        {
          title: 'SKILLS',
          order: 0,
          startLine: 0,
          endLine: 2,
          rawText: 'Java, Python, Node.js, Java, Python',
        },
      ];

      const result = await extractor.extract({
        sections: dupSections,
        rawText: dupSections[0].rawText,
      });

      const skillEntities = result.entities.filter((e) => e.type === 'skill');
      const merged = skillEntities.filter((e) => e.mergedFrom && e.mergedFrom.length > 0);
      expect(merged.length).toBeGreaterThan(0);
    });

    test('produces identical output for identical input', async () => {
      const result1 = await extractor.extract({
        sections: [sections[0]],
        rawText: sections[0].rawText,
      });
      const result2 = await extractor.extract({
        sections: [sections[0]],
        rawText: sections[0].rawText,
      });

      expect(result1.entities.length).toBe(result2.entities.length);
      expect(result1.strategy).toBe(result2.strategy);
      expect(result1.aiFallbackUsed).toBe(result2.aiFallbackUsed);
    });
  });

  describe('AI fallback', () => {
    test('triggers AI fallback when provider available and heuristic confidence low', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify([
            { type: 'person', confidence: 0.9, data: { name: 'AI Name', email: 'ai@example.com' } },
          ])
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const extractorWithAi = new ResumeEntityExtractor(mockAiProvider as any);
      const result = await extractorWithAi.extract({
        sections: [emptyHeader],
        rawText: '',
      });

      expect(result.aiFallbackUsed).toBe(true);
      expect(result.strategy).toBe('heuristic+ai');
      expect(mockAiProvider.generateJSON).toHaveBeenCalledTimes(1);
    });

    test('does not trigger AI fallback when provider unavailable', async () => {
      const extractorNoAi = new ResumeEntityExtractor();
      const result = await extractorNoAi.extract({
        sections: [emptyHeader],
        rawText: '',
      });

      expect(result.aiFallbackUsed).toBe(false);
      expect(result.strategy).toBe('heuristic');
    });

    test('handles AI fallback failure gracefully', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockRejectedValue(new Error('AI quota exceeded')),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const extractorWithAi = new ResumeEntityExtractor(mockAiProvider as any);
      const result = await extractorWithAi.extract({
        sections: [emptyHeader],
        rawText: '',
      });

      expect(result.aiFallbackUsed).toBe(false);
      expect(result.strategy).toBe('heuristic');
    });
  });

  describe('configurable AI model', () => {
    test('passes custom AI model to provider when configured', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify([
            { type: 'person', confidence: 0.9, data: { name: 'AI Name' } },
          ])
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const extractorWithCustomModel = new ResumeEntityExtractor(mockAiProvider as any, 'custom-model');
      const result = await extractorWithCustomModel.extract({
        sections: [emptyHeader],
        rawText: '',
      });

      expect(result.aiFallbackUsed).toBe(true);
      expect(mockAiProvider.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'custom-model', temperature: 0.1 })
      );
    });
  });
});
