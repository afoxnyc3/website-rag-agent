# Scratchpad - Planning & Notes

## 2025-09-20 - Slash Command Ideas Documented

### Created slash-ideas.md
- Documented /dev-workflow command for complete development workflow
- Based on agents.md behavioral contract
- Includes both full and short versions
- Added additional command ideas for common tasks

---

## 2025-09-20 - Critical Test Failures Fix COMPLETE ✅

### SUCCESS! All storage strategy tests are now passing (23/23)

#### What We Fixed:
1. **Corrected test mocks to match actual VectorStore interface**
   - Changed `similaritySearchWithScore` → `search`
   - Changed `getDocuments` → `getAllDocuments`
   - Fixed document structure: `pageContent` → `content`
   - Updated return types to match `SearchResult` interface

2. **Fixed test expectations**
   - Updated `addDocument` test to expect correct document structure
   - Fixed `search` test to use actual method signatures
   - Updated `deleteDocument` test to expect workaround behavior
   - Fixed `listDocuments` test to use correct methods

3. **Key Insight**
   - The production code was CORRECT all along
   - The tests had incorrect mocks based on a different API (possibly LangChain)
   - We fixed the tests, not the production code - following TDD principles

#### Test Results:
- ✅ Storage Strategy Tests: 23/23 passing
- ✅ BaseAgent Tests: 31/31 passing
- ✅ Tool Tests: 21/21 passing
- Total fixed: ~75 tests now passing correctly

---

## 2025-09-20 - Critical Test Failures Fix (ULTRATHINK)

### Problem Analysis

After deep investigation, I've identified the root cause of test failures:

**The test mocks don't match the actual VectorStore interface!**

#### Current VectorStore Reality:
- Has `search()` method that returns `SearchResult[]`
- Has `getAllDocuments()` method
- Uses `Document` with `content` field
- Has `addDocument()` and `addDocuments()` methods
- No `delete()` method with specific signature

