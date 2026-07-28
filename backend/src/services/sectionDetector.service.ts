import {
  DetectedSection,
  TemplateField,
  ExtractionIssue,
  ExtractionOptions,
} from './milestone2.types';
import { ExtractedDocument, ExtractedRun } from '../docxExtraction.service';
import { randomUUID as uuidv4 } from 'crypto';
import { HeadingDetector } from './headingDetector.service';
import {
  RESUME_PLACEHOLDERS,
  DEPRECATED_PLACEHOLDERS,
  SECTION_ORDER,
  SECTION_LABELS,
  ResumePlaceholder,
} from '../config/resumePlaceholders';

/**
 * Sections that can have multiple entries (e.g. multiple jobs, multiple degrees).
 * When a template contains repeatable section markers, each entry gets its own
 * set of fields — this is a FEATURE, not a duplicate.  The deduplication logic
 * only removes accidental duplicates *within a single section instance*.
 */
const REPEATABLE_SECTIONS = new Set(['experience', 'education', 'projects', 'publications', 'certifications']);
const REQUIRED_SECTIONS = new Set(['summary', 'skills', 'experience', 'education']);

/** Quick lookup: canonical key → placeholder definition */
const CANONICAL_BY_KEY = new Map<string, ResumePlaceholder>();
/** Quick lookup: alias → placeholder definition */
const CANONICAL_BY_ALIAS = new Map<string, ResumePlaceholder>();

for (const p of RESUME_PLACEHOLDERS) {
  CANONICAL_BY_KEY.set(p.key.toLowerCase(), p);
  if (p.aliases) {
    for (const alias of p.aliases) {
      CANONICAL_BY_ALIAS.set(alias.toLowerCase(), p);
    }
  }
}

/**
 * Resolve a raw placeholder key (e.g. "company", "experience_company", "employer")
 * to its canonical ResumePlaceholder definition.
 * Returns `null` for deprecated or unrecognised placeholders.
 */
function resolveCanonical(rawKey: string): ResumePlaceholder | null {
  const normalised = rawKey.toLowerCase().trim();

  // Skip deprecated placeholders — they must never generate form fields
  if (DEPRECATED_PLACEHOLDERS.has(normalised)) return null;

  // Direct match on canonical key
  const directMatch = CANONICAL_BY_KEY.get(normalised);
  if (directMatch) return directMatch;

  // Match on alias
  const aliasMatch = CANONICAL_BY_ALIAS.get(normalised);
  if (aliasMatch) return aliasMatch;

  return null;
}

export class SectionDetectorService {
  constructor(private options: ExtractionOptions = { enableAiAssistance: false }) {}

