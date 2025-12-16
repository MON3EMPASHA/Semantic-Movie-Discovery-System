import axios from 'axios';
import { Types } from 'mongoose';
import { MovieModel, type MovieDocument } from '../models/Movie';
import { semanticSearch } from './vectorSearchService';
import { logger } from '../utils/logger';
import { uploadImageToGridFS, deleteImageFromGridFS } from './gridfsService';

// Lightweight view model returned to clients
interface MovieSummary {
  id: string;
  title: string;
  genres: string[];
  cast: string[];
  rating?: number;
  posterUrl?: string;
  posterGridFSId?: string;
  releaseYear?: number;
}

const toMovieSummary = (movie: MovieDocument | any): MovieSummary => ({
  id: movie.id || movie._id?.toString(),
  title: movie.title,
  genres: movie.genres ?? [],
  cast: movie.cast ?? [],
  rating: movie.rating,
  posterUrl: movie.posterUrl,
  posterGridFSId: movie.posterGridFSId ? movie.posterGridFSId.toString() : undefined,
  releaseYear: movie.releaseYear,
});

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLowerCase();

export interface CreateMovieDTO {
  title: string;
  genres?: string[];
  cast?: string[];
  director?: string;
  releaseYear?: number;
  plot?: string;
  trailerUrl?: string;
  posterUrl?: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export const createMovie = async (payload: CreateMovieDTO): Promise<MovieDocument> => {
  return MovieModel.create({
    ...payload,
    genres: payload.genres ?? [],
    cast: payload.cast ?? [],
  });
};

export const createMovieWithImage = async (
  payload: CreateMovieDTO,
  imageBuffer?: Buffer,
  imageContentType?: string,
  imageFilename?: string
): Promise<MovieDocument> => {
  const movieData: any = {
    ...payload,
    genres: payload.genres ?? [],
    cast: payload.cast ?? [],
  };

  // Upload image to GridFS if provided
  if (imageBuffer && imageContentType && imageFilename) {
    try {
      const fileId = await uploadImageToGridFS(imageBuffer, imageFilename, imageContentType);
      movieData.posterGridFSId = fileId;
      movieData.posterContentType = imageContentType;
      logger.info(`Uploaded poster image to GridFS: ${fileId}`);
    } catch (error) {
      logger.error('Failed to upload image to GridFS', error);
      // Continue without image rather than failing completely
    }
  }

  return MovieModel.create(movieData);
};

export const updateMovieEmbeddingKeys = async (
  movieId: Types.ObjectId,
  embeddingKeys: Record<string, string>,
): Promise<MovieDocument | null> => {
  return MovieModel.findByIdAndUpdate(
    movieId,
    { $set: { embeddingKeys } },
    { new: true },
  );
};

export const getMovieById = async (id: string): Promise<MovieDocument | null> => {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  return MovieModel.findById(id);
};

export const getMoviesByIds = async (ids: string[]): Promise<MovieDocument[]> => {
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id));
  if (!objectIds.length) {
    return [];
  }
  const movies = await MovieModel.find({ _id: { $in: objectIds } });
  const movieMap = new Map(movies.map((movie) => [movie.id, movie]));
  return ids.map((id) => movieMap.get(id)).filter(Boolean) as MovieDocument[];
};

