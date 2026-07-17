import { OCRService } from './OCRService';

export const ocrService = new OCRService();

export * from './IOcrProvider';
export * from './OCRFactory';
export * from './OCRService';
export * from './DocumentExtractionEngine';
export * from './extractors/IDocumentExtractionEngine';
export * from './engines/IOcrEngine';
export * from './engines/TesseractEngine';
export * from './engines/PaddleOcrEngine';
export * from './extractors/IPdfTextExtractor';
export * from './extractors/PdfTextExtractor';
export * from './preprocessing/IImagePreprocessor';
export * from './preprocessing/SharpImagePreprocessor';
export * from './quality/IOcrQualityScorer';
export * from './quality/OcrQualityScorer';
