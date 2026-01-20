/**
 * Get the API base URL from environment variable
 * Falls back to localhost for development
 * 
 * Expected format: https://semantic-movie-discovery-system-production.up.railway.app/api
 */
export const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
  
  // Ensure URL doesn't have trailing slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * Get the API base URL without the /api suffix
 * Useful for constructing image URLs
 */
export const getApiBaseUrlWithoutApi = (): string => {
  const baseUrl = getApiBaseUrl();
  // Remove trailing /api if present
  return baseUrl.replace(/\/api$/, '');
};

/**
 * Get the poster image URL for a movie
 */
export const getPosterUrl = (movieId: string): string => {
  const baseUrl = getApiBaseUrlWithoutApi();
  // Ensure we have /api in the path
  return `${baseUrl}/api/movies/${movieId}/poster`;
};

/**
 * Log the current API base URL (for debugging)
 * Only logs in development mode
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', getApiBaseUrl());
}