  detect(document: ExtractedDocument): { sections: DetectedSection[]; issues: ExtractionIssue[] } {
    const issues: ExtractionIssue[] = [];

    // ── Step 1: Extract actual {{placeholder}} tags from the document ──
    const rawPlaceholders = this.extractPlaceholderTags(document);

    if (rawPlaceholders.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No {{placeholder}} tags found in template. Returning empty sections.',
      });
      return { sections: [], issues };
    }

    // ── Step 2: Resolve each tag to its canonical definition ──
    // Deduplicate per canonical key — one occurrence of a canonical key
    // produces one logical field.  This removes the erroneous duplicates
    // caused by the old heading-inference approach.
    //
    // For repeatable sections (experience, projects, etc.) the same canonical
    // key may legitimately appear N times in the DOCX (once per entry).
    // We intentionally deduplicate here because the *form schema* should
    // contain exactly one field definition per canonical key; the UI can
    // then repeat the section as needed via the section's `repeatable` flag
    // and `maxEntries` / `minEntries` configuration.
    const seenCanonicalKeys = new Set<string>();
    const resolvedFields: Array<{ canonical: ResumePlaceholder; raw: string }> = [];

    for (const raw of rawPlaceholders) {
      const canonical = resolveCanonical(raw);
      if (!canonical) {
        issues.push({
          severity: 'info',
          message: `Placeholder '{{${raw}}}' is not a recognised canonical field and was skipped.`,
        });
        continue;
      }

      if (seenCanonicalKeys.has(canonical.key)) {
        // Same canonical key seen again — this is a duplicate occurrence in
        // the DOCX (either accidental or a repeatable entry marker).
        // We do NOT create a second field definition; the repeatable section
        // mechanism handles multiple entries at render time.
        continue;
      }

      seenCanonicalKeys.add(canonical.key);
      resolvedFields.push({ canonical, raw });
    }

    // ── Step 3: Group fields by canonical section ──
    const sectionFieldsMap = new Map<string, TemplateField[]>();

    for (const { canonical } of resolvedFields) {
      const sectionKey = canonical.section;
      if (!sectionFieldsMap.has(sectionKey)) {
        sectionFieldsMap.set(sectionKey, []);
      }

      const field: TemplateField = {
        key: canonical.key,
        label: canonical.label,
        type: canonical.type,
        required: canonical.required,
        aiEnhanceable: canonical.aiEnhanceable,
        placeholder: canonical.placeholder,
        validation: canonical.validation,
      };

      sectionFieldsMap.get(sectionKey)!.push(field);
    }

    // ── Step 4: Build heading map for headingParagraphIndex ──
    const headingDetector = new HeadingDetector(this.options);
    const headingCandidates = headingDetector.findHeadingCandidates(document);
    const headingIndexMap = this.buildHeadingIndexMap(headingCandidates);

    // ── Step 5: Build DetectedSection[] sorted by SECTION_ORDER ──
    const sortedSectionKeys = Array.from(sectionFieldsMap.keys()).sort((a, b) => {
      const orderA = SECTION_ORDER[a] ?? 99;
      const orderB = SECTION_ORDER[b] ?? 99;
      return orderA - orderB;
    });

    const sections: DetectedSection[] = [];

    for (let i = 0; i < sortedSectionKeys.length; i++) {
      const sectionKey = sortedSectionKeys[i];
      const fields = sectionFieldsMap.get(sectionKey)!;
      const repeatable = REPEATABLE_SECTIONS.has(sectionKey);
      const minEntries = REQUIRED_SECTIONS.has(sectionKey) ? 1 : undefined;
      const headingParagraphIndex = headingIndexMap.get(sectionKey) ?? -1;

      const section: DetectedSection = {
        id: uuidv4(),
        title: SECTION_LABELS[sectionKey] || sectionKey,
        order: i,
        repeatable,
        maxEntries: repeatable ? undefined : 1,
        minEntries,
        fields,
        headingParagraphIndex,
        aiPrompt: `Extract structured data for section: ${SECTION_LABELS[sectionKey] || sectionKey}`,
      };

      sections.push(section);
    }

    issues.push({
      severity: 'info',
      message: `Placeholder-based detection: ${rawPlaceholders.length} raw tags → ${seenCanonicalKeys.size} unique fields → ${sections.length} sections.`,
    });

    return { sections, issues };
  }

  /**
   * Extract all {{placeholder_key}} tags from the document's paragraph runs.
   * Returns raw key strings (without braces), preserving order of first occurrence.
   */
  private extractPlaceholderTags(document: ExtractedDocument): string[] {
    const tags: string[] = [];
    const fullText = document.paragraphs.map(p => p.rawText).join(' ');
    const regex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(fullText)) !== null) {
      tags.push(match[1].trim());
    }

    return tags;
  }

  /**
   * Map heading candidates to their semantic section keys so we can assign
   * `headingParagraphIndex` to each section for the PlaceholderInjector.
   */
  private buildHeadingIndexMap(
    candidates: Array<{ index: number; title: string; paragraphIndex: number; titleKey?: string }>
  ): Map<string, number> {
    const map = new Map<string, number>();

    for (const candidate of candidates) {
      const key = candidate.titleKey || candidate.title.toLowerCase().replace(/[:\-–—]+$/, '').trim();

      // Map heading keys to canonical section keys
      const sectionKey = this.headingKeyToSectionKey(key);
      if (sectionKey && !map.has(sectionKey)) {
        map.set(sectionKey, candidate.paragraphIndex);
      }
    }

    return map;
  }

  /**
   * Map a heading keyword (from HeadingDetector) to the canonical section key
   * used in RESUME_PLACEHOLDERS (personal, summary, skills, etc.)
   */
  private headingKeyToSectionKey(headingKey: string): string | null {
    const HEADING_TO_SECTION: Record<string, string> = {
      'summary': 'summary',
      'objective': 'summary',
      'profile': 'summary',
      'about': 'summary',
      'about me': 'summary',
      'skills': 'skills',
      'technical skills': 'skills',
      'core competencies': 'skills',
      'competencies': 'skills',
      'education': 'education',
      'qualification': 'education',
      'academic': 'education',
      'academics': 'education',
      'experience': 'experience',
      'work history': 'experience',
      'employment': 'experience',
      'work experience': 'experience',
      'professional experience': 'experience',
      'projects': 'projects',
      'publications': 'projects',
      'achievements': 'projects',
      'certifications': 'certifications',
      'certificates': 'certifications',
      'certification': 'certifications',
      'personal': 'personal',
      'personal information': 'personal',
      'contact': 'personal',
      'contact information': 'personal',
      'additional': 'additional',
      'additional information': 'additional',
      'other': 'additional',
      'languages': 'additional',
      'hobbies': 'additional',
      'interests': 'additional',
      'references': 'additional',
    };

    return HEADING_TO_SECTION[headingKey] || null;
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
