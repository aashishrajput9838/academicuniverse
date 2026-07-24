import { ResumeSection, SectionDetectionOutput } from '../../models/ResumeSection';
import { ResumeEntity, EntityExtractionOutput } from '../../models/ResumeEntity';
import { IAIProvider, AIConfig } from '../../core/ai/ai.provider';
import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeEntityExtractor');

const SECTION_ORDER = [
  'HEADER',
  'EXPERIENCE',
  'EDUCATION',
  'PROJECTS',
  'SKILLS',
  'CERTIFICATIONS',
  'ACHIEVEMENTS',
  'LANGUAGES',
  'SUMMARY',
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,;:\-()[\]{}/\\|]/g, '')
    .replace(/\s+/g, ' ');
}

function sectionPriority(title: string): number {
  const idx = SECTION_ORDER.indexOf(title.toUpperCase());
  return idx === -1 ? SECTION_ORDER.length : idx;
}

export class ResumeEntityExtractor {
  private readonly aiProvider: IAIProvider | null;
  private readonly aiModel?: string;

  constructor(aiProvider?: IAIProvider, aiModel?: string) {
    this.aiProvider = aiProvider || null;
    this.aiModel = aiModel;
  }

  async extract(params: {
    sections: ResumeSection[];
    rawText: string;
  }): Promise<EntityExtractionOutput> {
    const { sections, rawText } = params;

    if (!sections || sections.length === 0) {
      if (!rawText || rawText.trim().length === 0) {
        return { entities: [], strategy: 'heuristic', aiFallbackUsed: false };
      }
    }

    const ordered = [...sections].sort((a, b) => sectionPriority(a.title) - sectionPriority(b.title));

    const entities: ResumeEntity[] = [];
    let aiFallbackUsed = false;
    let needsAi = false;

    for (const section of ordered) {
      const sectionEntities = this.extractSection(section);
      entities.push(...sectionEntities);

      if (sectionEntities.length > 0) {
        const avgConf = sectionEntities.reduce((sum, e) => sum + e.confidence, 0) / sectionEntities.length;
        if (avgConf < 0.5) {
          needsAi = true;
        }
      } else if (['HEADER', 'EXPERIENCE', 'EDUCATION', 'SKILLS'].includes(section.title.toUpperCase())) {
        needsAi = true;
      }
    }

    if (needsAi && this.aiProvider) {
      try {
        const aiEntities = await this.invokeAiFallback(rawText, ordered);
        if (aiEntities.length > 0) {
          entities.push(...aiEntities);
          aiFallbackUsed = true;
        }
      } catch (err) {
        logger.warn('ResumeEntityExtractor: AI fallback failed, using heuristic result', { error: (err as Error).message });
      }
    }

    const deduped = this.deduplicate(entities.filter((e) => e.confidence >= 0.4));

    const strategy: EntityExtractionOutput['strategy'] = aiFallbackUsed ? 'heuristic+ai' : 'heuristic';

    return {
      entities: deduped.map((e) => ({
        ...e,
        reviewStatus: e.confidence >= 0.7 ? 'auto' : 'pending',
      })),
      strategy,
      aiFallbackUsed,
    };
  }

  private extractSection(section: ResumeSection): ResumeEntity[] {
    const title = section.title.toUpperCase();
    const text = section.rawText || '';

    switch (title) {
      case 'HEADER':
        return this.extractHeader(text, section.title);
      case 'EXPERIENCE':
        return this.extractExperience(text, section.title);
      case 'EDUCATION':
        return this.extractEducation(text, section.title);
      case 'PROJECTS':
        return this.extractProjects(text, section.title);
      case 'SKILLS':
        return this.extractSkills(text, section.title);
      case 'CERTIFICATIONS':
        return this.extractCertifications(text, section.title);
      case 'ACHIEVEMENTS':
        return this.extractAchievements(text, section.title);
      case 'LANGUAGES':
        return this.extractLanguages(text, section.title);
      case 'SUMMARY':
        return [];
      default:
        return [];
    }
  }

  private extractHeader(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length === 0) return entities;

