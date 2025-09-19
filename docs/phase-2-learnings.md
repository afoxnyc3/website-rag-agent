# Phase 2: Intent Recognition - Learnings

## Overview
Phase 2 introduces **intent parsing** - the foundation for agent autonomy. The agent can now understand what the user wants to do.

## Workflow Evolution

### Phase 1 (Configuration)
- Static data storage
- No logic, just properties
- Foundation for the agent

### Phase 2 (Intent Recognition)
- Dynamic query analysis
- Pattern matching without AI
- Decision foundation for tool selection

## Code Structure

```typescript
// New types introduced
type IntentType = 'url' | 'question' | 'command' | 'unknown';

interface ParsedIntent {
  type: IntentType;
  query: string;
  urls?: string[];    // Extracted URLs if type = 'url'
  keywords?: string[]; // Command keywords if type = 'command'
}
```

## Implementation Pattern

The `parseIntent` method uses **cascading pattern matching**:

1. **URL Detection** (Priority 1)
   - Regex: `/https?:\/\/[^\s]+|www\.[^\s]+/gi`
   - Matches: `https://`, `http://`, `www.`
   - Returns immediately if found

2. **Question Detection** (Priority 2)
   - Regex: `/^(what|who|where|when|why|how|is|are|can|could|would|should|do|does)/i`
   - Matches question words at start of query
   - No keyword extraction needed

3. **Command Detection** (Priority 3)
   - Keyword array: `['add', 'remove', 'delete', 'clear', 'show', 'list', 'create', 'update']`
   - Case-insensitive matching
   - Extracts matching keywords for context

4. **Unknown** (Fallback)
   - Anything that doesn't match above patterns
   - Agent can decide how to handle

## Key Learnings

### 1. **Order Matters**
URLs are checked first because a query like "What is https://example.com?" should be treated as a URL intent, not a question.

### 2. **Pattern Matching vs AI**
Simple regex patterns are:
- Faster (no API calls)
- Predictable (deterministic)
- Testable (clear expectations)
- Free (no token costs)

### 3. **Intent Drives Action**
```
Intent Type → Tool Selection → Action
url         → ScrapeTool/CrawlTool → Fetch content
question    → RAGService → Search knowledge
command     → ToolExecutor → Execute action
```

### 4. **TDD Benefits Observed**
- Caught edge cases early (URLs with www. prefix)
- Clear specification before implementation
- Confidence in refactoring (tests as safety net)
- Documentation through tests

## Testing Strategy

Each intent type got its own test:
```javascript
✓ URL test: "Check https://example.com" → type='url', urls=['https://example.com']
✓ Question test: "What is pricing?" → type='question'
✓ Command test: "Clear knowledge base" → type='command', keywords=['clear']
```

## Next Phase Preview

Phase 3 (Decision Logic) will use these intents to:
- Decide when to fetch new data (`shouldFetchNewData`)
- Select appropriate tools (`selectTool`)
- Build the agent's decision-making brain

## Metrics
- Tests written: 3
- Tests passing: 12/12 (100%)
- Lines of code: ~35
- Time to implement: ~10 minutes with TDD