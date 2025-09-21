import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../tools/tool';
import type { AgentConfig } from './base-agent';

// Mock RAGService to avoid OpenAI initialization during tests
vi.mock('../rag', () => ({
  RAGService: vi.fn().mockImplementation(() => ({
    addDocument: vi.fn(),
    query: vi.fn(),
    getDocumentCount: vi.fn(),
  })),
}));

// Phase 1: Agent Configuration Tests
describe('AgentConfig', () => {
  it('should accept name property', () => {
    const config: AgentConfig = {
      name: 'TestAgent',
    };
    expect(config.name).toBe('TestAgent');
  });

  it('should accept description property', () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      description: 'A test agent for unit tests',
    };
    expect(config.description).toBe('A test agent for unit tests');
  });

  it('should accept toolRegistry property', () => {
    const registry = new ToolRegistry();
    const config: AgentConfig = {
      name: 'TestAgent',
      toolRegistry: registry,
    };
    expect(config.toolRegistry).toBe(registry);
  });

  it('should accept ragService property', async () => {
    const { RAGService } = await import('../rag');
    const ragService = new RAGService();
    const config: AgentConfig = {
      name: 'TestAgent',
      ragService: ragService,
    };
    expect(config.ragService).toBe(ragService);
  });

  it('should accept confidenceThreshold property', () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      confidenceThreshold: 0.7,
    };
    expect(config.confidenceThreshold).toBe(0.7);
  });
});

// BaseAgent Constructor Tests
describe('BaseAgent', () => {
  it('should accept AgentConfig in constructor', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent',
    };
    const agent = new BaseAgent(config);
    expect(agent).toBeDefined();
  });

  it('should store name from config', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent',
    };
    const agent = new BaseAgent(config);
    expect(agent.name).toBe('TestAgent');
  });

  it('should store description from config', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent',
      description: 'A test agent',
    };
    const agent = new BaseAgent(config);
    expect(agent.description).toBe('A test agent');
  });

  it('should default confidenceThreshold to 0.5', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent',
    };
    const agent = new BaseAgent(config);
    expect(agent.confidenceThreshold).toBe(0.5);
  });
});

// Phase 2: Intent Recognition Tests
describe('BaseAgent.parseIntent', () => {
  it('should identify URL in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('Check https://example.com for information');

    expect(result.type).toBe('url');
    expect(result.urls).toContain('https://example.com');
    expect(result.query).toBe('Check https://example.com for information');
  });

  it('should identify question in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('What is the pricing for the premium plan?');

    expect(result.type).toBe('question');
    expect(result.query).toBe('What is the pricing for the premium plan?');
  });

  it('should identify command in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('Clear the knowledge base');

    expect(result.type).toBe('command');
    expect(result.query).toBe('Clear the knowledge base');
    expect(result.keywords).toContain('clear');
  });
});

// Phase 3: Decision Logic Tests - shouldFetchNewData
describe('BaseAgent.shouldFetchNewData', () => {
  it('should return true for URL intents', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const intent = {
      type: 'url' as const,
      query: 'Check https://example.com',
      urls: ['https://example.com'],
    };

    const result = await agent.shouldFetchNewData(intent);
    expect(result).toBe(true);
  });

  it('should return false for question intents', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const intent = {
      type: 'question' as const,
      query: 'What is the pricing?',
    };

    const result = await agent.shouldFetchNewData(intent);
    expect(result).toBe(false);
  });

  it('should check cache expiry for URLs', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    // Mock cache with expired entry
    const expiredUrl = 'https://cached.com';
    agent.setCacheEntry(expiredUrl, Date.now() - 6 * 60 * 1000); // 6 minutes ago

    const intent = {
      type: 'url' as const,
      query: 'Check https://cached.com',
      urls: [expiredUrl],
    };

    const result = await agent.shouldFetchNewData(intent);
    expect(result).toBe(true); // Should fetch because cache expired
  });
});

// Phase 3: Decision Logic Tests - selectTool
describe('BaseAgent.selectTool', () => {
  it('should return ScrapeTool for single page URL', async () => {
    const { BaseAgent } = await import('./base-agent');
    const registry = new ToolRegistry();
    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    const intent = {
      type: 'url' as const,
      query: 'Check https://example.com/page',
      urls: ['https://example.com/page'],
    };

    const tool = agent.selectTool(intent);
    expect(tool).toBe('ScrapeTool');
  });

  it('should return CrawlTool for site URL', async () => {
    const { BaseAgent } = await import('./base-agent');
    const registry = new ToolRegistry();
    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    const intent = {
      type: 'url' as const,
      query: 'Crawl https://example.com',
      urls: ['https://example.com'],
    };

    const tool = agent.selectTool(intent);
    expect(tool).toBe('CrawlTool');
  });

  it('should return null for non-URL intent', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const intent = {
      type: 'question' as const,
      query: 'What is the pricing?',
    };

    const tool = agent.selectTool(intent);
    expect(tool).toBeNull();
  });
});

