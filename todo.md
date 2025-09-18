# Project Todo List

## Current Phase: MVP - Basic Text-Only RAG

### High Priority - Core RAG Implementation
- [ ] Implement MVP: Basic Text-Only RAG with embeddings
- [ ] Add OpenAI embeddings generation service
- [ ] Create in-memory vector storage system
- [ ] Implement vector similarity search
- [ ] Add confidence scoring to responses

### UI Updates
- [ ] Update UI to show confidence scores and sources
- [ ] Add loading states for embedding generation
- [ ] Display source attribution in responses

### Testing & Quality
- [ ] Set up testing framework with Vitest
- [ ] Create initial test suite for RAG components
- [ ] Add ESLint and Prettier configurations
- [ ] Achieve 100% test coverage for core functions

## Upcoming Phases

### Phase 0: Tool Chest Foundation
- [ ] Integrate Vercel AI SDK tools
- [ ] Create base agent class with tool calling
- [ ] Implement response formatting utilities
- [ ] Add structured output support

### Phase 1: Web Scraping
- [ ] Install and configure Playwright
- [ ] Create single-page scraper service
- [ ] Add URL content extraction
- [ ] Implement text cleaning and normalization

### Phase 2: Web Crawling
- [ ] Integrate Crawl4AI
- [ ] Build multi-page crawler
- [ ] Add robots.txt compliance
- [ ] Implement rate limiting

### Phase 3: Persistent Storage
- [ ] Set up Vercel Postgres
- [ ] Install pgvector extension
- [ ] Migrate from in-memory to persistent storage
- [ ] Add content versioning

## Completed
- [x] Set up TypeScript Next.js starter
- [x] Configure AI SDK with OpenAI GPT-5
- [x] Implement basic chat interface
- [x] Set up project documentation
- [x] Configure git and GitHub repository
- [x] Fix TypeScript types for react-syntax-highlighter
- [x] Successful local build and deployment