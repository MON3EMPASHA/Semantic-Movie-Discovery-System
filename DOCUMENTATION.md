# Semantic Movie Discovery System - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [File Structure](#file-structure)
4. [Technology Stack](#technology-stack)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Vector Search Implementation](#vector-search-implementation)
10. [Setup & Installation](#setup--installation)
11. [Key Features](#key-features)

---

## Project Overview

The **Semantic Movie Discovery System** is a full-stack web application that enables users to discover movies using natural language queries powered by semantic search. The system uses MongoDB for data storage, vector databases for similarity search, and machine learning embeddings to understand movie content semantically.

### Core Capabilities

- **Semantic Search**: Find movies using natural language descriptions
- **Vector Similarity**: Discover similar movies based on plot and content
- **Movie Management**: CRUD operations for movie database
- **Image Storage**: GridFS-based poster image storage and optimization
- **Advanced Filtering**: Filter movies by genres, ratings, years, and directors
- **Recommendations**: AI-powered movie recommendations

---

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Next.js 16)   │
│   React 19      │
└────────┬────────┘
         │ HTTP/REST API
         │
┌────────▼────────┐
│   Backend API   │
│  (Express 5)    │
│   TypeScript    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│MongoDB│ │ Vector DB│
│       │ │(Qdrant/ │
│GridFS │ │Pinecone) │
└───────┘ └──────────┘
```

### Architecture Layers

1. **Presentation Layer**: Next.js frontend with React components
2. **API Layer**: Express.js REST API with TypeScript
3. **Business Logic Layer**: Services for embeddings, search, recommendations
4. **Data Layer**: MongoDB for metadata, Vector DB for embeddings, GridFS for images

---

## File Structure

### Project Root

```
Adv Db project/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── app.ts          # Express app configuration
│   │   ├── index.ts        # Server entry point
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   ├── scripts/        # Utility scripts
│   │   └── data/           # Seed data
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/               # Frontend application
    ├── src/
    │   ├── app/            # Next.js app router pages
    │   ├── components/     # React components
    │   ├── lib/            # API clients
    │   └── types/          # TypeScript types
    ├── package.json
    └── tsconfig.json
```

### Backend Structure

#### `/backend/src/config/`

- **database.ts**: MongoDB connection and configuration
- **env.ts**: Environment variable validation using Zod
- **embeddingClient.ts**: ML embedding model initialization
- **vectorClient.ts**: Vector database client (Qdrant/Pinecone)
- **initVectorDB.ts**: Vector database initialization
- **winstonLogger.ts**: Logging configuration

#### `/backend/src/controllers/`

- **movieController.ts**: Handles movie-related HTTP requests
  - `searchMoviesHandler`: Semantic search endpoint
  - `getMovieHandler`: Get single movie
  - `getSimilarMoviesHandler`: Find similar movies
  - `listMoviesHandler`: Paginated movie listing
  - `createMovieHandler`: Create new movie
  - `updateMovieHandler`: Update movie
  - `deleteMovieHandler`: Delete movie

#### `/backend/src/models/`

- **Movie.ts**: Mongoose schema for movie documents
- **IngestionJob.ts**: Schema for tracking movie ingestion jobs

#### `/backend/src/routes/`

- **movieRoutes.ts**: Movie CRUD and search endpoints
- **adminRoutes.ts**: Administrative endpoints (analytics, bulk operations, imports)

#### `/backend/src/services/`

- **embeddingService.ts**: Generates embeddings using transformers.js
- **vectorSearchService.ts**: Vector database operations
- **movieService.ts**: Movie CRUD operations
- **searchService.ts**: Advanced search with filters
- **recommendationService.ts**: Movie recommendation algorithms
- **ingestionService.ts**: Movie ingestion with embedding generation
- **gridfsService.ts**: GridFS image storage operations
- **imageOptimizationService.ts**: Image processing with Sharp

#### `/backend/src/middleware/`

- **errorHandler.ts**: Global error handling
- **requestLogger.ts**: HTTP request logging
- **upload.ts**: Multer configuration for file uploads

#### `/backend/src/utils/`

- **asyncHandler.ts**: Wrapper for async route handlers
- **errors.ts**: Custom error classes
- **filterBuilder.ts**: MongoDB query builder for filters
- **logger.ts**: Winston logger instance

#### `/backend/src/scripts/`

- **seedMovies.ts**: Seed database from TMDB API
- **importMovies.ts**: Import movies from JSON files
- **testEmbedding.ts**: Test embedding generation
- **testVectorInsert.ts**: Test vector database operations

### Frontend Structure

#### `/frontend/src/app/`

- **page.tsx**: Home page with semantic search
- **layout.tsx**: Root layout with navbar
- **movies/page.tsx**: All movies listing with pagination
- **movies/[id]/page.tsx**: Single movie detail page
- **find-similar/page.tsx**: Find most similar movie tool
- **admin/page.tsx**: Admin panel for movie management

#### `/frontend/src/components/`

- **Navbar.tsx**: Navigation bar component
- **MovieCard.tsx**: Reusable movie card component

#### `/frontend/src/lib/`

- **api.ts**: Core API client functions
- **extendedApi.ts**: Extended API functions (filters, recommendations, admin)

#### `/frontend/src/types/`

- **movie.ts**: TypeScript interfaces for movie data

---

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: MongoDB 8.20.1 (via Mongoose)
- **Vector Database**: Qdrant / Pinecone (configurable)
- **ML/AI**:
  - `@xenova/transformers` 2.17.2 (local embeddings)
  - OpenAI API (optional)
- **Image Processing**: Sharp 0.34.5
- **File Upload**: Multer 2.0.2
- **Validation**: Zod 4.1.13
- **Logging**: Winston 3.19.0
- **HTTP Client**: Axios 1.13.2

### Frontend

- **Framework**: Next.js 16.0.6
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Fonts**: Geist Sans & Geist Mono

### Development Tools

- **Backend**: Nodemon, tsx, ts-node-dev
- **Frontend**: ESLint, Next.js ESLint config

---

## Backend Architecture

### Request Flow

```
HTTP Request
    ↓
Express Middleware (CORS, JSON parsing, logging)
    ↓
Route Handler (movieRoutes.ts / adminRoutes.ts)
    ↓
Controller (movieController.ts)
    ↓
Service Layer (movieService.ts, embeddingService.ts, etc.)
    ↓
Database Layer (MongoDB / Vector DB)
    ↓
Response
```

### Key Services

#### Embedding Service

- **Purpose**: Convert text to vector embeddings
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Usage**: Generates embeddings for movie plots and search queries
- **Location**: `backend/src/services/embeddingService.ts`

#### Vector Search Service

- **Purpose**: Perform similarity searches in vector space
- **Providers**: Qdrant (default), Pinecone, Chroma
- **Operations**: Insert, search, delete vectors
- **Location**: `backend/src/services/vectorSearchService.ts`

#### Movie Service

- **Purpose**: CRUD operations for movies
- **Features**:
  - Pagination
  - Sorting
  - Deduplication
  - Embedding management
- **Location**: `backend/src/services/movieService.ts`

#### Ingestion Service

- **Purpose**: Process and store new movies
- **Features**:
  - Generate embeddings
  - Store in MongoDB
  - Store in Vector DB
  - Handle image uploads
- **Location**: `backend/src/services/ingestionService.ts`

### Environment Configuration

Required environment variables (see `backend/src/config/env.ts`):

```env
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/movies

# Vector Database (choose one)
VECTOR_DB_PROVIDER=qdrant
VECTOR_DB_URL=http://localhost:6333  # For Qdrant
VECTOR_DB_API_KEY=your_key  # For Qdrant Cloud/Pinecone
VECTOR_COLLECTION=movies
VECTOR_DIMENSION=384

# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Optional: TMDB API for seeding
TMDB_API_KEY=your_tmdb_key

# Optional: Auto-import movies on startup
AUTO_IMPORT_MOVIES=false
```

---

## Frontend Architecture

### Page Structure

#### Home Page (`/`)

- Semantic search interface
- Natural language query input
- Search results display
- Similar movies sidebar
- Random movie discovery

#### All Movies Page (`/movies`)

- Paginated movie grid
- Statistics dashboard
- Movie cards with posters
- Navigation to detail pages

#### Movie Detail Page (`/movies/[id]`)

- Full movie information
- Poster display
- Similar movies section
- Recommendations section
- Trailer link

#### Find Similar Page (`/find-similar`)

- Movie selection interface
- Search/browse movies
- Display most similar movie
- Similarity score visualization

#### Admin Panel (`/admin`)

- Movie CRUD operations
- Bulk operations
- Import/export functionality
- Analytics dashboard
- Image management

### Component Architecture

```
App Layout
├── Navbar (global)
└── Page Components
    ├── HomePage
    │   ├── SearchForm
    │   ├── MovieCard (multiple)
    │   └── SimilarMoviesSidebar
    ├── MoviesPage
    │   ├── StatisticsCards
    │   └── MovieGrid
    ├── MovieDetailPage
    │   ├── MovieHeader
    │   ├── SimilarMovies
    │   └── Recommendations
    ├── FindSimilarPage
    │   ├── MovieSelector
    │   └── SimilarMovieDisplay
    └── AdminPage
        ├── MovieForm
        └── MovieList
```

### API Client Structure

#### Core API (`lib/api.ts`)

- `searchMovies()`: Semantic search
- `fetchSimilarMovies()`: Get similar movies
- `getAllMovies()`: Paginated listing
- `getMovie()`: Single movie
- `createMovie()`: Create movie
- `updateMovie()`: Update movie
- `deleteMovie()`: Delete movie

#### Extended API (`lib/extendedApi.ts`)

- `advancedSearch()`: Filtered search
- `getFilterOptions()`: Available filters
- `getTrendingMovies()`: Trending movies
- `getBestRatedMovies()`: Top-rated movies
- `getEnhancedRecommendations()`: AI recommendations
- Admin functions (analytics, bulk operations)

---

## API Documentation

### Base URL

```
http://localhost:4000/api
```

### Movie Endpoints

#### Search Movies (Semantic Search)

```
GET /movies/search?q={query}&limit={limit}
```

- **Description**: Semantic search using natural language
- **Parameters**:
  - `q` (required): Search query (min 3 characters)
  - `limit` (optional): Results limit (1-20, default: 10)
- **Response**: `{ count: number, results: MovieSummary[] }`

#### Get All Movies

```
GET /movies?page={page}&limit={limit}&sortBy={field}&sortOrder={asc|desc}
```

- **Description**: Paginated movie listing
- **Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (1-100, default: 20)
  - `sortBy` (optional): Sort field (default: createdAt)
  - `sortOrder` (optional): asc or desc (default: desc)
- **Response**: `{ movies: Movie[], total: number, page: number, totalPages: number }`

#### Get Single Movie

```
GET /movies/:id
```

- **Description**: Get movie by ID
- **Response**: `Movie`

#### Get Similar Movies

```
GET /movies/:id/similar?limit={limit}
```

- **Description**: Find similar movies based on plot
- **Parameters**:
  - `limit` (optional): Number of results (1-10, default: 5)
- **Response**: `{ count: number, results: SimilarMovie[] }`

#### Create Movie

```
POST /movies/ingest
Content-Type: application/json
```

- **Description**: Create new movie
- **Body**: `CreateMovieDTO` (JSON) or `FormData` (with posterImage)
- **Response**: `{ message: string }`

#### Update Movie

```
PUT /movies/:id
Content-Type: application/json
```

- **Description**: Update movie metadata
- **Body**: `Partial<CreateMovieDTO>`
- **Response**: `Movie`

#### Delete Movie

```
DELETE /movies/:id
```

- **Description**: Delete movie
- **Response**: `{ message: string }`

### Admin Endpoints

#### Get Analytics

```
GET /admin/analytics/searches
```

- **Description**: Search analytics
- **Response**: Analytics data

#### Get Storage Stats

```
GET /admin/analytics/storage
```

- **Description**: Storage statistics
- **Response**: Storage data

#### Export Movies (JSON)

```
GET /admin/export/json
```

- **Description**: Export all movies as JSON
- **Response**: JSON file download

#### Export Movies (CSV)

```
GET /admin/export/csv
```

- **Description**: Export all movies as CSV
- **Response**: CSV file download

#### Bulk Delete

```
POST /admin/bulk-delete
Content-Type: application/json
Body: { ids: string[] }
```

- **Description**: Delete multiple movies
- **Response**: `{ message: string, deletedCount: number }`

#### Backfill Posters

```
POST /admin/backfill-posters
```

- **Description**: Download missing poster images
- **Response**: `{ message: string, total: number, updated: number, failed: number }`

### Data Models

#### Movie

```typescript
interface Movie {
  id: string;
  title: string; // Required
  genres: string[];
  cast: string[];
  director?: string;
  releaseYear?: number;
  plot?: string;
  trailerUrl?: string;
  posterUrl?: string;
  posterGridFSId?: string;
  rating?: number; // 0-10
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
```

#### MovieSummary

```typescript
interface MovieSummary {
  id: string;
  title: string;
  genres: string[];
  cast: string[];
  rating?: number;
  posterUrl?: string;
  posterGridFSId?: string;
  releaseYear?: number;
  score?: number; // Similarity score
}
```

---

## Database Schema

### MongoDB Collections

#### Movies Collection

```javascript
{
  _id: ObjectId,
  id: String,                 // Virtual field
  title: String,              // Required, indexed
  genres: [String],
  cast: [String],
  director: String,
  releaseYear: Number,
  plot: String,               // Used for embeddings
  trailerUrl: String,
  posterUrl: String,
  posterGridFSId: ObjectId,   // Reference to GridFS
  rating: Number,             // 0-10
  metadata: Object,
  embeddingKeys: Object,      // Vector DB references
  createdAt: Date,
  updatedAt: Date
}
```

#### GridFS Buckets

- **posters**: Movie poster images
  - Optimized with Sharp
  - Stored as binary data
  - Metadata includes content type

### Vector Database

#### Collection Structure (Qdrant)

```json
{
  "collection_name": "movies",
  "vector_size": 384,
  "distance": "Cosine",
  "points": [
    {
      "id": "movie_id",
      "vector": [0.123, 0.456, ...],
      "payload": {
        "movieId": "mongodb_id",
        "title": "Movie Title"
      }
    }
  ]
}
```

---

## Vector Search Implementation

### Embedding Generation

1. **Model**: `sentence-transformers/all-MiniLM-L6-v2`

   - Dimensions: 384
   - Type: Sentence transformer
   - Framework: Transformers.js (runs locally)

2. **Process**:
   ```
   Text Input (plot/query)
       ↓
   Tokenization
       ↓
   Model Inference
       ↓
   384-dimensional Vector
       ↓
   Normalization
       ↓
   Vector Database
   ```

### Similarity Search Flow

```
User Query
    ↓
Generate Embedding (embeddingService)
    ↓
Search Vector DB (vectorSearchService)
    ↓
Get Top K Results
    ↓
Fetch Movie Details from MongoDB
    ↓
Return Results with Scores
```

### Similarity Metrics

- **Distance Metric**: Cosine Similarity
- **Score Range**: 0.0 - 1.0 (higher = more similar)
- **Default Limit**: 5-10 results

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Qdrant (or Pinecone account)
- npm or yarn

### Backend Setup

1. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 mongo:latest

   # Or use local MongoDB installation
   ```

4. **Start Vector Database**

   ```bash
   # Qdrant (Docker)
   docker run -d -p 6333:6333 qdrant/qdrant
   ```

5. **Run Development Server**

   ```bash
   npm run dev
   ```

6. **Seed Database (Optional)**
   ```bash
   npm run seed:movies
   ```

### Frontend Setup

1. **Install Dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**

   ```bash
   # Create .env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
   ```

3. **Run Development Server**

   ```bash
   npm run dev
   ```

4. **Access Application**
   ```
   http://localhost:3000
   ```

### Production Build

**Backend:**

```bash
cd backend
npm run build
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
npm start
```

---

## Key Features

### 1. Semantic Search

- Natural language queries
- Vector similarity matching
- Context-aware results

### 2. Movie Discovery

- Browse all movies with pagination
- Filter by genres, ratings, years
- Search by director or cast

### 3. Similarity Matching

- Find most similar movie
- Plot-based similarity
- Score-based ranking

### 4. Recommendations

- Enhanced recommendation engine
- Genre-based suggestions
- Rating-based filtering

### 5. Image Management

- GridFS storage
- Image optimization
- Automatic poster backfilling

### 6. Admin Features

- CRUD operations
- Bulk operations
- Analytics dashboard
- Import/export functionality

### 7. Statistics

- Total movies count
- Average ratings
- Genre distribution
- Rating statistics

---

## Development Notes

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Consistent naming conventions
- Async/await for asynchronous operations

### Error Handling

- Global error handler middleware
- Custom error classes
- Proper HTTP status codes
- User-friendly error messages

### Logging

- Winston logger for backend
- Request/response logging
- Error logging with stack traces
- Development/production log levels

### Testing

- Scripts for testing embeddings
- Vector database test scripts
- Manual testing endpoints

---

## Future Enhancements

- [ ] User authentication and profiles
- [ ] Watchlist functionality
- [ ] Movie reviews and ratings
- [ ] Advanced recommendation algorithms
- [ ] Real-time search suggestions
- [ ] Multi-language support
- [ ] Mobile app
- [ ] GraphQL API
- [ ] Unit and integration tests
- [ ] CI/CD pipeline

---

## License

MIT License

---

## Contact & Support

For issues, questions, or contributions, please refer to the project repository.
