import { IPdfTextExtractor, PdfTextResult } from './IPdfTextExtractor';
import { logger } from '../../../utils/logger';

export class PdfTextExtractor implements IPdfTextExtractor {
  async extractText(buffer: Buffer): Promise<PdfTextResult> {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const uint8Array = new Uint8Array([...buffer]);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const numPages = pdf.numPages;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        fullText += pageText + '\n';
      }

      const text = fullText.trim();
      const hasText = text.length > 50;
      
      logger.info(`PdfTextExtractor: Extracted ${text.length} chars via pdfjs-dist. hasText=${hasText}`);
      
      return {
        text,
        method: 'pdfjs-dist',
        hasText,
      };
    } catch (e) {
      logger.warn(`PdfTextExtractor: pdfjs-dist text extraction failed: ${e}`);
      return {
        text: '',
        method: 'pdfjs-dist',
        hasText: false,
      };
    }
  }
}
