# Real-Time RAG Web Application

## Purpose
A real-time RAG (Retrieval-Augmented Generation) web application that enables users to upload files (PDF, Word, Excel, images, audio) and immediately search/query them using multimodal embeddings from LanceDB, processed by CocoIndex, and integrated with Dify for conversational interfaces.

## Features

### 1. File Upload & Ingestion
- Users can upload files to `/data/files/documents/` (PDF, Word, Excel, images, audio)
- File Watcher monitors the `/data/files/` directory for new/changed files
- Metadata and content are stored in SQLite database (`documents.db`)
- File chunks are extracted and indexed

### 2. Multimodal Processing Pipeline
- **Text**: Extract text from PDF/Word/Excel using LanceDB text embeddings
- **Images**: Generate image embeddings using CLIP
- **Audio**: Transcribe and generate audio embeddings
- All embeddings stored in LanceDB (`text_embeddings`, `image_embeddings`)

### 3. CocoIndex Processing
- Monitors SQLite for new files
- Processes files incrementally
- Generates embeddings for text, images, and audio
- Updates LanceDB with new vector representations

### 4. RAG API (FastAPI)
- Provides search endpoints for text and image embeddings
- Supports hybrid search combining both modalities
- Returns top-k most relevant chunks for user queries

### 5. Dify Integration
- Dify calls the RAG API when users ask questions
- Dify displays answers based on retrieved context
- Real-time interaction between user, Dify, and RAG backend

## User Flows

### Flow 1: File Upload & Search
1. User uploads a document to `/data/files/documents/`
2. File Watcher detects the new file
3. SQLite stores file metadata and extracts text/chunks
4. CocoIndex processes the file and generates embeddings
5. LanceDB stores text/image embeddings
6. User queries Dify with a question
7. Dify calls RAG API → gets relevant chunks
8. Dify presents answer to user

### Flow 2: Real-Time Updates
- As new files are uploaded, the system continuously updates embeddings
- Existing queries can leverage newly indexed content
- No manual reprocessing required

## Technical Stack

- **Frontend**: Next.js web application
- **Backend**: FastAPI RAG service
- **Vector DB**: LanceDB (optimized for vector search)
- **Processing**: CocoIndex (monitors SQLite, processes files)
- **Chat Interface**: Dify (LangGenius Dify)
- **Storage**: SQLite (metadata + text), LanceDB (embeddings)
- **File Storage**: Raw files stored in `/data/files/`

## Success Criteria

- [ ] Users can upload PDF, Word, Excel, image, and audio files
- [ ] System retrieves relevant context within 1 second of query
- [ ] Search results are accurate and relevant (measured by user satisfaction)
- [ ] Real-time updates reflect new uploads within seconds
- [ ] System handles concurrent users without degradation
- [ ] Multimodal search works (text + image + audio)

## Assumptions

- SQLite database (`documents.db`) already exists with required tables
- LanceDB is accessible at `http://localhost:8001` (text_embeddings, image_embeddings)
- CocoIndex service is running and processing files
- Dify is deployed and accessible at `http://localhost:8000`
- Users have internet access and can upload files

## Constraints

- Must use SQLite for metadata storage (as per existing clinic.sqlite database)
- Must integrate with existing LanceDB and CocoIndex infrastructure
- Must support all supported file types: PDF, Word (.docx), Excel (.xlsx), images, audio
- Real-time updates must be near-instantaneous (no manual reprocessing)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow embedding generation | Degraded search quality | Use async processing, prioritize critical files |
| Large file processing time | Delayed search results | Stream processing, incremental updates |
| High embedding cost | Increased costs | Optimize embedding frequency, use caching |
| File type support gaps | Poor user experience | Gradual rollout, monitor error rates |

## Dependencies

- `sqlite3` (Python) - for metadata storage
- `lancedb` client - for vector embeddings
- `cocoindex` client - for file processing pipeline
- `fastapi` - for RAG API
- `dify` - for chat interface
- `nextjs` - for frontend

## Next Steps

1. Create feature directory: `specs/003-real-time-rag/`
2. Create spec file: `specs/003-real-time-rag/spec.md`
3. Validate specification against quality checklist
4. Proceed to planning phase

## Clarifications

### Session 2026-08-15
- Q: Database integration approach → A: Use a normalized schema with separate tables for patients, consultations, prescriptions, and other clinic data, linked via foreign keys for structured data management