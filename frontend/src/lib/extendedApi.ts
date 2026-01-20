// Extended API types and utility functions
import type { Movie, MovieSummary } from '../types/movie';
import { getApiBaseUrl } from './apiConfig';

const API_BASE_URL = getApiBaseUrl();

export interface FilterOptions {
  genres: string[];
  yearRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  totalMovies: number;
}

export interface TrendingResponse {
  count: number;
  results: MovieSummary[];
  period: string;
}

export interface RecommendationsResponse {
  baseMovie: {
    id: string;
    title: string;
    genres: string[];
  };
  count: number;
  results: MovieSummary[];
}

/**
 * Advanced search with filters
 */
export const advancedSearch = async (
  query?: string,
  filters?: {
    genres?: string[];
    minRating?: number;
    maxRating?: number;
    minYear?: number;
    maxYear?: number;
    director?: string;
  },
  limit = 20
): Promise<{ count: number; results: MovieSummary[] }> => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (filters?.genres?.length) params.append('genres', filters.genres.join(','));
  if (filters?.minRating !== undefined) params.append('minRating', String(filters.minRating));
  if (filters?.maxRating !== undefined) params.append('maxRating', String(filters.maxRating));
  if (filters?.minYear !== undefined) params.append('minYear', String(filters.minYear));
  if (filters?.maxYear !== undefined) params.append('maxYear', String(filters.maxYear));
  if (filters?.director) params.append('director', filters.director);
  params.append('limit', String(limit));

  const response = await fetch(`${API_BASE_URL}/movies/search/advanced?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Advanced search failed');
  return response.json();
};

/**
 * Get filter options
 */
export const getFilterOptions = async (): Promise<FilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/movies/search/filters`, {
    cache: 'force-cache',
  });
  if (!response.ok) throw new Error('Failed to fetch filter options');
  return response.json();
};

/**
 * Get director suggestions
 */
export const getDirectorSuggestions = async (query: string): Promise<string[]> => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/movies/search/directors?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch director suggestions');
  const data = await response.json();
  return data.suggestions || [];
};

/**
 * Get trending movies
 */
export const getTrendingMovies = async (
  limit = 10,
  daysBack = 7
): Promise<TrendingResponse> => {
  const params = new URLSearchParams({ limit: String(limit), daysBack: String(daysBack) });
  const response = await fetch(`${API_BASE_URL}/movies/search/trending?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch trending movies');
  return response.json();
};

/**
 * Get popular movies
 */
export const getPopularMovies = async (limit = 10): Promise<{ count: number; results: MovieSummary[] }> => {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/movies/search/popular?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch popular movies');
  return response.json();
};

/**
 * Get top-rated movies in a genre
 */
export const getTopRatedByGenre = async (
  genre: string,
  limit = 5
): Promise<{ genre: string; count: number; results: MovieSummary[] }> => {
  const params = new URLSearchParams({ genre, limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/movies/search/top-rated?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch top-rated movies');
  return response.json();
};

/**
 * Get enhanced recommendations for a movie
 */
export const getEnhancedRecommendations = async (
  movieId: string,
  limit = 10
): Promise<RecommendationsResponse> => {
  const params = new URLSearchParams({ movieId, limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/movies/${movieId}/recommendations?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch recommendations');
  return response.json();
};

// Admin endpoints

/**
 * Get analytics
 */
export const getAnalytics = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/analytics/searches`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

/**
 * Get storage statistics
 */
export const getStorageStats = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/analytics/storage`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch storage stats');
  return response.json();
};

/**
 * Health check
 */
export const getHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/health`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
};

/**
 * Export movies as JSON
 */
export const exportMoviesAsJSON = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/export/json`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Export failed');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movies-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Export movies as CSV
 */
export const exportMoviesAsCSV = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/export/csv`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Export failed');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movies-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Bulk delete movies
 */
export const bulkDeleteMovies = async (ids: string[]): Promise<{ message: string; deletedCount: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('Bulk delete failed');
  return response.json();
};

/**
 * Bulk update movies
 */
export const bulkUpdateMovies = async (
  ids: string[],
  updates: Partial<Movie>
): Promise<{ message: string; modifiedCount: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/bulk-update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates }),
  });
  if (!response.ok) throw new Error('Bulk update failed');
  return response.json();
};

/**
 * Import additional batch of movies (batch 2)
 */
export const importBatch2Movies = async (): Promise<{ message: string; status: string; batch: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/import-batch2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Import batch 2 failed');
  return response.json();
};

/**
 * Backfill posters for movies missing GridFS images
 */
export const backfillPosters = async (): Promise<{ message: string; total: number; updated: number; failed: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/backfill-posters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Poster backfill failed');
  return response.json();
};

/**
 * Deduplicate movies by title + year
 */
export const dedupeMovies = async (): Promise<{ message: string; totalGroups: number; removed: number; kept: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/dedupe-movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Deduplication failed');
  return response.json();
};

/**
 * List movies missing posters
 */
export const getMissingPosters = async (limit = 50): Promise<{ count: number; results: MovieSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/admin/missing-posters?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch missing posters');
  return response.json();
};

/**
 * Get random movies
 */
export const getRandomMovies = async (limit = 10): Promise<{ count: number; results: MovieSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/movies/random?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch random movies');
  return response.json();
};

/**
 * Get best rated movies by period
 */
export const getBestRatedMovies = async (
  period: 'today' | 'week' | 'month' | 'year' | 'all' = 'all',
  limit = 20
): Promise<{ period: string; count: number; results: MovieSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/movies/best-rated?period=${period}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch best rated movies');
  return response.json();
};
