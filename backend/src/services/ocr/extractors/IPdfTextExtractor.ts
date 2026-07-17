export interface PdfTextResult {
  text: string;
  method: string;
  hasText: boolean;
}

export interface IPdfTextExtractor {
  extractText(buffer: Buffer): Promise<PdfTextResult>;
}