export const searchMoviesByEmbedding = async (
  embedding: number[],
  limit = 10,
): Promise<{ movie: MovieDocument; score: number }[]> => {
  const matches = await semanticSearch(embedding, limit * 2); // Get more matches to account for duplicates
  
  if (matches.length === 0) {
    return [];
  }
  
  const ids = matches.map((match) => String(match.payload.movieId)).filter(Boolean);
  
  if (ids.length === 0) {
    return [];
  }
  
  const movies = await getMoviesByIds(ids);
  // Create map using both id and _id for lookup
  const movieMap = new Map<string, MovieDocument>();
  movies.forEach((movie) => {
    const movieId = movie.id || movie._id?.toString();
    if (movieId) {
      movieMap.set(movieId, movie);
      movieMap.set(String(movie._id), movie); // Also index by _id string
    }
  });

  // Map matches to movies and deduplicate by movie ID
  // If a movie appears multiple times (different embeddings), keep the highest score
  const movieScoreMap = new Map<string, { movie: MovieDocument; score: number }>();
  
  matches.forEach((match) => {
    const movieId = String(match.payload.movieId);
    const movie = movieMap.get(movieId);
    if (!movie) {
      logger.warn(`Movie not found for ID: ${movieId}`);
      return;
    }
    
    const existing = movieScoreMap.get(movieId);
    // Keep the match with the highest score if movie appears multiple times
    if (!existing || match.score > existing.score) {
      movieScoreMap.set(movieId, { movie, score: match.score });
    }
  });

  // Convert map to array, sort by score (descending), and limit
  return Array.from(movieScoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const getAllMovies = async (
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Promise<{ movies: MovieDocument[]; total: number; page: number; totalPages: number }> => {
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [movies, total] = await Promise.all([
    MovieModel.find().sort(sort).skip(skip).limit(limit),
    MovieModel.countDocuments(),
  ]);

  return {
    movies,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateMovie = async (
  id: string,
  payload: Partial<CreateMovieDTO>,
): Promise<MovieDocument | null> => {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const updatedMovie = await MovieModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
  
  // Import here to avoid circular dependency
  if (updatedMovie) {
    const { regenerateMovieEmbeddings } = await import('./ingestionService');
    // Regenerate embeddings based on the final updated movie state
    // Pass the full updated movie payload to regenerate all relevant embeddings
    const embeddingPayload = {
      title: updatedMovie.title,
      plot: updatedMovie.plot,
      genres: updatedMovie.genres,
      metadata: updatedMovie.metadata,
      ...payload, // Override with any explicitly updated fields
    };
    // Regenerate embeddings asynchronously (don't await to avoid blocking the update response)
    regenerateMovieEmbeddings(id, embeddingPayload).catch((error) => {
      logger.error(
        `Background embedding regeneration failed for movie ${id}:`,
        error
      );
    });
  }
  
  return updatedMovie;
};

export const deleteMovie = async (id: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(id)) {
    return false;
  }
  
  // Get movie to check for GridFS image
  const movie = await MovieModel.findById(id);
  if (movie?.posterGridFSId) {
    try {
      await deleteImageFromGridFS(movie.posterGridFSId);
      logger.info(`Deleted GridFS image: ${movie.posterGridFSId}`);
    } catch (error) {
      logger.error('Failed to delete GridFS image', error);
      // Continue with movie deletion even if image deletion fails
    }
  }
  
  const result = await MovieModel.findByIdAndDelete(id);
  return result !== null;
};

export const updateMoviePosterImage = async (
  id: string,
  imageBuffer: Buffer,
  imageContentType: string,
  imageFilename: string
): Promise<MovieDocument | null> => {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  const movie = await MovieModel.findById(id);
  if (!movie) {
    return null;
  }

  // Delete old image if exists
  if (movie.posterGridFSId) {
    try {
      await deleteImageFromGridFS(movie.posterGridFSId);
    } catch (error) {
      logger.error('Failed to delete old GridFS image', error);
    }
  }

  // Upload new image
  const fileId = await uploadImageToGridFS(imageBuffer, imageFilename, imageContentType);
  
  return MovieModel.findByIdAndUpdate(
    id,
    {
      $set: {
        posterGridFSId: fileId,
        posterContentType: imageContentType,
      },
    },
    { new: true }
  );
};

/**
 * Get random movies
 */
export const getRandomMovies = async (limit: number = 10): Promise<MovieSummary[]> => {
  const docs = await MovieModel.aggregate([{ $sample: { size: limit } }]);
  return docs.map((doc) => toMovieSummary(doc));
};

/**
 * Get best rated movies by time period
 */
export const getBestRatedMovies = async (
  period: string = 'all',
  limit: number = 20
): Promise<MovieSummary[]> => {
  const now = new Date();
  let dateFilter: Date | undefined;

  switch (period) {
    case 'today':
      dateFilter = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      dateFilter = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      dateFilter = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      dateFilter = undefined; // all time
  }

  const query: any = { rating: { $exists: true, $ne: null } };
  if (dateFilter) {
    query.createdAt = { $gte: dateFilter };
  }

  const docs = await MovieModel.find(query)
    .sort({ rating: -1, releaseYear: -1 })
    .limit(limit)
    .lean();

  return docs.map((doc) => toMovieSummary(doc));
};

/**
 * Backfill posters for movies that are missing GridFS images but have posterUrl
 */
export const backfillMissingPosters = async (): Promise<{ total: number; updated: number; failed: number }> => {
  const candidates = await MovieModel.find({ posterGridFSId: { $exists: false }, posterUrl: { $exists: true, $ne: '' } });
  let updated = 0;
  let failed = 0;

  for (const movie of candidates) {
    if (!movie.posterUrl) continue;
    try {
      // Try multiple URLs: provided + original size fallback
      const urlCandidates = [
        movie.posterUrl,
        movie.posterUrl?.replace('/w500/', '/original/'),
        movie.posterUrl?.replace('/w500', '/original'),
      ].filter(Boolean) as string[];

      let buffer: Buffer | null = null;
      let contentType = 'image/jpeg';

      for (const url of urlCandidates) {
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (MovieImporter)',
              Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            },
          });
          buffer = Buffer.from(response.data);
          contentType = response.headers['content-type'] || 'image/jpeg';
          break;
        } catch (err) {
          // Try next candidate
          continue;
        }
      }

      if (!buffer) {
        throw new Error('All poster URL attempts failed');
      }

      const filename = `${movie.title.replace(/[^a-zA-Z0-9]/g, '_')}_poster`;
      const fileId = await uploadImageToGridFS(buffer, `${filename}.img`, contentType);
      movie.posterGridFSId = fileId;
      movie.posterContentType = contentType;
      await movie.save();
      updated++;
    } catch (error) {
      logger.warn(`Backfill poster failed for ${movie.title}`, error as Error);
      failed++;
    }
  }

  return { total: candidates.length, updated, failed };
};

