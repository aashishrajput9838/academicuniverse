// src/services/parsing/__tests__/ParserFactory.test.ts
import { ParserFactory } from '../ParserFactory';
import { PdfParser } from '../pdfParser';
import { CsvParser } from '../CsvParser';

describe('ParserFactory', () => {
  it('should return registered PdfParser for PDF_PARSER strategy', () => {
    const parser = ParserFactory.getParser('PDF_PARSER');
    expect(parser).toBeInstanceOf(PdfParser);
  });

  it('should return registered CsvParser for CSV_PARSER strategy', () => {
    const parser = ParserFactory.getParser('CSV_PARSER');
    expect(parser).toBeInstanceOf(CsvParser);
  });

  it('should throw error for unknown strategy', () => {
    expect(() => ParserFactory.getParser('UNKNOWN')).toThrow(/No parser registered/);
  });
});
