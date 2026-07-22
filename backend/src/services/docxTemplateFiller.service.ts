import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Logger } from '../utils/logger';
import { ResumeDataService, ResumeDataValidationResult } from './resumeData.service';
import { DetectedSection } from './milestone2.types';

const logger = new Logger('DocxTemplateFiller');

export interface FillerResult {
  success: boolean;
  docxBuffer: Buffer;
  htmlPreview: string;
  validation: ResumeDataValidationResult;
  issues: string[];
}

export class DocxTemplateFiller {
  private dataService: ResumeDataService;

  constructor() {
    this.dataService = new ResumeDataService();
  }

  private expandDataWithMapping(data: Record<string, any>, mapping?: Record<string, string[]>): Record<string, any> {
    if (!mapping) return data;
    const expanded = { ...data };
    for (const [originalKey, uniqueKeys] of Object.entries(mapping)) {
      if (originalKey in data) {
        for (const uniqueKey of uniqueKeys) {
          expanded[uniqueKey] = data[originalKey];
        }
      }
    }
    return expanded;
  }

  async fill(
    templateBuffer: Buffer,
    studentData: Record<string, any>,
    schema: DetectedSection[],
    dataKeyMapping?: Record<string, string[]>
  ): Promise<FillerResult> {
    try {
      const flatSchema = schema.flatMap((section) => section.fields);
      const validation = this.dataService.validate(studentData, flatSchema);

      if (!validation.valid) {
        return {
          success: false,
          docxBuffer: Buffer.alloc(0),
          htmlPreview: '',
          validation,
          issues: validation.issues.map((issue) => issue.message),
        };
      }

      const expandedData = this.expandDataWithMapping(validation.data, dataKeyMapping);

      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData(expandedData);

      try {
        doc.render();
      } catch (error: any) {
        logger.error('Error rendering template with docxtemplater:', error);
        return {
          success: false,
          docxBuffer: Buffer.alloc(0),
          htmlPreview: '',
          validation,
          issues: [`Template rendering failed: ${error.message}`],
        };
      }

      const docxBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      let htmlPreview = '';
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ buffer: docxBuffer });
        htmlPreview = result.value;
      } catch (error: any) {
        logger.warn('HTML preview generation failed:', error);
      }

      return {
        success: true,
        docxBuffer,
        htmlPreview,
        validation,
        issues: [],
      };
    } catch (error: any) {
      logger.error('Error filling template:', error);
      return {
        success: false,
        docxBuffer: Buffer.alloc(0),
        htmlPreview: '',
        validation: { valid: false, issues: [], data: {} },
        issues: [`Filling failed: ${error.message}`],
      };
    }
  }
}
