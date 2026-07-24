import PizZip from 'pizzip';
import { Logger } from '../utils/logger';
import {
  CanonicalField,
  ExtractedPlaceholder,
  ValidationIssue,
  ValidationReport,
} from './placeholderValidator.types';

const logger = new Logger('PlaceholderValidator');

const CANONICAL_FIELDS: CanonicalField[] = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    section: 'personal',
    aliases: ['full_name', 'candidate_name'],
    suggestions: ['nam'],
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    section: 'personal',
    aliases: ['email_id', 'mail'],
    suggestions: ['e_mail'],
  },
  {
    key: 'phone',
    label: 'Phone',
    type: 'phone',
    required: true,
    section: 'personal',
    aliases: ['phone_number', 'mobile', 'contact'],
    suggestions: ['ph', 'mob'],
  },
  {
    key: 'url',
    label: 'URL',
    type: 'url',
    required: false,
    section: 'personal',
    aliases: ['website', 'linkedin', 'github'],
    suggestions: ['link'],
  },
  {
    key: 'text',
    label: 'Summary',
    type: 'textarea',
    required: true,
    section: 'summary',
    aliases: ['summary_text', 'about_me', 'profile'],
    suggestions: ['summry', 'abt', 'prof'],
  },
  {
    key: 'items',
    label: 'Skills',
    type: 'list',
    required: true,
    section: 'skills',
    aliases: ['skills_list', 'technical_skills'],
    suggestions: ['skill', 'skiils', 'skilss'],
  },
  {
    key: 'category',
    label: 'Category',
    type: 'text',
    required: false,
    section: 'skills',
    aliases: ['skill_category'],
    suggestions: ['catgory'],
  },
  {
    key: 'company',
    label: 'Company',
    type: 'text',
    required: true,
    section: 'experience',
    aliases: ['company_name', 'employer'],
    suggestions: ['compny', 'comp'],
  },
  {
    key: 'role',
    label: 'Role',
    type: 'text',
    required: true,
    section: 'experience',
    aliases: ['job_title', 'position'],
    suggestions: ['roll', 'roel', 'positon'],
  },
  {
    key: 'duration',
    label: 'Duration',
    type: 'text',
    required: false,
    section: 'experience',
    aliases: ['employment_duration', 'dates'],
    suggestions: ['duratn'],
  },
  {
    key: 'responsibilities',
    label: 'Responsibilities',
    type: 'textarea',
    required: false,
    section: 'experience',
    aliases: ['desc', 'description', 'duties'],
    suggestions: ['responsibilty'],
  },
  {
    key: 'degree',
    label: 'Degree',
    type: 'text',
    required: true,
    section: 'education',
    aliases: ['qualification', 'course'],
    suggestions: ['degre'],
  },
  {
    key: 'institution',
    label: 'Institution',
    type: 'text',
    required: true,
    section: 'education',
    aliases: ['school', 'college', 'university'],
    suggestions: ['inst', 'insitution'],
  },
  {
    key: 'year',
    label: 'Year',
    type: 'date',
    required: false,
    section: 'education',
    aliases: ['graduation_year', 'yop'],
    suggestions: ['yer', 'yr'],
  },
  {
    key: 'cgpa',
    label: 'CGPA/GPA',
    type: 'text',
    required: false,
    section: 'education',
    aliases: ['gpa', 'cgpa_score'],
    suggestions: ['cgpa_score'],
  },
  {
    key: 'project_name',
    label: 'Project Name',
    type: 'text',
    required: true,
    section: 'projects',
    aliases: ['project_name'],
    suggestions: ['proj_name'],
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    required: false,
    section: 'projects',
    aliases: ['project_desc', 'details'],
    suggestions: ['descr'],
  },
  {
    key: 'tech_stack',
    label: 'Tech Stack',
    type: 'list',
    required: false,
    section: 'projects',
    aliases: ['technologies', 'tools'],
    suggestions: ['tech'],
  },
  {
    key: 'certification_name',
    label: 'Certification Name',
    type: 'text',
    required: true,
    section: 'certifications',
    aliases: ['cert_name'],
    suggestions: ['cert'],
  },
  {
    key: 'issuer',
    label: 'Issuer',
    type: 'text',
    required: false,
    section: 'certifications',
    aliases: ['issuing_body', 'authority'],
    suggestions: ['issusr'],
  },
  {
    key: 'cert_date',
    label: 'Date',
    type: 'date',
    required: false,
    section: 'certifications',
    aliases: ['cert_date', 'issue_date'],
    suggestions: ['dt'],
  },
];

const RESERVED_WORDS = new Set([
  'sectionname',
  'each',
  'pagenumber',
  'date',
  'if',
  'else',
  'endif',
]);

