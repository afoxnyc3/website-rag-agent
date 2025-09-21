# CLAUDE.md - Technical Reference

**For workflow and behavioral guidance, see [agents.md](./agents.md) FIRST**

This file provides technical reference for the project architecture and implementation details.

## Project Overview

An intelligent RAG (Retrieval-Augmented Generation) knowledge assistant powered by BaseAgent orchestration that ingests website content and provides precise, contextual answers with confidence scoring.

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
- **AI SDK 5** with OpenAI GPT-4 integration
- **BaseAgent** orchestration layer with tool registry
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling
- **TypeScript** with strict mode enabled

### Key Directories

- `app/` - Next.js App Router pages and API routes
  - `app/api/chat/route.ts` - BaseAgent orchestration endpoint with tool execution
  - `app/page.tsx` - Main chat page
  - `app/about/`, `app/privacy/` - Static pages
- `components/chat/` - Chat-specific components
  - `chat-assistant.tsx` - Main chat interface component
- `components/ui/` - shadcn/ui components
- `components/ai-elements/` - Pre-built AI components from Vercel
- `lib/utils.ts` - Utility functions including `cn()` for className merging

### AI Integration

- Uses BaseAgent orchestration for intelligent request handling
- Integrated tool registry with ScrapeTool and CrawlTool
- Configured for GPT-4 via OpenAI provider
- API route at `/api/chat` returns `{ response, confidence, sources, mode }`
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

### Current Implementation: BaseAgent RAG System

- BaseAgent orchestration with tool registry
- Intelligent intent recognition and tool selection
- OpenAI embeddings + GPT-4 completion
- Dual storage: in-memory (dev) / Postgres+pgvector (prod)

### Phase 0: Tool Chest Foundation ✅ COMPLETE

- BaseAgent orchestration layer
- Tool registry with plugin architecture
- Embedding generation service
- Vector similarity search with confidence scoring

### Phase 1: Web Scraping ✅ COMPLETE

- ScrapeTool with dual-mode extraction (fetch/Playwright)
- Smart fallback for JavaScript sites
- Content chunking and sanitization
- 5-minute URL caching

### Phase 2: Web Crawling ✅ COMPLETE

- CrawlTool with configurable depth and page limits
- Robots.txt compliance
- Rate limiting and batch processing
- Integrated with Playwright for JavaScript sites

### Phase 3: Persistent Storage ✅ COMPLETE

- Storage strategy pattern for environment switching
- Vercel Postgres + pgvector for production
- Content versioning and metadata tracking
- Automatic schema initialization

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
  "extends": ["@typescript-eslint/recommended-strict", "@typescript-eslint/stylistic"],
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

## BaseAgent Architecture

### Core Components

- **BaseAgent**: Main orchestration class
- **ToolRegistry**: Plugin system for tools
- **RAGService**: Embedding and retrieval service
- **StorageStrategy**: Abstraction for storage backends

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
// BaseAgent Configuration
interface AgentConfig {
  name: string;
  description?: string;
  toolRegistry?: ToolRegistry;
  ragService?: RAGService;
  confidenceThreshold?: number;
}

// Agent Response Format
interface AgentResponse {
  answer: string;
  sources: string[];
  confidence: number;
  chunks: ContentChunk[];
}

// Tool System Interfaces
interface Tool {
  name: string;
  description: string;
  execute(params: any): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Storage Strategy Pattern
interface StorageStrategy {
  initialize(): Promise<void>;
  addDocument(doc: Document, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number): Promise<SearchResult[]>;
  deleteDocument(id: string): Promise<void>;
  listDocuments(): Promise<Document[]>;
  close(): Promise<void>;
}
```

## API Structure

### POST /api/chat

**Request:**

```typescript
{
  message: string;     // User query or URL
  useRAG?: boolean;    // Enable RAG mode (default: true)
}
```

**Response:**

```typescript
{
  response: string;    // AI-generated answer
  confidence: number;  // Score from 0.0 to 1.0
  sources: string[];   // Source document IDs
  mode: string;        // "agent" or "direct"
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

## Related Documentation

- **Workflow Guide**: [agents.md](./agents.md) - START HERE
- **API Reference**: [API.md](./API.md)
- **Project Overview**: [README.md](./README.md)

## External Resources

- [Vercel AI SDK RAG Example](https://github.com/vercel-labs/ai-sdk-preview-rag)
- [Playwright Docs](https://playwright.dev/docs/scraping)
- [Vercel Postgres + pgvector](https://vercel.com/docs/storage/vercel-postgres)

## Development Standards

- Follow TDD approach with comprehensive tests
- Maintain code quality standards (see below)
- Verify all features work before marking complete
- Run tests with `pnpm test`

## Monitoring & Evaluation

- Log all queries, responses, and confidence scores
- Track embedding generation performance
- Monitor vector search latency
- Alert on confidence score degradation
- Performance benchmarks for each component
