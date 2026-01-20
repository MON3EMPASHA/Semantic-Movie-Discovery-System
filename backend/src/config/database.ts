import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', false);
    
    // Connection options for better reliability
    const connectionOptions: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      retryWrites: true,
      retryReads: true,
    };

    logger.info('Attempting to connect to MongoDB...');
    logger.debug(`MongoDB URI: ${env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    
    await mongoose.connect(env.MONGODB_URI, connectionOptions);
    logger.info('✓ Connected to MongoDB successfully');
  } catch (error: any) {
    logger.error('MongoDB connection error', error);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND' || error.syscall === 'querySrv') {
      logger.error('');
      logger.error('DNS Resolution Error - Possible causes:');
      logger.error('1. Check your internet connection');
      logger.error('2. Verify your MongoDB Atlas connection string is correct');
      logger.error('3. Check if your IP is whitelisted in MongoDB Atlas');
      logger.error('4. Try using a different DNS server (e.g., 8.8.8.8)');
      logger.error('5. If behind a firewall/proxy, ensure DNS queries are allowed');
      logger.error('');
      logger.error('Connection string format should be:');
      logger.error('mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
    }
    
    throw error;
  }
};
















