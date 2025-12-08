## Movie / Video Recommendation Platform

Semantic search stack that combines MongoDB for movie metadata, vector databases for similarity search, and AI embeddings. **100% free setup available** using Hugging Face + Qdrant Cloud/Pinecone + MongoDB Atlas.

> 🆓 **Want to use free services?** See [FREE_SETUP.md](docs/FREE_SETUP.md) for step-by-step guide using Hugging Face, Qdrant Cloud, and MongoDB Atlas (all free tiers).

### Project Layout

| Path | Description |
|------|-------------|
| `backend/` | Express + TypeScript API (ingestion, search, similar movies). |
| `frontend/` | Next.js 14 App Router UI with Tailwind. |
| `services/embedding/` | Standalone embedding worker wrapping OpenAI. |
| `docs/ARCHITECTURE.md` | Detailed architecture + data flow documentation. |

### Quick Start

> 💡 **New to the project?** Check out [FREE_SETUP.md](docs/FREE_SETUP.md) for a complete free setup guide!

1. **Dependencies**: Node 20+, npm, MongoDB (Atlas free tier), Vector DB (Qdrant Cloud/Pinecone free tier), Embedding API (Hugging Face free tier).
2. **Setup env files**
   ```bash
   cp backend/env.example backend/.env
   cp frontend/env.example frontend/.env
   cp services/embedding/env.example services/embedding/.env
   ```
   Update API keys, DB URLs, and ports as needed.
3. **Install packages**
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   npm install --prefix services/embedding
   ```
4. **Run services (separate terminals)**
   ```bash
   npm run dev --prefix services/embedding
   npm run dev --prefix backend
   npm run dev --prefix frontend
   ```
5. **Explore**: open http://localhost:3000, craft a natural-language search, and inspect API responses at http://localhost:4000/api/health.

### API Surface (backend)
- `POST /api/movies/ingest` – create ingestion job (expects metadata + textual assets).
- `GET /api/movies/search?q=...` – semantic search across plots/scripts/trailers.
- `GET /api/movies/:id` – fetch metadata record.
- `GET /api/movies/:id/similar` – fetch semantically similar titles.

### Tooling & Improvements
- TypeScript strict mode across services, `ts-node-dev` for DX.
- Optional embedding microservice decouples heavy LLM calls from API nodes.
- Next steps: authentication, background ETL, observability dashboards, automated tests.

