import { OCRService } from './OCRService';

// Instantiate the OCRService singleton to activate event bus subscriptions
export const ocrService = new OCRService();

export * from './IOcrProvider';
export * from './OCRFactory';
export * from './OCRService';
export * from './providers/TesseractProvider';
