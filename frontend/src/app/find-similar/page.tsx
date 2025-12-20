'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchMovies, fetchSimilarMovies, getMovie, getAllMovies } from '../../lib/api';
import type { MovieSummary, SimilarMovie, Movie } from '../../types/movie';

export default function FindSimilarPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSummary[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [similarMovie, setSimilarMovie] = useState<SimilarMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await searchMovies(searchQuery.trim(), 20);
      setSearchResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search movies');
    } finally {
      setSearching(false);
    }
  };

  const handleBrowseAll = async () => {
    setBrowsing(true);
    setError(null);
    setSearchResults([]);
    setSearchQuery('');

    try {
      const response = await getAllMovies(1, 50);
      // Convert Movie[] to MovieSummary[] for display
      const movies: MovieSummary[] = response.movies.map((m) => ({
        id: m.id,
        title: m.title,
        genres: m.genres,
        cast: m.cast,
        rating: m.rating,
        posterUrl: m.posterUrl,
        posterGridFSId: m.posterGridFSId,
        releaseYear: m.releaseYear,
      }));
      setSearchResults(movies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setBrowsing(false);
    }
  };

  const handleSelectMovie = async (movie: MovieSummary) => {
    setLoading(true);
    setError(null);
    setSimilarMovie(null);

    try {
      // Get full movie details
      const fullMovie = await getMovie(movie.id);
      setSelectedMovie(fullMovie);

      // Check if movie has a plot (required for similarity search)
      if (!fullMovie.plot || fullMovie.plot.trim() === '') {
        setError('This movie does not have a plot description. Similarity search requires a plot to work.');
        setLoading(false);
        return;
      }

      // Find the most similar movie (limit=1)
      const response = await fetchSimilarMovies(movie.id, 1);
      if (response.results && response.results.length > 0) {
        setSimilarMovie(response.results[0]);
      } else {
        setError('No similar movie found. This might happen if there are no other movies in the database with similar plots.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find similar movie';
      if (errorMessage.includes('missing plot')) {
        setError('This movie does not have a plot description. Similarity search requires a plot to work.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedMovie(null);
    setSimilarMovie(null);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <main className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Find Most Similar Movie</h1>
          <p className="text-slate-400">
            Select a movie from the database to find its most similar match
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-900/50 border border-rose-500 p-4 text-rose-200">
            {error}
          </div>
        )}

        {/* Search Form */}
        {!selectedMovie && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <label className="block text-sm font-medium text-slate-200" htmlFor="search">
                Search for a movie
              </label>
              <div className="flex gap-3">
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter movie title or description..."
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 p-4 text-base text-white outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-xl bg-emerald-500 px-6 py-4 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={handleBrowseAll}
                  disabled={browsing}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {browsing ? 'Loading...' : 'Browse All'}
                </button>
              </div>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">
                  Search Results ({searchResults.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => handleSelectMovie(movie)}
                      className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/50 hover:bg-white/10"
                    >
                      {movie.posterGridFSId ? (
                        <img
                          src={`http://localhost:4000/api/movies/${movie.id}/poster`}
                          alt={`${movie.title} poster`}
                          className="mb-3 h-48 w-full rounded-lg object-cover transition group-hover:scale-105"
                        />
                      ) : movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={`${movie.title} poster`}
                          className="mb-3 h-48 w-full rounded-lg object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="mb-3 flex h-48 w-full items-center justify-center rounded-lg bg-slate-800 text-sm text-slate-400">
                          Poster unavailable
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-white group-hover:text-emerald-300 transition">
                            {movie.title}
                          </h3>
                          {typeof movie.rating === 'number' && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                              {movie.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">
                          {[movie.releaseYear, movie.genres?.slice(0, 2).join(' • ')]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Display */}
        {selectedMovie && (
          <div className="space-y-8">
            {/* Selected Movie */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Selected Movie</h2>
                <button
                  onClick={reset}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                >
                  Select Different Movie
                </button>
              </div>
              <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                {selectedMovie.posterGridFSId ? (
                  <img
                    src={`http://localhost:4000/api/movies/${selectedMovie.id}/poster`}
                    alt={`${selectedMovie.title} poster`}
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : selectedMovie.posterUrl ? (
                  <img
                    src={selectedMovie.posterUrl}
                    alt={`${selectedMovie.title} poster`}
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="flex h-[300px] w-full items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                    Poster unavailable
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{selectedMovie.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-slate-300">
                      {selectedMovie.releaseYear && (
                        <span>{selectedMovie.releaseYear}</span>
                      )}
                      {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                        <span>{selectedMovie.genres.join(' • ')}</span>
                      )}
                      {typeof selectedMovie.rating === 'number' && (
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                          ⭐ {selectedMovie.rating.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedMovie.director && (
                    <p className="text-slate-300">
                      <span className="font-medium">Director:</span> {selectedMovie.director}
                    </p>
                  )}
                  {selectedMovie.plot && (
                    <p className="text-slate-300 leading-relaxed">{selectedMovie.plot}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Most Similar Movie */}
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-emerald-500"></div>
                <p className="mt-4 text-slate-400">Finding most similar movie...</p>
              </div>
            ) : similarMovie ? (
              <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                    <span className="text-emerald-400">🎯 Most Similar Movie</span>
                    {typeof similarMovie.score === 'number' && (
                      <span className="text-sm font-normal text-slate-400">
                        (Similarity Score: {similarMovie.score.toFixed(3)})
                      </span>
                    )}
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                  {similarMovie.posterGridFSId ? (
                    <Link href={`/movies/${similarMovie.id}`}>
                      <img
                        src={`http://localhost:4000/api/movies/${similarMovie.id}/poster`}
                        alt={`${similarMovie.title} poster`}
                        className="w-full rounded-lg shadow-lg transition hover:scale-105 cursor-pointer"
                      />
                    </Link>
                  ) : similarMovie.posterUrl ? (
                    <Link href={`/movies/${similarMovie.id}`}>
                      <img
                        src={similarMovie.posterUrl}
                        alt={`${similarMovie.title} poster`}
                        className="w-full rounded-lg shadow-lg transition hover:scale-105 cursor-pointer"
                      />
                    </Link>
                  ) : (
                    <div className="flex h-[300px] w-full items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      Poster unavailable
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <Link
                        href={`/movies/${similarMovie.id}`}
                        className="text-2xl font-bold hover:text-emerald-300 transition"
                      >
                        {similarMovie.title}
                      </Link>
                    </div>
                    <Link
                      href={`/movies/${similarMovie.id}`}
                      className="inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black transition hover:bg-emerald-400"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
                No similar movie found
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

