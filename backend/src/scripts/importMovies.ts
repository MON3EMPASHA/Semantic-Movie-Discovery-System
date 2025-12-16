import { connectDatabase } from '../config/database';
import { initializeGridFS } from '../services/gridfsService';
import { initializeVectorDB } from '../config/initVectorDB';
import { MovieModel } from '../models/Movie';
import { ingestMovieWithImage } from '../services/ingestionService';
import { logger } from '../utils/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface MovieData {
  title: string;
  plot: string;
  genres: string[];
  cast: string[];
  director: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Check if movie already exists (by title and year)
 */
async function movieExists(title: string, year: number): Promise<boolean> {
  const normalizedTitle = title.trim();
  const regex = new RegExp(`^${escapeRegExp(normalizedTitle)}$`, 'i');

  const existing = await MovieModel.findOne({
    title: { $regex: regex },
    releaseYear: year,
  });
  return !!existing;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    logger.info(`Downloading: ${url.substring(0, 60)}...`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    logger.warn(`Failed to download image, skipping...`);
    return null;
  }
}

/**
 * Import movies from JSON file
 */
async function importMovies() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    initializeGridFS();
    await initializeVectorDB();

    // Load movies from JSON
    const jsonPath = path.join(__dirname, '../data/movies.json');
    const moviesData: MovieData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    logger.info(`Found ${moviesData.length} movies in JSON file`);
    logger.info('='.repeat(50));

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const movie of moviesData) {
      try {
        // Check for duplicates
        if (await movieExists(movie.title, movie.releaseYear)) {
          logger.info(`⊘ Already exists: ${movie.title} (${movie.releaseYear})`);
          skippedCount++;
          continue;
        }

        logger.info(`Processing: ${movie.title} (${movie.releaseYear})`);

        // Download poster if URL provided
        let posterBuffer: Buffer | null = null;
        let posterFilename: string | undefined;
        if (movie.posterUrl) {
          posterBuffer = await downloadImage(movie.posterUrl);
          if (posterBuffer) {
            posterFilename = `${movie.title.replace(/[^a-zA-Z0-9]/g, '_')}_poster.jpg`;
          }
        }

        // Ingest movie
        await ingestMovieWithImage(
          {
            title: movie.title,
            plot: movie.plot,
            genres: movie.genres,
            cast: movie.cast,
            director: movie.director,
            releaseYear: movie.releaseYear,
            rating: movie.rating,
            posterUrl: movie.posterUrl,
          },
          posterBuffer || undefined,
          'image/jpeg',
          posterFilename
        );

        logger.info(`✓ Success: ${movie.title}`);
        successCount++;

        // Small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`✗ Failed: ${movie.title}`, error);
        errorCount++;
      }
    }

    logger.info('='.repeat(50));
    logger.info('Import completed!');
    logger.info(`✓ Successfully added: ${successCount} movies`);
    logger.info(`⊘ Skipped (duplicates): ${skippedCount} movies`);
    logger.info(`✗ Errors: ${errorCount} movies`);

    process.exit(0);
  } catch (error) {
    logger.error('Import failed', error);
    process.exit(1);
  }
}

/**
 * Import movies from a specific JSON file (for batch imports)
 */
export async function importMoviesFromFile(filename: string): Promise<void> {
  try {
    // Initialize database connections if not already done
    if (!MovieModel.db || !MovieModel.db.readyState) {
      logger.info('Connecting to database...');
      await connectDatabase();
      initializeGridFS();
      await initializeVectorDB();
    }

    // Read JSON file
    const jsonPath = path.join(__dirname, '..', 'data', filename);
    const moviesData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as MovieData[];
    logger.info(`Found ${moviesData.length} movies in ${filename}`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    logger.info('='.repeat(50));

    for (const movie of moviesData) {
      try {
        logger.info(`Processing: ${movie.title} (${movie.releaseYear})`);

        // Check for duplicates
        const exists = await movieExists(movie.title, movie.releaseYear);
        if (exists) {
          logger.info(`⊘ Already exists, skipping: ${movie.title}`);
          skippedCount++;
          continue;
        }

        // Download poster
        let posterBuffer: Buffer | null = null;
        let posterFilename: string | undefined;
        if (movie.posterUrl) {
          posterBuffer = await downloadImage(movie.posterUrl);
          if (posterBuffer) {
            posterFilename = `${movie.title.replace(/[^a-zA-Z0-9]/g, '_')}_poster.jpg`;
          }
        }

        // Ingest movie
        await ingestMovieWithImage(
          {
            title: movie.title,
            plot: movie.plot,
            genres: movie.genres,
            cast: movie.cast,
            director: movie.director,
            releaseYear: movie.releaseYear,
            rating: movie.rating,
            posterUrl: movie.posterUrl,
          },
          posterBuffer || undefined,
          'image/jpeg',
          posterFilename
        );

        logger.info(`✓ Success: ${movie.title}`);
        successCount++;

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`✗ Error processing ${movie.title}`, error);
        errorCount++;
      }
    }

    logger.info('='.repeat(50));
    logger.info(`Import from ${filename} completed!`);
    logger.info(`✓ Successfully added: ${successCount} movies`);
    logger.info(`⊘ Skipped (duplicates): ${skippedCount} movies`);
    logger.info(`✗ Errors: ${errorCount} movies`);
  } catch (error) {
    logger.error(`Import from ${filename} failed`, error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  importMovies();
}

export { importMovies };
