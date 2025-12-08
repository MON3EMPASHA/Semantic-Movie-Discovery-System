import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initializeVectorDB } from './config/initVectorDB';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    await connectDatabase();
    await initializeVectorDB();
    app.listen(env.port, () => {
      logger.info(`API server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

