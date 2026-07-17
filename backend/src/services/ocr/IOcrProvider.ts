export interface IOcrProvider {
  process(storageId: string, mimeType: string): Promise<string>;
}