// Phase 4: Tool Execution Tests
describe('BaseAgent.executeTool', () => {
  it('should call tool.execute with input', async () => {
    const { BaseAgent } = await import('./base-agent');
    const mockTool = {
      name: 'MockTool',
      description: 'Test tool',
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { content: 'test content' },
      }),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    const result = await agent.executeTool('MockTool', { url: 'https://example.com' });

    expect(mockTool.execute).toHaveBeenCalledWith({ url: 'https://example.com' });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('test content');
  });

  it('should handle tool success', async () => {
    const { BaseAgent } = await import('./base-agent');
    const mockTool = {
      name: 'MockTool',
      description: 'Test tool',
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { content: 'success data' },
      }),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    const result = await agent.executeTool('MockTool', {});

    expect(result.success).toBe(true);
    expect(result.data.content).toBe('success data');
  });

  it('should handle tool failure', async () => {
    const { BaseAgent } = await import('./base-agent');
    const mockTool = {
      name: 'MockTool',
      description: 'Test tool',
      execute: vi.fn().mockResolvedValue({
        success: false,
        error: 'Tool execution failed',
      }),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    const result = await agent.executeTool('MockTool', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Tool execution failed');
  });

  it('should add timeout wrapper', async () => {
    const { BaseAgent } = await import('./base-agent');
    const mockTool = {
      name: 'MockTool',
      description: 'Test tool',
      execute: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 2000))
        ),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
    });

    // Execute with 100ms timeout (should timeout)
    const result = await agent.executeTool('MockTool', {}, { timeout: 100 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});

// Phase 5: Data Processing Tests
describe('BaseAgent.processToolResult', () => {
  it('should extract content from tool result', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const toolResult = {
      success: true,
      data: {
        content: 'This is the extracted content from the webpage',
        url: 'https://example.com',
        title: 'Example Page',
      },
    };

    const processed = await agent.processToolResult(toolResult);

    expect(processed.content).toBe('This is the extracted content from the webpage');
    expect(processed.metadata.url).toBe('https://example.com');
    expect(processed.metadata.title).toBe('Example Page');
  });

  it('should chunk large content', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const largeContent = 'A'.repeat(4000); // 4000 chars
    const toolResult = {
      success: true,
      data: {
        content: largeContent,
        url: 'https://example.com',
      },
    };

    const processed = await agent.processToolResult(toolResult);

    expect(processed.chunks).toBeDefined();
    expect(processed.chunks.length).toBeGreaterThan(1);
    expect(processed.chunks[0].length).toBeLessThanOrEqual(3000);
  });

  it('should preserve metadata', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const toolResult = {
      success: true,
      data: {
        content: 'Content',
        url: 'https://example.com',
        title: 'Test Page',
        scrapedAt: '2025-01-01',
        customField: 'custom value',
      },
    };

    const processed = await agent.processToolResult(toolResult);

    expect(processed.metadata.url).toBe('https://example.com');
    expect(processed.metadata.title).toBe('Test Page');
    expect(processed.metadata.scrapedAt).toBe('2025-01-01');
    expect(processed.metadata.customField).toBe('custom value');
  });
});

// Phase 6: Knowledge Operations Tests
describe('BaseAgent.ingestToRAG', () => {
  it('should call addDocument on RAG service', async () => {
    const { BaseAgent } = await import('./base-agent');
    const { RAGService } = await import('../rag');

    const mockAddDocument = vi.fn();
    const mockRAGService = {
      addDocument: mockAddDocument,
      query: vi.fn(),
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      ragService: mockRAGService as any,
    });

    const processed = {
      content: 'Test content',
      metadata: { url: 'https://example.com' },
    };

    await agent.ingestToRAG(processed);

    expect(mockAddDocument).toHaveBeenCalledWith({
      content: 'Test content',
      metadata: { url: 'https://example.com' },
    });
  });

  it('should handle chunks when ingesting', async () => {
    const { BaseAgent } = await import('./base-agent');

    const mockAddDocument = vi.fn();
    const mockRAGService = {
      addDocument: mockAddDocument,
      query: vi.fn(),
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      ragService: mockRAGService as any,
    });

    const processed = {
      content: 'Full content',
      chunks: ['Chunk 1', 'Chunk 2', 'Chunk 3'],
      metadata: { url: 'https://example.com' },
    };

    await agent.ingestToRAG(processed);

    expect(mockAddDocument).toHaveBeenCalledTimes(3);
    expect(mockAddDocument).toHaveBeenCalledWith({
      content: 'Chunk 1',
      metadata: { url: 'https://example.com', chunkIndex: 0, totalChunks: 3 },
    });
  });
});

