# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Building an intelligent RAG (Retrieval-Augmented Generation) knowledge assistant that ingests website content and provides precise, contextual answers with confidence scoring.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm test` - Run Vitest test suite (when configured)
- `pnpm lint` - Run ESLint with strict TypeScript rules
- `pnpm format` - Format code with Prettier

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Architecture

This is a TypeScript Next.js 15 starter template for AI-powered applications:

### Core Stack
- **Next.js 15** with App Router and Turbopack
- **AI SDK 5** with OpenAI GPT-5 integration
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling
- **TypeScript** with strict mode enabled

### Key Directories
- `app/` - Next.js App Router pages and API routes
  - `app/api/chat/route.ts` - AI chat endpoint using non-streaming `generateText()`
  - `app/page.tsx` - Main chat page
  - `app/about/`, `app/privacy/` - Static pages
- `components/chat/` - Chat-specific components
  - `chat-assistant.tsx` - Main chat interface component
- `components/ui/` - shadcn/ui components
- `components/ai-elements/` - Pre-built AI components from Vercel
- `lib/utils.ts` - Utility functions including `cn()` for className merging

### AI Integration
- Uses AI SDK 5's `generateText()` for non-streaming responses
- Configured for GPT-5 via OpenAI provider
- API route at `/api/chat` expects `{ message: string }` and returns `{ response: string }`
- Chat interface uses AI Elements components (Conversation, Message, PromptInput)
- Requires `OPENAI_API_KEY` in `.env.local`

### UI Components
- **shadcn/ui** configured with:
  - New York style
  - Neutral base color with CSS variables
  - Import aliases: `@/components`, `@/lib/utils`, `@/components/ui`
  - Lucide React for icons
- **AI Elements** from Vercel:
  - Pre-built components for AI applications
  - Key components: Conversation, Message, PromptInput, ConversationContent, ConversationEmptyState
  - Additional components: CodeBlock, Artifact, Tool, Loader, Response, etc.

### TypeScript Configuration
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` maps to root directory

### Adding Components
- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

## RAG Development Phases

### MVP: Basic Text-Only RAG
- Simple Q&A with pre-loaded content
- OpenAI embeddings + chat completion
- In-memory vector storage

### Phase 0: Tool Chest Foundation
- Vercel AI SDK integration
- Base agent class with tool calling
- Embedding generation service
- Vector similarity search

### Phase 1: Web Scraping (Playwright)
- Single page content extraction
- Clean text extraction from URLs
- Content sanitization

### Phase 2: Web Crawling (Crawl4AI)
- Multi-page site discovery
- Respect robots.txt
- Batch processing

### Phase 3: Persistent Storage
- Vercel Postgres + pgvector
- Content versioning
- Search optimization

## Code Quality Standards

### Conciseness Rules
- **Functions**: Max 15 lines (excluding types/comments)
- **Files**: Max 100 lines total
- **Classes**: Max 50 lines, single responsibility
- **No nested ternaries**: Use early returns
- **Single-purpose modules**: One export per file

### TypeScript Configuration Requirements
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true
}
```

### Testing Strategy
- TDD with Vitest
- 100% coverage requirement
- Test before implementation

### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended-strict",
    "@typescript-eslint/stylistic"
  ],
  "rules": {
    "max-lines-per-function": ["error", 15],
    "max-lines": ["error", 100],
    "complexity": ["error", 3],
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

## AI Agent Requirements

### Accuracy Standards
- Only respond when confidence ≥ 0.9
- If confidence < 0.9, respond: "I don't have enough information to answer accurately"
- Include confidence scores in all responses
- Provide source attribution
- Log all low-confidence queries for analysis

### Input Validation
- Sanitize all URLs before scraping
- Rate limiting: max 10 requests/minute per IP
- Content size limits: 10MB per scrape session
- Malicious content detection (basic regex patterns)

### Performance Targets
- Embedding generation: <100ms per chunk
- Vector search: <50ms per query
- Total response: <200ms average
- Support 100+ concurrent users

## Workflow Documentation Rules

**CRITICAL**: Every development session MUST maintain these documentation files:

### 1. `scratchpad.md` - Planning & Notes
- Document ALL planning before implementation
- Capture design decisions and considerations
- Record research findings and API explorations
- Update throughout the session

### 2. `todo.md` - Task Tracking
- Break down all features into specific tasks
- Mark tasks as: [ ] pending, [x] completed, [~] in-progress
- Update status in real-time
- Include phase and priority labels

### 3. `decision-log.md` - Technical Decisions
- Record every technical choice with rationale
- Include alternatives considered
- Document trade-offs
- Date each entry

### 4. `change-log.md` - Implementation History
- Log every file modification
- Include before/after for significant changes
- Record refactoring decisions
- Note breaking changes

## Git Workflow

### Branch Naming
- `feature/<slug>` - New features
- `bugfix/<slug>` - Bug fixes
- `chore/<slug>` - Maintenance

### Commit Format
```
<type>: <short imperative summary>

Types: feat, fix, chore, docs, refactor, test
```

## Core Interfaces

```typescript
interface AgentResponse {
  answer: string;
  sources: string[];
  confidence: number;
  chunks: ContentChunk[];
}

interface ResponseValidation {
  hasRelevantContext: boolean;
  confidenceScore: number;
  sourceAttribution: string[];
  shouldRespond: boolean;
}

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

## API Structure

### POST /api/chat
**Request:**
```typescript
{
  message: string;
  sessionId?: string;
}
```

**Response:**
```typescript
{
  answer: string;
  confidence: number;
  sources: string[];
  responseTime: number;
}
```

## Environment Setup

Create `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

Future phases will require:
```
POSTGRES_URL=your_vercel_postgres_url
POSTGRES_PRISMA_URL=your_prisma_url
POSTGRES_URL_NON_POOLING=your_direct_url
```

## pnpm Workspace Configuration

The project uses a pnpm workspace with specific built dependencies:
- `@tailwindcss/oxide`
- `sharp`

## Key Resources
- [Vercel AI SDK RAG Example](https://github.com/vercel-labs/ai-sdk-preview-rag)
- [Playwright Docs](https://playwright.dev/docs/scraping)
- [Crawl4AI](https://crawl4ai.com/mkdocs/)
- [Vercel Postgres + pgvector](https://vercel.com/docs/storage/vercel-postgres)

## Development Checklist

Before starting any task:
1. ✅ Update `scratchpad.md` with plan
2. ✅ Add tasks to `todo.md`
3. ✅ Check `quality-standards.md` for guidelines

During development:
1. ✅ Update `decision-log.md` for choices
2. ✅ Mark `todo.md` items in-progress
3. ✅ Follow TDD - write tests first

After implementation:
1. ✅ Update `change-log.md` with modifications
2. ✅ Mark `todo.md` items complete
3. ✅ Run lint and format checks
4. ✅ Verify confidence scoring works

## Monitoring & Evaluation
- Log all queries, responses, and confidence scores
- Track embedding generation performance
- Monitor vector search latency
- Alert on confidence score degradation
- Performance benchmarks for each component