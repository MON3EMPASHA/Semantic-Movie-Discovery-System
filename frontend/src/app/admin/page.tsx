'use client';

import { useState, useEffect } from 'react';
import { getAllMovies, createMovie, updateMovie, deleteMovie, getMovie } from '../../lib/api';
import type { Movie, CreateMovieDTO, MovieListResponse } from '../../types/movie';

export default function AdminPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [missingPosters, setMissingPosters] = useState<Movie[]>([]);
  const refreshMissing = async () => {
    try {
      const { getMissingPosters } = await import('../../lib/extendedApi');
      const res = await getMissingPosters(500);
      setMissingPosters(res.results as Movie[]);
      return res.count;
    } catch (err) {
      console.error('Failed to refresh missing posters', err);
      return 0;
    }
  };
  const [formData, setFormData] = useState<Partial<CreateMovieDTO>>({
    title: '',
    genres: [],
    cast: [],
    director: '',
    releaseYear: undefined,
    plot: '',
    trailerUrl: '',
    posterUrl: '',
    rating: undefined,
  });

  const loadMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: MovieListResponse = await getAllMovies(page, 20);
      setMovies(response.movies);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }
      if (!formData.genres || formData.genres.length === 0) {
        setError('At least one genre is required');
        setLoading(false);
        return;
      }
      if (!formData.plot || !formData.plot.trim()) {
        setError('Plot is required');
        setLoading(false);
        return;
      }

      const data: CreateMovieDTO = {
        title: formData.title!,
        genres: formData.genres || [],
        cast: formData.cast || [],
        director: formData.director,
        releaseYear: formData.releaseYear,
        plot: formData.plot!,
        trailerUrl: formData.trailerUrl,
        posterUrl: formData.posterUrl,
        rating: formData.rating,
      };

      if (editingMovie) {
        await updateMovie(editingMovie.id, data, posterFile || undefined);
      } else {
        await createMovie(data, posterFile || undefined);
      }

      setShowForm(false);
      setEditingMovie(null);
      setPosterFile(null);
      setFormData({
        title: '',
        genres: [],
        cast: [],
        director: '',
        releaseYear: undefined,
        plot: '',
        trailerUrl: '',
        posterUrl: '',
        rating: undefined,
      });
      loadMovies();
    } catch (err) {
      console.error('=== MOVIE SAVE ERROR ===');
      console.error('Error:', err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('========================');
      setError(err instanceof Error ? err.message : 'Failed to save movie');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!id) {
      setError('Invalid movie ID');
      return;
    }
    try {
      const movie = await getMovie(id);
      setEditingMovie(movie);
      setFormData({
        title: movie.title,
        genres: movie.genres,
        cast: movie.cast,
        director: movie.director,
        releaseYear: movie.releaseYear,
        plot: movie.plot,
        trailerUrl: movie.trailerUrl,
        posterUrl: movie.posterUrl,
        rating: movie.rating,
      });
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movie');
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      setError('Invalid movie ID');
      return;
    }
    if (!confirm('Are you sure you want to delete this movie?')) return;

    setLoading(true);
    setError(null);
    try {
      await deleteMovie(id);
      loadMovies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Movie Admin Panel</h1>
          <p className="text-slate-400">Manage your movie database</p>
        </div>
        <div className="mb-8 flex items-center justify-end">
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const { backfillPosters } = await import('../../lib/extendedApi');
                  const result = await backfillPosters();
                  alert(`Backfill done. Updated: ${result.updated}, Failed: ${result.failed}`);
                  loadMovies();
                  await refreshMissing();
                } catch (err) {
                  setError('Failed to backfill posters');
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
            >
              🖼️ Backfill Posters
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const count = await refreshMissing();
                  if (count === 0) {
                    alert('No movies are missing posters.');
                  }
                } catch (err) {
                  setError('Failed to load missing posters');
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500"
            >
              🔍 Show Missing Posters
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const { dedupeMovies } = await import('../../lib/extendedApi');
                  const result = await dedupeMovies();
                  alert(`Deduped. Removed: ${result.removed}, Kept: ${result.kept}`);
                  loadMovies();
                } catch (err) {
                  setError('Failed to deduplicate movies');
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500"
            >
              🧹 Deduplicate
            </button>
            <button
              onClick={async () => {
                if (confirm('Import 20 additional movies? Duplicates will be skipped.')) {
                  setLoading(true);
                  try {
                    const { importBatch2Movies } = await import('../../lib/extendedApi');
                    await importBatch2Movies();
                    alert('Import started! Check server logs for progress. Refresh in 30 seconds.');
                  } catch (err) {
                    setError('Failed to start import');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-500"
            >
              📥 Import 20 More Movies
            </button>
            <button
              onClick={() => {
                setEditingMovie(null);
                setPosterFile(null);
                setFormData({
                  title: '',
                  genres: [],
                  cast: [],
                  director: '',
                  releaseYear: undefined,
                  plot: '',
                  script: '',
                  trailerUrl: '',
                  posterUrl: '',
                  rating: undefined,
                });
                setShowForm(true);
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
            >
              + Add Movie
            </button>
          </div>
        </div>

        {missingPosters.length > 0 && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Missing Posters ({missingPosters.length})</h3>
              <span className="text-sm text-slate-400">Edit these and set a valid poster URL, then run Backfill.</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {missingPosters.map((m) => (
                <div key={m.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm">
                  <div className="font-semibold text-white">{m.title}</div>
                  <div className="text-slate-400 text-xs">Year: {m.releaseYear ?? '—'}</div>
                  <div className="text-slate-400 text-xs">Poster URL: {m.posterUrl ? m.posterUrl : 'None'}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => {
                        setEditingMovie(m);
                        setFormData({
                          title: m.title,
                          genres: m.genres,
                          cast: m.cast,
                          director: m.director,
                          releaseYear: m.releaseYear,
                          plot: m.plot,
                          trailerUrl: m.trailerUrl,
                          posterUrl: m.posterUrl,
                          rating: m.rating,
                        });
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-rose-900/50 border border-rose-500 p-4 text-rose-200">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {editingMovie ? 'Edit Movie' : 'Add New Movie'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title <span className="text-red-400">*</span> <span className="text-slate-400 text-xs">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Director <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.director || ''}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Release Year <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.releaseYear || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, releaseYear: Number(e.target.value) || undefined })
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Genres <span className="text-red-400">*</span> <span className="text-slate-400 text-xs">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.genres?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      genres: e.target.value.split(',').map((g) => g.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  placeholder="Action, Sci-Fi, Romance"
                />
                <p className="mt-1 text-xs text-slate-400">Comma-separated list (at least one genre required)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cast <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.cast?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cast: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  placeholder="Actor 1, Actor 2, Actor 3"
                />
                <p className="mt-1 text-xs text-slate-400">Comma-separated list</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Plot <span className="text-red-400">*</span> <span className="text-slate-400 text-xs">(Required)</span>
                </label>
                <textarea
                  required
                  value={formData.plot || ''}
                  onChange={(e) => setFormData({ ...formData, plot: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  placeholder="Enter movie plot description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Rating <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.rating || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, rating: Number(e.target.value) || undefined })
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  placeholder="0.0 - 10.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Trailer URL <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.trailerUrl || ''}
                  onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Poster Image <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-2 text-white"
                />
                {posterFile && (
                  <p className="mt-2 text-sm text-emerald-400">Selected: {posterFile.name}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Upload a poster image file</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingMovie ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMovie(null);
                    setPosterFile(null);
                  }}
                  className="rounded-lg border border-white/10 px-6 py-2 transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && !showForm ? (
          <div className="text-center py-12 text-slate-400">Loading movies...</div>
        ) : (
          <div className="space-y-4">
            {movies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 p-12 text-center text-slate-400">
                No movies found. Add your first movie!
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {movies.map((movie, index) => (
                    <div
                      key={`admin-movie-${movie.id || movie._id || index}-${index}`}
                      className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      {movie.posterGridFSId ? (
                        <img
                          src={`http://localhost:4000/api/movies/${movie.id}/poster`}
                          alt={movie.title}
                          className="h-32 w-24 rounded object-cover"
                        />
                      ) : movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-32 w-24 rounded object-cover"
                        />
                      ) : null}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{movie.title}</h3>
                        <p className="text-sm text-slate-400">
                          {movie.releaseYear && `${movie.releaseYear} • `}
                          {movie.genres.join(', ')}
                        </p>
                        {movie.director && (
                          <p className="text-sm text-slate-400">Director: {movie.director}</p>
                        )}
                        {movie.rating && (
                          <p className="text-sm text-slate-400">Rating: {movie.rating}/10</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(movie.id || movie._id || '')}
                          className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(movie.id || movie._id || '')}
                          className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

