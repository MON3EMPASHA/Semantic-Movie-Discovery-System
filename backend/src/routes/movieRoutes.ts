import { Router } from 'express';
import {
  ingestMovieHandler,
  searchMoviesHandler,
  getMovieHandler,
  getSimilarMoviesHandler,
  listMoviesHandler,
  updateMovieHandler,
  deleteMovieHandler,
} from '../controllers/movieController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CRUD operations
router.get('/movies', listMoviesHandler);
router.post('/movies/ingest', ingestMovieHandler);
router.get('/movies/search', searchMoviesHandler);
router.get('/movies/:id', getMovieHandler);
router.put('/movies/:id', updateMovieHandler);
router.delete('/movies/:id', deleteMovieHandler);
router.get('/movies/:id/similar', getSimilarMoviesHandler);

export default router;

