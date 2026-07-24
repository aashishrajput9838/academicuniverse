import { ResumeSection, SectionDetectionOutput } from '../../models/ResumeSection';
import { IAIProvider, AIConfig } from '../../core/ai/ai.provider';
import { FailoverAIProvider } from '../../core/ai/failover.provider';
import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeSectionDetector');

export class ResumeSectionDetector {
  private readonly aiProvider: IAIProvider | null;
  private readonly aiModel?: string;

  constructor(aiProvider?: IAIProvider, aiModel?: string) {
    this.aiProvider = aiProvider || null;
    this.aiModel = aiModel;
  }

  /**
   * Stateless section detection.
   * Input: raw text, MIME type
   * Output: detected sections with strategy metadata
   */
  async detect(params: {
    rawText: string;
    mimeType: string;
  }): Promise<SectionDetectionOutput> {
    const { rawText, mimeType } = params;

    if (!rawText || rawText.trim().length === 0) {
      return {
        sections: [],
        strategy: 'heuristic',
        aiFallbackUsed: false,
      };
    }

    const lines = rawText.split('\n');
    const heuristicSections = this.applyHeuristics(lines, mimeType);

    const requiredSections = ['HEADER', 'EXPERIENCE', 'EDUCATION', 'SKILLS'];
    const missingRequired = requiredSections.filter(
      (req) => !heuristicSections.some((s) => s.title === req)
    );

    let finalSections = heuristicSections;
    let strategy: SectionDetectionOutput['strategy'] = 'heuristic';
    let aiFallbackUsed = false;

    if (missingRequired.length > 0 && this.aiProvider) {
      try {
        const aiSections = await this.invokeAiFallback(rawText, missingRequired);
        if (aiSections.length > 0) {
          finalSections = aiSections;
          strategy = 'heuristic+ai';
          aiFallbackUsed = true;
        }
      } catch (err) {
        logger.warn('ResumeSectionDetector: AI fallback failed, using heuristic result', { error: (err as Error).message });
      }
    }

    if (finalSections.length === 0) {
      finalSections = [
        {
          title: 'GENERAL',
          order: 0,
          startLine: 0,
          endLine: lines.length,
          rawText: rawText.trim(),
        },
      ];
      strategy = aiFallbackUsed ? 'ai-only' : 'heuristic';
    }

    return {
      sections: finalSections,
      strategy,
      aiFallbackUsed,
    };
  }

  /**
   * Apply heuristic rules to detect section boundaries.
   *
   * TODO(Sprint-5): Implement DOCX heading-style heuristics
   * (e.g., Word paragraph styles, Heading 1/Heading 2 levels)
   * when mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'.
   */
  private applyHeuristics(lines: string[], mimeType: string): ResumeSection[] {
    const sections: ResumeSection[] = [];
    const sectionHeaders = [
      { title: 'SUMMARY', patterns: [/^(SUMMARY|PROFILE|OBJECTIVE|ABOUT\s+ME)$/i] },
      { title: 'EDUCATION', patterns: [/^(EDUCATION|ACADEMIC|QUALIFICATION)S?$/i] },
      { title: 'EXPERIENCE', patterns: [/^(EXPERIENCE|EMPLOYMENT|WORK\s+HISTORY)$/i] },
      { title: 'PROJECTS', patterns: [/^(PROJECTS?|MAJOR\s+PROJECTS?)$/i] },
      { title: 'SKILLS', patterns: [/^(SKILLS?|TECHNICAL\s+SKILLS?|COMPETENCIES)$/i] },
      { title: 'CERTIFICATIONS', patterns: [/^(CERTIFICATIONS?|CERTIFICATES?|AWARDS?)$/i] },
      { title: 'ACHIEVEMENTS', patterns: [/^(ACHIEVEMENTS?|HONORS?)$/i] },
      { title: 'PUBLICATIONS', patterns: [/^(PUBLICATIONS?|RESEARCH)$/i] },
      { title: 'LANGUAGES', patterns: [/^(LANGUAGES?|INTERESTS?|HOBBIES)$/i] },
      { title: 'CONTACT', patterns: [/^(CONTACT|REFERENCES?)$/i] },
    ];

    let currentSection: ResumeSection | null = null;
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;

      const matchedHeader = sectionHeaders.find((header) =>
        header.patterns.some((pattern) => pattern.test(line))
      );

      if (matchedHeader) {
        if (currentSection) {
          currentSection.endLine = i;
          sections.push(currentSection);
        }
        currentSection = {
          title: matchedHeader.title,
          order: sectionOrder++,
          startLine: i,
          endLine: lines.length,
          rawText: line,
        };
      } else if (currentSection) {
        currentSection.rawText += '\n' + line;
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Invoke AI fallback for section segmentation.
   */
  private async invokeAiFallback(rawText: string, missingRequired: string[]): Promise<ResumeSection[]> {
    if (!this.aiProvider) {
      return [];
    }

    const prompt = `You are a resume section detector. Split the following resume text into sections.
Required sections that are missing: ${missingRequired.join(', ')}.

Return a JSON array of sections with this exact format:
[
  { "title": "HEADER", "startLine": 0, "endLine": 3 },
  { "title": "EXPERIENCE", "startLine": 4, "endLine": 10 }
]

Rules:
- Use exact titles: HEADER, SUMMARY, EXPERIENCE, EDUCATION, PROJECTS, SKILLS, CERTIFICATIONS, ACHIEVEMENTS, PUBLICATIONS, LANGUAGES, CONTACT
- startLine and endLine are 0-based line indices from the provided text
- Ensure all required sections are present: HEADER, EXPERIENCE, EDUCATION, SKILLS
- If a section is not present, do not include it

Resume text:
${rawText}`;

    const aiConfig: AIConfig = { temperature: 0.1 };
    if (this.aiModel) {
      aiConfig.model = this.aiModel;
    }

    const response = await this.aiProvider.generateJSON<string>(prompt, aiConfig);

    const parsed = JSON.parse(response);
    if (!Array.isArray(parsed)) {
      throw new Error('AI fallback returned non-array response');
    }

    return parsed.map((section: any, index: number) => ({
      title: section.title || 'GENERAL',
      order: index,
      startLine: section.startLine ?? 0,
      endLine: section.endLine ?? 0,
      rawText: rawText.split('\n').slice(section.startLine ?? 0, section.endLine ?? 0).join('\n'),
    }));
  }
}

export const resumeSectionDetector = new ResumeSectionDetector();
