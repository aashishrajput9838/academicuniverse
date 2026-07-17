import { IDocumentExtractionEngine, ExtractionResult } from './extractors/IDocumentExtractionEngine';
import { IPdfTextExtractor } from './extractors/IPdfTextExtractor';
import { IImagePreprocessor, PreprocessedImage } from './preprocessing/IImagePreprocessor';
import { IOcrEngine } from './engines/IOcrEngine';
import { IOcrQualityScorer } from './quality/IOcrQualityScorer';
import { logger } from '../../utils/logger';

export class DocumentExtractionEngine implements IDocumentExtractionEngine {
  constructor(
    private pdfTextExtractor: IPdfTextExtractor,
    private imagePreprocessor: IImagePreprocessor,
    private primaryOcrEngine: IOcrEngine,
    private fallbackOcrEngine: IOcrEngine | null,
    private qualityScorer: IOcrQualityScorer,
  ) {}

  async extract(buffer: Buffer, mimeType: string, storageId?: string): Promise<ExtractionResult> {
    logger.info(`DocumentExtractionEngine: Starting extraction for mimeType=${mimeType}, storageId=${storageId}`);

    // 1. Try PDF text extraction first
    if (mimeType === 'application/pdf') {
      logger.info('DocumentExtractionEngine: Attempting PDF text extraction before OCR');
      const extracted = await this.pdfTextExtractor.extractText(buffer);
      
      if (extracted.hasText && extracted.text.trim().length > 0) {
        logger.info(`DocumentExtractionEngine: PDF native extraction text length: ${extracted.text.length}`);
        const quality = this.qualityScorer.score(extracted.text, 'pdf-text', 1);
        
        return {
          text: extracted.text,
          source: 'pdf-text',
          confidence: 1.0,
          pagesProcessed: 1,
          qualityScore: quality.score,
          metadata: { 
            method: extracted.method,
            qualityReason: quality.reason,
          },
        };
      }
      
      logger.info('DocumentExtractionEngine: PDF text extraction returned insufficient text, falling back to OCR');
    }

    // 2. Render PDF pages to images at 300 DPI
    const images = await this.getImagesToProcess(buffer, mimeType);
    
    if (images.length === 0) {
      logger.warn('DocumentExtractionEngine: No pages found for OCR');
      return {
        text: '',
        source: 'ocr',
        confidence: 0,
        pagesProcessed: 0,
        qualityScore: 0,
        metadata: { error: 'No pages found for OCR' },
      };
    }

    logger.info(`DocumentExtractionEngine: Processing ${images.length} pages with ${this.primaryOcrEngine.name}`);

    // 3. Process each page with primary engine
    const primaryResult = await this.processImages(images, this.primaryOcrEngine);
    
    // 4. Check quality and fallback if needed
    if (primaryResult.qualityScore >= 0.3 && primaryResult.pagesProcessed > 0) {
      return primaryResult;
    }

    logger.warn(`DocumentExtractionEngine: Primary engine ${this.primaryOcrEngine.name} returned low quality (score: ${primaryResult.qualityScore.toFixed(2)}, reason: ${primaryResult.metadata.qualityReason})`);

    if (this.fallbackOcrEngine) {
      logger.info(`DocumentExtractionEngine: Falling back to ${this.fallbackOcrEngine.name}`);
      try {
        const fallbackResult = await this.processImages(images, this.fallbackOcrEngine);
        
        if (fallbackResult.qualityScore > primaryResult.qualityScore) {
          logger.info(`DocumentExtractionEngine: Fallback engine produced better result (score: ${fallbackResult.qualityScore.toFixed(2)})`);
          return fallbackResult;
        }
        
        logger.info(`DocumentExtractionEngine: Fallback engine did not improve quality, keeping primary result`);
      } catch (err) {
        logger.warn(`DocumentExtractionEngine: Fallback engine failed: ${err}`);
      }
    } else {
      logger.warn('DocumentExtractionEngine: No fallback engine configured');
    }

    return primaryResult;
  }

