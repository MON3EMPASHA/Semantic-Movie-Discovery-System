import express from 'express';
import cors from 'cors';
import movieRoutes from './routes/movieRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { env } from './config/env';

const app = express();

// Configure CORS origins
const getCorsOrigins = (): string[] => {
  // Default origins for development
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  
  // If CORS_ORIGINS is set, parse it and combine with defaults
  if (env.CORS_ORIGINS) {
    const customOrigins = env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
    return [...defaultOrigins, ...customOrigins];
  }
  
  return defaultOrigins;
};

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Add request logging middleware
app.use(requestLogger);

// Parse JSON and URL-encoded bodies FIRST
// Multer will skip these if content-type is multipart/form-data
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply routes - Multer will only run for multipart/form-data
app.use('/api', movieRoutes);
app.use('/api', adminRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(errorHandler);

export default app;
















