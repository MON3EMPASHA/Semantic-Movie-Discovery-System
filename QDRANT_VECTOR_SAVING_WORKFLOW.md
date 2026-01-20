# Workflow: Saving Title, Genre, and Plot Vectors in Qdrant

This document explains the complete workflow for generating and saving vector embeddings (title, genre, plot) for movies in the Qdrant vector database.

## Overview

The system generates three types of vector embeddings for each movie:

1. **Title embedding** - Vector representation of the movie title
2. **Genre embedding** - Vector representation of all genres (combined as comma-separated string)
3. **Plot embedding** - Vector representation of the movie plot/description

These vectors are stored in Qdrant to enable semantic search capabilities.

---

## Complete Workflow

```
Movie Data Input
    ↓
Step 1: Create Movie in MongoDB
    ↓
Step 2: Generate Embeddings
    ├─→ Title Embedding (384 dimensions)
    ├─→ Genre Embedding (384 dimensions)
    └─→ Plot Embedding (384 dimensions)
    ↓
Step 3: Convert to Qdrant Points
    ├─→ Create Point ID (numeric hash)
    ├─→ Attach Vector Data
    └─→ Add Metadata Payload
    ↓
Step 4: Upsert to Qdrant
    ↓
Step 5: Store Embedding Keys in MongoDB
    ↓
Complete ✓
```

---

## Detailed Step-by-Step Process

### Step 1: Movie Ingestion Entry Point

**File**: `backend/src/services/ingestionService.ts`

When a new movie is created (via `ingestMovie()` or `ingestMovieWithImage()`):

```typescript
// 1. Create movie document in MongoDB first
const movie = await createMovie(payload);

// 2. Create ingestion job tracker
const job = await IngestionJobModel.create({
  movieId: movie._id,
  status: "processing",
});
```

---

### Step 2: Embedding Generation

**File**: `backend/src/services/ingestionService.ts` → `generateMovieEmbeddings()`

For each movie, the system generates embeddings for available text fields:

#### 2.1 Title Embedding

```typescript
if (payload.title && payload.title.trim()) {
  embeddings.title = await generateEmbedding(payload.title);
}
```

- **Input**: Movie title (e.g., "The Matrix")
- **Output**: 384-dimensional vector array `[0.123, 0.456, ...]`
- **Model**: `sentence-transformers/all-MiniLM-L6-v2`

#### 2.2 Plot Embedding

```typescript
if (payload.plot && payload.plot.trim()) {
  embeddings.plot = await generateEmbedding(payload.plot);
}
```

- **Input**: Movie plot/description text
- **Output**: 384-dimensional vector array

#### 2.3 Genre Embedding

```typescript
if (payload.genres && payload.genres.length > 0) {
  const genreText = payload.genres.join(", ");
  embeddings.genre = await generateEmbedding(genreText);
}
```

- **Input**: Genres joined as comma-separated string (e.g., "Action, Sci-Fi, Thriller")
- **Output**: 384-dimensional vector array

**Result**: Object with keys `title`, `plot`, `genre` (if available):

```typescript
{
  title: [0.123, 0.456, ...],  // 384 numbers
  plot: [0.789, 0.012, ...],   // 384 numbers
  genre: [0.345, 0.678, ...]   // 384 numbers
}
```

---

### Step 3: Embedding Generation Details

**File**: `backend/src/services/embeddingService.ts`

#### 3.1 Local Model Processing

1. **Model Initialization**: Loads `sentence-transformers/all-MiniLM-L6-v2` via `@xenova/transformers`

   - Uses quantized model for faster loading
   - Caches pipeline to avoid re-initialization

2. **Text Processing**:

   ```
   Text Input → Tokenization → Token Embeddings → Mean Pooling → Sentence Embedding
   ```

3. **Mean Pooling**: Combines token-level embeddings into sentence-level embedding

   - Token embeddings: `[num_tokens, 384]`
   - Mean pooling averages across tokens
   - Result: `[384]` - single vector representing entire text

4. **Output**: Normalized 384-dimensional floating-point vector

---

### Step 4: Conversion to Qdrant Points

**File**: `backend/src/services/vectorSearchService.ts` → `upsertMovieEmbeddings()`

Each embedding is converted into a Qdrant point:

#### 4.1 Point ID Generation

