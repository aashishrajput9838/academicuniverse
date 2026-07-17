import sharp from 'sharp';
import { IImagePreprocessor, PreprocessedImage } from './IImagePreprocessor';
import { logger } from '../../../utils/logger';

export class SharpImagePreprocessor implements IImagePreprocessor {
  async preprocess(buffer: Buffer): Promise<PreprocessedImage> {
    const processed = await sharp(buffer)
      .rotate() // auto-rotate based on EXIF
      .resize(3000, 4000, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize() // contrast enhancement
      .sharpen()
      .toBuffer();

    const metadata = await sharp(processed).metadata();
    
    logger.info(`SharpImagePreprocessor: Preprocessed image to ${metadata.width}x${metadata.height}`);
    
    return {
      buffer: processed,
      format: metadata.format || 'png',
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  async enhanceContrast(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).normalize().toBuffer();
  }

  async resizeForOcr(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(3000, 4000, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  }

  async deskew(buffer: Buffer): Promise<Buffer> {
    logger.warn('SharpImagePreprocessor: deskew not fully implemented, requires OpenCV integration');
    return buffer;
  }

  async autoRotate(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).rotate().toBuffer();
  }

  async adaptiveThreshold(buffer: Buffer): Promise<Buffer> {
    logger.warn('SharpImagePreprocessor: adaptiveThreshold not fully implemented, requires OpenCV integration');
    return buffer;
  }
}
