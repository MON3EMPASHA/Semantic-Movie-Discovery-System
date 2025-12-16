'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBestRatedMovies } from '@/lib/extendedApi';
import { MovieCard } from '@/components/MovieCard';
import type { MovieSummary } from '@/types/movie';

export default function DashboardPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBestRated = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getBestRatedMovies(period, 20);
        setMovies(response.results);
      } catch (err) {
        setError('Failed to load best rated movies');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBestRated();
  }, [period]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">📊 Best Rated Movies Dashboard</h1>
            <p className="text-gray-400">Top rated movies across different time periods</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Period Selector */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {[
            { value: 'today', label: '📅 Today', emoji: '📅' },
            { value: 'week', label: '📆 This Week', emoji: '📆' },
            { value: 'month', label: '🗓️ This Month', emoji: '🗓️' },
            { value: 'year', label: '📊 This Year', emoji: '📊' },
            { value: 'all', label: '🏆 All Time', emoji: '🏆' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                period === value
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6">
            <div className="text-sm text-purple-200 mb-1">Total Movies</div>
            <div className="text-3xl font-bold">{movies.length}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6">
            <div className="text-sm text-blue-200 mb-1">Average Rating</div>
            <div className="text-3xl font-bold">
              {movies.length > 0
                ? (movies.reduce((sum, m) => sum + (m.rating || 0), 0) / movies.length).toFixed(1)
                : '0.0'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6">
            <div className="text-sm text-green-200 mb-1">Period</div>
            <div className="text-2xl font-bold capitalize">{period === 'all' ? 'All Time' : period}</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading best rated movies...</p>
          </div>
        )}

        {/* Movies Grid */}
        {!loading && movies.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              🏆 Top {movies.length} Movies {period !== 'all' && `- ${period.charAt(0).toUpperCase() + period.slice(1)}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movies.map((movie, index) => (
                <div key={movie.id} className="relative">
                  <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-gray-900 shadow-lg">
                    #{index + 1}
                  </div>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && movies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl text-gray-400">No movies found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}
