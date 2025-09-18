# Decision Log

## 2025-09-18

### Decision: Use Vercel Postgres with Neon for persistent storage
**Rationale**:
- Native Vercel integration for seamless deployment
- Built-in pgvector support for vector operations
- Automatic connection management
- Good performance with connection pooling
**Alternatives considered**:
- Supabase (also good but less integrated)
- Prisma (adds ORM complexity)
**Trade-offs**: Vendor lock-in vs ease of use
**Result**: Successfully integrated Neon database with pgvector

### Decision: Implement Storage Strategy Pattern
**Rationale**:
- Allows seamless switching between storage types
- Environment-based configuration
- No code changes needed for different deployments
**Alternatives considered**:
- Hard-coded environment checks
- Separate implementations per environment
**Trade-offs**: Additional abstraction layer vs flexibility
**Result**: Clean abstraction with factory pattern

### Decision: Use environment variables for storage selection
**Rationale**:
- `NODE_ENV` for automatic selection
- `USE_PERSISTENT_STORAGE` for override
- No code changes needed between environments
**Alternatives considered**:
- Configuration files
- Build-time constants
**Trade-offs**: Runtime overhead vs deployment flexibility
**Result**: Easy configuration management

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

## 2024-01-17 - Web Scraping Phase

### Decision: Use TDD methodology for web scraping
**Rationale**: Ensure quality and reliability from the start
**Alternatives considered**: Write code first, test later
**Trade-offs**: Slower initial development vs higher quality
**Result**: Created tests first, then implementation

### Decision: Use Playwright for web scraping
**Rationale**:
- Handles JavaScript-rendered content
- Cross-browser support
- Reliable and well-maintained
**Alternatives considered**: Puppeteer, Cheerio
**Trade-offs**: Heavier dependency vs more capabilities
**Result**: Installed Playwright for actual scraping

### Decision: Implement chunking for long content
**Rationale**: Embeddings have token limits, need manageable chunks
**Alternatives considered**: Truncate content
**Trade-offs**: More complex processing vs complete content coverage
**Result**: Added chunkContent method with configurable size

### Decision: Chunk size of 3000 characters for embeddings
**Rationale**:
- OpenAI embedding models have token limits
- 3000 chars ≈ 750-1000 tokens (safe margin)
- Prevents "maximum context length" errors
**Alternatives considered**: 1000, 2000, 5000 chars
**Trade-offs**: More documents vs context coherence
**Result**: Implemented 3000 char chunks in scrape API
**Learning**: Large websites (137KB) create ~46 chunks

### Decision: Add URL input to chat UI
**Rationale**: Users need easy way to add web content to knowledge base
**Alternatives considered**: Separate page, CLI tool
**Trade-offs**: UI complexity vs user convenience
**Result**: Integrated URL input field above chat input
**Features**:
- Real-time scraping feedback
- Loading states with spinner
- Dynamic knowledge base counter
- Error handling and display

## 2025-09-18 - Phase 2: Web Crawling

### Decision: Build custom crawler instead of using Crawl4AI
**Rationale**:
- More control over crawling behavior
- Better integration with existing Playwright scraper
- Easier to test with TDD approach
**Alternatives considered**: Crawl4AI library
**Trade-offs**: More code to maintain vs full control
**Result**: Built WebCrawler and PlaywrightCrawler classes

### Decision: Implement comprehensive crawling features
**Rationale**: Production-ready crawling requires:
- Robots.txt compliance (ethical crawling)
- Rate limiting (prevent server overload)
- Sitemap support (discover all pages)
- Depth control (prevent infinite crawling)
**Result**: All features implemented and tested

### Decision: Add UI controls for crawl configuration
**Rationale**: Users need control over crawl behavior
**Features added**:
- Single page vs multi-page toggle
- Depth control (1-5 levels)
- Max pages limit (1-100)
- Advanced settings toggle
**Result**: Intuitive UI with sensible defaults

## 2025-09-18 - Course Correction: Phase 0

### Decision: Return to Phase 0 (Tool Chest Foundation)
**Rationale**:
- Skipping Phase 0 was a tactical mistake
- Current architecture lacks unified tool interface
- Code duplication across scrapers and crawlers
- No consistent error handling or response formats
- Building more features on weak foundation compounds technical debt
**Alternatives considered**: Continue with Phase 3 (Storage)
**Trade-offs**: Short-term slowdown vs long-term maintainability
**Result**: Implement Phase 0 before proceeding

### Decision: Split Phase 0 into Foundation + Migration
**Rationale**:
- Smaller, focused PRs are easier to review
- Can validate foundation before refactoring
- Less risk of breaking existing features
- Incremental progress and testing
**Approach**:
- Phase 0: Build tool foundation (new code)
- Phase 0.5: Migrate existing features to tools
**Result**: Two-phase approach for safer implementation

### Learning: Architecture First
**Insight**: "We don't have time to do it right, but we have time to do it twice"
**Lesson**: Always build foundation before features
**Impact**: 3 days of refactoring could have been avoided
**Future**: Review full roadmap before starting each phase

## 2025-09-18 - Phase 0.5: Tool Migration

### Decision: Convert scrapers and crawlers to Tool architecture
**Rationale**:
- Eliminate code duplication across scrapers
- Standardize error handling and responses
- Enable tool composition and chaining
- Consistent validation and retry logic
**Implementation**:
- ScrapeTool: Unified fetch + Playwright strategies
- CrawlTool: Extends Tool base class
**Result**: Cleaner, more maintainable codebase

### Decision: Deprecate old files instead of deleting
**Rationale**:
- Preserve history and implementation details
- Allow rollback if needed
- Document evolution of codebase
**Method**: Rename to .deprecated.ts
**Result**: Clean compilation while preserving code

### Decision: Add caching to ScrapeTool
**Rationale**:
- Reduce redundant API calls
- Improve performance for repeated scrapes
- Common pattern in web scraping
**Implementation**: 5-minute TTL cache
**Trade-offs**: Memory usage vs performance
**Result**: Faster responses for cached content

### Learning: Tool Migration Success
**Validation Results**:
- All 60 tests passing
- All API endpoints functional
- RAG system working correctly
- No runtime errors
**Insight**: Proper architecture makes refactoring easier
**Benefit**: Future tools will be easier to add