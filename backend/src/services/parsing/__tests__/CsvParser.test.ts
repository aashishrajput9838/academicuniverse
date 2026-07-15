// src/services/parsing/__tests__/CsvParser.test.ts
const { CsvParser } = require('../CsvParser');

describe('CsvParser', () => {
  it('should return raw CSV content unchanged', async () => {
    const csvContent = 'header1,header2\nvalue1,value2\nvalue3,value4';
    const buffer = Buffer.from(csvContent, 'utf-8');
    const parser = new CsvParser();
    const result = await parser.parse(buffer);
    expect(result).toBe(csvContent);
  });
});
