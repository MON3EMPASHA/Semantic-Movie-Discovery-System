import type { Request, Response } from 'express';
import { z } from 'zod';
import { MovieModel } from '../models/Movie';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import { buildFilterQuery, getAvailableGenres, getYearRange, getDirectors } from '../utils/filterBuilder';
import { generateEmbedding } from './embeddingService';
import { searchMoviesByEmbedding } from './movieService';

const filterSchema = z.object({
  q: z.string().min(1).optional(),
  genres: z.string().optional(), // comma-separated
  minRating: z.coerce.number().min(0).max(10).optional(),
  maxRating: z.coerce.number().min(0).max(10).optional(),
  minYear: z.coerce.number().min(1900).optional(),
  maxYear: z.coerce.number().max(new Date().getFullYear() + 1).optional(),
  director: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  sortBy: z.enum(['rating', 'releaseYear', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Advanced search with filters and semantic search
 */
export const advancedSearch = asyncHandler(async (req: Request, res: Response) => {
  const params = filterSchema.parse(req.query);
  
  const filters = {
    genres: params.genres?.split(',').map((g) => g.trim()).filter(Boolean),
    minRating: params.minRating,
    maxRating: params.maxRating,
    minYear: params.minYear,
    maxYear: params.maxYear,
    director: params.director,
  };

  const limit = params.limit || 20;
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

  try {
    let results: any[] = [];

    // If semantic search query provided, use vector search first then filter
    if (params.q && params.q.trim()) {
      logger.info(`Advanced search with query: "${params.q}"`, { filters });

      const embedding = await generateEmbedding(params.q);
      const vectorResults = await searchMoviesByEmbedding(embedding, limit * 2);

      // Apply filters to vector results
      const filterQuery = buildFilterQuery(filters);
      results = await Promise.all(
        vectorResults.map(async ({ movie, score }) => {
          // Check if movie matches all filters
          const matchesFilters = await MovieModel.findOne({
            _id: movie._id,
            ...filterQuery,
          });

          if (matchesFilters) {
            return { movie: matchesFilters, score };
          }
          return null;
        })
      );

      results = results.filter(Boolean).slice(0, limit);
    } else {
      // No semantic search, just use filters and sorting
      logger.info('Advanced search with filters only', { filters });

      const filterQuery = buildFilterQuery(filters);
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

      const movies = await MovieModel.find(filterQuery)
        .sort(sort)
        .limit(limit)
        .lean();

      results = movies.map((movie) => ({ movie, score: null }));
    }

    res.json({
      count: results.length,
      results: results.map(({ movie, score }) => ({
        id: movie.id || movie._id?.toString(),
        title: movie.title,
        genres: movie.genres,
        cast: movie.cast,
        rating: movie.rating,
        releaseYear: movie.releaseYear,
        director: movie.director,
        posterUrl: movie.posterUrl,
        posterGridFSId: movie.posterGridFSId?.toString(),
        ...(score !== null && { score }),
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Advanced search error', { error: errorMessage, filters });
    throw error;
  }
});

/**
 * Get filter options (genres, year range, etc.)
 */
export const getFilterOptions = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const [genres, yearRange, totalMovies] = await Promise.all([
      getAvailableGenres(MovieModel),
      getYearRange(MovieModel),
      MovieModel.countDocuments(),
    ]);

    res.json({
      genres,
      yearRange,
      totalMovies,
      ratingRange: { min: 0, max: 10 },
    });
  } catch (error) {
    logger.error('Failed to fetch filter options', error);
    throw error;
  }
});

/**
 * Get director suggestions for autocomplete
 */
export const getDirectorSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { q } = z.object({ q: z.string().min(1) }).parse(req.query);

  try {
    const directors = await getDirectors(MovieModel, q);
    res.json({ suggestions: directors.slice(0, 10) });
  } catch (error) {
    logger.error('Failed to fetch director suggestions', error);
    throw error;
  }
});
