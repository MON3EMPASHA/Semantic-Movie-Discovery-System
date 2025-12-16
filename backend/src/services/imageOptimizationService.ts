import sharp from 'sharp';
import { logger } from '../utils/logger';

export interface OptimizedImage {
  original: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  format: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Optimize image by:
 * 1. Detecting format
 * 2. Compressing to WebP (if supported) or original format
 * 3. Generating thumbnail (200x300 for poster aspect ratio)
 * 4. Returning both main and thumbnail
 */
export const optimizeImage = async (
  imageBuffer: Buffer,
  filename: string
): Promise<OptimizedImage> => {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to determine image dimensions');
    }

    // Compress main image to WebP (80% quality)
    // Falls back to original format if not suitable
    const format = metadata.format || 'jpeg';
    const compressedBuffer = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(1920, 1440, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer()
      .catch(async () => {
        // Fallback to original format if WebP fails
        logger.warn(`WebP conversion failed for ${filename}, using original format`);
        return sharp(imageBuffer)
          .rotate()
          .resize(1920, 1440, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(format as any, { quality: 80 })
          .toBuffer();
      });

    // Generate thumbnail (200x300) for list views
    const thumbnailBuffer = await sharp(imageBuffer)
      .rotate()
      .resize(200, 300, {
        fit: 'cover',
        position: 'top',
      })
      .webp({ quality: 70 })
      .toBuffer()
      .catch(async () => {
        return sharp(imageBuffer)
          .rotate()
          .resize(200, 300, {
            fit: 'cover',
            position: 'top',
          })
          .toFormat(format as any, { quality: 70 })
          .toBuffer();
      });

    const compression = (
      ((imageBuffer.length - compressedBuffer.length) / imageBuffer.length) *
      100
    ).toFixed(2);

    logger.info(`Image optimized: ${filename}`, {
      originalSize: imageBuffer.length,
      compressedSize: compressedBuffer.length,
      compressionPercent: compression,
      width: metadata.width,
      height: metadata.height,
    });

    return {
      original: compressedBuffer,
      thumbnail: thumbnailBuffer,
      width: metadata.width,
      height: metadata.height,
      format: 'webp',
      originalSize: imageBuffer.length,
      compressedSize: compressedBuffer.length,
    };
  } catch (error) {
    logger.error('Image optimization failed', error);
    // Fallback: return original buffer with basic compression
    return {
      original: imageBuffer,
      thumbnail: imageBuffer,
      width: 0,
      height: 0,
      format: 'unknown',
      originalSize: imageBuffer.length,
      compressedSize: imageBuffer.length,
    };
  }
};
