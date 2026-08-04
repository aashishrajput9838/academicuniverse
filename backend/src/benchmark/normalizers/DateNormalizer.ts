/**
 * DateNormalizer.ts
 *
 * Normalizes date representations into canonical ISO 8601 format (YYYY-MM-DD).
 */

export class DateNormalizer {
  private static monthMap: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  /**
   * Normalize date string to ISO YYYY-MM-DD.
   */
  public static normalize(rawDate: any): string {
    if (!rawDate) return '';
    const str = String(rawDate).trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Month DD, YYYY or DD Month YYYY
    const textMatch = str.match(/^(?:([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})|(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4}))$/);
    if (textMatch) {
      const monthStr = (textMatch[1] || textMatch[5] || '').toLowerCase();
      const dayStr = (textMatch[2] || textMatch[4] || '').padStart(2, '0');
      const yearStr = textMatch[3] || textMatch[6];
      const monthNum = this.monthMap[monthStr];

      if (monthNum && yearStr) {
        return `${yearStr}-${monthNum}-${dayStr}`;
      }
    }

    // Standard Date fallback parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return str.toLowerCase();
  }
}
