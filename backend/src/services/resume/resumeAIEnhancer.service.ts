import { ResumeEntity } from '../../models/ResumeEntity';
import { IAIProvider, AIConfig } from '../../core/ai/ai.provider';
import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeAIEnhancer');

export interface AIEnhancementOutput {
  entities: ResumeEntity[];
  strategy: 'normalized' | 'normalized+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  improvements: {
    fieldsAdded: number;
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
}

const CRITICAL_FIELDS: Record<string, string[]> = {
  person: ['name', 'email'],
  experience: ['title', 'company'],
  education: ['degree', 'institution'],
  skill: ['name'],
  project: ['name'],
  certification: ['title'],
  achievement: ['title'],
  language: ['name'],
};

const AI_ENHANCEMENT_THRESHOLD = 0.7;

export class ResumeAIEnhancer {
  private readonly aiProvider: IAIProvider | null;
  private readonly aiModel?: string;
  private readonly acronyms: Set<string> = new Set(['aws', 'gcp', 'ai', 'ml', 'api', 'sdk', 'ci', 'cd', 'ui', 'ux', 'sql', 'nosql', 'rest', 'graphql', 'jwt', 'oauth']);

  constructor(aiProvider?: IAIProvider, aiModel?: string) {
    this.aiProvider = aiProvider || null;
    this.aiModel = aiModel;
  }

  async enhance(params: {
    entities: ResumeEntity[];
    rawText?: string;
    existing?: Record<string, any>;
  }): Promise<AIEnhancementOutput> {
    const { entities, rawText, existing } = params;

    if (existing?.aiEnhanced === true) {
      return {
        entities,
        strategy: 'normalized',
        aiFallbackUsed: false,
        improvements: { fieldsAdded: 0, fieldsNormalized: 0, fieldsCorrected: 0 },
      };
    }

    if (!entities || entities.length === 0) {
      throw new Error('no_entities');
    }

    let totalFieldsAdded = 0;
    let totalFieldsNormalized = 0;
    let totalFieldsCorrected = 0;
    let aiFallbackUsed = false;
    const enhancedEntities: ResumeEntity[] = [];

    for (const entity of entities) {
      const normalization = this.normalizeEntity(entity);
      totalFieldsNormalized += normalization.fieldsNormalized;
      totalFieldsCorrected += normalization.fieldsCorrected;

      const needsAi = this.needsAiEnhancement(normalization.entity, rawText);
      let finalEntity = normalization.entity;

      if (needsAi && this.aiProvider) {
        try {
          const aiResult = await this.invokeAiEnhancement(finalEntity, rawText);
          if (aiResult) {
            totalFieldsAdded += aiResult.fieldsAdded;
            finalEntity = aiResult.entity;
            aiFallbackUsed = true;
          }
        } catch (err) {
          logger.warn('ResumeAIEnhancer: AI enhancement failed for entity, keeping normalized', {
            type: finalEntity.type,
            error: (err as Error).message,
          });
        }
      }

      enhancedEntities.push(finalEntity);
    }

    const allAi = enhancedEntities.every((e) => e.extractedBy === 'ai');
    const someAi = enhancedEntities.some((e) => e.extractedBy === 'ai');
    const strategy: AIEnhancementOutput['strategy'] = allAi ? 'ai-only' : someAi ? 'normalized+ai' : 'normalized';

    return {
      entities: enhancedEntities,
      strategy,
      aiFallbackUsed,
      improvements: {
        fieldsAdded: totalFieldsAdded,
        fieldsNormalized: totalFieldsNormalized,
        fieldsCorrected: totalFieldsCorrected,
      },
    };
  }

