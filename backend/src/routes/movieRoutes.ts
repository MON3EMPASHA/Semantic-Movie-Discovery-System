import { Router } from 'express';
import {
  searchMoviesHandler,
  getMovieHandler,
  getSimilarMoviesHandler,
  listMoviesHandler,
  updateMovieHandler,
  deleteMovieHandler,
  ingestMovieWithImageHandler,
  getMoviePosterHandler,
  updateMoviePosterHandler,
} from '../controllers/movieController';
import { advancedSearch, getFilterOptions, getDirectorSuggestions } from '../services/searchService';
import { getTrendingMovies, getTopRatedByGenre, getEnhancedRecommendations, getPopularMovies } from '../services/recommendationService';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CRUD operations
router.get('/movies', listMoviesHandler);

// Ingest with image support - ONLY use Multer for multipart/form-data
router.post('/movies/ingest', (req, res, next) => {
  const contentType = req.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    // FormData with file - use Multer
    upload.single('posterImage')(req, res, next);
  } else {
    // JSON request - skip Multer, let express.json() handle it
    next();
  }
}, ingestMovieWithImageHandler);

// All search routes MUST come before /movies/:id to avoid matching 'search' as an id
router.get('/movies/search/advanced', advancedSearch);
router.get('/movies/search/trending', getTrendingMovies);
router.get('/movies/search/popular', getPopularMovies);
router.get('/movies/search/top-rated', getTopRatedByGenre);
router.get('/movies/search/filters', getFilterOptions);
router.get('/movies/search/directors', getDirectorSuggestions);
router.get('/movies/search', searchMoviesHandler);

// Random and best rated endpoints
router.get('/movies/random', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { getRandomMovies } = await import('../services/movieService');
    const movies = await getRandomMovies(limit);
    res.json({ count: movies.length, results: movies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch random movies' });
  }
});

router.get('/movies/best-rated', async (req, res) => {
  try {
    const period = (req.query.period as string) || 'all';
    const limit = parseInt(req.query.limit as string) || 20;
    const { getBestRatedMovies } = await import('../services/movieService');
    const movies = await getBestRatedMovies(period, limit);
    res.json({ period, count: movies.length, results: movies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch best rated movies' });
  }
});

// Movie-specific routes - :id routes come after all /movies/* static paths
router.get('/movies/:id/poster', getMoviePosterHandler);
router.get('/movies/:id/recommendations', getEnhancedRecommendations);
router.get('/movies/:id/similar', getSimilarMoviesHandler);
router.get('/movies/:id', getMovieHandler);

router.put('/movies/:id', updateMovieHandler);
router.put('/movies/:id/poster', upload.single('posterImage'), updateMoviePosterHandler);

router.delete('/movies/:id', deleteMovieHandler);

export default router;

