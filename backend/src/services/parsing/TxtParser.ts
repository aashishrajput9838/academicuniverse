// src/services/parsing/TxtParser.ts
import { IParser } from './ParserInterface';

export class TxtParser implements IParser {
  async parse(buffer: Buffer): Promise<string> {
    // TXT files are plain text; return the UTF-8 string directly.
    return buffer.toString('utf-8');
  }

  getStrategyName(): string {
    return 'TXT_PARSER';
  }
}
