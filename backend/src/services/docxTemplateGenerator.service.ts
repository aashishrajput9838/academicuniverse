import PizZip from 'pizzip';
import { Logger } from '../utils/logger';

const logger = new Logger('DocxTemplateGenerator');

export interface GenerationResult {
  success: boolean;
  buffer: Buffer;
  size: number;
  issues: string[];
}

export class DocxTemplateGenerator {
  async generate(modifiedBuffer: Buffer): Promise<GenerationResult> {
    try {
      const zip = new PizZip(modifiedBuffer);
      const docXml = zip.file('word/document.xml')?.asText() || '';

      if (!docXml || docXml.trim().length === 0) {
        return {
          success: false,
          buffer: Buffer.alloc(0),
          size: 0,
          issues: ['Modified DOCX contains empty word/document.xml'],
        };
      }

      const outputBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return {
        success: true,
        buffer: outputBuffer,
        size: outputBuffer.length,
        issues: [],
      };
    } catch (error: any) {
      logger.error('DOCX generation failed:', error);
      return {
        success: false,
        buffer: Buffer.alloc(0),
        size: 0,
        issues: [`Generation failed: ${error.message}`],
      };
    }
  }
}
