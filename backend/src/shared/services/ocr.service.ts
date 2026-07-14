export class OCRService {
  // Simple stub implementation returning empty string.
  async extractText(_buffer: Buffer): Promise<string> {
    // In production, integrate with an OCR library.
    return '';
  }
}
