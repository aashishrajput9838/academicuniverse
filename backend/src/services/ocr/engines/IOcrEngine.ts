export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface OcrEngineResult {
  text: string;
  confidence: number;
  pagesProcessed: number;
  engine: string;
  pageDetails: OcrPageResult[];
}

export interface IOcrEngine {
  readonly name: string;
  process(buffer: Buffer, options?: { language?: string }): Promise<OcrEngineResult>;
}