    const name = lines[0];
    entities.push({
      type: 'person',
      confidence: 0.9,
      sourceSection,
      data: { name },
      extractedBy: 'heuristic',
    });

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      entities.push({
        type: 'person',
        confidence: 0.95,
        sourceSection,
        data: { email: emailMatch[0] },
        extractedBy: 'heuristic',

      });
    }

    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      entities.push({
        type: 'person',
        confidence: 0.9,
        sourceSection,
        data: { phone: phoneMatch[0] },
        extractedBy: 'heuristic',

      });
    }

    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
    if (linkedinMatch) {
      entities.push({
        type: 'person',
        confidence: 0.95,
        sourceSection,
        data: { linkedin: linkedinMatch[0] },
        extractedBy: 'heuristic',

      });
    }

    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9-]+/i);
    if (githubMatch) {
      entities.push({
        type: 'person',
        confidence: 0.95,
        sourceSection,
        data: { github: githubMatch[0] },
        extractedBy: 'heuristic',

      });
    }

    return entities;
  }

  private extractExperience(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    const datePattern = /(\d{4}-\d{2}-\d{2}|Present)/g;
    const titleCompanyPattern = /^(.+?)\s+(?:at|@|,|\s-\s)\s+(.+?)(?:\s*\(|$)/i;

    let current: Partial<Record<string, any>> = {};
    const bullets: string[] = [];

    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('*')) {
        bullets.push(line.replace(/^[-*]\s*/, ''));
        continue;
      }

      const tcMatch = line.match(titleCompanyPattern);
      if (tcMatch) {
        if (current.title) {
          entities.push({
            type: 'experience',
            confidence: 0.75,
            sourceSection,
            data: {
              title: current.title,
              company: current.company,
              startDate: current.startDate,
              endDate: current.endDate,
              current: current.current || false,
              description: bullets.join('\n'),
              bullets: [...bullets],
            },
            extractedBy: 'heuristic',
    
          });
          bullets.length = 0;
        }
        current = {
          title: tcMatch[1].trim(),
          company: tcMatch[2].trim(),
        };
      }

      const dates = line.match(datePattern);
      if (dates && dates.length >= 1) {
        current.startDate = dates[0];
        current.endDate = dates[1] || null;
        current.current = dates[1] === undefined || dates[1] === 'Present';
      }
    }

    if (current.title) {
      entities.push({
        type: 'experience',
        confidence: 0.75,
        sourceSection,
        data: {
          title: current.title,
          company: current.company,
          startDate: current.startDate,
          endDate: current.endDate,
          current: current.current || false,
          description: bullets.join('\n'),
          bullets: [...bullets],
        },
        extractedBy: 'heuristic',

      });
    }

    return entities;
  }

  private extractEducation(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const degreePattern = /\b(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|PhD|MBA|B\.?A|M\.?A|B\.?E|M\.?E|Bachelor|Master|Diploma)\b/i;
    const institutionPattern = /(University|Institute|College|School)/i;
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const gpaPattern = /(?:GPA|CGPA)[:\s]+([\d.]+)/i;

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    for (const line of lines) {
      const degreeMatch = line.match(degreePattern);
      const institutionMatch = line.match(institutionPattern);
      const years = line.match(yearPattern);
      const gpaMatch = line.match(gpaPattern);

      if (degreeMatch || institutionMatch) {
        entities.push({
          type: 'education',
          confidence: degreeMatch && institutionMatch ? 0.85 : 0.7,
          sourceSection,
          data: {
            degree: degreeMatch ? degreeMatch[0] : undefined,
            institution: institutionMatch ? line : undefined,
            startDate: years && years.length >= 1 ? years[0] : undefined,
            endDate: years && years.length >= 2 ? years[1] : undefined,
            gpa: gpaMatch ? gpaMatch[1] : undefined,
          },
          extractedBy: 'heuristic',
  
        });
      }
    }

    return entities;
  }

  private extractSkills(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const delimiters = /[,;|\n]+/;
    const rawSkills = text.split(delimiters).map((s) => s.trim()).filter((s) => s.length > 0);

    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'with', 'for', 'etc']);

    for (const skill of rawSkills) {
      const normalized = skill.toLowerCase();
      if (stopWords.has(normalized) || normalized.length < 2) continue;

      entities.push({
        type: 'skill',
        confidence: 0.75,
        sourceSection,
        data: { name: skill },
        extractedBy: 'heuristic',

      });
    }

    return entities;
  }

  private extractProjects(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    let current: { name?: string; description?: string; bullets: string[]; techStack: string[] } = {
      bullets: [],
      techStack: [],
    };

    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('*')) {
        current.bullets.push(line.replace(/^[-*]\s*/, ''));
        continue;
      }

      if (current.name) {
        entities.push({
          type: 'project',
          confidence: 0.75,
          sourceSection,
          data: {
            name: current.name,
            description: current.description || current.bullets.join('\n'),
            techStack: current.techStack,
          },
          extractedBy: 'heuristic',
  
        });
        current = { bullets: [], techStack: [] };
      }

      current.name = line;
    }

    if (current.name) {
      entities.push({
        type: 'project',
        confidence: 0.75,
        sourceSection,
        data: {
          name: current.name,
          description: current.description || current.bullets.join('\n'),
          techStack: current.techStack,
        },
        extractedBy: 'heuristic',

      });
    }

    return entities;
  }

  private extractCertifications(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const issuerPattern = /(?:from|by|issued by)\s+(.+)/i;
    const datePattern = /(\d{4}-\d{2}-\d{2}|\w+\s+\d{4}|\(\d{4}-\d{2}-\d{2}\))/;
    const credentialPattern = /(?:ID|#|Credential)[:\s]+([a-zA-Z0-9-]+)/i;

    for (const line of lines) {
      const issuerMatch = line.match(issuerPattern);
      const dateMatch = line.match(datePattern);
      const credentialMatch = line.match(credentialPattern);

      entities.push({
        type: 'certification',
        confidence: issuerMatch ? 0.8 : 0.7,
        sourceSection,
        data: {
          title: issuerMatch ? line.replace(issuerMatch[0], '').trim() : line,
          issuer: issuerMatch ? issuerMatch[1].replace(datePattern, '').trim() : undefined,
          issueDate: dateMatch ? dateMatch[0] : undefined,
          credentialId: credentialMatch ? credentialMatch[1] : undefined,
        },
        extractedBy: 'heuristic',
      });
    }

    return entities;
  }

  private extractAchievements(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    for (const line of lines) {
      if (line.length > 5) {
        entities.push({
          type: 'achievement',
          confidence: 0.6,
          sourceSection,
          data: { title: line, description: line },
          extractedBy: 'heuristic',
  
        });
      }
    }

    return entities;
  }

  private extractLanguages(text: string, sourceSection: string): ResumeEntity[] {
    const entities: ResumeEntity[] = [];
    const knownLanguages = [
      'English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean',
      'Arabic', 'Portuguese', 'Russian', 'Bengali', 'Urdu', 'Punjabi', 'Tamil', 'Telugu',
      'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Nepali', 'Sinhala', 'Thai', 'Vietnamese',
    ];
    const proficiencyPattern = /(native|fluent|conversational|basic|elementary|advanced|intermediate)/i;

    const delimiters = /[,;|\n]+/;
    const rawItems = text.split(delimiters).map((s) => s.trim()).filter((s) => s.length > 0);

    for (const item of rawItems) {
      const langMatch = knownLanguages.find((lang) => item.toLowerCase().includes(lang.toLowerCase()));
      const profMatch = item.match(proficiencyPattern);

      if (langMatch) {
        entities.push({
          type: 'language',
          confidence: profMatch ? 0.85 : 0.7,
          sourceSection,
          data: {
            name: langMatch,
            proficiency: profMatch ? profMatch[1] : undefined,
          },
          extractedBy: 'heuristic',
  
        });
      }
    }

    return entities;
  }

  private deduplicate(entities: ResumeEntity[]): ResumeEntity[] {
    const groups = new Map<string, ResumeEntity[]>();

    for (const entity of entities) {
      const data = entity.data as any;
      const identifier = data.name || data.title || data.email || data.phone || data.linkedin || data.github || '';
      const key = `${entity.type}:${normalizeName(identifier)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    // TODO(Sprint-5): Integrate CanonicalSkill alias registry for skill deduplication.
    const result: ResumeEntity[] = [];

    for (const group of groups.values()) {
      if (group.length === 1) {
        result.push(group[0]);
        continue;
      }

      group.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return sectionPriority(a.sourceSection) - sectionPriority(b.sourceSection);
      });

      const kept = { ...group[0] };
      kept.mergedFrom = group.map((e) => e.sourceSection);
      result.push(kept);
    }

    return result;
  }

  private async invokeAiFallback(rawText: string, sections: ResumeSection[]): Promise<ResumeEntity[]> {
    if (!this.aiProvider) {
      return [];
    }

    const prompt = `You are a resume entity extractor. Extract structured entities from the following resume section text.

Section: ${sections.map((s) => s.title).join(', ')}
Section text:
${rawText}

Expected entity types for these sections: person, experience, education, skill, project, certification, achievement, language

Return ONLY a valid JSON array of entities with this exact format:
[
  {
    "type": "experience",
    "confidence": 0.85,
    "data": {
      "title": "Senior Backend Engineer",
      "company": "TechCorp Inc.",
      "startDate": "2021-06-01",
      "endDate": null,
      "current": true,
      "description": "Led migration to microservices",
      "bullets": ["Reduced latency by 40%"]
    }
  }
]

Rules:
- Use exact type values: person, experience, education, skill, project, certification, achievement, language
- confidence must be between 0.0 and 1.0
- Include only entities you are confident about
- If no entities found, return empty array []
- Do NOT invent data not present in the text`;

    const aiConfig: AIConfig = { temperature: 0.1 };
    if (this.aiModel) {
      aiConfig.model = this.aiModel;
    }

    const response = await this.aiProvider.generateJSON<string>(prompt, aiConfig);

    const parsed = JSON.parse(response);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const VALID_TYPES = new Set([
      'person',
      'experience',
      'education',
      'skill',
      'project',
      'certification',
      'achievement',
      'language',
    ]);

    return parsed
      .filter((item: any) => {
        if (!item || typeof item !== 'object') return false;
        if (!VALID_TYPES.has(item.type)) return false;
        if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) return false;
        if (!item.data || typeof item.data !== 'object') return false;
        return true;
      })
      .map((item: any) => ({
        type: item.type,
        confidence: Math.max(0.4, Math.min(1.0, item.confidence)),
        sourceSection: sections[0]?.title || 'SUMMARY',
        data: item.data || {},
        extractedBy: 'ai' as const,
        reviewStatus: item.confidence >= 0.7 ? 'auto' : 'pending',
      }));
  }
}
