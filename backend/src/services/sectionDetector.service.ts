import {
  DetectedSection,
  TemplateField,
  ExtractionIssue,
  ExtractionOptions,
} from './milestone2.types';
import { ExtractedDocument, ExtractedRun } from '../docxExtraction.service';
import { v4 as uuidv4 } from 'uuid';
import { HeadingDetector } from './headingDetector.service';

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
    const headingDetector = new HeadingDetector(this.options);
    const headingCandidates = headingDetector.findHeadingCandidates(document);
    
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
        headingParagraphIndex: -1,
      };
      
      return { sections: [contentSection], issues };
    }

    return { sections, issues };
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

      const titleKey = current.titleKey || current.title.toLowerCase().replace(/[:\-–—]+$/, '').trim();
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
        headingParagraphIndex: current.paragraphIndex,
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
