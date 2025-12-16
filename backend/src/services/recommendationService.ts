import { MovieModel, type MovieDocument } from '../models/Movie';
import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * Get trending movies (recently added/updated with ratings)
 */
export const getTrendingMovies = asyncHandler(async (req: Request, res: Response) => {
  const { limit, daysBack } = z
    .object({
      limit: z.coerce.number().min(1).max(50).default(10),
      daysBack: z.coerce.number().min(1).default(7),
    })
    .parse(req.query);

  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    const trending = await MovieModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateThreshold },
        },
      },
      {
        $addFields: {
          trendScore: {
            $add: [
              { $multiply: [{ $ifNull: ['$rating', 5] }, 0.6] },
              { $multiply: [{ $cond: ['$posterGridFSId', 1, 0] }, 1] }, // Has poster bonus
            ],
          },
        },
      },
      { $sort: { trendScore: -1 } },
      { $limit: limit },
      {
        $project: {
          id: '$_id',
          title: 1,
          rating: 1,
          genres: 1,
          posterUrl: 1,
          posterGridFSId: 1,
          releaseYear: 1,
          trendScore: 1,
        },
      },
    ]);

    res.json({
      count: trending.length,
      results: trending,
      period: `Last ${daysBack} days`,
    });
  } catch (error) {
    logger.error('Failed to fetch trending movies', error);
    throw error;
  }
});

/**
 * Get top-rated movies by genre
 */
export const getTopRatedByGenre = asyncHandler(async (req: Request, res: Response) => {
  const { genre, limit } = z
    .object({
      genre: z.string().min(1),
      limit: z.coerce.number().min(1).max(20).default(5),
    })
    .parse(req.query);

  try {
    const topRated = await MovieModel.find({
      genres: genre,
      rating: { $exists: true, $ne: null },
    })
      .sort({ rating: -1 })
      .limit(limit)
      .select('title rating genres posterUrl posterGridFSId releaseYear');

    res.json({
      genre,
      count: topRated.length,
      results: topRated,
    });
  } catch (error) {
    logger.error(`Failed to fetch top-rated movies in genre: ${genre}`, error);
    throw error;
  }
});

/**
 * Get personalized recommendations based on a movie
 * Enhanced with more sophisticated scoring
 */
export const getEnhancedRecommendations = asyncHandler(
  async (req: Request, res: Response) => {
    const { movieId, limit } = z
      .object({
        movieId: z.string().min(1),
        limit: z.coerce.number().min(1).max(20).default(10),
      })
      .parse(req.query);

    try {
      const movie = await MovieModel.findById(movieId);

      if (!movie) {
        return res.status(404).json({ message: 'Movie not found' });
      }

      // Find similar movies based on:
      // 1. Shared genres
      // 2. Similar release year
      // 3. Similar rating range
      const recommendations = await MovieModel.aggregate([
        {
          $match: {
            _id: { $ne: movie._id },
            $or: [
              { genres: { $in: movie.genres } },
              {
                releaseYear: {
                  $gte: (movie.releaseYear || 2000) - 5,
                  $lte: (movie.releaseYear || 2000) + 5,
                },
              },
              {
                rating: {
                  $gte: (movie.rating || 5) - 1,
                  $lte: (movie.rating || 5) + 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            score: {
              $add: [
                // Genre match: 0-3 points
                {
                  $multiply: [
                    { $size: { $setIntersection: ['$genres', movie.genres] } },
                    3,
                  ],
                },
                // Year proximity: 0-2 points
                {
                  $multiply: [
                    {
                      $cond: [
                        {
                          $and: [
                            { $gte: ['$releaseYear', (movie.releaseYear || 2000) - 2] },
                            { $lte: ['$releaseYear', (movie.releaseYear || 2000) + 2] },
                          ],
                        },
                        2,
                        1,
                      ],
                    },
                    1,
                  ],
                },
                // Has poster: 1 point
                { $cond: ['$posterGridFSId', 1, 0] },
                // Has rating: 1 point
                { $cond: ['$rating', 1, 0] },
              ],
            },
          },
        },
        { $sort: { score: -1 } },
        { $limit: limit },
        {
          $project: {
            id: '$_id',
            title: 1,
            rating: 1,
            genres: 1,
            releaseYear: 1,
            posterUrl: 1,
            posterGridFSId: 1,
            director: 1,
            plot: 1,
            score: 1,
          },
        },
      ]);

      res.json({
        baseMovie: {
          id: movie.id,
          title: movie.title,
          genres: movie.genres,
        },
        count: recommendations.length,
        results: recommendations,
      });
    } catch (error) {
      logger.error(`Failed to get recommendations for movie ${movieId}`, error);
      throw error;
    }
  }
);

/**
 * Get popular movies (most recently rated/viewed)
 */
export const getPopularMovies = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = z
    .object({
      limit: z.coerce.number().min(1).max(50).default(10),
    })
    .parse(req.query);

  try {
    const popular = await MovieModel.find({
      rating: { $exists: true, $ne: null },
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .select('title rating genres posterUrl posterGridFSId releaseYear');

    res.json({
      count: popular.length,
      results: popular,
    });
  } catch (error) {
    logger.error('Failed to fetch popular movies', error);
    throw error;
  }
});
