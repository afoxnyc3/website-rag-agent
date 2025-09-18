# Website RAG Agent

An intelligent knowledge assistant that automatically ingests website content and provides instant, contextual answers to user questions with confidence scoring.

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create `.env.local` file:
   ```bash
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
   ```

3. Start development:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) to interact with the RAG agent.

## 📋 Project Documentation

This project maintains comprehensive documentation for development workflow:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI agent instructions and project guidelines |
| `prd.md` | Product requirements and phased development plan |
| `technical-spec.md` | Technical architecture and specifications |
| `quality-standards.md` | Code quality and testing requirements |
| `agents.md` | AI agent configuration and behavior |

## 🔄 Development Workflow

### Required Documentation Updates

Every development session MUST maintain these files:

1. **`scratchpad.md`** - Planning notes and design decisions
2. **`todo.md`** - Task tracking with status markers
3. **`decision-log.md`** - Technical choices and rationale
4. **`change-log.md`** - File modifications and refactoring

### Workflow Process

```mermaid
graph LR
    A[Plan in scratchpad.md] --> B[Add tasks to todo.md]
    B --> C[Implement with TDD]
    C --> D[Update decision-log.md]
    D --> E[Record in change-log.md]
    E --> F[Mark todo complete]
```

## 🏗️ Development Phases

### Completed ✅
- **MVP**: Basic Text-Only RAG with confidence scoring
- **Phase 0**: Tool Chest Foundation - Base Tool architecture
- **Phase 0.5**: Tool Migration - Converted scrapers/crawlers to Tools
- **Phase 1**: Web Scraping - Playwright integration
- **Phase 2**: Web Crawling - Multi-page with robots.txt compliance

### Current Features
- ✅ Chat interface with GPT-5
- ✅ In-memory vector storage with embeddings
- ✅ Web scraping (ScrapeTool with fetch/Playwright strategies)
- ✅ Web crawling (CrawlTool with depth control)
- ✅ RAG system with confidence scoring
- ✅ Tool-based architecture for extensibility

### Upcoming Phases
- **Phase 3**: Persistent Storage (pgvector)
- **Phase 4**: Advanced RAG Features
- **Phase 5**: Multi-modal Support

## 🎯 Success Metrics

- **Accuracy**: >95% correct responses (confidence ≥ 0.9)
- **Performance**: <200ms average response time
- **Coverage**: 100% test coverage required
- **Quality**: Max 15 lines per function, 100 lines per file

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **Language**: TypeScript (strict mode)
- **AI**: Vercel AI SDK 5 + OpenAI GPT-5
- **UI**: shadcn/ui + AI Elements
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest (TDD approach) - 60 tests passing
- **Web Scraping**: Playwright + fetch API
- **Architecture**: Tool-based with validation & retry logic
- **Package Manager**: pnpm (exclusively)

## 📝 Development Commands

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm test       # Run test suite
pnpm lint       # Check code quality
pnpm format     # Format code
```

## 🔒 Quality Standards

- **Functions**: Max 15 lines
- **Files**: Max 100 lines
- **Testing**: TDD with 100% coverage
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional format (`feat:`, `fix:`, etc.)

## 🌐 Resources

- [Vercel AI SDK RAG Example](https://github.com/vercel-labs/ai-sdk-preview-rag)
- [Playwright Docs](https://playwright.dev/docs/scraping)
- [Crawl4AI](https://crawl4ai.com/mkdocs/)
- [Vercel Postgres + pgvector](https://vercel.com/docs/storage/vercel-postgres)

## 📄 License

MIT