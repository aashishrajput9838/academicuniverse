/**
 * Research Controller
 * Handles HTTP requests and responses
 */

import { Request, Response } from 'express';
import { ResearchService } from './research.service';
import { Logger, sendResponse, sendError } from '../../shared/utils';

const logger = new Logger('ResearchController');

export class ResearchController {
  constructor(private researchService: ResearchService) {}

  /**
   * Generate research topics
   * POST /api/research/topics
   */
  generateTopics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { domain } = req.body;

      if (!domain) {
        sendError(res, 400, 'Domain or interest is required');
        return;
      }

      const topics = await this.researchService.generateTopics({ domain });
      sendResponse(res, 200, { topics }, 'Topics generated successfully');
    } catch (error: any) {
      logger.error('Error generating topics:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to generate topics');
    }
  };

  /**
   * Generate research outline
   * POST /api/research/outline
   */
  generateOutline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { topic } = req.body;

      if (!topic) {
        sendError(res, 400, 'Topic is required');
        return;
      }

      const outline = await this.researchService.generateOutline({ topic });
      sendResponse(res, 200, { outline }, 'Outline generated successfully');
    } catch (error: any) {
      logger.error('Error generating outline:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to generate outline');
    }
  };

  /**
   * Improve content
   * POST /api/research/improve
   */
  improveContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      if (!text) {
        sendError(res, 400, 'Text content is required');
        return;
      }

      const improvedText = await this.researchService.improveContent({ text });
      sendResponse(res, 200, { improvedText }, 'Content improved successfully');
    } catch (error: any) {
      logger.error('Error improving content:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to improve content');
    }
  };

  /**
   * Generate abstract
   * POST /api/research/abstract
   */
  generateAbstract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { content } = req.body;

      if (!content) {
        sendError(res, 400, 'Content is required');
        return;
      }

      const abstract = await this.researchService.generateAbstract({ content });
      sendResponse(res, 200, { abstract }, 'Abstract generated successfully');
    } catch (error: any) {
      logger.error('Error generating abstract:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to generate abstract');
    }
  };

  /**
   * Generate citations
   * POST /api/research/citations
   */
  generateCitations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { details } = req.body;

      if (!details) {
        sendError(res, 400, 'Source details are required');
        return;
      }

      const citations = await this.researchService.generateCitations({ details });
      sendResponse(res, 200, { citations }, 'Citations generated successfully');
    } catch (error: any) {
      logger.error('Error generating citations:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to generate citations');
    }
  };

  /**
   * Save research progress
   * POST /api/research/save
   */
  saveResearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id, topic, outline, content, abstract, citations } = req.body;

      const docId = await this.researchService.saveResearch(user.userId, {
        id,
        topic,
        outline,
        content,
        abstract,
        citations,
      });

      sendResponse(res, 200, { id: docId }, 'Research saved successfully');
    } catch (error: any) {
      logger.error('Error saving research:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to save research');
    }
  };

  /**
   * Get research history
   * GET /api/research/history
   */
  getResearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await this.researchService.getResearchHistory(user.userId, limit);
      sendResponse(res, 200, { history }, 'Research history retrieved successfully');
    } catch (error: any) {
      logger.error('Error fetching research history:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to fetch history');
    }
  };

  /**
   * Get single research document
   * GET /api/research/:id
   */
  getResearchById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const research = await this.researchService.getResearchById(id);
      
      if (!research) {
        sendError(res, 404, 'Research document not found');
        return;
      }

      sendResponse(res, 200, { research }, 'Research retrieved successfully');
    } catch (error: any) {
      logger.error('Error fetching research:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status, error.message || 'Failed to fetch research');
    }
  };

  /**
   * Delete research document
   * DELETE /api/research/:id
   */
  deleteResearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      await this.researchService.deleteResearch(user.userId, id);
      sendResponse(res, 200, null, 'Research deleted successfully');
    } catch (error: any) {
      logger.error('Error deleting research:', error);
      const status = this.getHttpStatus(error);
      sendError(res, status === 403 ? 403 : status, error.message || 'Failed to delete research');
    }
  };

  private getHttpStatus(error: any): number {
    const status = Number(error?.status || error?.response?.status || 0);
    if (status >= 400 && status <= 599) {
      return status;
    }
    return 500;
  }
}
