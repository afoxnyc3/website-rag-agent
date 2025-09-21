# Phase 3: Decision Logic - Learnings

## Overview

Phase 3 introduces **decision-making capabilities** - the agent can now decide when to fetch new data and which tools to use based on intent analysis.

## Workflow Evolution

### Phase 1 (Configuration)

- Static data storage (name, description, thresholds)
- Foundation setup

### Phase 2 (Intent Recognition)

- Query understanding (URL, question, command)
- Pattern matching for classification

### Phase 3 (Decision Logic) ✨ NEW

- **Smart caching** - Avoid redundant fetches
- **Tool selection** - Choose right tool for the job
- **Autonomous decisions** - Agent thinks before acting

## Code Structure

### Two Key Decision Methods:

```typescript
// 1. Should I fetch new data?
async shouldFetchNewData(intent: ParsedIntent): Promise<boolean>
  - Only fetches for URL intents
  - Checks 5-minute cache TTL
  - Returns false for questions (use existing knowledge)

// 2. Which tool should I use?
selectTool(intent: ParsedIntent): string | null
  - ScrapeTool: Specific pages (/path)
  - CrawlTool: Entire sites (domain root)
  - null: Non-URL intents
```

## Implementation Details

### Cache System

```typescript
private urlCache: Map<string, number> = new Map();
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

- Simple in-memory cache with timestamps
- Prevents hitting same URL repeatedly
- 5-minute TTL matches scraper cache

### Tool Selection Logic

```
Query Analysis:
1. Has "crawl" keyword? → CrawlTool
2. URL has specific path? → ScrapeTool
3. Domain root only? → CrawlTool
4. Not a URL? → null
```

## Key Learnings

### 1. **Caching is Critical**

Without caching, the agent would:

- Waste API calls
- Slow down responses
- Annoy websites with repeated requests
- Cost more in resources

### 2. **URL Analysis Matters**

```javascript
https://example.com → CrawlTool (entire site)
https://example.com/docs → ScrapeTool (single page)
https://example.com/blog/post → ScrapeTool (specific content)
```

### 3. **Decision Flow**

```
User Query
    ↓
parseIntent() [Phase 2]
    ↓
shouldFetchNewData() [Phase 3]
    ↓ Yes
selectTool() [Phase 3]
    ↓
Execute Tool [Phase 4]
```

### 4. **TDD Insights**

- Cache testing revealed edge cases (expired entries)
- URL parsing needed try-catch for malformed URLs
- Tool selection needed keyword analysis for "crawl"

## Testing Strategy

6 new tests covering:

```javascript
✓ shouldFetchNewData returns true for URLs
✓ shouldFetchNewData returns false for questions
✓ shouldFetchNewData checks cache expiry
✓ selectTool returns ScrapeTool for pages
✓ selectTool returns CrawlTool for sites
✓ selectTool returns null for non-URLs
```

## Real-World Impact

### Before Phase 3:

```
User: "Check example.com/docs"
Agent: 🤷 Don't know what to do
```

### After Phase 3:

```
User: "Check example.com/docs"
Agent:
  1. Parse: URL intent detected ✓
  2. Cache: Not cached, need to fetch ✓
  3. Tool: /docs path → ScrapeTool ✓
  4. Ready to execute!
```

## Next Phase Preview

Phase 4 (Tool Execution) will:

- Actually call the selected tools
- Handle success/failure cases
- Add timeout protection
- Process tool results

## Metrics

- Tests written: 6
- Tests passing: 18/18 (100%)
- Lines of code: ~40
- Decision methods: 2
- Cache TTL: 5 minutes
