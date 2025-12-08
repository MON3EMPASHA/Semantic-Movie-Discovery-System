import { Types } from 'mongoose';
import { IngestionJobModel } from '../models/IngestionJob';
import {
  createMovie,
  type CreateMovieDTO,
  updateMovieEmbeddingKeys,
} from './movieService';
import { generateEmbedding } from './embeddingService';
import { upsertMovieEmbeddings } from './vectorSearchService';
import { logger } from '../utils/logger';

export const ingestMovie = async (payload: CreateMovieDTO): Promise<void> => {
  const movie = await createMovie(payload);
  const job = await IngestionJobModel.create({
    movieId: movie._id,
    status: 'processing',
  });

  try {
    const embeddings: Record<string, number[]> = {};

    // Generate embeddings for available text content
    if (payload.plot && payload.plot.trim()) {
      try {
        embeddings.plot = await generateEmbedding(payload.plot);
        logger.info(`Generated plot embedding for movie ${movie._id}`);
      } catch (error) {
        logger.warn(`Failed to generate plot embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (payload.script && payload.script.trim()) {
      try {
        embeddings.script = await generateEmbedding(payload.script);
        logger.info(`Generated script embedding for movie ${movie._id}`);
      } catch (error) {
        logger.warn(`Failed to generate script embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (payload.metadata?.trailerTranscript && typeof payload.metadata.trailerTranscript === 'string') {
      try {
        embeddings.trailer = await generateEmbedding(payload.metadata.trailerTranscript);
        logger.info(`Generated trailer embedding for movie ${movie._id}`);
      } catch (error) {
        logger.warn(`Failed to generate trailer embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If we have embeddings, upsert them to vector DB
    if (Object.keys(embeddings).length > 0) {
      try {
        const embeddingKeys = await upsertMovieEmbeddings(String(movie._id), embeddings);
        await updateMovieEmbeddingKeys(movie._id as Types.ObjectId, embeddingKeys);
        logger.info(`Upserted ${Object.keys(embeddings).length} embeddings for movie ${movie._id}`);
      } catch (error) {
        logger.error(`Failed to upsert embeddings to vector DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw - movie is still saved, just without vector search capability
      }
    } else {
      logger.warn(`Movie ${movie._id} ingested without embeddings (no plot/script provided). It won't be searchable via semantic search.`);
    }

    job.status = 'completed';
    await job.save();
    logger.info(`Movie ${movie._id} ingested successfully`);
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await job.save();
    logger.error('Failed to ingest movie', {
      movieId: movie._id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

