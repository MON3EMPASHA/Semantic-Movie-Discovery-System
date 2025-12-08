import type {
  MovieSummary,
  SimilarMoviesResponse,
  Movie,
  MovieListResponse,
  CreateMovieDTO,
} from '../types/movie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface SearchResponse {
  count: number;
  results: MovieSummary[];
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Request failed';
    try {
      const payload = JSON.parse(errorText);
      errorMessage = payload.message ?? errorMessage;
    } catch {
      errorMessage = errorText || `Request failed with status code ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
};

// Semantic search
export const searchMovies = async (query: string, limit = 10): Promise<SearchResponse> => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/movies/search?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  return handleResponse<SearchResponse>(response);
};

export const fetchSimilarMovies = async (
  movieId: string,
  limit = 6,
): Promise<SimilarMoviesResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/movies/${movieId}/similar?${params.toString()}`, {
    cache: 'no-store',
  });
  return handleResponse<SimilarMoviesResponse>(response);
};

// CRUD operations
export const getAllMovies = async (
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Promise<MovieListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  const response = await fetch(`${API_BASE_URL}/movies?${params.toString()}`, {
    cache: 'no-store',
  });
  return handleResponse<MovieListResponse>(response);
};

export const getMovie = async (id: string): Promise<Movie> => {
  const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
    cache: 'no-store',
  });
  return handleResponse<Movie>(response);
};

export const createMovie = async (data: CreateMovieDTO): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/movies/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string }>(response);
};

export const updateMovie = async (id: string, data: Partial<CreateMovieDTO>): Promise<Movie> => {
  const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Movie>(response);
};

export const deleteMovie = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(response);
};

