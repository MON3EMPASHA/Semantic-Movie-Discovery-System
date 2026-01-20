import axios from "axios";
import { connectDatabase } from "../config/database";
import { initializeGridFS } from "../services/gridfsService";
import { initializeVectorDB } from "../config/initVectorDB";
import { MovieModel } from "../models/Movie";
import { ingestMovieWithImage } from "../services/ingestionService";
import { logger } from "../utils/logger";

// TMDB API - Free for non-commercial use
// Get your API key at: https://www.themoviedb.org/settings/api
const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  genres: Array<{ id: number; name: string }>;
  poster_path: string | null;
  vote_average: number;
  runtime: number;
  tagline: string;
  production_companies: Array<{ name: string }>;
  credits?: {
    cast: Array<{ name: string; character: string }>;
    crew: Array<{ name: string; job: string }>;
  };
}

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

/**
 * Check if movie already exists in database (by title and year)
 */
async function movieExists(title: string, year: number): Promise<boolean> {
  const existing = await MovieModel.findOne({
    title: { $regex: new RegExp(`^${title}$`, "i") },
    releaseYear: year,
  });
  return !!existing;
}

/**
 * Download image from URL and return buffer
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    logger.info(`Downloading image: ${url}`);
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    logger.error(`Failed to download image from ${url}`, error);
    return null;
  }
}

/**
 * Fetch movie details from TMDB
 */
async function fetchMovieDetails(
  movieId: number,
): Promise<TMDBMovieDetails | null> {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`,
    );
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch details for movie ID ${movieId}`, error);
    return null;
  }
}

/**
 * Fetch popular movies from TMDB
 */
async function fetchPopularMovies(page = 1): Promise<TMDBMovie[]> {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`,
    );
    return response.data.results || [];
  } catch (error) {
    logger.error(`Failed to fetch popular movies (page ${page})`, error);
    return [];
  }
}

/**
 * Fetch top-rated movies from TMDB
 */
async function fetchTopRatedMovies(page = 1): Promise<TMDBMovie[]> {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`,
    );
    return response.data.results || [];
  } catch (error) {
    logger.error(`Failed to fetch top-rated movies (page ${page})`, error);
    return [];
  }
}

/**
 * Process and ingest a single movie
 */
async function processMovie(tmdbMovie: TMDBMovie): Promise<boolean> {
  try {
    // Get movie details
    const details = await fetchMovieDetails(tmdbMovie.id);
    if (!details) {
      logger.warn(`No details found for movie ID ${tmdbMovie.id}`);
      return false;
    }

    let releaseYear: number | undefined;
    if (details.release_date && details.release_date.length > 0) {
      const yearPart = details.release_date.split("-")[0];
      if (yearPart) {
        const parsedYear = parseInt(yearPart, 10);
        releaseYear = isNaN(parsedYear) ? undefined : parsedYear;
      } else {
        releaseYear = undefined;
      }
    } else {
      releaseYear = undefined;
    }

    // Check if movie already exists
    if (releaseYear && (await movieExists(details.title, releaseYear))) {
      logger.info(`Movie already exists: ${details.title} (${releaseYear})`);
      return false;
    }

    // Extract cast (top 10)
    const cast =
      details.credits?.cast
        ?.slice(0, 10)
        .map((actor) => actor.name)
        .filter(Boolean) || [];

    // Extract director
    const director =
      details.credits?.crew?.find((person) => person.job === "Director")
        ?.name || undefined;

    // Extract genres
    const genres = details.genres.map((g) => g.name);

    // Download poster if available
    let posterBuffer: Buffer | null = null;
    let posterFilename: string | undefined;
    if (details.poster_path) {
      const posterUrl = `${TMDB_IMAGE_BASE}${details.poster_path}`;
      posterBuffer = await downloadImage(posterUrl);
      posterFilename = `${details.id}_poster.jpg`;
    }

    // Prepare movie data
    const movieData = {
      title: details.title,
      plot: details.overview || undefined,
      genres: genres.length > 0 ? genres : undefined,
      cast: cast.length > 0 ? cast : undefined,
      director,
      releaseYear,
      rating: details.vote_average
        ? parseFloat(details.vote_average.toFixed(1))
        : undefined,
      posterUrl: details.poster_path
        ? `${TMDB_IMAGE_BASE}${details.poster_path}`
        : undefined,
      metadata: {
        tmdbId: details.id,
        runtime: details.runtime,
        tagline: details.tagline,
        popularity: tmdbMovie.popularity,
      },
    };

    // Ingest movie with poster
    logger.info(`Ingesting movie: ${details.title} (${releaseYear})`);
    await ingestMovieWithImage(
      movieData,
      posterBuffer || undefined,
      "image/jpeg",
      posterFilename,
    );

    logger.info(`✓ Successfully ingested: ${details.title}`);
    return true;
  } catch (error) {
    logger.error(`Failed to process movie ID ${tmdbMovie.id}`, error);
    return false;
  }
}

/**
 * Main seeding function
 */
async function seedMovies() {
  if (TMDB_API_KEY === "YOUR_API_KEY_HERE") {
    logger.error("❌ Please set TMDB_API_KEY in your .env file");
    logger.info(
      "Get your free API key at: https://www.themoviedb.org/settings/api",
    );
    process.exit(1);
  }

  try {
    // Connect to database
    logger.info("Connecting to database...");
    await connectDatabase();
    initializeGridFS();
    await initializeVectorDB();

    logger.info("Starting movie seeding process...");
    logger.info("=".repeat(50));

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Fetch popular movies (first 3 pages = ~60 movies)
    logger.info("Fetching popular movies...");
    for (let page = 1; page <= 3; page++) {
      const movies = await fetchPopularMovies(page);
      logger.info(`Processing ${movies.length} movies from page ${page}...`);

      for (const movie of movies) {
        const success = await processMovie(movie);
        if (success) {
          successCount++;
        } else {
          skippedCount++;
        }

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Fetch top-rated movies (first 2 pages = ~40 movies)
    logger.info("Fetching top-rated movies...");
    for (let page = 1; page <= 2; page++) {
      const movies = await fetchTopRatedMovies(page);
      logger.info(`Processing ${movies.length} movies from page ${page}...`);

      for (const movie of movies) {
        const success = await processMovie(movie);
        if (success) {
          successCount++;
        } else {
          skippedCount++;
        }

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    logger.info("=".repeat(50));
    logger.info("Seeding completed!");
    logger.info(`✓ Successfully added: ${successCount} movies`);
    logger.info(`⊘ Skipped (duplicates): ${skippedCount} movies`);
    logger.info(`✗ Errors: ${errorCount} movies`);

    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedMovies();
}

export { seedMovies };
