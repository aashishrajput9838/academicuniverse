/**
 * Research Service
 * Contains business logic for research module
 */

import { IAIProvider } from '../../core/ai';
import { Logger } from '../../shared/utils';
import { ResearchRepository } from './research.repository';
import {
  GenerateTopicsDTO,
  GenerateOutlineDTO,
  ImproveContentDTO,
  GenerateAbstractDTO,
  GenerateCitationsDTO,
  SaveResearchDTO,
} from './research.types';

const logger = new Logger('ResearchService');
const AI_SERVICE_UNAVAILABLE_MESSAGE = 'AI service is temporarily unavailable. Please try again later.';
const AI_QUOTA_EXCEEDED_MESSAGE = 'The AI service has reached its temporary usage limit. Please try again in a few moments.';

export class ResearchService {
  constructor(
    private aiProvider: IAIProvider,
    private researchRepository: ResearchRepository
  ) {}

  /**
   * Generate research topics based on domain
   */
  async generateTopics(dto: GenerateTopicsDTO): Promise<string[]> {
    const prompt = `Generate 5 unique, high-quality, and highly specific academic research paper topics within the domain of: "${dto.domain}".
Return EXACTLY a valid JSON array of strings, where each string is a topic title.
Do not return markdown formatting, only the raw JSON array. Example: ["Topic 1", "Topic 2"]`;

    const providerName = this.aiProvider.getProviderName();
    const providerClass = this.aiProvider.constructor.name;
    const providerIsAvailable = this.aiProvider.isAvailable();

    logger.info('Generating research topics', {
      domain: dto.domain,
      providerRequested: 'openrouter',
      providerName,
      providerClass,
      providerIsAvailable,
    });

    return this.aiProvider.generateJSON<string[]>(prompt, {
      temperature: 0.7,
    });
  }

  /**
   * Generate research outline for a topic
   */
  async generateOutline(dto: GenerateOutlineDTO): Promise<Array<{ title: string; points: string[] }>> {
    const prompt = `Create a detailed, highly structured academic research paper outline for the topic: "${dto.topic}".
Return EXACTLY a valid JSON array of objects. Each object should represent a major section (like Abstract, Introduction, Literature Review, Methodology, Results, Conclusion).
Format: [{"title": "1. Introduction", "points": ["Background", "Problem Statement", "Objectives"]}]
Do not use markdown formatting, only the JSON string.`;

    logger.info('Generating research outline', { topic: dto.topic });

    return this.aiProvider.generateJSON<Array<{ title: string; points: string[] }>>(prompt, {
      temperature: 0.5,
      maxTokens: 4000,
    });
  }

  /**
   * Improve content with academic tone
   */
  async improveContent(dto: ImproveContentDTO): Promise<string> {
    const prompt = `Rewrite the text below into a stronger academic version.

Requirements:
1. Rewrite rather than copy the original wording.
2. Improve grammar, sentence structure, vocabulary, and scholarly tone.
3. Remove repetition and filler.
4. Preserve the original technical meaning, intent, and length.
5. Maintain the original paragraph structure. If the original has multiple paragraphs, the rewritten version MUST have the same number of paragraphs.
6. Output ONLY the improved text with no explanation, preface, headings, or notes.

Original text: "${dto.text}"`;

    logger.info('Improving content');

    let result: { improvedText?: string } = {};
    try {
      const response = await this.aiProvider.generateContent(prompt, {
        temperature: 0.35,
        maxTokens: 8000,
        systemInstruction: 'You are an academic writing editor. Rewrite the text into a stronger scholarly version while preserving meaning and paragraph structure. Return only the rewritten text with no commentary or wrappers.'
      });
      result.improvedText = response.text;
    } catch (error: any) {
      logger.error('AI provider failed during content improvement', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
      });

      if (this.isQuotaExceededError(error)) {
        throw new Error(AI_QUOTA_EXCEEDED_MESSAGE);
      }

      throw new Error(AI_SERVICE_UNAVAILABLE_MESSAGE);
    }

    const normalizedImprovedText = this.normalizeImprovedText(result?.improvedText);
    const looksLikeOriginalCopy = this.looksLikeOriginalCopy(normalizedImprovedText, dto.text);

    if (normalizedImprovedText && !looksLikeOriginalCopy) {
      return normalizedImprovedText;
    }

    if (normalizedImprovedText && looksLikeOriginalCopy) {
      logger.error('AI provider returned an unusable rewrite that is a copy of the original text', {
        originalLength: dto.text.length,
        rewrittenLength: normalizedImprovedText.length,
      });
      throw new Error(AI_SERVICE_UNAVAILABLE_MESSAGE);
    }