describe('BaseAgent.searchKnowledge', () => {
  it('should query RAG service', async () => {
    const { BaseAgent } = await import('./base-agent');

    const mockQuery = vi.fn().mockResolvedValue({
      answer: 'Test answer',
      confidence: 0.85,
      sources: ['source1'],
      chunks: [],
    });

    const mockRAGService = {
      addDocument: vi.fn(),
      query: mockQuery,
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      ragService: mockRAGService as any,
    });

    const result = await agent.searchKnowledge('Test question');

    expect(mockQuery).toHaveBeenCalledWith('Test question');
    expect(result.answer).toBe('Test answer');
    expect(result.confidence).toBe(0.85);
  });
});

// Phase 7: Orchestration Tests
describe('BaseAgent.execute', () => {
  it('should orchestrate full pipeline for URL intent', async () => {
    const { BaseAgent } = await import('./base-agent');

    // Mock tool
    const mockTool = {
      name: 'ScrapeTool',
      description: 'Scrape tool',
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { content: 'Scraped content', url: 'https://example.com/page' },
      }),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    // Mock RAG service
    const mockAddDocument = vi.fn();
    const mockQuery = vi.fn().mockResolvedValue({
      answer: 'Based on the content...',
      confidence: 0.9,
      sources: ['https://example.com/page'],
      chunks: [],
    });

    const mockRAGService = {
      addDocument: mockAddDocument,
      query: mockQuery,
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
      ragService: mockRAGService as any,
    });

    const result = await agent.execute('Check https://example.com/page and tell me about it');

    expect(mockTool.execute).toHaveBeenCalled();
    expect(mockAddDocument).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalled();
    expect(result.answer).toContain('Based on the content');
    expect(result.confidence).toBe(0.9);
  });

  it('should handle fetch-and-respond flow', async () => {
    const { BaseAgent } = await import('./base-agent');

    // Mock tool for fetching
    const mockTool = {
      name: 'ScrapeTool',
      description: 'Scrape tool',
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: {
          content: 'New article about AI trends in 2025',
          url: 'https://techblog.com/ai-trends',
          title: 'AI Trends 2025',
        },
      }),
    };

    const registry = new ToolRegistry();
    registry.register(mockTool as any);

    // Mock RAG service
    const mockAddDocument = vi.fn();
    const mockQuery = vi.fn().mockResolvedValue({
      answer: 'According to the article, AI will focus on...',
      confidence: 0.95,
      sources: ['https://techblog.com/ai-trends'],
      chunks: [],
    });

    const mockRAGService = {
      addDocument: mockAddDocument,
      query: mockQuery,
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
      ragService: mockRAGService as any,
    });

    // First time asking about this URL - should fetch
    const result = await agent.execute('What does https://techblog.com/ai-trends say about AI?');

    // Verify full flow executed
    expect(mockTool.execute).toHaveBeenCalledWith({ url: 'https://techblog.com/ai-trends' });
    expect(mockAddDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'New article about AI trends in 2025',
      })
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'What does https://techblog.com/ai-trends say about AI?'
    );
    expect(result.answer).toContain('According to the article');
    expect(result.confidence).toBe(0.95);
  });

  it('should handle query-only flow without fetching', async () => {
    const { BaseAgent } = await import('./base-agent');

    // No tool needed for query-only
    const registry = new ToolRegistry();

    // Mock RAG service that already has knowledge
    const mockQuery = vi.fn().mockResolvedValue({
      answer: 'Based on my knowledge, the answer is...',
      confidence: 0.88,
      sources: ['internal://doc1', 'internal://doc2'],
      chunks: [],
    });

    const mockRAGService = {
      addDocument: vi.fn(),
      query: mockQuery,
      getDocumentCount: vi.fn(),
    };

    const agent = new BaseAgent({
      name: 'TestAgent',
      toolRegistry: registry,
      ragService: mockRAGService as any,
    });

    // Ask a general question without URLs
    const result = await agent.execute('What are the benefits of using RAG systems?');

    // Should NOT fetch anything, just query knowledge
    expect(mockRAGService.addDocument).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith('What are the benefits of using RAG systems?');
    expect(result.answer).toContain('Based on my knowledge');
    expect(result.confidence).toBe(0.88);
    expect(result.sources).toHaveLength(2);
  });
});
