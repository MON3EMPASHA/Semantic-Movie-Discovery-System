import { getVectorClient } from './vectorClient';
import { env } from './env';
import { logger } from '../utils/logger';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import type { ChromaClient } from './vectorClient';

const isQdrant = (client: unknown): client is QdrantClient => {
  return client instanceof QdrantClient || (client as { search?: unknown }).search !== undefined;
};

const isPinecone = (client: unknown): client is Pinecone => {
  return client instanceof Pinecone || (client as { index?: unknown }).index !== undefined;
};

const isChroma = (client: unknown): client is ChromaClient => {
  return (client as { baseUrl?: string; collection?: string }).baseUrl !== undefined;
};

export const initializeVectorDB = async (): Promise<void> => {
  try {
    const client = getVectorClient();

    if (isQdrant(client)) {
      // Check if collection exists
      try {
        logger.info(`Checking Qdrant collection '${env.VECTOR_COLLECTION}'...`);
        await client.getCollection(env.VECTOR_COLLECTION);
        logger.info(`✓ Qdrant collection '${env.VECTOR_COLLECTION}' already exists`);
      } catch (error: any) {
        // Collection doesn't exist, create it
        if (error?.status === 404 || error?.message?.includes('not found')) {
          logger.info(`Creating Qdrant collection '${env.VECTOR_COLLECTION}'...`);
          try {
            await client.createCollection(env.VECTOR_COLLECTION, {
              vectors: {
                size: env.VECTOR_DIMENSION,
                distance: 'Cosine',
              },
            });
            logger.info(`✓ Qdrant collection '${env.VECTOR_COLLECTION}' created successfully`);
          } catch (createError: any) {
            logger.error(`Failed to create Qdrant collection: ${createError.message}`);
            throw createError;
          }
        } else {
          // Other error (connection, timeout, etc.)
          logger.error(`Failed to check Qdrant collection: ${error.message}`);
          throw error;
        }
      }
    } else if (isPinecone(client)) {
      // Pinecone indexes are created via the dashboard, just verify it exists
      const indexName = env.PINECONE_INDEX || env.VECTOR_COLLECTION;
      try {
        const index = client.index(indexName);
        await index.describeIndexStats();
        logger.info(`Pinecone index '${indexName}' is ready`);
      } catch (error) {
        logger.warn(
          `Pinecone index '${indexName}' may not exist. Please create it in the Pinecone dashboard with dimension ${env.VECTOR_DIMENSION}`,
        );
      }
    } else if (isChroma(client)) {
      // Check if Chroma collection exists
      try {
        await axios.get(`${client.baseUrl}/collections/${client.collection}`);
        logger.info(`Chroma collection '${client.collection}' already exists`);
      } catch (error) {
        // Collection doesn't exist, create it
        logger.info(`Creating Chroma collection '${client.collection}'...`);
        await axios.post(`${client.baseUrl}/collections`, {
          name: client.collection,
          metadata: { dimension: env.VECTOR_DIMENSION },
        });
        logger.info(`Chroma collection '${client.collection}' created successfully`);
      }
    }
  } catch (error: any) {
    logger.error('Failed to initialize vector database', error);
    
    // Provide helpful error messages
    if (error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      logger.error('');
      logger.error('Qdrant Connection Timeout - Possible causes:');
      logger.error('1. Check your internet connection');
      logger.error('2. Verify your Qdrant URL is correct in .env (VECTOR_DB_URL)');
      logger.error('3. Check if your IP is whitelisted in Qdrant Cloud (if using cloud)');
      logger.error('4. Verify your Qdrant API key is correct (if using cloud)');
      logger.error('5. If using Qdrant Cloud, ensure the cluster is running');
      logger.error('6. Check firewall/proxy settings');
      logger.error('');
      logger.warn('⚠️  Server will continue without vector database.');
      logger.warn('⚠️  Semantic search features will not work until Qdrant is connected.');
    } else {
      logger.warn('⚠️  Server will continue without vector database.');
      logger.warn('⚠️  Semantic search features will not work until vector DB is connected.');
    }
    
    // Don't throw - allow server to start even if vector DB init fails
    // It will fail when actually trying to use it
  }
};
















