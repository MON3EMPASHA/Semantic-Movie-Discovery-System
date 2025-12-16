import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initializeVectorDB } from './config/initVectorDB';
import { initializeGridFS } from './services/gridfsService';
import { logger } from './utils/logger';
import { importMovies } from './scripts/importMovies';

const startServer = async () => {
  try {
    await connectDatabase();
    initializeGridFS();
    await initializeVectorDB();
    
    // Auto-import movies if AUTO_IMPORT_MOVIES=true in .env
    if (process.env.AUTO_IMPORT_MOVIES === 'true') {
      logger.info('AUTO_IMPORT_MOVIES enabled - importing movies...');
      try {
        await importMovies();
        logger.info('Movie import completed successfully');
      } catch (error) {
        logger.warn('Movie import failed, but server will continue', error);
      }
    }
    
    app.listen(env.port, () => {
      logger.info(`API server running on port ${env.port}`);
      logger.info(`Visit: http://localhost:${env.port}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

