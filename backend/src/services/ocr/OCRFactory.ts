import { IOcrEngine } from './engines/IOcrEngine';
import { TesseractEngine } from './engines/TesseractEngine';
import { PaddleOcrEngine } from './engines/PaddleOcrEngine';

export class OCRFactory {
  private static engines: Map<string, IOcrEngine> = new Map();

  static registerEngine(name: string, engine: IOcrEngine): void {
    if (this.engines.has(name)) {
      console.warn(`OCRFactory: Overriding existing engine for ${name}`);
    }
    this.engines.set(name, engine);
  }

  static getEngine(name: string): IOcrEngine {
    const engine = this.engines.get(name);
    if (!engine) {
      throw new Error(`OCRFactory: No engine registered for strategy '${name}'`);
    }
    return engine;
  }
}

OCRFactory.registerEngine('TESSERACT', new TesseractEngine());
OCRFactory.registerEngine('PADDLEOCR', new PaddleOcrEngine());
