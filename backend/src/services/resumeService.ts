import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import axios from 'axios';
import { Logger } from '../utils/logger';
import aiService from './aiService';

const logger = new Logger('resumeService');

export class ResumeService {
  /**
   * Generates a filled DOCX and its HTML preview from a template URL and data.
   */
  async processResumeTemplate(templateUrl: string, data: any, tone?: string, enhanceableTags?: string[]): Promise<{ docxBuffer: Buffer; htmlPreview: string }> {
    try {
      logger.info(`Fetching template from ${templateUrl}`);
      // 1. Fetch the DOCX template from Firebase Storage (or any public URL)
      const response = await axios.get(templateUrl, { responseType: 'arraybuffer' });
      const content = response.data;

      // 2. Load the DOCX content as a zip
      const zip = new PizZip(content);

      // 3. Initialize docxtemplater and inject data
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // AI Enhancement Phase
      let finalData = data;
      if (tone && tone !== 'none' && enhanceableTags && enhanceableTags.length > 0) {
          logger.info(`Applying AI enhancement before generation. Tone: ${tone}`);
          finalData = await aiService.enhanceResumeFields(data, tone, enhanceableTags);
      }

      doc.setData(finalData);

      try {
        doc.render();
      } catch (error: any) {
        logger.error('Error rendering template with docxtemplater:', error);
        throw new Error('Template processing failed. Ensure template placeholders match data.');
      }

      // 4. Generate the filled DOCX buffer
      const docxBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      // 5. Generate HTML preview using Mammoth
      logger.info('Converting generated DOCX to HTML sequence for preview.');
      const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });

      return {
        docxBuffer,
        htmlPreview: mammothResult.value, // The generated HTML
      };
    } catch (error: any) {
      logger.error('Error in processResumeTemplate:', error);
      throw new Error(error.message || 'Failed to process resume template.');
    }
  }
}

export default new ResumeService();
