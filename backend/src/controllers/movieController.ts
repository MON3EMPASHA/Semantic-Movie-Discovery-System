import type { Request, Response } from 'express';
import { z } from 'zod';
import { ingestMovie, ingestMovieWithImage } from '../services/ingestionService';
import { getMovieById, searchMoviesByEmbedding, getAllMovies, updateMovie, deleteMovie, updateMoviePosterImage } from '../services/movieService';
import type { MovieDocument } from '../models/Movie';
import { asyncHandler } from '../utils/asyncHandler';
import { generateEmbedding } from '../services/embeddingService';
import { logger } from '../utils/logger';
import { downloadImageFromGridFS } from '../services/gridfsService';

// Helper to transform empty strings to undefined and validate URL if provided
const urlOrEmpty = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().url().optional(),
);

const ingestionSchema = z.object({
  title: z.string().min(1),
  genres: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([]),
  director: z.string().optional(),
  releaseYear: z.number().int().optional(),
  plot: z.string().optional(),
  trailerUrl: urlOrEmpty,
  posterUrl: urlOrEmpty,
  rating: z.number().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const searchSchema = z.object({
  q: z.string().min(3),
  limit: z.coerce.number().min(1).max(20).optional(),
});

const similarSchema = z.object({
  limit: z.coerce.number().min(1).max(10).default(5),
});

export const searchMoviesHandler = asyncHandler(async (req, res) => {
  const { q, limit } = searchSchema.parse(req.query);
  
  try {
    logger.info(`Starting semantic search for query: "${q}"`);
    
    // Generate embedding
    let embedding: number[];
    try {
      embedding = await generateEmbedding(q);
      logger.info(`Generated embedding with dimension: ${embedding.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Embedding generation failed', { error: errorMessage, query: q });
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }

    // Search vector database
    let results: { movie: MovieDocument; score: number }[] = [];
    try {
      results = await searchMoviesByEmbedding(embedding, limit ?? 10);
      logger.info(`Vector search returned ${results.length} results`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Vector search failed', { error: errorMessage });
      // Return empty results instead of failing
      results = [];
    }

    // Transform results
    const transformedResults = results.map(({ movie, score }) => ({
      id: movie.id || movie._id?.toString(),
      title: movie.title,
      genres: movie.genres,
      cast: movie.cast,
      rating: movie.rating,
      posterUrl: movie.posterUrl,
      posterGridFSId: movie.posterGridFSId?.toString(),
      releaseYear: movie.releaseYear,
      score,
    }));

    res.json({
      count: transformedResults.length,
      results: transformedResults,
    });
  } catch (error) {
    // Log the full error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Search error', { 
      error: errorMessage, 
      query: q, 
      stack: error instanceof Error ? error.stack : undefined 
    });
    throw error;
  }
});

export const getMovieHandler = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const movie = await getMovieById(id);
  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  // Ensure id field is present
  const movieObj = movie.toObject();
  return res.json({
    ...movieObj,
    id: movie.id || movie._id?.toString(),
  });
});

export const getSimilarMoviesHandler = asyncHandler(async (req: Request, res) => {
  const { limit } = similarSchema.parse(req.query);
  const { id } = req.params as { id: string };
  const movie = await getMovieById(id);

  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  const baseText = movie.plot;
  if (!baseText) {
    return res.status(400).json({ message: 'Movie is missing plot description for similarity search' });
  }

  const embedding = await generateEmbedding(baseText);
  const results = await searchMoviesByEmbedding(embedding, limit);
  const filtered = results.filter(({ movie: candidate }) => candidate.id !== movie.id);

  return res.json({
    count: filtered.length,
    results: filtered.map(({ movie: candidate, score }) => ({
      id: candidate.id,
      title: candidate.title,
      posterUrl: candidate.posterUrl,
      posterGridFSId: candidate.posterGridFSId?.toString(),
      score,
    })),
  });
});

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const listMoviesHandler = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder } = listSchema.parse(req.query);
  const result = await getAllMovies(page, limit, sortBy, sortOrder);
  
  // Transform movies to ensure id field is present
  const transformedMovies = result.movies.map((movie) => ({
    ...movie.toObject(),
    id: movie.id || movie._id?.toString(),
  }));
  
  res.json({
    ...result,
    movies: transformedMovies,
  });
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  genres: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  director: z.string().optional(),
  releaseYear: z.number().int().optional(),
  plot: z.string().optional(),
  trailerUrl: urlOrEmpty,
  posterUrl: urlOrEmpty,
  rating: z.number().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMovieHandler = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const payload = updateSchema.parse(req.body);
  const movie = await updateMovie(id, payload);

  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  // Ensure id field is present
  const movieObj = movie.toObject();
  res.json({
    ...movieObj,
    id: movie.id || movie._id?.toString(),
  });
});

export const deleteMovieHandler = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const deleted = await deleteMovie(id);

  if (!deleted) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  res.json({ message: 'Movie deleted successfully' });
});

// Handler for ingesting movie - supports both JSON and FormData with optional image
export const ingestMovieWithImageHandler = asyncHandler(async (req, res) => {
  try {
    // DEBUG: Log what we received
    logger.info('=== INGESTION REQUEST DEBUG ===');
    logger.info('Content-Type:', req.headers['content-type']);
    logger.info('Has file:', !!req.file);
    logger.info('req.body type:', typeof req.body);
    logger.info('req.body:', req.body);
    logger.info('req.body keys:', Object.keys(req.body || {}));
    logger.info('================================');

    let payload: any;

    // If multer processed the request (FormData), req.body will have fields
    // If it's a JSON request, express.json() would have parsed req.body
    const isFormData = req.headers['content-type']?.includes('multipart/form-data');
    const hasBodyFields = Object.keys(req.body || {}).length > 0;

    if (isFormData && hasBodyFields) {
      // FormData request - multer parsed fields into req.body
      const bodyData = req.body;

      // Helper function to normalize values to arrays
      const normalizeArray = (value: any): string[] => {
        if (!value) return [];
        // If it's a JSON string, parse it
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed.filter((v) => v && typeof v === 'string' && v.trim());
            }
          } catch {
            // Not JSON, treat as single string
            return value.trim() ? [value] : [];
          }
        }
        // If it's already an array, filter it
        if (Array.isArray(value)) {
          return value.filter((v) => v && typeof v === 'string' && v.trim());
        }
        return [];
      };

      // Build payload from FormData
      payload = {
        title: bodyData.title,
        genres: normalizeArray(bodyData.genres),
        cast: normalizeArray(bodyData.cast),
        director:
          bodyData.director && bodyData.director.trim()
            ? bodyData.director
            : undefined,
        releaseYear:
          bodyData.releaseYear && bodyData.releaseYear.trim()
            ? Number(bodyData.releaseYear)
            : undefined,
        plot:
          bodyData.plot && bodyData.plot.trim() ? bodyData.plot : undefined,
        trailerUrl:
          bodyData.trailerUrl && bodyData.trailerUrl.trim()
            ? bodyData.trailerUrl
            : undefined,
        posterUrl:
          bodyData.posterUrl && bodyData.posterUrl.trim()
            ? bodyData.posterUrl
            : undefined,
        rating:
          bodyData.rating && bodyData.rating.trim()
            ? Number(bodyData.rating)
            : undefined,
      };

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });
    } else if (hasBodyFields) {
      // JSON request - body already parsed by express.json()
      payload = req.body;
    } else {
      // No body data at all
      logger.error('No body data received');
      throw new Error('No request body provided');
    }

    // Validate with schema
    const validatedPayload = ingestionSchema.parse(payload);
    
    // Get file (multer.single() puts it in req.file)
    const file = req.file;

    if (file) {
      // Ensure buffer is a proper Buffer object
      const imageBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
      logger.info('Image buffer info:', {
        isBuffer: Buffer.isBuffer(imageBuffer),
        size: imageBuffer.length,
        type: typeof imageBuffer
      });
      
      await ingestMovieWithImage(
        validatedPayload,
        imageBuffer,
        file.mimetype,
        file.originalname
      );
      res.status(202).json({ message: 'Movie ingestion with image started' });
    } else {
      await ingestMovie(validatedPayload);
      res.status(202).json({ message: 'Movie ingestion started' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Ingestion handler error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      payload: req.body,
    });
    throw error;
  }
});

// Handler for getting movie poster image
export const getMoviePosterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const movie = await getMovieById(id);

  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  if (!movie.posterGridFSId) {
    return res.status(404).json({ message: 'Movie has no poster image stored in GridFS' });
  }

  try {
    const { buffer, contentType } = await downloadImageFromGridFS(movie.posterGridFSId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);
  } catch (error) {
    logger.error('Failed to retrieve poster image', error);
    return res.status(500).json({ message: 'Failed to retrieve poster image' });
  }
});

// Handler for updating movie poster image
export const updateMoviePosterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  try {
    const movie = await updateMoviePosterImage(id, file.buffer, file.mimetype, file.originalname);
    
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json({ 
      message: 'Poster image updated successfully',
      posterGridFSId: movie.posterGridFSId,
    });
  } catch (error) {
    logger.error('Failed to update poster image', error);
    throw error;
  }
});