  private normalizeEntity(entity: ResumeEntity): { entity: ResumeEntity; fieldsNormalized: number; fieldsCorrected: number } {
    const data = { ...entity.data };
    let fieldsNormalized = 0;
    let fieldsCorrected = 0;

    switch (entity.type) {
      case 'person': {
        if (typeof data.name === 'string' && data.name !== this.toTitleCase(data.name)) {
          data.name = this.toTitleCase(data.name);
          fieldsNormalized++;
        }
        if (typeof data.email === 'string') {
          const trimmed = data.email.trim().toLowerCase();
          if (trimmed !== data.email) {
            data.email = trimmed;
            fieldsNormalized++;
          }
          if (!this.isValidEmail(data.email)) {
            fieldsCorrected++;
          }
        }
        if (typeof data.phone === 'string') {
          const normalized = this.normalizePhone(data.phone);
          if (normalized !== data.phone) {
            data.phone = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.linkedin === 'string') {
          const normalized = this.normalizeUrl(data.linkedin, 'linkedin.com');
          if (normalized !== data.linkedin) {
            data.linkedin = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.github === 'string') {
          const normalized = this.normalizeUrl(data.github, 'github.com');
          if (normalized !== data.github) {
            data.github = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'experience': {
        if (typeof data.title === 'string') {
          const normalized = this.toTitleCase(data.title);
          if (normalized !== data.title) {
            data.title = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.company === 'string') {
          const normalized = this.toTitleCase(data.company);
          if (normalized !== data.company) {
            data.company = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.startDate === 'string') {
          const normalized = this.normalizeDate(data.startDate);
          if (normalized !== data.startDate) {
            data.startDate = normalized;
            fieldsNormalized++;
          }
          if (normalized === 'Invalid Date') {
            fieldsCorrected++;
          }
        }
        if (typeof data.endDate === 'string') {
          const normalized = this.normalizeDate(data.endDate);
          if (normalized !== data.endDate) {
            data.endDate = normalized;
            fieldsNormalized++;
          }
          if (normalized === 'Invalid Date') {
            fieldsCorrected++;
          }
        }
        if (data.current === undefined && data.startDate) {
          data.current = this.inferCurrentFromDate(data.startDate);
          fieldsNormalized++;
        }
        break;
      }
      case 'education': {
        if (typeof data.degree === 'string') {
          const expanded = this.expandDegreeAbbreviation(data.degree);
          if (expanded !== data.degree) {
            data.degree = expanded;
            fieldsNormalized++;
          }
        }
        if (typeof data.institution === 'string') {
          const normalized = this.toTitleCase(data.institution);
          if (normalized !== data.institution) {
            data.institution = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.startDate === 'string') {
          const normalized = this.normalizeDate(data.startDate);
          if (normalized !== data.startDate) {
            data.startDate = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.endDate === 'string') {
          const normalized = this.normalizeDate(data.endDate);
          if (normalized !== data.endDate) {
            data.endDate = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.gpa === 'string' || typeof data.gpa === 'number') {
          const normalized = this.normalizeGpa(data.gpa);
          if (normalized !== data.gpa) {
            data.gpa = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'skill': {
        if (typeof data.name === 'string') {
          const normalized = this.normalizeSkillName(data.name);
          if (normalized !== data.name) {
            data.name = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'project': {
        if (typeof data.name === 'string') {
          const normalized = this.toTitleCase(data.name);
          if (normalized !== data.name) {
            data.name = normalized;
            fieldsNormalized++;
          }
        }
        if (Array.isArray(data.techStack)) {
          const normalizedStack = data.techStack.map((t: string) => this.normalizeSkillName(t));
          if (JSON.stringify(normalizedStack) !== JSON.stringify(data.techStack)) {
            data.techStack = normalizedStack;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'certification': {
        if (typeof data.title === 'string') {
          const normalized = this.toTitleCase(data.title);
          if (normalized !== data.title) {
            data.title = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.issuer === 'string') {
          const normalized = this.toTitleCase(data.issuer);
          if (normalized !== data.issuer) {
            data.issuer = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.issueDate === 'string') {
          const normalized = this.normalizeDate(data.issueDate);
          if (normalized !== data.issueDate) {
            data.issueDate = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.expiryDate === 'string') {
          const normalized = this.normalizeDate(data.expiryDate);
          if (normalized !== data.expiryDate) {
            data.expiryDate = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'achievement': {
        if (typeof data.title === 'string') {
          const normalized = this.toTitleCase(data.title);
          if (normalized !== data.title) {
            data.title = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.date === 'string') {
          const normalized = this.normalizeDate(data.date);
          if (normalized !== data.date) {
            data.date = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
      case 'language': {
        if (typeof data.name === 'string') {
          const normalized = this.normalizeLanguageName(data.name);
          if (normalized !== data.name) {
            data.name = normalized;
            fieldsNormalized++;
          }
        }
        if (typeof data.proficiency === 'string') {
          const normalized = this.normalizeProficiency(data.proficiency);
          if (normalized !== data.proficiency) {
            data.proficiency = normalized;
            fieldsNormalized++;
          }
        }
        break;
      }
    }

    return {
      entity: { ...entity, data },
      fieldsNormalized,
      fieldsCorrected,
    };
  }

  private needsAiEnhancement(entity: ResumeEntity, rawText?: string): boolean {
    if (entity.confidence < AI_ENHANCEMENT_THRESHOLD) {
      return true;
    }

    const criticalFields = CRITICAL_FIELDS[entity.type] || [];
    const missingCritical = criticalFields.some((field) => {
      const value = (entity.data as any)?.[field];
      return value === undefined || value === null || value === '';
    });
    if (missingCritical) {
      return true;
    }

    const data = entity.data as any;
    switch (entity.type) {
      case 'person':
        if (data.email && !this.isValidEmail(data.email)) return true;
        if (data.linkedin && !this.isValidUrl(data.linkedin)) return true;
        if (data.github && !this.isValidUrl(data.github)) return true;
        break;
      case 'experience':
        if (data.startDate && this.isInvalidDate(data.startDate)) return true;
        if (data.endDate && this.isInvalidDate(data.endDate)) return true;
        break;
      case 'education':
        if (data.startDate && this.isInvalidDate(data.startDate)) return true;
        if (data.endDate && this.isInvalidDate(data.endDate)) return true;
        if (data.gpa !== undefined && data.gpa !== null && (Number(data.gpa) < 0 || Number(data.gpa) > 10)) return true;
        break;
      case 'certification':
        if (data.issueDate && this.isInvalidDate(data.issueDate)) return true;
        if (data.expiryDate && this.isInvalidDate(data.expiryDate)) return true;
        break;
      case 'achievement':
        if (data.date && this.isInvalidDate(data.date)) return true;
        break;
    }

    return false;
  }

  private async invokeAiEnhancement(entity: ResumeEntity, rawText?: string): Promise<{ entity: ResumeEntity; fieldsAdded: number } | null> {
    if (!this.aiProvider) {
      return null;
    }

    const prompt = this.buildEnhancementPrompt(entity, rawText);
    const aiConfig: AIConfig = { temperature: 0.1 };
    if (this.aiModel) {
      aiConfig.model = this.aiModel;
    }

    const response = await this.aiProvider.generateJSON<string>(prompt, aiConfig);
    const parsed = JSON.parse(response);

    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
      logger.warn('ResumeAIEnhancer: Malformed AI response, keeping normalized entity', { type: entity.type });
      return null;
    }

    const enhancedData = parsed.data;
    const fieldsAdded = Object.keys(enhancedData).filter((key) => !(entity.data as any)[key]).length;

    return {
      entity: {
        ...entity,
        data: enhancedData,
        extractedBy: 'ai',
      },
      fieldsAdded,
    };
  }

  private buildEnhancementPrompt(entity: ResumeEntity, rawText?: string): string {
    const expectedSchema = this.getExpectedSchema(entity.type);
    return `You are a resume entity enhancer. Improve the following entity by filling missing fields, normalizing values, and correcting errors.

Entity type: ${entity.type}
Current data:
${JSON.stringify(entity.data, null, 2)}

${rawText ? `Raw text context:\n${rawText}\n` : ''}

Expected schema for this entity type:
${JSON.stringify(expectedSchema, null, 2)}

Return ONLY a valid JSON object with the improved entity:
{
  "data": {
    ${Object.entries(expectedSchema).map(([key, type]) => `"${key}": ${this.getExampleValue(key, type as string)}`).join(',\n    ')}
  }
}

Rules:
- Preserve existing correct values
- Normalize dates to ISO 8601 (YYYY-MM-DD)
- Normalize names to Title Case
- Do NOT invent data not present in the original entity or raw text
- If no improvements possible, return the original data unchanged`;
  }

  private getExpectedSchema(type: string): Record<string, string> {
    switch (type) {
      case 'person':
        return { name: 'string', email: 'string', phone: 'string', linkedin: 'string', github: 'string', summary: 'string' };
      case 'experience':
        return { title: 'string', company: 'string', startDate: 'string (YYYY-MM-DD)', endDate: 'string (YYYY-MM-DD) or null', current: 'boolean', description: 'string', bullets: 'string[]' };
      case 'education':
        return { degree: 'string', institution: 'string', startDate: 'string (YYYY-MM-DD)', endDate: 'string (YYYY-MM-DD)', gpa: 'number or string' };
      case 'skill':
        return { name: 'string', category: 'string', proficiency: 'string' };
      case 'project':
        return { name: 'string', description: 'string', techStack: 'string[]' };
      case 'certification':
        return { title: 'string', issuer: 'string', issueDate: 'string (YYYY-MM-DD)', expiryDate: 'string (YYYY-MM-DD) or null', credentialId: 'string' };
      case 'achievement':
        return { title: 'string', description: 'string', date: 'string (YYYY-MM-DD)' };
      case 'language':
        return { name: 'string', proficiency: 'string' };
      default:
        return {};
    }
  }

  private getExampleValue(key: string, type: string): string {
    if (type.includes('string') && !type.includes('[]')) return `"${key}"`;
    if (type.includes('boolean')) return 'true';
    if (type.includes('number')) return '0';
    if (type.includes('null')) return 'null';
    if (type.includes('[]')) return '[]';
    return `"${key}"`;
  }

  private toTitleCase(str: string): string {
    return str
      .split(' ')
      .map((word) => {
        const lower = word.toLowerCase();
        if (this.acronyms.has(lower)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      })
      .join(' ');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return phone.replace(/[^+\d]/g, '');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url.includes('://') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string, domain: string): string {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.includes(domain)) {
      const path = trimmed.split(domain)[1] || '';
      return `https://${domain}${path}`;
    }
    return `https://${domain}/${trimmed}`;
  }

  private normalizeDate(dateStr: string): string {
    if (!dateStr || dateStr === 'Present' || dateStr === 'present') return dateStr;
    const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (isoMatch) return isoMatch[1];
    const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (parts) {
      const [, m, d, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
  }

  private isInvalidDate(dateStr: string): boolean {
    if (!dateStr || dateStr === 'Present' || dateStr === 'present') return false;
    return isNaN(Date.parse(dateStr));
  }

  private inferCurrentFromDate(startDate: string): boolean {
    if (!startDate || startDate === 'Present') return true;
    const date = new Date(startDate);
    const now = new Date();
    const diffYears = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return diffYears < 0.5;
  }

  private expandDegreeAbbreviation(degree: string): string {
    const expansions: Record<string, string> = {
      'b.tech': 'Bachelor of Technology',
      'b. tech': 'Bachelor of Technology',
      'btech': 'Bachelor of Technology',
      'm.tech': 'Master of Technology',
      'm. tech': 'Master of Technology',
      'mtech': 'Master of Technology',
      'b.sc': 'Bachelor of Science',
      'bsc': 'Bachelor of Science',
      'm.sc': 'Master of Science',
      'msc': 'Master of Science',
      'phd': 'Doctor of Philosophy',
      'mba': 'Master of Business Administration',
      'b.a': 'Bachelor of Arts',
      'ba': 'Bachelor of Arts',
      'm.a': 'Master of Arts',
      'ma': 'Master of Arts',
      'b.e': 'Bachelor of Engineering',
      'be': 'Bachelor of Engineering',
      'm.e': 'Master of Engineering',
      'me': 'Master of Engineering',
    };
    return expansions[degree.toLowerCase()] || degree;
  }

  private normalizeGpa(gpa: number | string): number | string {
    const num = Number(gpa);
    if (isNaN(num)) return gpa;
    if (num > 4.0 && num <= 10.0) {
      return Number((num / 10 * 4.0).toFixed(2));
    }
    if (num > 10) {
      return 4.0;
    }
    return num <= 4.0 ? num : gpa;
  }

  private normalizeSkillName(name: string): string {
    const lower = name.toLowerCase().trim();
    const canonical: Record<string, string> = {
      js: 'JavaScript',
      'javascript': 'JavaScript',
      ts: 'TypeScript',
      'typescript': 'TypeScript',
      node: 'Node.js',
      'node.js': 'Node.js',
      py: 'Python',
      'python': 'Python',
      'react.js': 'React.js',
      react: 'React',
      'reactjs': 'React',
      'vue.js': 'Vue.js',
      vue: 'Vue.js',
      postgres: 'PostgreSQL',
      'postgresql': 'PostgreSQL',
      mongo: 'MongoDB',
      mongodb: 'MongoDB',
      k8s: 'Kubernetes',
      kubernetes: 'Kubernetes',
      docker: 'Docker',
      aws: 'AWS',
      'amazon web services': 'AWS',
      gcp: 'GCP',
      'google cloud': 'GCP',
      azure: 'Azure',
    };
    return canonical[lower] || name;
  }

  private normalizeLanguageName(name: string): string {
    const known: Record<string, string> = {
      english: 'English',
      hindi: 'Hindi',
      spanish: 'Spanish',
      french: 'French',
      german: 'German',
      chinese: 'Chinese',
      japanese: 'Japanese',
      korean: 'Korean',
      arabic: 'Arabic',
      portuguese: 'Portuguese',
      russian: 'Russian',
      bengali: 'Bengali',
      urdu: 'Urdu',
      punjabi: 'Punjabi',
      tamil: 'Tamil',
      telugu: 'Telugu',
      marathi: 'Marathi',
      gujarati: 'Gujarati',
      kannada: 'Kannada',
      malayalam: 'Malayalam',
      nepali: 'Nepali',
      sinhala: 'Sinhala',
      thai: 'Thai',
      vietnamese: 'Vietnamese',
    };
    return known[name.toLowerCase()] || name;
  }

  private normalizeProficiency(proficiency: string): string {
    const map: Record<string, string> = {
      native: 'native',
      fluent: 'fluent',
      conversational: 'conversational',
      basic: 'basic',
      elementary: 'basic',
      advanced: 'fluent',
      intermediate: 'conversational',
    };
    return map[proficiency.toLowerCase()] || proficiency;
  }
}
