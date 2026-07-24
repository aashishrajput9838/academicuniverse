import { ResumeSectionDetector } from '../services/resume/resumeSectionDetector.service';

describe('ResumeSectionDetector', () => {
  const detector = new ResumeSectionDetector();

  const wellStructuredResume = `John Doe
john.doe@example.com | +1-555-0199
linkedin.com/in/johndoe

SUMMARY
Senior backend engineer with 5+ years of experience in distributed systems.

EXPERIENCE
Senior Backend Engineer at TechCorp Inc. (2021-06-01 to Present)
- Led migration to microservices architecture
- Reduced latency by 40%

EDUCATION
B.Tech Computer Science, ABC University (2015-2019)

SKILLS
Java, Python, Node.js, PostgreSQL, Redis, Docker, Kubernetes

PROJECTS
Microservices Migration
- Led team of 5 engineers`;

  const missingExperienceResume = `John Doe
john.doe@example.com

SUMMARY
Senior backend engineer with 5+ years of experience.

EDUCATION
B.Tech Computer Science, ABC University

SKILLS
Java, Python, Node.js`;

  const plainText = `This is a plain text document without any resume sections.
It just contains some random paragraphs.
There are no headings or structured content here.`;

  describe('detect()', () => {
    test('detects sections in well-structured resume', async () => {
      const result = await detector.detect({
        rawText: wellStructuredResume,
        mimeType: 'application/pdf',
      });

      expect(result.sections.length).toBeGreaterThanOrEqual(5);
      expect(result.strategy).toBe('heuristic');
      expect(result.aiFallbackUsed).toBe(false);

      const titles = result.sections.map((s) => s.title);
      expect(titles).toContain('SUMMARY');
      expect(titles).toContain('EXPERIENCE');
      expect(titles).toContain('EDUCATION');
      expect(titles).toContain('SKILLS');
    });

    test('returns GENERAL section for plain text', async () => {
      const result = await detector.detect({
        rawText: plainText,
        mimeType: 'text/plain',
      });

      expect(result.sections.length).toBe(1);
      expect(result.sections[0].title).toBe('GENERAL');
      expect(result.sections[0].rawText).toBe(plainText.trim());
    });

    test('returns empty sections for empty rawText', async () => {
      const result = await detector.detect({
        rawText: '',
        mimeType: 'application/pdf',
      });

      expect(result.sections.length).toBe(0);
      expect(result.strategy).toBe('heuristic');
    });

    test('detects missing required section and triggers AI fallback when provider available', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify([
            { title: 'SUMMARY', startLine: 2, endLine: 3 },
            { title: 'EXPERIENCE', startLine: 4, endLine: 5 },
            { title: 'EDUCATION', startLine: 6, endLine: 7 },
            { title: 'SKILLS', startLine: 8, endLine: 9 },
          ])
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const detectorWithAi = new ResumeSectionDetector(mockAiProvider as any);
      const result = await detectorWithAi.detect({
        rawText: missingExperienceResume,
        mimeType: 'application/pdf',
      });

      expect(result.aiFallbackUsed).toBe(true);
      expect(result.strategy).toBe('heuristic+ai');
      expect(mockAiProvider.generateJSON).toHaveBeenCalledTimes(1);
    });

    test('does not trigger AI fallback when provider unavailable', async () => {
      const detectorNoAi = new ResumeSectionDetector();
      const result = await detectorNoAi.detect({
        rawText: missingExperienceResume,
        mimeType: 'application/pdf',
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

      const detectorWithAi = new ResumeSectionDetector(mockAiProvider as any);
      const result = await detectorWithAi.detect({
        rawText: missingExperienceResume,
        mimeType: 'application/pdf',
      });

      expect(result.aiFallbackUsed).toBe(false);
      expect(result.strategy).toBe('heuristic');
    });

    test('passes custom AI model to provider when configured', async () => {
      const mockAiProvider = {
        generateJSON: jest.fn().mockResolvedValue(
          JSON.stringify([
            { title: 'SUMMARY', startLine: 2, endLine: 3 },
            { title: 'EXPERIENCE', startLine: 4, endLine: 5 },
            { title: 'EDUCATION', startLine: 6, endLine: 7 },
            { title: 'SKILLS', startLine: 8, endLine: 9 },
          ])
        ),
        isAvailable: () => true,
        getProviderName: () => 'MockAI',
      };

      const detectorWithCustomModel = new ResumeSectionDetector(mockAiProvider as any, 'custom-model');
      const result = await detectorWithCustomModel.detect({
        rawText: missingExperienceResume,
        mimeType: 'application/pdf',
      });

      expect(result.aiFallbackUsed).toBe(true);
      expect(mockAiProvider.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'custom-model', temperature: 0.1 })
      );
    });
  });

  describe('statelessness', () => {
    test('produces identical output for identical input', () => {
      const result1 = detector.detect({ rawText: wellStructuredResume, mimeType: 'application/pdf' });
      const result2 = detector.detect({ rawText: wellStructuredResume, mimeType: 'application/pdf' });

      expect(result1).toEqual(result2);
    });
  });
});
