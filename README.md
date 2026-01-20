# 🎬 Semantic Movie Discovery System

A full-stack web application that enables users to discover movies using natural language queries powered by semantic search. Built with Next.js, Express.js, MongoDB, and vector databases for intelligent movie recommendations.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Express](https://img.shields.io/badge/Express-5-green)
![MongoDB](https://img.shields.io/badge/MongoDB-8.20-brightgreen)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-orange)

## ✨ Features

### 🔍 Semantic Search
- **Natural Language Queries**: Search movies using plain English descriptions
- **Vector Similarity**: Find movies based on plot, genre, and title similarity
- **Context-Aware Results**: Get relevant results even with vague queries

### 🎯 Movie Discovery
- **Browse Movies**: Paginated movie listing with sorting options
- **Advanced Filtering**: Filter by genres, ratings, release years, directors, and cast
- **Movie Details**: Comprehensive movie information with posters and trailers
- **Similar Movies**: Discover movies similar to your favorites

### 🤖 AI-Powered Recommendations
- **Enhanced Recommendations**: AI-powered movie suggestions
- **Genre-Based Suggestions**: Find movies in your preferred genres
- **Rating-Based Filtering**: Get recommendations based on quality ratings

### 🖼️ Image Management
- **GridFS Storage**: Efficient poster image storage using MongoDB GridFS
- **Image Optimization**: Automatic image optimization with Sharp
- **Poster Backfilling**: Automatic download of missing poster images

### 👨‍💼 Admin Features
- **CRUD Operations**: Full movie management interface
- **Bulk Operations**: Delete multiple movies at once
- **Import/Export**: Export movies as JSON or CSV
- **Analytics Dashboard**: View search and storage statistics
- **Movie Ingestion**: Add movies with automatic embedding generation

## 🏗️ Architecture

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

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: MongoDB 8.20.1 (via Mongoose)
- **Vector Database**: Qdrant / Pinecone (configurable)
- **ML/AI**: 
  - `@xenova/transformers` 2.17.2 (local embeddings)
  - Sentence Transformers model: `all-MiniLM-L6-v2` (384 dimensions)
- **Image Processing**: Sharp 0.34.5
- **File Upload**: Multer 2.0.2
- **Validation**: Zod 4.1.13
- **Logging**: Winston 3.19.0

### Frontend
- **Framework**: Next.js 16.0.6
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Fonts**: Geist Sans & Geist Mono

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** 6 or higher (local or cloud)
- **Qdrant** (or Pinecone account)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Adv Db project"
   ```

2. **Set up the Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Backend Environment**
   
   Create a `.env` file in the `backend` directory:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=4000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/movies

   # Vector Database (Qdrant)
   VECTOR_DB_PROVIDER=qdrant
   VECTOR_DB_URL=http://localhost:6333
   VECTOR_COLLECTION=movies
   VECTOR_DIMENSION=384

   # Embedding Model
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

   # Optional: TMDB API for seeding movies
   TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. **Set up the Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Configure Frontend Environment**
   
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
   ```

### Running the Application

#### Start MongoDB

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Or use your local MongoDB installation**

#### Start Qdrant Vector Database

**Using Docker:**
```bash
docker run -d -p 6333:6333 --name qdrant qdrant/qdrant
```

**Or use Qdrant Cloud** (update `VECTOR_DB_URL` and `VECTOR_DB_API_KEY` in `.env`)

#### Start Backend Server

```bash
cd backend
npm run dev
```

The backend API will be available at `http://localhost:4000`

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend application will be available at `http://localhost:3000`

### Seed the Database (Optional)

To populate the database with sample movies from TMDB:

1. **Get a TMDB API Key** (free):
   - Sign up at https://www.themoviedb.org/signup
   - Go to Settings → API → Request API Key
   - Choose "Developer" option
   - Copy your API key

2. **Add to `.env` file**:
   ```env
   TMDB_API_KEY=your_api_key_here
   ```

3. **Run the seeding script**:
   ```bash
   cd backend
   npm run seed:movies
   ```

This will fetch ~100 popular movies, download their posters, and generate embeddings for semantic search.

## 📖 Usage

### Semantic Search

1. Navigate to the home page (`http://localhost:3000`)
2. Enter a natural language query, for example:
   - "movies about time travel"
   - "sci-fi movies with robots"
   - "emotional dramas"
3. View search results ranked by semantic similarity

### Browse Movies

- Visit `/movies` to see all movies with pagination
- Use filters to narrow down by genre, rating, year, etc.
- Click on any movie card to view detailed information

### Find Similar Movies

- Visit `/find-similar`
- Search or browse to select a movie
- View the most similar movie based on plot, genre, and title

### Admin Panel

- Visit `/admin` for movie management
- Create, update, or delete movies
- Export movies as JSON or CSV
- View analytics and statistics

## 📡 API Endpoints

### Base URL
```
http://localhost:4000/api
```


## 📁 Project Structure

```
Adv Db project/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── app.ts          # Express app configuration
│   │   ├── index.ts        # Server entry point
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models (Mongoose)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── scripts/        # Utility scripts (seeding, testing)
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

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `4000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `VECTOR_DB_PROVIDER` | Vector DB provider (`qdrant`, `pinecone`, `chroma`) | No | `qdrant` |
| `VECTOR_DB_URL` | Vector DB URL | Yes (for Qdrant/Chroma) | - |
| `VECTOR_DB_API_KEY` | Vector DB API key | Yes (for cloud) | - |
| `VECTOR_COLLECTION` | Vector collection name | No | `movies` |
| `VECTOR_DIMENSION` | Vector dimension size | No | `384` |
| `EMBEDDING_MODEL` | Embedding model name | No | `sentence-transformers/all-MiniLM-L6-v2` |
| `TMDB_API_KEY` | TMDB API key for seeding | No | - |

#### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | Yes |

## 🧪 Development

### Available Scripts

#### Backend

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Type check TypeScript
npm run seed:movies  # Seed database with TMDB movies
npm run import:movies # Import movies from JSON file
npm run test:embedding # Test embedding generation
npm run test:vectors  # Test vector database operations
```

#### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Vector Search Workflow

The system generates three types of embeddings for each movie:
1. **Title embedding** - Vector representation of the movie title
2. **Genre embedding** - Vector representation of genres
3. **Plot embedding** - Vector representation of the plot

These vectors are stored in Qdrant for semantic search. For detailed workflow documentation, see [QDRANT_VECTOR_SAVING_WORKFLOW.md](./QDRANT_VECTOR_SAVING_WORKFLOW.md).

## 🚢 Production Deployment

### Backend

1. Build the application:
   ```bash
   cd backend
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Build the application:
   ```bash
   cd frontend
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```
## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **The Movie Database (TMDB)** - For movie data and images
- **Hugging Face** - For the sentence transformer models
- **Qdrant** - For the vector database solution
- **Transformers.js** - For local embedding generation

**Built with ❤️ for Advanced Database course**
