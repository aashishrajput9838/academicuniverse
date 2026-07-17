import { IOcrEngine, OcrEngineResult } from './IOcrEngine';
import { logger } from '../../../utils/logger';

export class PaddleOcrEngine implements IOcrEngine {
  name = 'paddleocr';

  async process(buffer: Buffer, options?: { language?: string }): Promise<OcrEngineResult> {
    logger.warn('PaddleOcrEngine: Not yet implemented. Requires PaddleOCR Python runtime or child_process integration.');
    throw new Error('PaddleOcrEngine is not implemented. Install PaddleOCR and wire it via child_process or a microservice.');
  }
}
