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

    logger.info('Generating research topics', { domain: dto.domain });

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
    });
  }

  /**
   * Improve content with academic tone
   */
  async improveContent(dto: ImproveContentDTO): Promise<string> {
    const prompt = `Rewrite the following paragraph in a highly formal, academic, and professional tone. Correct any grammar mistakes and drastically improve clarity and flow.
Return EXACTLY a valid JSON object with: "improvedText" (string).
Original text: "${dto.text}"`;

    logger.info('Improving content');

    const result = await this.aiProvider.generateJSON<{ improvedText: string }>(prompt, {
      temperature: 0.2,
    });

    return result.improvedText;
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
