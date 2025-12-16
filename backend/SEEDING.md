# Movie Database Seeding

This script automatically fetches real movie data from The Movie Database (TMDB) API and populates your database.

## Features

✅ **Fetches Real Movie Data**: Title, plot, genres, cast, director, year, rating  
✅ **Downloads Movie Posters**: Automatically saves to GridFS  
✅ **Duplicate Detection**: Checks existing movies by title + year  
✅ **Auto Embedding Generation**: Creates vector embeddings for semantic search  
✅ **Rate Limiting**: Respects API limits with delays  

## Setup

### 1. Get TMDB API Key (FREE)

1. Go to https://www.themoviedb.org/signup
2. Create a free account
3. Go to Settings → API → Request API Key
4. Choose "Developer" option
5. Fill out the form (you can use personal/educational project)
6. Copy your API key

### 2. Add to `.env` file

Open `backend/.env` and add:

```bash
TMDB_API_KEY=your_api_key_here
```

### 3. Run the Seeding Script

```bash
cd backend
npm run seed:movies
```

## What It Does

The script will:

1. **Connect** to MongoDB and Vector DB
2. **Fetch** ~100 popular and top-rated movies from TMDB
3. **Download** poster images for each movie
4. **Check** for duplicates (by title + release year)
5. **Ingest** each movie with:
   - Movie metadata (title, plot, genres, cast, director, year, rating)
   - Poster image stored in GridFS
   - Vector embeddings for semantic search
6. **Report** success/skip/error counts

## Sample Output

```
Connecting to database...
Starting movie seeding process...
==================================================
Fetching popular movies...
Processing 20 movies from page 1...
Ingesting movie: The Shawshank Redemption (1994)
Downloading image: https://image.tmdb.org/t/p/w500/...
✓ Successfully ingested: The Shawshank Redemption
Ingesting movie: The Godfather (1972)
Movie already exists: The Godfather (1972)
...
==================================================
Seeding completed!
✓ Successfully added: 87 movies
⊘ Skipped (duplicates): 13 movies
✗ Errors: 0 movies
```

## Configuration

### Change Number of Movies

Edit `src/scripts/seedMovies.ts`:

```typescript
// Fetch more pages for more movies
for (let page = 1; page <= 5; page++) { // Default: 3
  const movies = await fetchPopularMovies(page);
  ...
}
```

### Fetch Different Categories

Available TMDB endpoints:
- `movie/popular` - Most popular movies
- `movie/top_rated` - Highest rated movies
- `movie/now_playing` - Currently in theaters
- `movie/upcoming` - Coming soon

## Troubleshooting

**Error: "Please set TMDB_API_KEY"**
→ Add TMDB_API_KEY to your `.env` file

**Error: "Request failed with status 401"**
→ Invalid API key, get a new one from TMDB

**Error: "Rate limit exceeded"**
→ Script includes 300ms delays, but you can increase them

**Movies not searchable after seeding**
→ Embeddings are generated automatically, wait a moment for processing

## Re-running the Script

You can run the script multiple times safely. It will:
- Skip movies that already exist (by title + year)
- Only add new movies
- Update existing movies (if you modify the script)

## Data Source

All movie data and images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Legal

- TMDB API is free for non-commercial use
- Movie data and images are owned by TMDB and respective copyright holders
- Use this script only for educational/personal projects
- For commercial use, review TMDB's terms of service
