import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import axios from 'axios';
import { Logger } from '../utils/logger';
import aiService from './aiService';
import { RESUME_PLACEHOLDERS } from '../config/resumePlaceholders';
import fs from 'fs';
import path from 'path';

const logger = new Logger('resumeService');

export class ResumeService {
  private normalizeData(data: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        normalized[key] = '';
      } else if (typeof value === 'string') {
        normalized[key] = value;
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  private expandAliasesAndNormalize(data: Record<string, any>): Record<string, any> {
    const normalized = this.normalizeData(data);

    for (const p of RESUME_PLACEHOLDERS) {
      let foundVal: string | undefined = undefined;
      if (data[p.key] !== undefined && data[p.key] !== null) {
        foundVal = String(data[p.key]);
      } else if (p.aliases) {
        for (const alias of p.aliases) {
          if (data[alias] !== undefined && data[alias] !== null) {
            foundVal = String(data[alias]);
            break;
          }
        }
      }

      if (foundVal !== undefined) {
        normalized[p.key] = foundVal;
        if (p.aliases) {
          for (const alias of p.aliases) {
            normalized[alias] = foundVal;
          }
        }
      }
    }

    return normalized;
  }

  private deterministicCleanup(html: string, data: Record<string, any>): string {
    let cleaned = html;
    const seen = new Set<string>();
    for (const value of Object.values(data)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const trimmed = value.trim();
        if (seen.has(trimmed)) continue;
        seen.add(trimmed);
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\{${escaped}\\}`, 'g');
        cleaned = cleaned.replace(regex, trimmed);
      }
    }
    return cleaned;
  }

  private async cleanupRendererArtifacts(data: Record<string, any>, html: string): Promise<string> {
    if (!html) return html;
    const deterministic = this.deterministicCleanup(html, data);
    if (deterministic === html) return html;
    return deterministic;
  }

  /**
   * Generates a filled DOCX and its HTML preview from a template URL and data.
   */
  async processResumeTemplate(templateUrl: string, data: any, tone?: string, enhanceableTags?: string[]): Promise<{ docxBuffer: Buffer; htmlPreview: string; knownLimitations: { docxArtifacts: boolean } }> {
    try {
      logger.info(`Fetching template from ${templateUrl}`);
      // 1. Fetch the DOCX template from Firebase Storage (or any public URL)
      const response = await axios.get(templateUrl, { responseType: 'arraybuffer' });
      const content = response.data;

      const rawDebugPath = path.join(__dirname, '..', '..', 'debug-raw-template.docx');
      fs.writeFileSync(rawDebugPath, Buffer.from(content));
      logger.info(`[DEBUG] Wrote raw template to ${rawDebugPath}`);

      // 2. Load the DOCX content as a zip
      const zip = new PizZip(content);

      // 3. Initialize docxtemplater and inject data
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        syntax: {
          allowUnclosedTag: true,
          allowUnopenedTag: true,
        },
        nullGetter: () => '',
      });

      // AI Enhancement Phase
      let finalData = data;
      if (tone && tone !== 'none' && enhanceableTags && enhanceableTags.length > 0) {
          logger.info(`Applying AI enhancement before generation. Tone: ${tone}`);
          finalData = await aiService.enhanceResumeFields(data, tone, enhanceableTags);
      }

      const normalizedData = this.expandAliasesAndNormalize(finalData);

      logger.info('[DEBUG] Submitted answers:', JSON.stringify(data, null, 2));
      logger.info('[DEBUG] Placeholder map:', JSON.stringify(normalizedData, null, 2));

      doc.render(normalizedData);

      // 4. Generate the filled DOCX buffer
      const docxBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      const debugPath = path.join(__dirname, '..', '..', 'generated-debug.docx');
      fs.writeFileSync(debugPath, docxBuffer);
      logger.info(`[DEBUG] Wrote generated DOCX to ${debugPath}`);

      // 5. Generate HTML preview using Mammoth
      logger.info('Converting generated DOCX to HTML sequence for preview.');
      const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });

      // 6. Clean up Docxtemplater brace artifacts from the generated text.
      const cleanedHtml = await this.cleanupRendererArtifacts(normalizedData, mammothResult.value);

      const unresolvedPlaceholders = (cleanedHtml.match(/\{\{[^}]+\}\}/g) || []).filter(
        (val, idx, arr) => arr.indexOf(val) === idx
      );
      logger.info('[DEBUG] Unresolved placeholders after replacement:', unresolvedPlaceholders);

      return {
        docxBuffer,
        htmlPreview: cleanedHtml,
        knownLimitations: {
          docxArtifacts: true,
        },
      };
    } catch (error: any) {
      logger.error('Error in processResumeTemplate:', error);
      throw new Error(error.message || 'Failed to process resume template.');
    }
  }
}

export default new ResumeService();
