// src/services/parsing/excelParser.ts
import { IParser } from './ParserInterface';
import * as xlsx from 'xlsx';

export class ExcelParser implements IParser {
  async parse(buffer: Buffer): Promise<string> {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      const result: Record<string, any[]> = {};
      sheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        const json = xlsx.utils.sheet_to_json(ws, { header: 1 });
        result[name] = json;
      });
      return JSON.stringify(result);
    } catch (e) {
      return '';
    }
  }

  getStrategyName(): string {
    return 'EXCEL_PARSER';
  }
}
