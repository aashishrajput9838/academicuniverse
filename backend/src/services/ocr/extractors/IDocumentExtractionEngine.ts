export interface ExtractionResult {
  text: string;
  source: 'pdf-text' | 'ocr';
  engine?: string;
  confidence: number;
  pagesProcessed: number;
  qualityScore: number;
  metadata: Record<string, any>;
}

export interface IDocumentExtractionEngine {
  extract(buffer: Buffer, mimeType: string, storageId?: string): Promise<ExtractionResult>;
}
