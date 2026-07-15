// src/services/parsing/CsvParser.ts
import { IParser } from './ParserInterface';

export class CsvParser implements IParser {
  async parse(buffer: Buffer): Promise<string> {
    // CSV files are plain text; return the raw UTF-8 content.
    // No additional parsing is performed to keep this stage independent.
    return buffer.toString('utf-8');
  }

  getStrategyName(): string {
    return 'CSV_PARSER';
  }
}
