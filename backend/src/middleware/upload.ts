import multer from 'multer';
import path from 'path';
import { logger } from '../utils/logger';

// Store files in memory as buffers
const storage = multer.memoryStorage();

// File filter - only allow image files
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  logger.info(`[FILEFILTER] Called for: ${file.fieldname} - ${file.originalname} (${file.mimetype})`);
  
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  logger.info(`[FILEFILTER] Extension: ${extname}, MIME: ${mimetype}`);

  if (mimetype && extname) {
    logger.info(`[FILEFILTER] ✓ File accepted`);
    cb(null, true);
  } else {
    logger.warn(`[FILEFILTER] ✗ File rejected: ${file.originalname}`);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

// Debug middleware - logs after multer has processed
export const debugFormData = (req: any, res: any, next: any) => {
  if (req.path.includes('/movies/ingest')) {
    logger.info('[AFTER MULTER]', {
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body || {}),
      bodySize: JSON.stringify(req.body).length
    });
  }
  next();
};

