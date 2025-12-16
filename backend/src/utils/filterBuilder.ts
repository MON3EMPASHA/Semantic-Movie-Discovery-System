import { logger } from './logger';
import { AppError } from './errors';

export interface SearchFilters {
  genres?: string[];
  minRating?: number;
  maxRating?: number;
  minYear?: number;
  maxYear?: number;
  director?: string;
}

/**
 * Build MongoDB query from filters
 */
export const buildFilterQuery = (filters: SearchFilters): Record<string, any> => {
  const query: Record<string, any> = {};

  if (filters.genres && filters.genres.length > 0) {
    query.genres = { $in: filters.genres };
  }

  if (filters.director) {
    query.director = { $regex: filters.director, $options: 'i' };
  }

  if (filters.minYear || filters.maxYear) {
    query.releaseYear = {};
    if (filters.minYear) query.releaseYear.$gte = filters.minYear;
    if (filters.maxYear) query.releaseYear.$lte = filters.maxYear;
  }

  if (filters.minRating || filters.maxRating) {
    query.rating = {};
    if (filters.minRating) query.rating.$gte = filters.minRating;
    if (filters.maxRating) query.rating.$lte = filters.maxRating;
  }

  logger.info('Built filter query', { filters, query });
  return query;
};

/**
 * Get all unique genres for filter dropdown
 */
export const getAvailableGenres = async (MovieModel: any): Promise<string[]> => {
  try {
    const genres = await MovieModel.distinct('genres');
    return genres.sort();
  } catch (error) {
    logger.error('Failed to fetch genres', error);
    return [];
  }
};

/**
 * Get year range for filter slider
 */
export const getYearRange = async (MovieModel: any): Promise<{ min: number; max: number }> => {
  try {
    const stats = await MovieModel.aggregate([
      {
        $group: {
          _id: null,
          minYear: { $min: '$releaseYear' },
          maxYear: { $max: '$releaseYear' },
        },
      },
    ]);

    if (stats.length === 0) {
      return { min: new Date().getFullYear() - 50, max: new Date().getFullYear() };
    }

    return {
      min: stats[0].minYear || new Date().getFullYear() - 50,
      max: stats[0].maxYear || new Date().getFullYear(),
    };
  } catch (error) {
    logger.error('Failed to fetch year range', error);
    return { min: 1970, max: new Date().getFullYear() };
  }
};

/**
 * Get directors for autocomplete
 */
export const getDirectors = async (MovieModel: any, searchTerm?: string): Promise<string[]> => {
  try {
    const query = searchTerm
      ? { director: { $regex: searchTerm, $options: 'i' } }
      : {};

    const directors = await MovieModel.distinct('director', query);
    return directors.filter(Boolean).sort();
  } catch (error) {
    logger.error('Failed to fetch directors', error);
    return [];
  }
};
