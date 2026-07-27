import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { Logger } from './utils/logger';

const logger = new Logger('DocxExtractionService');

export interface DocxLocation {
    paragraphIndex: number;
    runIndex: number;
    textIndex: number;
    pathString: string;
}

export interface ExtractedRun {
    paragraphIndex: number;
    runIndex: number;
    textIndex: number;
    location: DocxLocation;
    text: string;
    formatting: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        font?: string;
        fontSize?: number;
        color?: string;
    };
}

export interface ExtractedParagraph {
    index: number;
    runs: ExtractedRun[];
    style?: string;
    isHeading: boolean;
    rawText: string;
}

export interface ExtractedDocument {
    runs: ExtractedRun[];
    paragraphs: ExtractedParagraph[];
    hasTables: boolean;
    hasImages: boolean;
    placeholderCount: number;
}

export class DocxExtractionService {
    private xmlParser: XMLParser;

    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
            textNodeName: '#text',
            parseTagValue: false,
            parseAttributeValue: false,
            trimValues: false,
        });
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        const inputBuffer = Buffer.from(buffer);
        const zip = new PizZip(inputBuffer);
        const documentXml = zip.file('word/document.xml')?.asText() || '';

        const parsed = this.xmlParser.parse(documentXml);
        const normalized = this.normalizeDocx(parsed);
        const body = this.getBody(normalized);

        const paragraphs: ExtractedParagraph[] = [];
        const runs: ExtractedRun[] = [];
        let hasTables = false;
        let hasImages = false;
        let placeholderCount = 0;

        const rawParagraphs = this.collectAllParagraphs(body);
        if (rawParagraphs.length > 0) {
            for (let pIndex = 0; pIndex < rawParagraphs.length; pIndex++) {
                const paragraph = rawParagraphs[pIndex];
                const paragraphResult = this.extractParagraph(paragraph, pIndex, runs.length);
                paragraphs.push(paragraphResult.paragraph);
                runs.push(...paragraphResult.runs);

                if (paragraphResult.hasTable) hasTables = true;
                if (paragraphResult.hasImage) hasImages = true;
            }
        }

        const fullText = runs.map(r => r.text).join('');
        placeholderCount = this.countPlaceholders(fullText);

        const headingStyleNames = ['Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6', 'Title', 'Subtitle'];
        for (const paragraph of paragraphs) {
            if (paragraph.style && headingStyleNames.some(h => paragraph.style.toLowerCase().includes(h.toLowerCase()))) {
                paragraph.isHeading = true;
            }
        }

        return {
            runs,
            paragraphs,
            hasTables,
            hasImages,
            placeholderCount,
        };
    }

    private normalizeDocx(node: any): any {
        if (!node || typeof node !== 'object') return node;

        // Remove whitespace-only #text nodes
        if (node['#text'] && typeof node['#text'] === 'string' && node['#text'].trim() === '') {
            delete node['#text'];
        }

        // Remove namespace attributes
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

    private getBody(parsed: any): any {
        if (!parsed || !parsed['w:document']) return null;
        const doc = parsed['w:document'];
        if (!doc || !doc['w:body']) return null;
        return doc['w:body'];
    }

    private extractParagraph(paragraph: any, paragraphIndex: number, globalRunCount: number): {
        paragraph: ExtractedParagraph;
        runs: ExtractedRun[];
        hasTable: boolean;
        hasImage: boolean;
    } {
        const runs: ExtractedRun[] = [];
        let hasTable = false;
        let hasImage = false;
        let rawText = '';
        const style = this.extractParagraphStyle(paragraph);

        const runsList = paragraph['w:r'] 
            ? (Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']])
            : [];

        for (let rIndex = 0; rIndex < runsList.length; rIndex++) {
            const run = runsList[rIndex];
            const runResult = this.extractRun(run, paragraphIndex, rIndex, globalRunCount + runs.length);
            runs.push(runResult.run);
            rawText += runResult.text;

            if (runResult.hasImage) hasImage = true;
            if (runResult.hasTable) hasTable = true;
        }

        // Detect tables directly in paragraph (not just inside runs)
        if (!hasTable && paragraph['w:tbl']) {
            hasTable = true;
        }

        return {
            paragraph: {
                index: paragraphIndex,
                runs,
                style,
                isHeading: false,
                rawText,
            },
            runs,
            hasTable,
            hasImage,
        };
    }

    private extractRun(run: any, paragraphIndex: number, runIndex: number, existingRunCount: number): {
        run: ExtractedRun;
        text: string;
        hasImage: boolean;
        hasTable: boolean;
    } {
        const textNodes = this.extractTextNodes(run);
        const formatting = this.extractFormatting(run);
        const hasImage = this.checkHasImage(run);
        const hasTable = !!run['w:tbl'];

        const runText = textNodes.map(t => t.text).join('');
        const textIndex = existingRunCount;

        const location: DocxLocation = {
            paragraphIndex,
            runIndex,
            textIndex,
            pathString: `p[${paragraphIndex}]/r[${runIndex}]/t[${textIndex}]`,
        };

        const extractedRun: ExtractedRun = {
            paragraphIndex,
            runIndex,
            textIndex,
            location,
            text: runText,
            formatting,
        };

        return {
            run: extractedRun,
            text: runText,
            hasImage,
            hasTable,
        };
    }

    private extractTextNodes(run: any): { text: string }[] {
        const texts: { text: string }[] = [];

        if (run['w:t']) {
            const tNodes = Array.isArray(run['w:t']) ? run['w:t'] : [run['w:t']];
            for (const tNode of tNodes) {
                if (typeof tNode === 'string') {
                    texts.push({ text: tNode });
                } else if (tNode && typeof tNode === 'object') {
                    texts.push({ text: String(tNode['#text'] || '') });
                } else {
                    texts.push({ text: '' });
                }
            }
        }

        return texts;
    }

    private extractFormatting(run: any): ExtractedRun['formatting'] {
        const rPrArray = run['w:rPr'];
        const rPr = Array.isArray(rPrArray) ? rPrArray[0] : rPrArray;
        
        if (!rPr) {
            return {
                bold: false,
                italic: false,
                underline: false,
            };
        }

        const formatting: ExtractedRun['formatting'] = {
            bold: this.isTruthyTag(rPr['w:b']),
            italic: this.isTruthyTag(rPr['w:i']),
            underline: this.isTruthyTag(rPr['w:u']),
        };

        if (rPr['w:rFonts']) {
            const fonts = Array.isArray(rPr['w:rFonts']) ? rPr['w:rFonts'][0] : rPr['w:rFonts'];
            formatting.font = fonts['w:ascii'] || fonts['w:hAnsi'] || fonts['w:cs'] || undefined;
        }

        if (rPr['w:sz']) {
            const szArray = Array.isArray(rPr['w:sz']) ? rPr['w:sz'][0] : rPr['w:sz'];
            const szVal = typeof szArray === 'object' ? szArray['#text'] || szArray['w:val'] || szArray : szArray;
            const size = parseInt(String(szVal), 10);
            if (!isNaN(size) && size > 0) {
                formatting.fontSize = size / 2;
            }
        }

        if (rPr['w:color']) {
            const color = Array.isArray(rPr['w:color']) ? rPr['w:color'][0] : rPr['w:color'];
            formatting.color = color['w:val'] || color['#text'] || undefined;
        }

        return formatting;
    }

    private isTruthyTag(value: any): boolean {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') {
            if (value.trim() === '') return true; // empty string = self-closing tag = active
            if (value.toLowerCase() === 'false') return false;
            if (value === '0') return false;
            return true;
        }
        if (value === false) return false;
        if (value === 0) return false;
        return true;
    }

    private extractParagraphStyle(paragraph: any): string | undefined {
        const pPrArray = paragraph['w:pPr'];
        const pPr = Array.isArray(pPrArray) ? pPrArray[0] : pPrArray;
        if (!pPr) return undefined;

        const pStyle = pPr['w:pStyle'];
        if (!pStyle) return undefined;

        if (typeof pStyle === 'string') return pStyle;
        return pStyle['w:val'] || pStyle['#text'] || undefined;
    }

    private checkHasImage(run: any): boolean {
        return !!run['w:drawing'] || !!run['w:pict'];
    }

    private getChildren(element: any): any[] {
        if (!element || typeof element !== 'object') return [];
        const children: any[] = [];
        for (const key of Object.keys(element)) {
            if (key.startsWith('w:')) {
                const value = element[key];
                if (Array.isArray(value)) {
                    children.push(...value);
                } else {
                    children.push(value);
                }
            }
        }
        return children;
    }

    private countPlaceholders(text: string): number {
        const matches = text.match(/\{\{([^}]+)\}\}/g);
        return matches ? matches.length : 0;
    }

    private collectAllParagraphs(node: any, result: any[] = []): any[] {
        if (!node || typeof node !== 'object') return result;

        if (Array.isArray(node)) {
            for (const item of node) {
                this.collectAllParagraphs(item, result);
            }
            return result;
        }

        if (node['w:p']) {
            const pNodes = Array.isArray(node['w:p']) ? node['w:p'] : [node['w:p']];
            for (const pNode of pNodes) {
                result.push(pNode);
            }
        }

        for (const key of Object.keys(node)) {
            if (key === 'w:p') continue;
            const child = node[key];
            if (child && typeof child === 'object') {
                this.collectAllParagraphs(child, result);
            }
        }

        return result;
    }
}
