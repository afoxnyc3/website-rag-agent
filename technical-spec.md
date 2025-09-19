# Technical Specification

## System Architecture

### Response Validation Pipeline
```typescript
interface ResponseValidation {
  hasRelevantContext: boolean;
  confidenceScore: number; // 0-1
  sourceAttribution: string[];
  shouldRespond: boolean;
}

interface AgentResponse {
  answer: string;
  sources: string[];
  confidence: number;
  chunks: ContentChunk[];
}
```

### Core Data Types
```typescript
type EmbeddingVector = number[] & { __brand: 'EmbeddingVector' };

type ContentChunk = {
  readonly id: string;
  readonly content: string;
  readonly source: URL;
  readonly embedding?: EmbeddingVector;
};

interface AgentEvaluation {
  accuracy: number;        // Correct answers / Total answers
  precision: number;       // Relevant responses / Total responses
  recall: number;         // Found answers / Available answers
  responseTime: number;   // Average ms per query
  confidenceCalibration: number; // Confidence vs actual accuracy
}
```

## TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Tool Integration Specifications

### Phase 1: Playwright Web Scraping
- Extract clean text content from single URLs
- Handle dynamic content and SPAs
- Content sanitization and normalization
- Error handling for failed scrapes

### Phase 2: Custom Web Crawling (CrawlTool)
- Multi-page site discovery with configurable depth
- Built-in robots.txt compliance and crawl delays
- URL deduplication and pattern-based filtering
- Batch processing with Playwright integration

### Phase 3: Vector Database (Vercel Postgres + pgvector)
- Persistent vector storage with metadata
- Efficient similarity search with indexing
- Content versioning and updates
- Connection pooling and optimization

## API Endpoints Structure
```typescript
// POST /api/chat
interface ChatRequest {
  message: string;
  sessionId?: string;
}

interface ChatResponse {
  answer: string;
  confidence: number;
  sources: string[];
  responseTime: number;
}
```

## Performance Requirements
- Embedding generation: <100ms per chunk
- Vector search: <50ms per query
- Total response time: <200ms average
- Concurrent requests: Support 100+ simultaneous users
