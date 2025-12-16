import mongoose from 'mongoose';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

let gridFSBucket: mongoose.mongo.GridFSBucket;

/**
 * Initialize GridFS bucket
 */
export const initializeGridFS = (): void => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection not established');
  }
  gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'posters',
  });
  logger.info('GridFS initialized');
};

/**
 * Get GridFS bucket instance
 */
export const getGridFSBucket = (): mongoose.mongo.GridFSBucket => {
  if (!gridFSBucket) {
    initializeGridFS();
  }
  return gridFSBucket;
};

/**
 * Upload image to GridFS
 */
export const uploadImageToGridFS = async (
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<mongoose.Types.ObjectId> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    
    // Validate buffer
    if (!Buffer.isBuffer(buffer)) {
      return reject(new Error(`Invalid buffer type: ${typeof buffer}`));
    }
    
    logger.info(`Uploading image to GridFS: ${filename} (${buffer.length} bytes)`);
    
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        uploadedAt: new Date(),
        originalSize: buffer.length,
      },
    });

    const readableStream = Readable.from(buffer);
    
    uploadStream.on('finish', () => {
      logger.info(`Image successfully uploaded to GridFS: ${uploadStream.id} (${buffer.length} bytes)`);
      resolve(uploadStream.id as mongoose.Types.ObjectId);
    });

    uploadStream.on('error', (error) => {
      logger.error('GridFS upload error', error);
      reject(error);
    });

    readableStream.on('error', (error) => {
      logger.error('Stream read error', error);
      reject(error);
    });

    readableStream.pipe(uploadStream);
  });
};

/**
 * Download image from GridFS
 */
export const downloadImageFromGridFS = async (
  fileId: mongoose.Types.ObjectId
): Promise<{ buffer: Buffer; contentType: string }> => {
  return new Promise(async (resolve, reject) => {
    const bucket = getGridFSBucket();
    
    try {
      // Get file metadata first - use async/await instead of callback
      const files = await bucket.find({ _id: fileId }).toArray() as any[];
      
      if (!files || files.length === 0) {
        return reject(new Error('File not found in GridFS'));
      }

      const file = files[0];
      // Fallback chain: file.contentType → metadata.contentType → default
      const contentType = file.contentType || file.metadata?.contentType || 'image/jpeg';
      
      const chunks: Buffer[] = [];
      const downloadStream = bucket.openDownloadStream(fileId);

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, contentType });
      });

      downloadStream.on('error', (error) => {
        logger.error('GridFS download error', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete image from GridFS
 */
export const deleteImageFromGridFS = async (
  fileId: mongoose.Types.ObjectId
): Promise<void> => {
  const bucket = getGridFSBucket();
  await bucket.delete(fileId);
  logger.info(`Image deleted from GridFS: ${fileId}`);
};

/**
 * Check if file exists in GridFS
 */
export const fileExistsInGridFS = async (
  fileId: mongoose.Types.ObjectId
): Promise<boolean> => {
  return new Promise(async (resolve) => {
    const bucket = getGridFSBucket();
    try {
      const files = await bucket.find({ _id: fileId }).toArray() as any[];
      if (!files || files.length === 0) {
        resolve(false);
      } else {
        resolve(true);
      }
    } catch (error) {
      resolve(false);
    }
  });
};
