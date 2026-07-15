// src/services/parsing/__tests__/TxtParser.test.ts
const { ParserFactory } = require('../ParserFactory');
const { PdfParser } = require('../pdfParser');
const { TxtParser } = require('../TxtParser');

describe('TxtParser', () => {
  it('should return UTF-8 string from buffer', async () => {
    const txt = 'Hello, this is a text file.';
    const buffer = Buffer.from(txt, 'utf-8');
    const parser = new TxtParser();
    const result = await parser.parse(buffer);
    expect(result).toBe(txt);
  });
});
