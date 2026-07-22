import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { Logger } from '../utils/logger';
import { ExtractedDocument, DocxLocation } from '../docxExtraction.service';
import { DetectedSection, TemplateField } from './milestone2.types';

const logger = new Logger('PlaceholderInjector');

export interface InjectionResult {
  success: boolean;
  placeholdersInjected: number;
  issues: string[];
  buffer: Buffer;
  dataKeyMapping?: Record<string, string[]>;
}

export class PlaceholderInjector {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: false,
    });

    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
      suppressEmptyNode: false,
      format: false,
      suppressBooleanAttributes: false,
    });
  }

  async inject(
    originalBuffer: Buffer,
    extractedDoc: ExtractedDocument,
    sections: DetectedSection[]
  ): Promise<InjectionResult> {
    const inputBuffer = Buffer.from(originalBuffer);
    const zip = new PizZip(inputBuffer);
    const documentXml = zip.file('word/document.xml')?.asText() || '';

    if (!documentXml) {
      return {
        success: false,
        placeholdersInjected: 0,
        issues: ['No word/document.xml found in DOCX'],
        buffer: Buffer.alloc(0),
      };
    }

    let parsed: any;
    try {
      parsed = this.xmlParser.parse(documentXml);
    } catch (error: any) {
      return {
        success: false,
        placeholdersInjected: 0,
        issues: [`XML parsing failed: ${error.message}`],
        buffer: Buffer.alloc(0),
      };
    }

    const normalized = this.normalizeDocx(parsed);
    let placeholdersInjected = 0;
    const rawKeysSeen = new Set<string>();
    const dataKeyMapping: Record<string, string[]> = {};

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      const fieldCount = this.injectSectionPlaceholders(normalized, extractedDoc, section, sectionIndex, rawKeysSeen, dataKeyMapping);
      placeholdersInjected += fieldCount;
    }

    let modifiedXml: string;
    try {
      modifiedXml = this.xmlBuilder.build(normalized);
      try {
        const fs = require('fs');
        fs.writeFileSync('C:/Users/elitebook840g89319/AppData/Local/Temp/kilo/debug-xml-output.xml', modifiedXml);
      } catch (e) {}
    } catch (error: any) {
      return {
        success: false,
        placeholdersInjected: 0,
        issues: [`XML serialization failed: ${error.message}`],
        buffer: Buffer.alloc(0),
      };
    }

    const modifiedZip = new PizZip();
    modifiedZip.file('word/document.xml', modifiedXml);

    for (const file of Object.keys(zip.files)) {
      if (file !== 'word/document.xml') {
        modifiedZip.file(file, zip.file(file)?.asText() || '');
      }
    }

    let modifiedBuffer: Buffer;
    try {
      modifiedBuffer = modifiedZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (error: any) {
      return {
        success: false,
        placeholdersInjected: 0,
        issues: [`DOCX generation failed: ${error.message}`],
        buffer: Buffer.alloc(0),
      };
    }

    return {
      success: true,
      placeholdersInjected,
      issues: [],
      buffer: modifiedBuffer,
      dataKeyMapping: Object.keys(dataKeyMapping).length > 0 ? dataKeyMapping : undefined,
    };
  }

  private injectSectionPlaceholders(
    normalized: any,
    extractedDoc: ExtractedDocument,
    section: DetectedSection,
    sectionIndex: number,
    rawKeysSeen: Set<string>,
    dataKeyMapping: Record<string, string[]>
  ): number {
    const doc = normalized['w:document'];
    if (!doc || !doc['w:body'] || !doc['w:body']['w:p']) return 0;

    const paragraphs = Array.isArray(doc['w:body']['w:p']) ? doc['w:body']['w:p'] : [doc['w:body']['w:p']];
    let injected = 0;

    const sectionStartIdx = section.fields.length > 0 ? this.findSectionStart(extractedDoc, section) : -1;
    if (sectionStartIdx < 0) {
      return 0;
    }

    const fieldTargets = this.mapFieldsToRuns(extractedDoc, section, sectionStartIdx, sectionIndex, rawKeysSeen, dataKeyMapping);

    for (const target of fieldTargets) {
      if (target.paragraphIndex < paragraphs.length) {
        const replaced = this.replaceRunTextWithPlaceholder(paragraphs[target.paragraphIndex], target.runIndex, target.fieldKey);
        if (replaced) injected++;
      }
    }

    return injected;
  }

  private findSectionStart(extractedDoc: ExtractedDocument, section: DetectedSection): number {
    for (let i = 0; i < extractedDoc.paragraphs.length; i++) {
      const p = extractedDoc.paragraphs[i];
      if (p.rawText.trim().toLowerCase().includes(section.title.toLowerCase()) && p.runs.length > 0) {
        const hasHeadingFormatting = p.runs.some(run => run.formatting.bold || (run.formatting.fontSize || 0) >= 14);
        if (hasHeadingFormatting) {
          return i + 1;
        }
      }
    }
    return -1;
  }

  private mapFieldsToRuns(
    extractedDoc: ExtractedDocument,
    section: DetectedSection,
    startIdx: number,
    sectionIndex: number,
    rawKeysSeen: Set<string>,
    dataKeyMapping: Record<string, string[]>
  ): Array<{ paragraphIndex: number; runIndex: number; fieldKey: string }> {
    const targets: Array<{ paragraphIndex: number; runIndex: number; fieldKey: string }> = [];
    const fields = section.fields;

    let fieldIdx = 0;
    for (let pIdx = startIdx; pIdx < extractedDoc.paragraphs.length && fieldIdx < fields.length; pIdx++) {
      const paragraph = extractedDoc.paragraphs[pIdx];
      if (!paragraph.runs || paragraph.runs.length === 0) continue;

      const isNextSection = this.isSectionHeading(extractedDoc, pIdx);
      if (isNextSection) break;

      if (fieldIdx < fields.length && paragraph.runs.length > 0) {
        const rawKey = fields[fieldIdx].key;
        const uniqueKey = this.getUniqueKey(rawKey, sectionIndex, rawKeysSeen);
        if (!dataKeyMapping[rawKey]) {
          dataKeyMapping[rawKey] = [];
        }
        if (!dataKeyMapping[rawKey].includes(uniqueKey)) {
          dataKeyMapping[rawKey].push(uniqueKey);
        }
        targets.push({
          paragraphIndex: pIdx,
          runIndex: 0,
          fieldKey: `{{${uniqueKey}}}`,
        });
        fieldIdx++;
      }
    }

    return targets;
  }

  private getUniqueKey(rawKey: string, sectionIndex: number, rawKeysSeen: Set<string>): string {
    if (!rawKeysSeen.has(rawKey)) {
      rawKeysSeen.add(rawKey);
      return rawKey;
    }
    const scopedKey = `section_${sectionIndex}_${rawKey}`;
    rawKeysSeen.add(scopedKey);
    return scopedKey;
  }

  private isSectionHeading(extractedDoc: ExtractedDocument, paragraphIndex: number): boolean {
    if (paragraphIndex >= extractedDoc.paragraphs.length) return false;
    const paragraph = extractedDoc.paragraphs[paragraphIndex];
    if (paragraph.runs.length === 0) return false;
    return paragraph.runs.some(run => run.formatting.bold && (run.formatting.fontSize || 0) >= 14);
  }

  private replaceRunTextWithPlaceholder(paragraph: any, runIndex: number, placeholder: string): boolean {
    const runs = paragraph['w:r'];
    if (!runs) return false;

    const targetRun = Array.isArray(runs) ? runs[runIndex] : runs;
    if (!targetRun) return false;

    const textNodes = targetRun['w:t'];
    if (!textNodes) return false;

    const textArray = Array.isArray(textNodes) ? textNodes : [textNodes];
    for (let i = 0; i < textArray.length; i++) {
      const tNode = textArray[i];
      const textValue = typeof tNode === 'string' ? tNode : tNode['#text'];
      if (textValue && textValue.trim().length > 0) {
        if (typeof tNode === 'string') {
          textArray[i] = placeholder;
        } else {
          tNode['#text'] = placeholder;
        }
        return true;
      }
    }

    return false;
  }

  private normalizeDocx(node: any): any {
    if (!node || typeof node !== 'object') return node;

    if (node['#text'] && typeof node['#text'] === 'string' && node['#text'].trim() === '') {
      delete node['#text'];
    }

    for (const key of Object.keys(node)) {
      if (key.startsWith('xmlns')) {
        delete node[key];
      }
    }

    for (const key of Object.keys(node)) {
      if (key === '#text') continue;
      const value = node[key];

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          value[i] = this.normalizeDocx(value[i]);
        }
      } else if (value && typeof value === 'object') {
        node[key] = this.normalizeDocx(value);
      }
    }

    const arrayKeys = ['w:p', 'w:r', 'w:t', 'w:tbl', 'w:tr', 'w:tc', 'w:pPr', 'w:rPr', 'w:drawing'];
    for (const key of arrayKeys) {
      if (node[key] && !Array.isArray(node[key])) {
        node[key] = [node[key]];
      }
    }

    return node;
  }
}
