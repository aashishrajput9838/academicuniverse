const { ExcelParser } = require('../excelParser');
const xlsx = require('xlsx');

describe('ExcelParser', () => {
  it('should parse an in‑memory XLSX workbook and return JSON string', async () => {
    // Create a simple workbook with one sheet
    const ws = xlsx.utils.aoa_to_sheet([
      ['header1', 'header2'],
      ['value1', 'value2'],
    ]);
    const wb = { SheetNames: ['Sheet1'], Sheets: { Sheet1: ws } } as any;
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parser = new ExcelParser();
    const content = await parser.parse(buffer);
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    // Should be valid JSON with the sheet data
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('Sheet1');
    expect(parsed['Sheet1'][0]).toEqual(['header1', 'header2']);
  });
});
