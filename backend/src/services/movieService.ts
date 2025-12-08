import { Types } from 'mongoose';
import { MovieModel, type MovieDocument } from '../models/Movie';
import { semanticSearch } from './vectorSearchService';
import { logger } from '../utils/logger';

export interface CreateMovieDTO {
  title: string;
  genres?: string[];
  cast?: string[];
  director?: string;
  releaseYear?: number;
  plot?: string;
  script?: string;
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
  const matches = await semanticSearch(embedding, limit);
  
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

  return matches
    .map((match) => {
      const movieId = String(match.payload.movieId);
      const movie = movieMap.get(movieId);
      if (!movie) {
        logger.warn(`Movie not found for ID: ${movieId}`);
        return null;
      }
      return { movie, score: match.score };
    })
    .filter(Boolean) as { movie: MovieDocument; score: number }[];
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
  return MovieModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
};

export const deleteMovie = async (id: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(id)) {
    return false;
  }
  const result = await MovieModel.findByIdAndDelete(id);
  return result !== null;
};