export class PlaceholderValidator {
  private readonly canonicalKeys: Map<string, CanonicalField>;
  private readonly canonicalAliases: Map<string, CanonicalField>;
  private readonly canonicalSuggestions: Map<string, string[]>;

  constructor() {
    this.canonicalKeys = new Map();
    this.canonicalAliases = new Map();
    this.canonicalSuggestions = new Map();

    for (const field of CANONICAL_FIELDS) {
      this.canonicalKeys.set(field.key.toLowerCase(), field);
      for (const alias of field.aliases) {
        this.canonicalAliases.set(alias.toLowerCase(), field);
      }
      for (const suggestion of field.suggestions) {
        this.canonicalSuggestions.set(suggestion.toLowerCase(), field.key);
      }
      this.canonicalSuggestions.set(field.key.toLowerCase(), field.key);
    }
  }

  async validate(buffer: Buffer): Promise<ValidationReport> {
    const placeholders: ExtractedPlaceholder[] = [];
    const issues: ValidationIssue[] = [];

    try {
      const extracted = this.extractPlaceholders(buffer);
      placeholders.push(...extracted);
    } catch (error: any) {
      logger.error('Failed to extract placeholders:', error);
      return {
        valid: false,
        placeholders: [],
        issues: [
          {
            severity: 'error',
            code: 'UNKNOWN',
            placeholder: '',
            message: `DOCX parsing failed: ${error.message}`,
          },
        ],
        summary: {
          total: 0,
          unique: 0,
          duplicates: 0,
          missingRequired: [],
          unknown: [],
          misspelled: [],
          reservedConflicts: [],
        },
      };
    }

    const seen = new Map<string, ExtractedPlaceholder[]>();
    for (const ph of placeholders) {
      const normalized = ph.key.toLowerCase();
      const list = seen.get(normalized) || [];
      list.push(ph);
      seen.set(normalized, list);
    }

    const duplicates: string[] = [];
    for (const [normalized, list] of seen) {
      if (list.length > 1) {
        duplicates.push(normalized);
        for (const ph of list) {
          issues.push({
            severity: 'warning',
            code: 'DUPLICATE',
            placeholder: ph.raw,
            message: `Duplicate placeholder '${ph.key}' found ${list.length} times`,
            suggestion: `Standardize casing: use '${normalized}' everywhere`,
            location: ph.location,
          });
        }
      }
    }

    const unknown: string[] = [];
    const misspelled: string[] = [];
    const reservedConflicts: string[] = [];

    for (const ph of placeholders) {
      const normalized = ph.key.toLowerCase();
      if (this.canonicalKeys.has(normalized)) continue;
      if (this.canonicalAliases.has(normalized)) continue;

      if (RESERVED_WORDS.has(normalized)) {
        reservedConflicts.push(normalized);
        issues.push({
          severity: 'error',
          code: 'RESERVED_CONFLICT',
          placeholder: ph.raw,
          message: `Placeholder '${ph.key}' conflicts with reserved docxtemplater word`,
          suggestion: 'Rename this placeholder to avoid collision with loop/conditional syntax',
          location: ph.location,
        });
        continue;
      }

      const suggestedKey = this.canonicalSuggestions.get(normalized);
      if (suggestedKey) {
        misspelled.push(normalized);
        issues.push({
          severity: 'warning',
          code: 'MISSPELLED',
          placeholder: ph.raw,
          message: `Placeholder '${ph.key}' is misspelled`,
          suggestion: `Did you mean {{${suggestedKey}}}?`,
          location: ph.location,
        });
      } else {
        const closest = this.findClosestCanonicalKey(normalized);
        if (closest) {
          misspelled.push(normalized);
          issues.push({
            severity: 'warning',
            code: 'MISSPELLED',
            placeholder: ph.raw,
            message: `Placeholder '${ph.key}' may be misspelled`,
            suggestion: `Did you mean {{${closest}}}?`,
            location: ph.location,
          });
        } else {
          unknown.push(normalized);
          issues.push({
            severity: 'warning',
            code: 'UNKNOWN',
            placeholder: ph.raw,
            message: `Placeholder '${ph.key}' is not in the canonical resume schema`,
            suggestion: 'Add it to your template or rename it to a known field',
            location: ph.location,
          });
        }
      }
    }

    const missingRequired = this.findMissingRequired(seen);
    for (const key of missingRequired) {
      issues.push({
        severity: 'error',
        code: 'MISSING',
        placeholder: `{{${key}}}`,
        message: `Required field '${key}' is missing from template`,
        suggestion: `Add {{${key}}} to the appropriate section`,
      });
    }

    const hasErrors = issues.some((issue) => issue.severity === 'error');

    return {
      valid: !hasErrors,
      placeholders,
      issues,
      summary: {
        total: placeholders.length,
        unique: seen.size,
        duplicates: duplicates.length,
        missingRequired,
        unknown,
        misspelled,
        reservedConflicts,
      },
    };
  }