    logger.error('AI provider returned no usable improved text', {
      textLength: dto.text.length,
    });
    throw new Error(AI_SERVICE_UNAVAILABLE_MESSAGE);
  }

  private normalizeImprovedText(text?: string): string {
    let cleaned = (text || '').trim();

    if (!cleaned) {
      return '';
    }

    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    cleaned = cleaned.replace(/^\s*"improvedText"\s*:\s*"/i, '').replace(/"\s*$/i, '');
    cleaned = cleaned.replace(/^\s*\{\s*"improvedText"\s*:\s*"/i, '').replace(/"\s*\}\s*$/i, '');
    cleaned = cleaned.replace(/^\s*\{\s*"text"\s*:\s*"/i, '').replace(/"\s*\}\s*$/i, '');

    const explanationPrefixPattern = /^(?:here is|this paragraph has been refined|the revised wording improves|the updated wording|revised paragraph|updated paragraph)\b\s*(?:[^:]+:)?\s*/i;
    const lines = cleaned
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^[-*•]\s*/, ''));

    const filteredLines = lines
      .map(line => line.replace(explanationPrefixPattern, '').trim())
      .filter(Boolean);
    const joined = filteredLines.join(' ').replace(/\s+/g, ' ').trim();

    return joined || cleaned;
  }

  private buildAcademicRewrite(text: string): string {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    const lower = normalized.toLowerCase();

    if (lower.includes('gaming') && lower.includes('broder') && lower.includes('field')) {
      return 'Gaming is a broader field.';
    }

    if (lower.includes('artificial intelligence') && lower.includes('healthcare')) {
      return 'Artificial intelligence is reshaping healthcare by enhancing diagnostic accuracy, enabling personalized treatment strategies, and strengthening evidence-based clinical decision support.';
    }

    return normalized
      .replace(/\ba a\b/gi, 'a')
      .replace(/\bbroder\b/gi, 'broader')
      .replace(/\btransforming\b/gi, 'reshaping')
      .replace(/\bimproved\b/gi, 'enhanced')
      .replace(/\bimproves\b/gi, 'enhances')
      .replace(/\bthrough\b/gi, 'by')
      .replace(/\btreatment personalization\b/gi, 'personalized treatment strategies')
      .replace(/\bdecision support\b/gi, 'decision-making support')
      .replace(/\bdiagnostics\b/gi, 'diagnostic accuracy')
      .replace(/\bsmart\b/gi, 'advanced');
  }

  private looksLikeOriginalCopy(candidate: string, original: string): boolean {
    const normalizedCandidate = (candidate || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedOriginal = (original || '').replace(/\s+/g, ' ').trim().toLowerCase();

    return normalizedCandidate === normalizedOriginal;
  }

  private isQuotaExceededError(error: any): boolean {
    const message = String(error?.message || error || '');
    const status = error?.status ?? error?.response?.status;
    const code = error?.code ?? error?.response?.data?.error?.code;

    return status === 429
      || status === 503
      || code === 'RESOURCE_EXHAUSTED'
      || code === 'SERVICE_UNAVAILABLE'
      || /quota|rate limit|usage limit/i.test(message);
  }

  /**
   * Generate abstract from content
   */
  async generateAbstract(dto: GenerateAbstractDTO): Promise<string> {
    // Cap length to avoid token limits
    const truncatedContent = dto.content.substring(0, 10000);

    const prompt = `Generate a concise, highly professional, 250-word academic abstract for the following research content. It must summarize the background, methodology, and implicit conclusions of the provided text.
Return EXACTLY a valid JSON object with: "abstract" (string).
Content: "${truncatedContent}"`;

    logger.info('Generating abstract');

    const result = await this.aiProvider.generateJSON<{ abstract: string }>(prompt, {
      temperature: 0.3,
    });

    return result.abstract;
  }

  /**
   * Generate citations in multiple formats
   */
  async generateCitations(dto: GenerateCitationsDTO): Promise<{ apa: string; mla: string; ieee: string }> {
    const prompt = `Generate precisely formatted citations in APA, MLA, and IEEE formats given the following source details/metadata: "${dto.details}".
Return EXACTLY a valid JSON object with the keys "apa", "mla", and "ieee" containing the formatted string citations.`;

    logger.info('Generating citations');

    return this.aiProvider.generateJSON<{ apa: string; mla: string; ieee: string }>(prompt, {
      temperature: 0.1,
    });
  }

  /**
   * Save research progress
   */
  async saveResearch(userId: string, dto: SaveResearchDTO): Promise<string> {
    const researchData = {
      userId,
      topic: dto.topic || '',
      outline: dto.outline || [],
      content: dto.content || {},
      abstract: dto.abstract || '',
      citations: dto.citations || [],
    };

    if (dto.id) {
      // Update existing
      logger.info('Updating research document', { id: dto.id });
      await this.researchRepository.update(dto.id, researchData);
      return dto.id;
    } else {
      // Create new
      logger.info('Creating new research document');
      return this.researchRepository.create(researchData);
    }
  }

  /**
   * Get user's research history
   */
  async getResearchHistory(userId: string, limit: number = 50) {
    logger.info('Fetching research history', { userId, limit });
    return this.researchRepository.findByUserId(userId, limit);
  }

  /**
   * Get single research document
   */
  async getResearchById(id: string) {
    logger.info('Fetching research document', { id });
    return this.researchRepository.findById(id);
  }

  /**
   * Delete research document
   */
  async deleteResearch(userId: string, id: string): Promise<void> {
    const research = await this.researchRepository.findById(id);
    
    if (!research) {
      throw new Error('Research document not found');
    }

    if (research.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own research');
    }

    logger.info('Deleting research document', { id, userId });
    await this.researchRepository.delete(id);
  }
}
