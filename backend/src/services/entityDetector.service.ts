import {
  ExtractedEntity,
  ExtractionIssue,
  ExtractionOptions,
} from './milestone2.types';
import { ExtractedDocument, ExtractedParagraph, DocxLocation } from '../docxExtraction.service';

interface EntityDetectorConfig {
  enableAiAssistance: boolean;
  googleAiApiKey?: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_IN_REGEX = /(\+91[\s-]?)?[6-9]\d{9}/;
const PHONE_US_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_REGEX = /https?:\/\/[^\s]+/;
const YEAR_IN_RANGE_REGEX = /(19|20)\d{2}\s*-\s*(19|20)\d{2}/;
const MONTH_YEAR_REGEX = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(19|20)\d{2}/i;
const CGPA_REGEX = /\d\.\d+\s*(cgpa|gpa)?/i;
const NAME_ALL_CAPS_REGEX = /^[A-Z][A-Z\s]{2,}$/;
const NAME_TITLE_CASE_REGEX = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;

const SECTION_TYPE_MAP: Record<string, string[]> = {
  'summary': ['name', 'email', 'phone', 'url'],
  'skills': ['skill'],
  'education': ['education', 'date'],
  'experience': ['experience', 'date', 'url'],
  'projects': ['experience', 'skill'],
  'certifications': ['education', 'date'],
  'languages': ['skill'],
};

export class EntityDetectorService {
  constructor(private config: EntityDetectorConfig) {}

  async detect(document: ExtractedDocument, sections: { title: string }[]): Promise<{ entities: ExtractedEntity[]; issues: ExtractionIssue[] }> {
    const entities: ExtractedEntity[] = [];
    const issues: ExtractionIssue[] = [];

    for (const section of sections) {
      const sectionEntities = await this.detectEntitiesInSection(document, section, issues);
      entities.push(...sectionEntities);
    }

    const deduped = this.overlapAwareDeduplicate(entities);
    const sorted = this.sortEntitiesByLocation(deduped);

    const validationIssues = this.validateEntities(sorted, document);
    issues.push(...validationIssues);

    return { entities: sorted, issues };
  }

  private async detectEntitiesInSection(
    document: ExtractedDocument,
    section: { title: string },
    issues: ExtractionIssue[]
  ): Promise<ExtractedEntity[]> {
    const titleLower = section.title.toLowerCase();
    const matchedTypes = this.getSectionType(titleLower);
    const entities: ExtractedEntity[] = [];

    const relevantParagraphs = this.getRelevantParagraphs(document, titleLower);

    for (const paragraph of relevantParagraphs) {
      const text = paragraph.rawText;

      for (const run of paragraph.runs) {
        const runEntities = this.extractFromRun(run, matchedTypes, issues);
        entities.push(...runEntities);
      }

      const paragraphEntities = this.extractFromParagraphText(paragraph, matchedTypes);
      entities.push(...paragraphEntities);

      if (this.config.enableAiAssistance && text.length > 200) {
        try {
          const aiEntities = await this.extractWithAi(text, section.title, matchedTypes);
          entities.push(...aiEntities);
        } catch (error: any) {
          issues.push({
            severity: 'warning',
            message: `AI entity detection failed for section "${section.title}": ${error.message}`,
          });
        }
      }
    }

    return entities;
  }

  private extractFromRun(run: { text: string; location?: DocxLocation }, allowedTypes: string[], issues: ExtractionIssue[]): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const text = run.text;

    if (!text || text.trim().length === 0) return entities;

    const emailMatch = text.match(EMAIL_REGEX);
    if (emailMatch && allowedTypes.includes('email')) {
      entities.push({
        type: 'email',
        value: emailMatch[0],
        location: run.location,
        confidence: 0.95,
      });
    }

    const phoneInMatch = text.match(PHONE_IN_REGEX);
    if (phoneInMatch && allowedTypes.includes('phone')) {
      entities.push({
        type: 'phone',
        value: phoneInMatch[0],
        location: run.location,
        confidence: 0.9,
      });
    }

    const phoneUsMatch = text.match(PHONE_US_REGEX);
    if (phoneUsMatch && allowedTypes.includes('phone')) {
      entities.push({
        type: 'phone',
        value: phoneUsMatch[0],
        location: run.location,
        confidence: 0.85,
      });
    }

    const urlMatch = text.match(URL_REGEX);
    if (urlMatch && allowedTypes.includes('url')) {
      entities.push({
        type: 'url',
        value: urlMatch[0],
        location: run.location,
        confidence: 0.9,
      });
    }