```typescript
const stringId = `${movieId}:${source}`; // e.g., "507f1f77bcf86cd799439011:title"
const numericId = stringToNumericId(stringId);
```

- **String ID Format**: `{movieId}:{source}` where source is `title`, `plot`, or `genre`
- **Numeric ID**: Hash conversion using SHA-256
  - Ensures deterministic numeric IDs for Qdrant
  - Uses modulo to fit in JavaScript's safe integer range

#### 4.2 Point Structure

For each embedding, a point object is created:

```typescript
{
  id: numericId,                    // Numeric hash of "{movieId}:{source}"
  vector: [0.123, 0.456, ...],      // 384-dimensional embedding
  payload: {
    movieId: "507f1f77bcf86cd799439011",
    source: "title",                // or "plot" or "genre"
    originalId: "507f1f77bcf86cd799439011:title"
  }
}
```

**Example for a movie with all three vectors:**

```javascript
[
  {
    id: 1234567890,
    vector: [0.123, 0.456, ...],  // title embedding
    payload: { movieId: "abc123", source: "title", originalId: "abc123:title" }
  },
  {
    id: 9876543210,
    vector: [0.789, 0.012, ...],  // plot embedding
    payload: { movieId: "abc123", source: "plot", originalId: "abc123:plot" }
  },
  {
    id: 5555555555,
    vector: [0.345, 0.678, ...],  // genre embedding
    payload: { movieId: "abc123", source: "genre", originalId: "abc123:genre" }
  }
]
```

---

### Step 5: Upsert to Qdrant

**File**: `backend/src/services/vectorSearchService.ts` → `upsertMovieEmbeddings()`

```typescript
await client.upsert(env.VECTOR_COLLECTION, {
  wait: true,
  points: points, // Array of point objects
});
```

#### 5.1 Qdrant Operations

- **Collection**: Uses collection name from `env.VECTOR_COLLECTION` (default: "movies")
- **Wait Mode**: `wait: true` ensures operation completes before returning
- **Upsert**: If point with same ID exists, it's updated; otherwise, it's created

#### 5.2 Qdrant Storage Structure

After upsert, Qdrant stores:

```
Collection: "movies"
  ├─ Point ID: 1234567890
  │  ├─ Vector: [384 dimensions]
  │  └─ Payload: { movieId: "abc123", source: "title", ... }
  │
  ├─ Point ID: 9876543210
  │  ├─ Vector: [384 dimensions]
  │  └─ Payload: { movieId: "abc123", source: "plot", ... }
  │
  └─ Point ID: 5555555555
     ├─ Vector: [384 dimensions]
     └─ Payload: { movieId: "abc123", source: "genre", ... }
```

---

### Step 6: Store Embedding Keys in MongoDB

**File**: `backend/src/services/vectorSearchService.ts` → Returns embedding keys

After successful upsert, the function returns:

```typescript
{
  title: "1234567890",   // Qdrant point ID (as string)
  plot: "9876543210",
  genre: "5555555555"
}
```

**File**: `backend/src/services/ingestionService.ts` → Updates MongoDB

```typescript
const embeddingKeys = await upsertMovieEmbeddings(movieId, embeddings);
await updateMovieEmbeddingKeys(movie._id, embeddingKeys);
```

#### MongoDB Document Update

**File**: `backend/src/models/Movie.ts`

