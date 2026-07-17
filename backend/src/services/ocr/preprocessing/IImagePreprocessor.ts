export interface PreprocessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
}

export interface IImagePreprocessor {
  preprocess(buffer: Buffer): Promise<PreprocessedImage>;
  enhanceContrast(buffer: Buffer): Promise<Buffer>;
  resizeForOcr(buffer: Buffer): Promise<Buffer>;
  deskew(buffer: Buffer): Promise<Buffer>;
  autoRotate(buffer: Buffer): Promise<Buffer>;
  adaptiveThreshold(buffer: Buffer): Promise<Buffer>;
}
