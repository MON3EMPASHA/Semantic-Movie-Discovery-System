import { QdrantClient, type QdrantClientParams } from '@qdrant/js-client-rest';
import { Pinecone } from '@pinecone-database/pinecone';
import { env } from './env';
import { logger } from '../utils/logger';

export interface ChromaClient {
  collection: string;
  baseUrl: string;
}

export type VectorClient = QdrantClient | Pinecone | ChromaClient;

let client: VectorClient | null = null;

export const getVectorClient = (): VectorClient => {
  if (!client) {
    if (env.VECTOR_DB_PROVIDER === 'pinecone') {
      if (!env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY is required for Pinecone');
      }
      client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
      logger.info('Pinecone vector client initialized');
    } else if (env.VECTOR_DB_PROVIDER === 'chroma') {
      if (!env.VECTOR_DB_URL) {
        throw new Error('VECTOR_DB_URL is required for Chroma');
      }
      client = {
        collection: env.VECTOR_COLLECTION,
        baseUrl: env.VECTOR_DB_URL,
      };
      logger.info('Chroma vector client initialized');
    } else {
      // Default to Qdrant
      if (!env.VECTOR_DB_URL) {
        throw new Error('VECTOR_DB_URL is not configured');
      }
      const params: QdrantClientParams = {
        url: env.VECTOR_DB_URL,
      };

      if (env.VECTOR_DB_API_KEY) {
        params.apiKey = env.VECTOR_DB_API_KEY;
      }

      client = new QdrantClient(params);
      logger.info('Qdrant vector client initialized');
    }
  }

  return client;
};

