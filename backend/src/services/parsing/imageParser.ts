// src/services/parsing/imageParser.ts
import { IParser } from './ParserInterface';

export class ImageParser implements IParser {
  async parse(_buffer: Buffer): Promise<string> {
    // Image parsing without OCR returns empty content.
    return '';
  }

  getStrategyName(): string {
    return 'IMAGE_PARSER';
  }
}