  private async processImages(images: Array<{ buffer: Buffer; pageNumber: number; width: number; height: number }>, engine: IOcrEngine): Promise<ExtractionResult> {
    let fullText = '';
    let totalConfidence = 0;
    let pagesProcessed = 0;
    const pageDetails: any[] = [];
    let lastError: Error | null = null;

    for (const image of images) {
      try {
        logger.debug(`DocumentExtractionEngine: Preprocessing page ${image.pageNumber} (${image.width}x${image.height})`);
        const preprocessed = await this.imagePreprocessor.preprocess(image.buffer);
        
        logger.debug(`DocumentExtractionEngine: Running OCR on page ${image.pageNumber} with ${engine.name}`);
        const result = await engine.process(preprocessed.buffer);
        
        if (result.text && result.text.trim().length > 0) {
          fullText += (fullText ? '\n\n--- PAGE BREAK ---\n\n' : '') + result.text.trim();
          totalConfidence += result.confidence;
          pagesProcessed++;
          
          pageDetails.push({
            pageNumber: image.pageNumber,
            text: result.text,
            confidence: result.confidence,
          });
          
          logger.info(`DocumentExtractionEngine: Page ${image.pageNumber} OCR - ${result.text.length} chars, confidence: ${(result.confidence * 100).toFixed(1)}%`);
        } else {
          logger.warn(`DocumentExtractionEngine: Page ${image.pageNumber} returned empty OCR text`);
        }
      } catch (err) {
        lastError = err as Error;
        logger.warn(`DocumentExtractionEngine: OCR failed for page ${image.pageNumber}: ${err}`);
      }
    }

    if (pagesProcessed === 0 && images.length > 0 && lastError) {
      throw lastError;
    }

    const avgConfidence = pagesProcessed > 0 ? totalConfidence / pagesProcessed : 0;
    const quality = this.qualityScorer.score(fullText, engine.name, pagesProcessed);

    logger.info(`DocumentExtractionEngine: ${engine.name} completed - ${pagesProcessed}/${images.length} pages, final merged OCR length: ${fullText.length} chars, quality: ${(quality.score * 100).toFixed(1)}%`);

    return {
      text: fullText,
      source: 'ocr',
      engine: engine.name,
      confidence: avgConfidence,
      pagesProcessed,
      qualityScore: quality.score,
      metadata: {
        pageDetails,
        qualityReason: quality.reason,
        totalPagesFound: images.length,
      },
    };
  }

  private async getImagesToProcess(buffer: Buffer, mimeType: string): Promise<Array<{ buffer: Buffer; pageNumber: number; width: number; height: number }>> {
    if (mimeType.startsWith('image/')) {
      return [{ buffer, pageNumber: 1, width: 0, height: 0 }];
    }

    if (mimeType === 'application/pdf') {
      return this.renderPdfPages(buffer);
    }

    return [];
  }

  protected async renderPdfPages(buffer: Buffer): Promise<Array<{ buffer: Buffer; pageNumber: number; width: number; height: number }>> {
    const images: Array<{ buffer: Buffer; pageNumber: number; width: number; height: number }> = [];
    
    try {
      const { pdf } = await import('pdf-to-img');
      const pages = await pdf(buffer, { scale: 300 / 72 });
      
      let pageNum = 0;
      for await (const page of pages) {
        pageNum++;
        const width = (page as any).width || 2481;
        const height = (page as any).height || 3508;
        
        images.push({
          buffer: page as Buffer,
          pageNumber: pageNum,
          width,
          height,
        });
        
        logger.info(`DocumentExtractionEngine: Rendered page ${pageNum} (${width}x${height}px)`);
      }

      logger.info(`DocumentExtractionEngine: Rendered ${images.length} pages from PDF`);
    } catch (e) {
      logger.error(`DocumentExtractionEngine: Failed to render PDF pages: ${e}`);
    }

    return images;
  }
}
