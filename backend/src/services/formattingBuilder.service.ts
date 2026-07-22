import { ExtractedDocument } from '../docxExtraction.service';
import { DetectedSection } from './milestone2.types';

export class FormattingBuilderService {
  build(document: ExtractedDocument, sections: DetectedSection[]): {
    styles: Record<string, any>;
    headingLevels: Record<string, number>;
    bulletMarker: string;
    dateFormat: string;
  } {
    const styles = this.buildStyles(document);
    const headingLevels = this.buildHeadingLevels(sections, document);
    const bulletMarker = this.detectBulletMarker(document);
    const dateFormat = this.detectDateFormat(document, sections);

    return {
      styles,
      headingLevels,
      bulletMarker,
      dateFormat,
    };
  }

  private buildStyles(document: ExtractedDocument): Record<string, any> {
    const signatureCounts = new Map<string, { count: number; example: any }>();

    for (const run of document.runs) {
      const signature = this.getFormattingSignature(run.formatting);
      const existing = signatureCounts.get(signature);
      
      if (existing) {
        existing.count++;
      } else {
        signatureCounts.set(signature, {
          count: 1,
          example: run.formatting,
        });
      }
    }

    const sorted = Array.from(signatureCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const styles: Record<string, any> = {};
    let customIndex = 1;

    for (const [signature, data] of sorted) {
      let name: string;
      
      const example = data.example;
      if (example.font && example.fontSize) {
        name = `${example.font}${example.fontSize}`;
      } else if (example.bold) {
        name = 'Bold';
      } else if (example.font) {
        name = example.font;
      } else {
        name = `Custom${customIndex++}`;
      }

      styles[signature] = {
        name,
        count: data.count,
        formatting: example,
      };
    }

    return styles;
  }

  private getFormattingSignature(fmt: any): string {
    const parts = [
      fmt.font || 'Default',
      fmt.fontSize || 11,
      fmt.bold ? 'b' : '',
      fmt.italic ? 'i' : '',
      fmt.underline ? 'u' : '',
      fmt.color || '000000',
    ];
    return parts.join('|');
  }

  private buildHeadingLevels(sections: DetectedSection[], document: ExtractedDocument): Record<string, number> {
    const levels: Record<string, number> = {};

    for (const section of sections) {
      const level = this.inferHeadingLevel(section, document);
      levels[section.title.toLowerCase()] = level;
    }

    return levels;
  }

  private inferHeadingLevel(section: DetectedSection, document: ExtractedDocument): number {
    const titleLower = section.title.toLowerCase();
    
    if (titleLower.includes('summary') || titleLower.includes('objective') || titleLower.includes('profile')) {
      return 1;
    }
    
    if (titleLower.includes('experience') || titleLower.includes('education')) {
      return 1;
    }
    
    if (titleLower.includes('skills') || titleLower.includes('projects') || titleLower.includes('certifications')) {
      return 2;
    }

    return 3;
  }

  private detectBulletMarker(document: ExtractedDocument): string {
    const bulletPatterns = ['•', '-', '●', '○', '▪', '▫', '→', '*'];

    for (const pattern of bulletPatterns) {
      for (const paragraph of document.paragraphs) {
        for (let i = 0; i < paragraph.runs.length; i++) {
          const run = paragraph.runs[i];
          if (run.text.startsWith(pattern)) {
            const prevRun = i > 0 ? paragraph.runs[i - 1] : null;
            if (!prevRun || prevRun.text.trim().length === 0) {
              return pattern;
            }
          }
        }
      }
    }

    for (const paragraph of document.paragraphs) {
      const text = paragraph.rawText.trim();
      const numberedMatch = text.match(/^(\d+\.\s)/);
      if (numberedMatch) {
        return 'numbered';
      }
      
      const alphaMatch = text.match(/^([a-zA-Z]\.\s)/);
      if (alphaMatch) {
        return 'alpha-numbered';
      }
    }

    return '';
  }

  private detectDateFormat(document: ExtractedDocument, sections: DetectedSection[]): string {
    const relevantSectionKeywords = ['experience', 'education', 'certifications'];
    
    let allText = sections
      .filter(s => relevantSectionKeywords.some(k => s.title.toLowerCase().includes(k)))
      .map(s => s.title)
      .join(' ')
      .toLowerCase();

    for (const paragraph of document.paragraphs) {
      allText += ' ' + paragraph.rawText.toLowerCase();
    }

    const datePatterns: Array<{ pattern: RegExp; format: string }> = [
      { pattern: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i, format: 'MMM YYYY' },
      { pattern: /\d{2}\/\d{4}/, format: 'MM/YYYY' },
      { pattern: /\d{4}-\d{2}/, format: 'YYYY-MM' },
      { pattern: /\d{1,2}\/\d{1,2}\/\d{4}/, format: 'DD/MM/YYYY' },
    ];

    for (const { pattern, format } of datePatterns) {
      if (pattern.test(allText)) {
        return format;
      }
    }

    return 'unknown';
  }
}
