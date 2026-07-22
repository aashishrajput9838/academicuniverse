import {
  DetectedSection,
  TemplateField,
  ExtractionIssue,
  ExtractionOptions,
} from './milestone2.types';
import { ExtractedDocument, ExtractedRun, ExtractedParagraph } from '../docxExtraction.service';
import { v4 as uuidv4 } from 'uuid';

const KNOWN_SECTION_KEYWORDS: Record<string, string[]> = {
  'summary': ['summary', 'objective', 'profile', 'about', 'about me'],
  'skills': ['skills', 'technical skills', 'core competencies', 'competencies'],
  'education': ['education', 'qualification', 'academic', 'academics'],
  'experience': ['experience', 'work history', 'employment', 'work experience', 'professional experience'],
  'projects': ['projects', 'publications', 'achievements'],
  'certifications': ['certifications', 'certificates', 'certification'],
  'languages': ['languages', 'hobbies', 'interests', 'references'],
};

const FIELD_INFERENCE: Record<string, TemplateField[]> = {
  'education': [
    { key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true },
    { key: 'institution', label: 'Institution', type: 'text', required: true, aiEnhanceable: true },
    { key: 'year', label: 'Year', type: 'date', required: false, aiEnhanceable: true },
    { key: 'cgpa', label: 'CGPA/GPA', type: 'text', required: false, aiEnhanceable: true },
  ],
  'experience': [
    { key: 'company', label: 'Company', type: 'text', required: true, aiEnhanceable: true },
    { key: 'role', label: 'Role', type: 'text', required: true, aiEnhanceable: true },
    { key: 'duration', label: 'Duration', type: 'text', required: false, aiEnhanceable: true },
    { key: 'responsibilities', label: 'Responsibilities', type: 'textarea', required: false, aiEnhanceable: true },
  ],
  'projects': [
    { key: 'name', label: 'Project Name', type: 'text', required: true, aiEnhanceable: true },
    { key: 'description', label: 'Description', type: 'textarea', required: false, aiEnhanceable: true },
    { key: 'tech_stack', label: 'Tech Stack', type: 'list', required: false, aiEnhanceable: true },
  ],
  'skills': [
    { key: 'category', label: 'Category', type: 'text', required: false, aiEnhanceable: true },
    { key: 'items', label: 'Skills', type: 'list', required: true, aiEnhanceable: true },
  ],
  'summary': [
    { key: 'text', label: 'Summary', type: 'textarea', required: true, aiEnhanceable: true },
  ],
  'certifications': [
    { key: 'name', label: 'Certification Name', type: 'text', required: true, aiEnhanceable: true },
    { key: 'issuer', label: 'Issuer', type: 'text', required: false, aiEnhanceable: true },
    { key: 'date', label: 'Date', type: 'date', required: false, aiEnhanceable: true },
  ],
  'default': [
    { key: 'text', label: 'Content', type: 'textarea', required: false, aiEnhanceable: true },
  ],
};

const REPEATABLE_SECTIONS = new Set(['experience', 'education', 'projects', 'publications', 'certifications']);
const REQUIRED_SECTIONS = new Set(['summary', 'skills', 'experience', 'education']);

export class SectionDetectorService {
  constructor(private options: ExtractionOptions = { enableAiAssistance: false }) {}

  detect(document: ExtractedDocument): { sections: DetectedSection[]; issues: ExtractionIssue[] } {
    const issues: ExtractionIssue[] = [];
    const headingCandidates = this.findHeadingCandidates(document);
    
    if (headingCandidates.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No clear section headings detected. Returning single "Content" section.',
      });
      
      const contentSection: DetectedSection = {
        id: uuidv4(),
        title: 'Content',
        order: 0,
        repeatable: false,
        fields: FIELD_INFERENCE['default'],
      };
      
