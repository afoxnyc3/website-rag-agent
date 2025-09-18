# Scratchpad - Planning & Notes

## 2024-01-17 - RAG MVP Implementation Planning

### Current State
- Basic chat app working with GPT-5
- TypeScript issues resolved
- App running on port 3003
- Feature branch `feature/rag-mvp` created

### RAG Architecture Design
```
User Query � Embedding Generation � Vector Search �
Context Retrieval � Augmented Prompt � GPT-5 �
Confidence Scoring � Response with Sources
```

### Implementation Approach
1. **Embeddings Service** (`lib/embeddings.ts`)
   - Use OpenAI text-embedding-3-small model
   - 1536 dimensions
   - Batch processing capability

2. **Vector Store** (`lib/vector-store.ts`)
   - In-memory storage using Map
   - Store: id, content, embedding, metadata
   - Cosine similarity for search

3. **RAG Service** (`lib/rag.ts`)
   - Orchestrate embedding � search � generate
   - Calculate confidence scores
   - Format responses with sources

### Technical Decisions to Make
- [ ] Chunk size for documents (considering 15-line function limit)
- [ ] Number of top-k results to retrieve (3-5?)
- [ ] Confidence threshold (0.9 as per requirements)
- [ ] Response format structure

### Test Content Ideas
- Use Next.js documentation as sample knowledge base
- Small, focused content for initial testing
- Can expand to web scraping later

## Current Implementation - Embeddings Service

Starting with embeddings service:
1. Create lib/embeddings.ts
2. Use OpenAI text-embedding-3-small model
3. Keep functions under 15 lines (quality standard)
4. Add proper TypeScript types
5. Include error handling

## Testing Issues Found

1. Knowledge base initialization is async but not awaited
2. Need to ensure embeddings are generated before search
3. May need to debug similarity scores

## Next Steps
- Fix async initialization ✓
- Add logging to debug similarity scores ✓
- Test with simpler queries ✓

## UI Update Plan
- Modify chat-assistant.tsx to handle new response format ✓
- Add confidence badge display ✓
- Show source indicators ✓
- Add RAG mode indicator ✓
- Handle both RAG and direct modes ✓

## Next Phase Planning

### Immediate Actions:
1. Commit and push RAG MVP
2. Create PR for review

### Phase 1: Web Scraping (Next Major Feature)
- Install Playwright
- Create scraping service
- Add URL input to UI
- Dynamic content ingestion
- Real-time embedding generation

### Quality & Testing:
- Set up Vitest
- Write tests for RAG components
- Achieve code coverage targets

### Enhancement Ideas:
- Add more sample content
- Implement chat history
- Add document management UI
- Export/import knowledge base

### Performance Considerations
- Embedding caching to avoid re-computation
- Batch embedding requests
- Keep vector operations efficient

### UI Updates Needed
- Add confidence score display
- Show source citations
- Handle "low confidence" responses
- Loading states for RAG processing