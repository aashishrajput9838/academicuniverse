// src/services/ocr/OCRFactory.ts
import { IOcrProvider } from './IOcrProvider';
import { TesseractProvider } from './providers/TesseractProvider';

export class OCRFactory {
  private static providers: Map<string, IOcrProvider> = new Map();

  static registerProvider(name: string, provider: IOcrProvider): void {
    if (this.providers.has(name)) {
      console.warn(`OCRFactory: Overriding existing provider for ${name}`);
    }
    this.providers.set(name, provider);
  }

  static getProvider(name: string): IOcrProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`OCRFactory: No provider registered for strategy '${name}'`);
    }
    return provider;
  }
}

// Register built-in providers
OCRFactory.registerProvider('TESSERACT', new TesseractProvider());

