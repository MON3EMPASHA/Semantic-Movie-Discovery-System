import { getVectorClient, type ChromaClient } from '../config/vectorClient';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';

export type EmbeddingRecord = Record<string, number[]>;

export interface VectorMatch {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

// Helper to check client type
const isQdrant = (client: unknown): client is QdrantClient => {
  return client instanceof QdrantClient || (client as { search?: unknown }).search !== undefined;
};

const isPinecone = (client: unknown): client is Pinecone => {
  return client instanceof Pinecone || (client as { index?: unknown }).index !== undefined;
};

const isChroma = (client: unknown): client is ChromaClient => {
  return (client as { baseUrl?: string; collection?: string }).baseUrl !== undefined;
};

export const upsertMovieEmbeddings = async (
  movieId: string,
  embeddings: EmbeddingRecord,
): Promise<Record<string, string>> => {
  const client = getVectorClient();

  if (!Object.keys(embeddings).length) {
    throw new Error('No embeddings provided for upsert');
  }

  if (isQdrant(client)) {
    const points = Object.entries(embeddings).map(([source, vector]) => ({
      id: `${movieId}:${source}`,
      vector,
      payload: {
        movieId,
        source,
      },
    }));

    await client.upsert(env.VECTOR_COLLECTION, {
      wait: true,
      points,
    });

    logger.info(`Upserted ${points.length} embeddings for movie ${movieId} to Qdrant`);
    return points.reduce<Record<string, string>>((acc, point) => {
      acc[point.payload.source as string] = point.id as string;
      return acc;
    }, {});
  }

  if (isPinecone(client)) {
    const index = client.index(env.PINECONE_INDEX || env.VECTOR_COLLECTION);
    const vectors = Object.entries(embeddings).map(([source, vector]) => ({
      id: `${movieId}:${source}`,
      values: vector,
      metadata: { movieId, source },
    }));

    await index.upsert(vectors);
    logger.info(`Upserted ${vectors.length} embeddings for movie ${movieId} to Pinecone`);
    return vectors.reduce<Record<string, string>>((acc, vec) => {
      acc[vec.metadata.source] = vec.id;
      return acc;
    }, {});
  }

  if (isChroma(client)) {
    // Chroma upsert via REST API
    const vectors = Object.entries(embeddings).map(([source, vector]) => ({
      id: `${movieId}:${source}`,
      embedding: vector,
      metadata: { movieId, source },
    }));

    await axios.post(`${client.baseUrl}/collections/${client.collection}/add`, {
      ids: vectors.map((v) => v.id),
      embeddings: vectors.map((v) => v.embedding),
      metadatas: vectors.map((v) => v.metadata),
    });

    logger.info(`Upserted ${vectors.length} embeddings for movie ${movieId} to Chroma`);
    return vectors.reduce<Record<string, string>>((acc, vec) => {
      acc[vec.metadata.source] = vec.id;
      return acc;
    }, {});
  }

  throw new Error('Unsupported vector database provider');
};

export const semanticSearch = async (
  embedding: number[],
  limit = 10,
): Promise<VectorMatch[]> => {
  const client = getVectorClient();

  if (isQdrant(client)) {
    try {
      // Check if collection exists first
      try {
        const collectionInfo = await client.getCollection(env.VECTOR_COLLECTION);
        // Check if collection has any points
        if (collectionInfo.points_count === 0) {
          logger.info(`Vector collection '${env.VECTOR_COLLECTION}' is empty. Returning empty results.`);
          return [];
        }
      } catch (error) {
        logger.warn(`Vector collection '${env.VECTOR_COLLECTION}' does not exist. Returning empty results.`);
        return [];
      }

      const response = await client.search(env.VECTOR_COLLECTION, {
        vector: embedding,
        limit,
        with_payload: true,
      });

      if (!response || !Array.isArray(response)) {
        logger.warn('Qdrant search returned invalid response');
        return [];
      }

      return (response as unknown as Array<{ id: unknown; score?: number; payload?: Record<string, unknown> }>).map((point) => ({
        id: String(point.id),
        score: point.score ?? 0,
        payload: point.payload ?? {},
      }));
    } catch (error) {
      logger.error('Qdrant search error', error);
      // Return empty array instead of throwing to allow graceful degradation
      logger.warn('Returning empty results due to search error');
      return [];
    }
  }

  if (isPinecone(client)) {
    const index = client.index(env.PINECONE_INDEX || env.VECTOR_COLLECTION);
    const queryResponse = await index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
    });

    return (queryResponse.matches || []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      payload: (match.metadata || {}) as Record<string, unknown>,
    }));
  }

  if (isChroma(client)) {
    const response = await axios.post(
      `${client.baseUrl}/collections/${client.collection}/query`,
      {
        query_embeddings: [embedding],
        n_results: limit,
      }
    );

    const results = response.data;
    const matches: VectorMatch[] = [];

    if (results.ids && results.ids[0]) {
      const ids = results.ids[0] as string[];
      const distances = (results.distances?.[0] || []) as number[];
      const metadatas = (results.metadatas?.[0] || []) as Record<string, unknown>[];

      ids.forEach((id, idx) => {
        matches.push({
          id,
          score: 1 - (distances[idx] || 0), // Convert distance to similarity score
          payload: metadatas[idx] || {},
        });
      });
    }

    return matches;
  }

  throw new Error('Unsupported vector database provider');
};