  private extractPlaceholders(buffer: Buffer): ExtractedPlaceholder[] {
    const zip = new PizZip(buffer);
    const documentXml = zip.file('word/document.xml')?.asText() || '';

    if (!documentXml) {
      return [];
    }

    const textNodes = this.extractTextNodes(documentXml);
    if (textNodes.length === 0) {
      return [];
    }

    const placeholders: ExtractedPlaceholder[] = [];
    const regex = /\{\{([^}]+)\}\}/g;

    const concatenated = textNodes.map((n) => n.text).join('');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(concatenated)) !== null) {
      const raw = match[0];
      const key = match[1].trim();
      const matchStart = match.index;
      const matchEnd = matchStart + raw.length;

      const contributingNodes = this.findContributingNodes(textNodes, matchStart, matchEnd);
      const firstNode = contributingNodes[0];

      const context = this.buildContext(concatenated, matchStart, matchEnd);
      const location = this.buildLocation(firstNode);

      placeholders.push({
        raw,
        key,
        location,
        context,
      });
    }

    return placeholders;
  }

  private extractTextNodes(xml: string): Array<{
    nodeIndex: number;
    paragraphIndex: number;
    runIndex: number;
    textNodeIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
  }> {
    const textNodes: Array<{
      nodeIndex: number;
      paragraphIndex: number;
      runIndex: number;
      textNodeIndex: number;
      text: string;
      startOffset: number;
      endOffset: number;
    }> = [];

    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let nodeIndex = 0;

    while ((tMatch = tRegex.exec(xml)) !== null) {
      const before = xml.slice(0, tMatch.index);
      const paragraphIndex = (before.match(/<w:p[\s>]/g) || []).length;
      const runIndex = (before.match(/<w:r[\s>]/g) || []).length;
      const textNodeIndex = (before.match(/<w:t[\s>]/g) || []).length;

      textNodes.push({
        nodeIndex: nodeIndex++,
        paragraphIndex,
        runIndex,
        textNodeIndex,
        text: tMatch[1],
        startOffset: 0,
        endOffset: 0,
      });
    }

    let currentOffset = 0;
    for (const node of textNodes) {
      node.startOffset = currentOffset;
      node.endOffset = currentOffset + node.text.length;
      currentOffset = node.endOffset;
    }

    return textNodes;
  }

  private findContributingNodes(
    textNodes: Array<{
      nodeIndex: number;
      paragraphIndex: number;
      runIndex: number;
      textNodeIndex: number;
      text: string;
      startOffset: number;
      endOffset: number;
    }>,
    matchStart: number,
    matchEnd: number
  ): Array<{
    nodeIndex: number;
    paragraphIndex: number;
    runIndex: number;
    textNodeIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
  }> {
    return textNodes.filter(
      (node) => node.startOffset < matchEnd && node.endOffset > matchStart
    );
  }

  private buildLocation(node: {
    paragraphIndex: number;
    runIndex: number;
    textNodeIndex: number;
  }): string {
    return `p[${node.paragraphIndex}]/r[${node.runIndex}]/t[${node.textNodeIndex}]`;
  }

  private buildContext(text: string, matchStart: number, matchEnd: number, radius: number = 80): string {
    const start = Math.max(0, matchStart - radius);
    const end = Math.min(text.length, matchEnd + radius);
    let context = text.slice(start, end);

    context = context.replace(/<[^>]+>/g, ' ');
    context = context.replace(/\s+/g, ' ').trim();

    return context;
  }

  private findMissingRequired(seen: Map<string, ExtractedPlaceholder[]>): string[] {
    const missing: string[] = [];
    const seenNormalized = new Set(seen.keys());

    for (const field of CANONICAL_FIELDS) {
      if (!field.required) continue;

      const found =
        seenNormalized.has(field.key.toLowerCase()) ||
        field.aliases.some((alias) => seenNormalized.has(alias.toLowerCase()));

      if (!found) {
        missing.push(field.key);
      }
    }

    return missing;
  }

  private findClosestCanonicalKey(key: string): string | null {
    let closest: string | null = null;
    let minDistance = Infinity;

    for (const [canonicalKey] of this.canonicalKeys) {
      const distance = this.levenshtein(key, canonicalKey);
      if (distance < minDistance) {
        minDistance = distance;
        closest = canonicalKey;
      }
    }

    if (minDistance <= 2 && key.length >= 3) {
      return closest;
    }
    return null;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (a[j - 1] === b[i - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