    const yearInRangeMatch = text.match(YEAR_IN_RANGE_REGEX);
    if (yearInRangeMatch && allowedTypes.includes('date')) {
      entities.push({
        type: 'date',
        value: yearInRangeMatch[0],
        location: run.location,
        confidence: 0.8,
      });
    }

    const monthYearMatch = text.match(MONTH_YEAR_REGEX);
    if (monthYearMatch && allowedTypes.includes('date')) {
      entities.push({
        type: 'date',
        value: monthYearMatch[0],
        location: run.location,
        confidence: 0.85,
      });
    }

    const cgpaMatch = text.match(CGPA_REGEX);
    if (cgpaMatch && allowedTypes.includes('education')) {
      entities.push({
        type: 'education',
        value: cgpaMatch[0].trim(),
        location: run.location,
        confidence: 0.8,
      });
    }

    return entities;
  }

  private extractFromParagraphText(paragraph: { rawText: string; runs: any[] }, allowedTypes: string[]): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const text = paragraph.rawText;
    if (!text || text.trim().length === 0) return entities;

    const location = paragraph.runs.length > 0 ? paragraph.runs[0].location : undefined;

    const nameMatch = this.extractNameFromText(text, location);
    if (nameMatch && allowedTypes.includes('name')) {
      entities.push(nameMatch);
    }

    const emailMatch = text.match(EMAIL_REGEX);
    if (emailMatch && allowedTypes.includes('email')) {
      entities.push({
        type: 'email',
        value: emailMatch[0],
        location,
        confidence: 0.95,
      });
    }

    const phoneInMatch = text.match(PHONE_IN_REGEX);
    if (phoneInMatch && allowedTypes.includes('phone')) {
      entities.push({
        type: 'phone',
        value: phoneInMatch[0],
        location,
        confidence: 0.9,
      });
    }

    const phoneUsMatch = text.match(PHONE_US_REGEX);
    if (phoneUsMatch && allowedTypes.includes('phone')) {
      entities.push({
        type: 'phone',
        value: phoneUsMatch[0],
        location,
        confidence: 0.85,
      });
    }

    const urlMatch = text.match(URL_REGEX);
    if (urlMatch && allowedTypes.includes('url')) {
      entities.push({
        type: 'url',
        value: urlMatch[0],
        location,
        confidence: 0.9,
      });
    }

    const yearInRangeMatch = text.match(YEAR_IN_RANGE_REGEX);
    if (yearInRangeMatch && allowedTypes.includes('date')) {
      entities.push({
        type: 'date',
        value: yearInRangeMatch[0],
        location,
        confidence: 0.8,
      });
    }

    const monthYearMatch = text.match(MONTH_YEAR_REGEX);
    if (monthYearMatch && allowedTypes.includes('date')) {
      entities.push({
        type: 'date',
        value: monthYearMatch[0],
        location,
        confidence: 0.85,
      });
    }

    const cgpaMatch = text.match(CGPA_REGEX);
    if (cgpaMatch && allowedTypes.includes('education')) {
      entities.push({
        type: 'education',
        value: cgpaMatch[0].trim(),
        location,
        confidence: 0.8,
      });
    }

