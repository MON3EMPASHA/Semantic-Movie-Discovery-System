'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMovie, fetchSimilarMovies } from '../../../lib/api';
import { getEnhancedRecommendations } from '../../../lib/extendedApi';
import type { Movie, SimilarMovie } from '../../../types/movie';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [similar, setSimilar] = useState<SimilarMovie[]>([]);
  const [recommendations, setRecommendations] = useState<SimilarMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovie = async () => {
      if (!movieId) return;

      setLoading(true);
      setError(null);

      try {
        // Load movie details
        const movieData = await getMovie(movieId);
        setMovie(movieData);

        // Load similar movies and recommendations in parallel
        const [similarData, recommendationsData] = await Promise.all([
          fetchSimilarMovies(movieId, 6).catch(() => ({ results: [] })),
          getEnhancedRecommendations(movieId, 6).catch(() => ({ results: [] })),
        ]);

        setSimilar(similarData.results || []);
        setRecommendations(recommendationsData.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [movieId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <main className="mx-auto max-w-7xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-emerald-500"></div>
            <p className="mt-4 text-slate-400">Loading movie details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <main className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-rose-900/50 border border-rose-500 p-6 text-rose-200">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error || 'Movie not found'}</p>
            <Link
              href="/movies"
              className="mt-4 inline-block text-emerald-400 hover:underline"
            >
              ← Back to All Movies
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <main className="mx-auto max-w-7xl">
        {/* Back Button */}
        <Link
          href="/movies"
          className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-emerald-300 transition"
        >
          ← Back to All Movies
        </Link>

        {/* Movie Header */}
        <div className="mb-8 grid gap-8 md:grid-cols-[300px_1fr]">
          {/* Poster */}
          <div className="flex-shrink-0">
            {movie.posterGridFSId ? (
              <img
                src={`http://localhost:4000/api/movies/${movie.id}/poster`}
                alt={`${movie.title} poster`}
                className="w-full rounded-xl shadow-2xl"
              />
            ) : movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={`${movie.title} poster`}
                className="w-full rounded-xl shadow-2xl"
              />
            ) : (
              <div className="flex h-[450px] w-full items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                Poster unavailable
              </div>
            )}
          </div>

          {/* Movie Info */}
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                {movie.releaseYear && (
                  <span className="text-lg">{movie.releaseYear}</span>
                )}
                {movie.genres && movie.genres.length > 0 && (
                  <span className="text-lg">
                    {movie.genres.join(' • ')}
                  </span>
                )}
                {typeof movie.rating === 'number' && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                    ⭐ {movie.rating.toFixed(1)}/10
                  </span>
                )}
              </div>
            </div>

            {movie.director && (
              <div>
                <span className="text-sm font-medium text-slate-400">Director: </span>
                <span className="text-slate-200">{movie.director}</span>
              </div>
            )}

            {movie.cast && movie.cast.length > 0 && (
              <div>
                <span className="text-sm font-medium text-slate-400">Cast: </span>
                <span className="text-slate-200">{movie.cast.join(', ')}</span>
              </div>
            )}

            {movie.plot && (
              <div className="pt-4">
                <h2 className="text-xl font-semibold mb-2">Plot</h2>
                <p className="text-slate-300 leading-relaxed">{movie.plot}</p>
              </div>
            )}

            {movie.trailerUrl && (
              <div className="pt-4">
                <a
                  href={movie.trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black transition hover:bg-emerald-400"
                >
                  ▶ Watch Trailer
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Similar Movies */}
        {similar.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Similar Movies</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((similarMovie) => (
                <Link
                  key={similarMovie.id}
                  href={`/movies/${similarMovie.id}`}
                  className="group flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/50 hover:bg-white/10"
                >
                  {similarMovie.posterGridFSId ? (
                    <img
                      src={`http://localhost:4000/api/movies/${similarMovie.id}/poster`}
                      alt={`${similarMovie.title} poster`}
                      className="h-24 w-16 rounded object-cover"
                    />
                  ) : similarMovie.posterUrl ? (
                    <img
                      src={similarMovie.posterUrl}
                      alt={`${similarMovie.title} poster`}
                      className="h-24 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="h-24 w-16 rounded bg-slate-800"></div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-emerald-300 transition">
                      {similarMovie.title}
                    </h3>
                    {typeof similarMovie.score === 'number' && (
                      <p className="text-xs text-slate-400 mt-1">
                        Similarity: {similarMovie.score.toFixed(3)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Enhanced Recommendations */}
        {recommendations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((recMovie) => (
                <Link
                  key={recMovie.id}
                  href={`/movies/${recMovie.id}`}
                  className="group flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/50 hover:bg-white/10"
                >
                  {recMovie.posterGridFSId ? (
                    <img
                      src={`http://localhost:4000/api/movies/${recMovie.id}/poster`}
                      alt={`${recMovie.title} poster`}
                      className="h-24 w-16 rounded object-cover"
                    />
                  ) : recMovie.posterUrl ? (
                    <img
                      src={recMovie.posterUrl}
                      alt={`${recMovie.title} poster`}
                      className="h-24 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="h-24 w-16 rounded bg-slate-800"></div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-emerald-300 transition">
                      {recMovie.title}
                    </h3>
                    {typeof recMovie.score === 'number' && (
                      <p className="text-xs text-slate-400 mt-1">
                        Score: {recMovie.score.toFixed(3)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}











