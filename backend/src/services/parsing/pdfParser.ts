// src/services/parsing/pdfParser.ts
import { IParser } from './ParserInterface';

export class PdfParser implements IParser {
  async parse(buffer: Buffer): Promise<string> {
    // Use pdf-parse to extract text from PDF buffer.
    // pdf-parse returns an object with a .text property containing extracted text.
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (e) {
      // On error return empty string to keep pipeline functional.
      return '';
    }
  }

  getStrategyName(): string {
    return 'PDF_PARSER';
  }
}
