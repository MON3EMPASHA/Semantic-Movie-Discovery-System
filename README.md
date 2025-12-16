# Adv-Db Project

Simple local setup on Windows with MongoDB + Qdrant, backend API, and Next.js frontend.

## Prerequisites
- Node.js 18+ and npm
- Docker Desktop (for MongoDB and Qdrant) or locally installed MongoDB

## Quick Start

### 1) Start databases (Docker)
```powershell
# MongoDB
docker run --name mongo -p 27017:27017 -d mongo:7
# Qdrant vector DB
docker run --name qdrant -p 6333:6333 -p 6334:6334 -d qdrant/qdrant:latest
```

### 2) Configure env
Copy examples:
```powershell
Copy-Item d:\ADB\Adv-Db-project-main\backend\.env.example d:\ADB\Adv-Db-project-main\backend\.env
Copy-Item d:\ADB\Adv-Db-project-main\frontend\.env.local.example d:\ADB\Adv-Db-project-main\frontend\.env.local
```
Edit values if needed (MongoDB URI, vector provider).

### 3) Install deps
```powershell
cd d:\ADB\Adv-Db-project-main\backend; npm install
cd d:\ADB\Adv-Db-project-main\frontend; npm install
```

### 4) Run servers
```powershell
# Backend (port 4000)
cd d:\ADB\Adv-Db-project-main\backend; npm run dev
# Frontend (port 3000)
cd d:\ADB\Adv-Db-project-main\frontend; npm run dev
```

Health check: http://localhost:4000/api/health
Frontend: http://localhost:3000

## Data Storage & Access
- Movies stored in MongoDB via `MovieModel` (collection `movies`).
- Vector embeddings created with local model (MiniLM) and stored in Qdrant collection `movies`.
- Linking: each embedding payload includes `movieId`, so vector search returns matches with `movieId`, then API resolves to MongoDB docs.

### Key Files
- Backend start: `backend/src/index.ts` connects MongoDB and vector DB, serves API.
- Mongo config: `backend/src/config/database.ts` uses `MONGODB_URI`.
- Model: `backend/src/models/Movie.ts` defines movie fields.
- Vector ops: `backend/src/services/vectorSearchService.ts` upserts and searches embeddings.
- Ingestion flow: `backend/src/services/ingestionService.ts` saves movie, generates embeddings, upserts to vector DB, and records ingestion jobs.
- API routes: `backend/src/routes/movieRoutes.ts` exposes CRUD and search endpoints.

## Common Commands
```powershell
# Test embeddings
cd d:\ADB\Adv-Db-project-main\backend; npm run test:embedding
# Test vector insert
cd d:\ADB\Adv-Db-project-main\backend; npm run test:vectors
```

## Troubleshooting
- Invalid env: ensure `backend/.env` has `MONGODB_URI` and vector settings.
- Empty search: check Qdrant collection exists and has points; ingest a movie first.
- Dimension mismatch: keep `VECTOR_DIMENSION=384` matching model.
