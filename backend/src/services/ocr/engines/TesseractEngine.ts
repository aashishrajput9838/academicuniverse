import { createWorker } from 'tesseract.js';
import { IOcrEngine, OcrEngineResult } from './IOcrEngine';
import { logger } from '../../../utils/logger';

export class TesseractEngine implements IOcrEngine {
  name = 'tesseract';

  async process(buffer: Buffer, options?: { language?: string }): Promise<OcrEngineResult> {
    const worker = await createWorker(options?.language || 'eng');
    try {
      const { data } = await worker.recognize(buffer);
      const rawConfidence = data.confidence || 0;
      const confidence = Math.max(0, Math.min(100, rawConfidence)) / 100;
      
      logger.debug(`TesseractEngine: Recognized text (${data.text?.length || 0} chars, confidence: ${(confidence * 100).toFixed(1)}%)`);
      
      return {
        text: data.text || '',
        confidence,
        pagesProcessed: 1,
        engine: this.name,
        pageDetails: [
          {
            pageNumber: 1,
            text: data.text || '',
            confidence,
          },
        ],
      };
    } finally {
      await worker.terminate();
    }
  }
}
