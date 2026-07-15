// src/services/parsing/ParserInterface.ts
export interface IParser {
  /**
   * Parse the given buffer and return raw extracted content as a string.
   * Must not perform classification, schema inference, OCR, or any downstream processing.
   */
  parse(buffer: Buffer): Promise<string>;

  /**
   * Returns a string identifier for the parser (e.g., 'PDF_PARSER').
   */
  getStrategyName(): string;
}
