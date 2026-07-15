// src/services/ocr/IOcrProvider.ts
export interface IOcrProvider {
  /**
   * Execute OCR on a stored file.
   * @param storageId Identifier of the binary file stored via StorageProvider.
   * @param mimeType MIME type of the file (e.g., 'image/png', 'application/pdf').
   * @returns Extracted textual content.
   */
  process(storageId: string, mimeType: string): Promise<string>;
}