#### What Tests Expect (Incorrect Mocks):
- `similaritySearchWithScore()` method (doesn't exist)
- `getDocuments()` method (actually `getAllDocuments()`)
- Documents with `pageContent` field (actually `content`)
- `delete()` method with `{ ids: [...] }` format (doesn't exist)

### Root Cause
The tests were written with mocks based on a different vector store API (possibly LangChain's interface), but the actual VectorStore implementation uses a custom interface. The MemoryStorage adapter code is CORRECT - it's the test mocks that are WRONG.

### Solution Strategy

**Approach: Fix the test mocks to match actual VectorStore interface**

Instead of changing the working production code, we need to:
1. Update test mocks to use correct method names
2. Fix document structure in mocks
3. Remove non-existent method expectations
4. Ensure mock behavior matches real VectorStore

### Risk Analysis
- **Low Risk**: Only changing test files, not production code
- **No Breaking Changes**: Production code is working correctly
- **Test Coverage**: Will accurately test the actual implementation

### Success Criteria
- All storage strategy tests pass
- Mocks accurately reflect real VectorStore interface
- No changes to production code needed
- Tests actually validate correct behavior

### Detailed Task Breakdown

#### Phase 1: Analyze VectorStore Interface
1. Document actual VectorStore methods and signatures
2. Document actual Document interface structure
3. Note return types and behaviors

#### Phase 2: Fix MemoryStorage Test Mocks
1. Replace `similaritySearchWithScore` mock with `search`
2. Replace `getDocuments` mock with `getAllDocuments`
3. Remove `delete` mock (not used in MemoryStorage)
4. Fix document structure (remove `pageContent`, use `content`)
5. Update mock return values to match actual types

#### Phase 3: Fix Test Expectations
1. Update `addDocument` test to check correct structure
2. Fix `search` test to use correct method and return type
3. Update `deleteDocument` test to expect workaround behavior
4. Fix `listDocuments` test to use `getAllDocuments`

#### Phase 4: Validate PersistentStorage Tests
1. Check if PersistentStorage tests have similar issues
2. Apply same fixes if needed
3. Ensure consistency across all storage tests

#### Phase 5: Run and Verify
1. Run individual test file first
2. Check for any remaining failures
3. Run full test suite
4. Document any additional issues found

---

## 2025-09-20 - Agent Instructions Restructuring COMPLETE ✅

### What We Did
Successfully restructured the agent instruction files as planned:

#### agents.md (Now 135 lines - Primary Behavioral Contract)
- ✅ Added MANDATORY PRE-FLIGHT CHECKLIST at the top
- ✅ Moved all workflow rules from CLAUDE.md
- ✅ Added planning template with clear structure
- ✅ Created "Common Mistakes to Avoid" section
- ✅ Included tool usage guide
- ✅ Fixed GPT-5 reference → GPT-4
- ✅ Added development checklist

#### CLAUDE.md (Now 313 lines - Technical Reference)
- ✅ Removed workflow documentation rules
- ✅ Removed development checklist (moved to agents.md)
- ✅ Added clear header pointing to agents.md FIRST
- ✅ Kept all technical specifications
- ✅ Added cross-references to other docs

### Results
- **Before**: CLAUDE.md was 344 lines with buried workflow instructions
- **After**: Clear separation - agents.md for behavior, CLAUDE.md for technical reference
- **Impact**: Workflow instructions are now impossible to miss
- **Validation**: All content preserved, no information lost

### Key Achievement
The restructuring ensures that planning in scratchpad.md is now unavoidable - it's the first item in the mandatory pre-flight checklist in the primary behavioral contract (agents.md).

---

## 2025-09-19 - Agent Instructions Restructuring Plan

### Problem Identified
- I completely failed to use scratchpad.md during BaseAgent implementation
- CLAUDE.md is 320 lines (too long, important instructions get buried)
- agents.md is only 33 lines (underutilized)
- Massive overlap and confusion between the two files

### Proposed Restructuring

#### agents.md (Primary - 80 lines)
**Purpose**: Behavioral contract and workflow enforcement
```
1. MANDATORY WORKFLOW (Never Skip)
   - Planning (scratchpad.md) - ALWAYS FIRST
   - Implementation (with TDD)
   - Documentation (all logs)

2. PRE-FLIGHT CHECKLIST
   □ Read last scratchpad entry
   □ Check todo.md for context
   □ Review recent change-log
   □ ASK: "Have I planned this in scratchpad?"
   If any unchecked → STOP

3. Planning Templates
4. Quality Gates
5. Common Mistakes to Avoid
```

#### CLAUDE.md (Reference - 170 lines)
**Purpose**: Technical reference guide
```
1. Project Overview
2. Technical Architecture
3. Development Commands
4. Code Standards
5. API Reference
6. Testing Strategy
```

### Key Changes Needed
1. Move ALL workflow rules from CLAUDE.md to agents.md
2. Add MANDATORY FIRST ACTION section at top of agents.md
3. Include scratchpad template with example entry
4. Add enforcement checkpoints throughout
5. Make agents.md the "what to do RIGHT NOW" guide
6. Make CLAUDE.md the "how things work" reference

### Why This Matters
- Makes scratchpad usage unavoidable (it's in primary file)
- Reduces cognitive load (smaller, focused documents)
- Clear hierarchy (behavior first, reference second)
- Better compliance (checkpoints in right place)
- Students can follow workflow clearly

### Implementation Impact
This restructuring ensures critical workflows (like scratchpad planning) are never missed because they'll be in the primary behavioral contract that's read first, not buried in a 320-line reference document.

---

## 2025-09-18 - Bug Fix: VectorStore Integration Issue

### Problem Discovered
- Web scraping/crawling completely broken
- Error: "Document must have id and content"
- Both `/api/scrape` and `/api/crawl` endpoints failing

### Root Cause Analysis
1. **Mismatch in document format between layers**:
   - MemoryStorage was passing: `{ pageContent, metadata, embedding }`
   - VectorStore expected: `{ id, content, metadata, embedding }`
2. **Incorrect method calls**:
   - MemoryStorage called non-existent VectorStore methods
   - `similaritySearchWithScore()` doesn't exist → use `search()`
   - `getDocuments()` doesn't exist → use `getAllDocuments()`

### Lessons Learned
1. **Always verify interface contracts between layers**
2. **Test integration points after refactoring**
3. **Add detailed error logging for debugging production issues**
4. **Document expected formats in interfaces**

### Solution Applied
- Fixed MemoryStorage adapter to match VectorStore's expected format
- Updated all method calls to use actual VectorStore API
- Implemented workaround for missing delete functionality
- Enhanced error reporting in API endpoints

## Phase 1 Web Scraping COMPLETE ✅

### What We Built
1. **PlaywrightScraper Class**: Production-ready web scraper
   - Handles JavaScript-rendered content
   - Smart content selection strategies
   - Proper error handling and cleanup

2. **API Integration**: `/api/scrape` endpoint
   - Accepts URLs via POST request
   - Chunks large content (3000 chars/chunk)
   - Adds to RAG knowledge base with metadata

3. **UI Integration**: Enhanced chat interface
   - URL input field with Globe icon
   - Real-time scraping with loading states
   - Dynamic knowledge base counter

4. **TDD Success**: 14/14 tests passing

### Technical Achievements
- Successfully scraped and indexed 137KB from nextjs.org
- Content chunked into ~46 documents
- RAG queries working with scraped content
- No token limit errors after chunking

### Key Learnings
- Chunking is critical for large content
- 3000 chars ≈ 750 tokens (safe margin)
- Playwright handles modern JavaScript sites
- Metadata tracking is essential

---

# Scratchpad - Planning & Notes

## 2024-01-17 - RAG MVP Implementation Planning

### Current State
- Basic chat app working with GPT-5
- TypeScript issues resolved
- App running on port 3003
- Feature branch `feature/rag-mvp` created

### RAG Architecture Design
```
User Query → Embedding Generation → Vector Search →
Context Retrieval → Augmented Prompt → GPT-5 →
Confidence Scoring → Response with Sources
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
   - Orchestrate embedding → search → generate
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
1. Commit and push RAG MVP ✓
2. Create PR for review ✓

## Phase 1: Web Scraping Implementation (TDD)

### TDD Approach:
1. Write tests first for scraper service
2. Test URL validation
3. Test content extraction
4. Test error handling
5. Then implement to pass tests

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