The movie document's `embeddingKeys` field is updated:

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  title: "The Matrix",
  plot: "A computer hacker...",
  genres: ["Action", "Sci-Fi"],
  embeddingKeys: {
    title: "1234567890",   // Reference to Qdrant point ID
    plot: "9876543210",
    genre: "5555555555"
  },
  ...
}
```

This creates a bidirectional link:

- **MongoDB → Qdrant**: `embeddingKeys` stores Qdrant point IDs
- **Qdrant → MongoDB**: `payload.movieId` stores MongoDB document ID

---

## Error Handling

### Graceful Degradation

The system is designed to handle failures gracefully:

1. **Embedding Generation Failure**:

   - Logs warning
   - Movie is still saved in MongoDB
   - Missing embeddings simply won't be searchable

2. **Qdrant Upsert Failure**:

   - Logs error
   - Movie remains in MongoDB
   - Ingestion job marked as "failed" with error message

3. **Partial Success**:
   - If only some embeddings succeed, only those are stored
   - Movie remains functional with available vectors

---

## Example: Complete Flow for One Movie

### Input Data

```json
{
  "title": "The Matrix",
  "plot": "A computer hacker learns about the true nature of reality...",
  "genres": ["Action", "Sci-Fi"]
}
```

### Step-by-Step Execution

1. **MongoDB Document Created**:

   ```javascript
   {
     _id: ObjectId("507f1f77bcf86cd799439011"),
     title: "The Matrix",
     plot: "...",
     genres: ["Action", "Sci-Fi"]
   }
   ```

2. **Embeddings Generated**:

   ```javascript
   {
     title: [0.023, -0.145, 0.892, ...],  // 384 numbers
     plot: [0.156, 0.234, -0.567, ...],   // 384 numbers
     genre: [0.789, -0.123, 0.456, ...]   // 384 numbers
   }
   ```

3. **Qdrant Points Created**:

   ```javascript
   [
     {
       id: 9123456789,
       vector: [0.023, -0.145, 0.892, ...],
       payload: {
         movieId: "507f1f77bcf86cd799439011",
         source: "title",
         originalId: "507f1f77bcf86cd799439011:title"
       }
     },
     // ... similar for plot and genre
   ]
   ```

4. **Qdrant Upsert**:

   - 3 points inserted into "movies" collection
   - All points linked via `payload.movieId`

5. **MongoDB Updated**:

   ```javascript
   {
     _id: ObjectId("507f1f77bcf86cd799439011"),
     embeddingKeys: {
       title: "9123456789",
       plot: "9876543210",
       genre: "5555555555"
     }
   }
   ```

6. **Result**: Movie is now searchable via semantic search!

---

## Key Design Decisions

### Why Three Separate Vectors?

1. **Flexibility**: Can search by title, plot, or genre independently
2. **Performance**: Smaller vectors can be searched faster
3. **Specialization**: Each vector type captures different semantic aspects

### Why Store Embedding Keys in MongoDB?

1. **Reference Tracking**: Quickly find which vectors belong to a movie
2. **Cleanup**: Easy to delete vectors when movie is deleted
3. **Audit Trail**: Know what embeddings exist for each movie

### Why Numeric IDs in Qdrant?

1. **Qdrant Requirement**: Qdrant works best with numeric IDs
2. **Performance**: Numeric IDs are faster to index and search
3. **Deterministic**: Hash function ensures same movie+source always gets same ID

---

## Search Workflow (Related)

When searching, the system:

1. Generates embedding for search query
2. Searches Qdrant for similar vectors
3. Returns matching `payload.movieId` values
4. Fetches full movie details from MongoDB using those IDs

The separate title/plot/genre vectors allow for:

- **Title search**: Find movies with similar titles
- **Plot search**: Find movies with similar stories
- **Genre search**: Find movies with similar genre combinations
- **Combined search**: (Future enhancement) Weighted combination of all three

---

## Configuration

Relevant environment variables:

```env
VECTOR_DB_PROVIDER=qdrant
VECTOR_DB_URL=http://localhost:6333
VECTOR_COLLECTION=movies
VECTOR_DIMENSION=384
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

---

## Files Involved

1. **Entry Point**: `backend/src/services/ingestionService.ts`

   - `ingestMovie()` / `ingestMovieWithImage()`
   - `generateMovieEmbeddings()`

2. **Embedding Generation**: `backend/src/services/embeddingService.ts`

   - `generateEmbedding()`
   - `generateLocalEmbedding()`

3. **Vector Operations**: `backend/src/services/vectorSearchService.ts`

   - `upsertMovieEmbeddings()`
   - `stringToNumericId()`

4. **Qdrant Client**: `backend/src/config/vectorClient.ts`

   - `getVectorClient()`

5. **MongoDB Model**: `backend/src/models/Movie.ts`
   - `embeddingKeys` field definition

---

## Summary

The workflow ensures that every movie with text content (title, plot, genres) gets vectorized and stored in Qdrant for semantic search. The process is:

1. ✅ **Robust**: Handles partial failures gracefully
2. ✅ **Efficient**: Uses local embedding model (no API calls)
3. ✅ **Traceable**: Maintains bidirectional links between MongoDB and Qdrant
4. ✅ **Scalable**: Each movie's vectors are independent, allowing parallel processing

This architecture enables powerful semantic search capabilities while maintaining data consistency and system reliability.