      return { sections: [contentSection], issues };
    }

    const sections = this.buildSectionsFromCandidates(headingCandidates, document, issues);
    
    if (sections.length === 0) {
      issues.push({
        severity: 'error',
        message: 'No sections could be built from candidates.',
      });
      
      const contentSection: DetectedSection = {
        id: uuidv4(),
        title: 'Content',
        order: 0,
        repeatable: false,
        fields: FIELD_INFERENCE['default'],
      };
      
      return { sections: [contentSection], issues };
    }

    return { sections, issues };
  }

  private findHeadingCandidates(document: ExtractedDocument): Array<{ index: number; title: string; paragraphIndex: number; runIndex?: number; runText: string; titleKey?: string; rawConfidence: number }> {
    const candidates: Array<{ index: number; title: string; paragraphIndex: number; runIndex?: number; runText: string; titleKey?: string; rawConfidence: number }> = [];

    for (let pIndex = 0; pIndex < document.paragraphs.length; pIndex++) {
      const paragraph = document.paragraphs[pIndex];
      const rawText = paragraph.rawText.trim();
      
      if (!rawText || rawText.length === 0) continue;
      if (paragraph.runs.length === 0) continue;

      const firstRun = paragraph.runs[0];
      const isStyledHeading = firstRun.formatting.bold && (firstRun.formatting.fontSize || 0) >= 14;
      const isAllCapsOrTitleCase = /^[A-Z][A-Z\s]+$/.test(rawText) || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(rawText);
      const hasTrailingPunctuation = /[.:;!?]$/.test(rawText);
      const isKeywordMatch = this.matchKeyword(rawText);
      const startsWithBullet = /^[•\-\*\u2022\u2023\u2043\u204c\u204d]/.test(rawText) || /^(\d+\.\s|[a-zA-Z]\.\s)/.test(rawText);

      const isHeading = !startsWithBullet && (isStyledHeading || (isKeywordMatch && !hasTrailingPunctuation) || (isAllCapsOrTitleCase && isKeywordMatch));

      if (!isHeading && !isStyledHeading) continue;

      let titleKey: string | undefined;
      let confidence = 0.5;

      if (isStyledHeading) {
        confidence = 0.8;
      }

      const keywordMatch = this.matchKeywordWithKey(rawText);
      if (keywordMatch) {
        titleKey = keywordMatch.key;
        confidence = Math.max(confidence, 0.9);
      } else if (isStyledHeading && isAllCapsOrTitleCase) {
        titleKey = this.normalizeTitle(rawText);
        confidence = Math.max(confidence, 0.6);
      }

      const title = this.cleanTitle(rawText);
      if (title.length < 2 || title.length > 100) continue;

      if (confidence >= 0.6) {
        candidates.push({
          index: candidates.length,
          title,
          paragraphIndex: pIndex,
          runIndex: firstRun.runIndex,
          runText: rawText,
          titleKey,
          rawConfidence: confidence,
        });
      }
    }

    return candidates;
  }

  private matchKeyword(text: string): boolean {
    const lower = text.toLowerCase();
    return Object.values(KNOWN_SECTION_KEYWORDS).some(keywords =>
      keywords.some(keyword => lower.includes(keyword))
    );
  }

  private matchKeywordWithKey(text: string): { key: string; confidence: number } | null {
    const lower = text.toLowerCase();
    for (const [key, keywords] of Object.entries(KNOWN_SECTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return { key, confidence: 0.9 };
        }
      }
    }
    return null;
  }

  private cleanTitle(text: string): string {
    return text.replace(/[:\-–—]+$/, '').trim();
  }

  private normalizeTitle(text: string): string {
    return this.cleanTitle(text).toLowerCase();
  }

  private buildSectionsFromCandidates(
    candidates: Array<{ index: number; title: string; paragraphIndex: number; runIndex?: number; runText: string; titleKey?: string; rawConfidence: number }>,
    document: ExtractedDocument,
    issues: ExtractionIssue[]
  ): DetectedSection[] {
    const sections: DetectedSection[] = [];
    const mergedTitles = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      const current = candidates[i];
      const next = candidates[i + 1];

      if (mergedTitles.has(current.title.toLowerCase())) {
        issues.push({
          severity: 'warning',
          message: `Duplicate section "${current.title}" detected and skipped.`,
        });
        continue;
      }

      const startParagraph = current.paragraphIndex;
      const endParagraph = next ? next.paragraphIndex : document.paragraphs.length;
      
      const sectionRuns = this.extractSectionRuns(document, startParagraph, endParagraph);

      const titleKey = current.titleKey || this.normalizeTitle(current.title);
      const repeatable = REPEATABLE_SECTIONS.has(titleKey);
      const minEntries = REQUIRED_SECTIONS.has(titleKey) ? 1 : undefined;
      
      const fields = FIELD_INFERENCE[titleKey] || FIELD_INFERENCE['default'];

      const section: DetectedSection = {
        id: uuidv4(),
        title: current.title,
        order: sections.length,
        repeatable,
        maxEntries: repeatable ? undefined : 1,
        minEntries,
        fields: JSON.parse(JSON.stringify(fields)),
        aiPrompt: `Extract structured data for section: ${current.title}`,
      };

      sections.push(section);
      mergedTitles.add(current.title.toLowerCase());
    }

    return sections;
  }

  private extractSectionRuns(document: ExtractedDocument, start: number, end: number): ExtractedRun[] {
    const runs: ExtractedRun[] = [];
    for (let i = start; i < end; i++) {
      const paragraph = document.paragraphs[i];
      if (paragraph) {
        runs.push(...paragraph.runs);
      }
    }
    return runs;
  }
}
