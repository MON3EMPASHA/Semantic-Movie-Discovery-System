/**
 * Get the API base URL from environment variable
 * Falls back to localhost for development
 */
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
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
  return `${getApiBaseUrlWithoutApi()}/api/movies/${movieId}/poster`;
};