    return entities;
  }

  private extractNameFromText(text: string, location?: DocxLocation): ExtractedEntity | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (NAME_ALL_CAPS_REGEX.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
      return {
        type: 'name',
        value: trimmed,
        location,
        confidence: 0.85,
      };
    }

    if (NAME_TITLE_CASE_REGEX.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
      return {
        type: 'name',
        value: trimmed,
        location,
        confidence: 0.8,
      };
    }

    const leadingCapsMatch = trimmed.match(/^([A-Z][A-Z\s]{2,})/);
    if (leadingCapsMatch) {
      const candidate = leadingCapsMatch[1].trim();
      const words = candidate.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2) {
        return {
          type: 'name',
          value: candidate,
          location,
          confidence: 0.75,
        };
      }
    }

    const longCapsMatch = trimmed.match(/^([A-Z]{5,})/);
    if (longCapsMatch) {
      const candidate = longCapsMatch[1];
      if (candidate.length >= 8) {
        return {
          type: 'name',
          value: candidate,
          location,
          confidence: 0.7,
        };
      }
    }

    return null;
  }

  private validateEntities(entities: ExtractedEntity[], document: ExtractedDocument): ExtractionIssue[] {
    const issues: ExtractionIssue[] = [];

    const hasDuplicate = this.checkForDuplicates(entities);
    if (hasDuplicate) {
      issues.push({
        severity: 'warning',
        message: 'Duplicate entities detected; some entities may overlap.',
      });
    }

    const hasName = entities.some(e => e.type === 'name');
    if (!hasName && document.paragraphs.length > 0) {
      const firstParagraphText = document.paragraphs[0].rawText.trim();
      if (firstParagraphText.length > 0 && !firstParagraphText.includes('@') && !/[6-9]\d{9}/.test(firstParagraphText)) {
        issues.push({
          severity: 'warning',
          message: 'Expected resume name not detected in first paragraph.',
        });
      }
    }

    return issues;
  }

  private checkForDuplicates(entities: ExtractedEntity[]): boolean {
    const seen = new Map<string, ExtractedEntity>();
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
      if (seen.has(key)) {
        return true;
      }
      seen.set(key, entity);
    }
    return false;
  }

  private async extractWithAi(text: string, sectionTitle: string, allowedTypes: string[]): Promise<ExtractedEntity[]> {
    if (!this.config.enableAiAssistance) {
      return [];
    }
    if (!this.config.googleAiApiKey) {
      return [];
    }

    const entities: ExtractedEntity[] = [];

    try {
      const genaiModule = await import('@google/genai');
      const GoogleGenerativeAI = (genaiModule as any).GoogleGenerativeAI || (genaiModule as any).default;
      const ai = new GoogleGenerativeAI(this.config.googleAiApiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are extracting structured entities from a resume section.

Section: ${sectionTitle}
Allowed entity types: ${allowedTypes.join(', ')}

Content: ${text}

Extract entities as JSON array with this schema:
[
  {
    "type": "name" | "email" | "phone" | "url" | "date" | "address" | "education" | "skill" | "experience",
    "value": "extracted text",
    "confidence": 0.0-1.0
  }
]

Rules:
- Prefer specific values over vague ones.
- If a phone appears, classify as phone even if email is also present.
- For education, extract the degree+institution combo as a single entity.
- For skills, list each distinct skill as a separate entity.
- Do NOT invent data not present in the text.
- Return [] if no entities.
- Only return entities matching allowed types: ${allowedTypes.join(', ')}.

Return ONLY the JSON array. No markdown, no explanation.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ type: string; value: string; confidence: number }>;
      
      for (const item of parsed) {
        if (allowedTypes.includes(item.type) && item.value && item.value.trim().length > 0) {
          entities.push({
            type: item.type as ExtractedEntity['type'],
            value: item.value.trim(),
            confidence: Math.min(1.0, Math.max(0.0, item.confidence)),
          });
        }
      }
    } catch (error: any) {
      throw new Error(`AI extraction failed: ${error.message}`);
    }

    return entities;
  }

  private getSectionType(titleLower: string): string[] {
    for (const [key, types] of Object.entries(SECTION_TYPE_MAP)) {
      if (titleLower.includes(key)) {
        return types;
      }
    }
    return ['name', 'email', 'phone', 'url'];
  }

  private getRelevantParagraphs(document: ExtractedDocument, _titleLower: string): ExtractedParagraph[] {
    return document.paragraphs.filter(p => p.runs.length > 0);
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, entity);
      } else if (entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }
    
    return Array.from(seen.values());
  }

  private overlapAwareDeduplicate(entities: ExtractedEntity[]): ExtractedEntity[] {
    const unique: ExtractedEntity[] = [];
    
    for (const entity of entities) {
      let isOverlap = false;
      
      for (const existing of unique) {
        if (entity.type !== existing.type) continue;
        
        const a = entity.value.toLowerCase().trim();
        const b = existing.value.toLowerCase().trim();
        
        if (a === b) {
          isOverlap = true;
          if (entity.confidence > existing.confidence) {
            existing.value = entity.value;
            existing.confidence = entity.confidence;
            existing.location = entity.location || existing.location;
          }
          break;
        }
        
        if (a.includes(b) || b.includes(a)) {
          isOverlap = true;
          if (a.length > b.length) {
            existing.value = entity.value;
            existing.confidence = entity.confidence;
            existing.location = entity.location || existing.location;
          }
          break;
        }
      }
      
      if (!isOverlap) {
        unique.push(entity);
      }
    }
    
    return unique;
  }

  private sortEntitiesByLocation(entities: ExtractedEntity[]): ExtractedEntity[] {
    return entities.sort((a, b) => {
      if (!a.location && !b.location) return 0;
      if (!a.location) return 1;
      if (!b.location) return -1;
      
      if (a.location.paragraphIndex !== b.location.paragraphIndex) {
        return a.location.paragraphIndex - b.location.paragraphIndex;
      }
      return a.location.runIndex - b.location.runIndex;
    });
  }
}