/**
 * List movies missing posterGridFSId to help manual fixes
 */
export const listMissingPosters = async (limit = 500): Promise<MovieSummary[]> => {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const docs = await MovieModel.find({ posterGridFSId: { $exists: false } })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
  return docs.map((doc) => toMovieSummary(doc));
};

/**
 * Deduplicate movies by normalized title + releaseYear
 * Keeps the record with highest rating, preferring one with poster
 */
export const dedupeMovies = async (): Promise<{ totalGroups: number; removed: number; kept: number }> => {
  const movies = await MovieModel.find().lean();
  const groups = new Map<string, any[]>();

  for (const movie of movies) {
    const key = `${normalizeTitle(movie.title)}::${movie.releaseYear || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(movie);
  }

  let removed = 0;
  let kept = 0;

  for (const [, group] of groups) {
    if (group.length <= 1) {
      kept += group.length;
      continue;
    }

    // Choose survivor: highest rating, then has posterGridFSId, then newest createdAt
    const survivor = [...group].sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      const hasPosterA = a.posterGridFSId ? 1 : 0;
      const hasPosterB = b.posterGridFSId ? 1 : 0;
      if (hasPosterA !== hasPosterB) return hasPosterB - hasPosterA;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })[0];

    const survivorId = survivor._id;

    for (const dup of group) {
      if (String(dup._id) === String(survivorId)) continue;

      // If survivor lacks poster but duplicate has one, move poster reference
      if (!survivor.posterGridFSId && dup.posterGridFSId) {
        await MovieModel.findByIdAndUpdate(survivorId, {
          posterGridFSId: dup.posterGridFSId,
          posterContentType: dup.posterContentType,
        });
      }

      await MovieModel.findByIdAndDelete(dup._id);
      removed++;
    }

    kept++;
  }

  return { totalGroups: groups.size, removed, kept };
};

