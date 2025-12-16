import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import { MovieModel } from '../models/Movie';
import { getAllMovies } from '../services/movieService';
import { importMovies } from '../scripts/importMovies';

const router = Router();

// Analytics: Get search statistics
router.get(
  '/analytics/searches',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = z
      .object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
      .parse(req.query);

    try {
      const query: any = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Count by genre
      const genreStats = await MovieModel.aggregate([
        { $unwind: '$genres' },
        {
          $group: {
            _id: '$genres',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Count by rating range
      const ratingStats = await MovieModel.aggregate([
        {
          $bucket: {
            groupBy: '$rating',
            boundaries: [0, 2, 4, 6, 8, 10],
            default: 'unrated',
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]);

      // Most recent movies
      const recentMovies = await MovieModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title createdAt rating posterGridFSId');

      // Top rated movies
      const topRated = await MovieModel.find({ rating: { $exists: true, $ne: null } })
        .sort({ rating: -1 })
        .limit(10)
        .select('title rating posterGridFSId');

      res.json({
        totalMovies: await MovieModel.countDocuments(),
        genreStats,
        ratingStats,
        recentMovies,
        topRated,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Analytics error', error);
      throw error;
    }
  })
);

// Analytics: Get storage statistics
router.get(
  '/analytics/storage',
  asyncHandler(async (req, res) => {
    try {
      const movieCount = await MovieModel.countDocuments();
      const moviesWithImages = await MovieModel.countDocuments({
        posterGridFSId: { $exists: true, $ne: null },
      });

      // Estimate storage from document count and average size
      const sampleMovie = await MovieModel.findOne();
      const estimatedAvgSize = sampleMovie 
        ? JSON.stringify(sampleMovie.toObject()).length 
        : 1000;
      const estimatedTotalSize = movieCount * estimatedAvgSize;

      res.json({
        databaseStats: {
          estimatedTotalSize: estimatedTotalSize,
          estimatedAvgDocSize: estimatedAvgSize,
          documentCount: movieCount,
        },
        movieStats: {
          totalMovies: movieCount,
          moviesWithImages: moviesWithImages,
          moviesWithoutImages: movieCount - moviesWithImages,
        },
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Storage stats error', error);
      throw error;
    }
  })
);

// Admin: Bulk delete movies by IDs
router.post(
  '/admin/bulk-delete',
  asyncHandler(async (req, res) => {
    const { ids } = z
      .object({
        ids: z.array(z.string()).min(1),
      })
      .parse(req.body);

    try {
      const result = await MovieModel.deleteMany({
        _id: { $in: ids },
      });

      logger.info(`Bulk deleted ${result.deletedCount} movies`);

      res.json({
        message: `Deleted ${result.deletedCount} movies`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error('Bulk delete error', error);
      throw error;
    }
  })
);

// Admin: Bulk update movies
router.put(
  '/admin/bulk-update',
  asyncHandler(async (req, res) => {
    const { ids, updates } = z
      .object({
        ids: z.array(z.string()).min(1),
        updates: z.object({
          genres: z.array(z.string()).optional(),
          director: z.string().optional(),
          rating: z.number().min(0).max(10).optional(),
        }),
      })
      .parse(req.body);

    try {
      const result = await MovieModel.updateMany(
        { _id: { $in: ids } },
        { $set: updates }
      );

      logger.info(`Bulk updated ${result.modifiedCount} movies`);

      res.json({
        message: `Updated ${result.modifiedCount} movies`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      logger.error('Bulk update error', error);
      throw error;
    }
  })
);

// Admin: Export movies as JSON
router.get(
  '/admin/export/json',
  asyncHandler(async (req, res) => {
    try {
      const movies = await MovieModel.find().lean();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="movies-${new Date().toISOString().split('T')[0]}.json"`
      );

      res.json({
        exportedAt: new Date(),
        totalMovies: movies.length,
        movies,
      });

      logger.info(`Exported ${movies.length} movies to JSON`);
    } catch (error) {
      logger.error('Export error', error);
      throw error;
    }
  })
);

// Admin: Export movies as CSV
router.get(
  '/admin/export/csv',
  asyncHandler(async (req, res) => {
    try {
      const movies = await MovieModel.find().lean();

      // Convert to CSV
      const headers = [
        'id',
        'title',
        'director',
        'releaseYear',
        'rating',
        'genres',
        'plot',
        'trailerUrl',
        'posterUrl',
        'hasImage',
      ];

      const rows = movies.map((movie: any) => [
        movie._id.toString(),
        movie.title,
        movie.director || '',
        movie.releaseYear || '',
        movie.rating || '',
        movie.genres?.join(';') || '',
        movie.plot || '',
        movie.trailerUrl || '',
        movie.posterUrl || '',
        movie.posterGridFSId ? 'yes' : 'no',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="movies-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csv);

      logger.info(`Exported ${movies.length} movies to CSV`);
    } catch (error) {
      logger.error('CSV export error', error);
      throw error;
    }
  })
);

// Admin: Health check
router.get(
  '/admin/health',
  asyncHandler(async (req, res) => {
    try {
      const dbHealthy = await MovieModel.collection.findOne({}) !== undefined;
      const movieCount = await MovieModel.countDocuments();

      res.json({
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        database: {
          connected: dbHealthy,
          movieCount,
        },
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

// Admin: Trigger movie import manually
router.post(
  '/admin/import-movies',
  asyncHandler(async (req, res) => {
    try {
      logger.info('Manual movie import triggered via API');
      
      // Run import in background to avoid timeout
      importMovies()
        .then(() => {
          logger.info('Background movie import completed successfully');
        })
        .catch((error) => {
          logger.error('Background movie import failed', error);
        });

      res.json({
        message: 'Movie import started in background',
        status: 'processing',
        note: 'Check server logs for progress',
      });
    } catch (error) {
      logger.error('Failed to start movie import', error);
      throw error;
    }
  })
);

// Admin: Import additional 20 movies (batch 2)
router.post(
  '/admin/import-batch2',
  asyncHandler(async (req, res) => {
    try {
      logger.info('Importing additional movies (batch 2)...');
      
      // Dynamically import the function
      const { importMoviesFromFile } = await import('../scripts/importMovies');
      
      // Run import in background
      importMoviesFromFile('movies-batch2.json')
        .then(() => {
          logger.info('Batch 2 import completed successfully');
        })
        .catch((error) => {
          logger.error('Batch 2 import failed', error);
        });

      res.json({
        message: 'Importing 20 additional movies in background',
        status: 'processing',
        batch: 2,
        note: 'Check server logs for progress. Duplicates will be skipped.',
      });
    } catch (error) {
      logger.error('Failed to start batch 2 import', error);
      throw error;
    }
  })
);

// Admin: Backfill posters for movies missing GridFS images
router.post(
  '/admin/backfill-posters',
  asyncHandler(async (_req, res) => {
    const { backfillMissingPosters } = await import('../services/movieService');
    const result = await backfillMissingPosters();
    res.json({ message: 'Backfill completed', ...result });
  })
);

// Admin: Deduplicate movies by title + year
router.post(
  '/admin/dedupe-movies',
  asyncHandler(async (_req, res) => {
    const { dedupeMovies } = await import('../services/movieService');
    const result = await dedupeMovies();
    res.json({ message: 'Deduplication completed', ...result });
  })
);

// Admin: List movies missing posters
router.get(
  '/admin/missing-posters',
  asyncHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 500;
    const { listMissingPosters } = await import('../services/movieService');
    const results = await listMissingPosters(limit);
    res.json({ count: results.length, results });
  })
);

export default router;
