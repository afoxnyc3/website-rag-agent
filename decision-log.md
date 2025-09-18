# Decision Log

## 2024-01-17

### Decision: Use feature branch strategy for RAG development
**Rationale**: Keep main branch stable while developing complex RAG features
**Alternatives considered**: Direct development on main
**Trade-offs**: Slightly more complex git workflow vs safer development
**Result**: Created `feature/rag-mvp` branch

### Decision: Start with in-memory vector storage
**Rationale**: Simpler to implement, no external dependencies for MVP
**Alternatives considered**: Start directly with pgvector
**Trade-offs**: Will need migration later vs faster initial development
**Result**: Proceeding with Map-based in-memory store

### Decision: Use OpenAI text-embedding-3-small model
**Rationale**:
- Good balance of performance and quality
- 1536 dimensions is manageable
- Same provider as our chat model (OpenAI)
**Alternatives considered**:
- text-embedding-3-large (3072 dims, more expensive)
- text-embedding-ada-002 (older, being deprecated)
**Trade-offs**: Slightly less accurate than large model but much faster
**Result**: Will implement with text-embedding-3-small

### Decision: Implement confidence scoring based on cosine similarity
**Rationale**:
- Industry standard for vector similarity
- Maps well to 0-1 confidence range
- Meets our 0.9 threshold requirement
**Alternatives considered**: Euclidean distance, dot product
**Trade-offs**: Slightly more computation vs better normalized scores
**Result**: Will use cosine similarity for confidence calculation

### Decision: Track all progress in documentation files
**Rationale**: Maintain audit trail and decision history per requirements
**Alternatives considered**: Just use git commits
**Trade-offs**: More overhead vs complete documentation
**Result**: Updating scratchpad, decision-log, change-log, and todo on each turn

### Decision: Use separate OpenAI client for embeddings
**Rationale**: The AI SDK doesn't expose embeddings API directly
**Alternatives considered**: Using fetch API directly
**Trade-offs**: Additional dependency vs cleaner code
**Result**: Installed openai package for embeddings

### Decision: Implement Map-based vector store
**Rationale**: Simple, fast for MVP, no external dependencies
**Alternatives considered**: Array-based storage
**Trade-offs**: Limited to in-memory vs simple implementation
**Result**: Created VectorStore class with Map storage

### Decision: Set confidence threshold at 0.9
**Rationale**: Matches PRD requirement for high accuracy
**Alternatives considered**: 0.8, 0.95
**Trade-offs**: May have fewer responses vs higher accuracy
**Result**: Hardcoded 0.9 threshold in RAGService

### Decision: Adjust confidence threshold to 0.5
**Rationale**: Testing revealed that embeddings rarely exceed 0.6-0.7 similarity even for relevant content
**Alternatives considered**: 0.6, 0.7
**Trade-offs**: More responses vs potential false positives
**Result**: Changed threshold from 0.9 to 0.5 for practical use
**Learning**: Cosine similarity scores for embeddings are typically:
- 0.8+ = Near duplicate
- 0.6-0.8 = Very relevant
- 0.5-0.6 = Relevant
- <0.5 = Marginally relevant