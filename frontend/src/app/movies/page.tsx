"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllMovies } from "../../lib/api";
import type { Movie, MovieListResponse } from "../../types/movie";

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: MovieListResponse = await getAllMovies(page, 20);
      setMovies(response.movies);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movies");
    } finally {
      setLoading(false);
    }
  };

  // Load movies for statistics (only once on mount)
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load maximum allowed (100) for statistics
        const statsResponse: MovieListResponse = await getAllMovies(1, 100);
        setAllMovies(statsResponse.movies);
      } catch (err) {
        console.error("Failed to load movies for statistics:", err);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    loadMovies();
  }, [page]);

  // Calculate statistics
  const moviesWithRating = allMovies.filter((m) => m.rating);
  const totalRatings = moviesWithRating.reduce(
    (sum, m) => sum + (m.rating || 0),
    0
  );
  const averageRating =
    moviesWithRating.length > 0
      ? (totalRatings / moviesWithRating.length).toFixed(1)
      : "0.0";

  const stats = {
    totalMovies: total,
    averageRating,
    moviesWithRating: moviesWithRating.length,
    totalGenres: new Set(allMovies.flatMap((m) => m.genres || [])).size,
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <main className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Movies</h1>
          <p className="text-slate-400">
            Browse through our complete collection of {total} movies
          </p>
        </header>

        {/* Statistics */}
        {!loading && allMovies.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6">
              <div className="text-sm text-purple-200 mb-1">Total Movies</div>
              <div className="text-3xl font-bold">{stats.totalMovies}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6">
              <div className="text-sm text-blue-200 mb-1">Average Rating</div>
              <div className="text-3xl font-bold">{stats.averageRating}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg p-6">
              <div className="text-sm text-emerald-200 mb-1">Unique Genres</div>
              <div className="text-3xl font-bold">{stats.totalGenres}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg p-6">
              <div className="text-sm text-amber-200 mb-1">Rated Movies</div>
              <div className="text-3xl font-bold">{stats.moviesWithRating}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-rose-900/50 border border-rose-500 p-4 text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-emerald-500"></div>
            <p className="mt-4 text-slate-400">Loading movies...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 p-12 text-center text-slate-400">
            No movies found.
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
              {movies.map((movie) => (
                <Link
                  key={movie.id || movie._id}
                  href={`/movies/${movie.id || movie._id}`}
                  className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow transition hover:-translate-y-1 hover:border-emerald-400/50 hover:shadow-lg"
                >
                  {movie.posterGridFSId ? (
                    <img
                      src={`http://localhost:4000/api/movies/${movie.id}/poster`}
                      alt={`${movie.title} poster`}
                      className="mb-3 h-80 w-full rounded-lg object-cover transition group-hover:scale-105"
                    />
                  ) : movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={`${movie.title} poster`}
                      className="mb-3 h-80 w-full rounded-lg object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="mb-3 flex h-80 w-full items-center justify-center rounded-lg bg-slate-800 text-sm text-slate-400">
                      Poster unavailable
                    </div>
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition">
                        {movie.title}
                      </h3>
                      {typeof movie.rating === "number" && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                          {movie.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">
                      {[
                        movie.releaseYear,
                        movie.genres?.slice(0, 2).join(" • "),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    {movie.director && (
                      <p className="text-xs text-slate-400">
                        Director: {movie.director}
                      </p>
                    )}
                    {movie.cast?.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Cast: {movie.cast.slice(0, 3).join(", ")}
                        {movie.cast.length > 3 && "..."}
                      </p>
                    )}
                    {movie.plot && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2">
                        {movie.plot}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-6 py-2 font-medium transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-6 py-2 font-medium transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
