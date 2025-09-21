import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the BaseAgent and its dependencies
vi.mock('@/lib/agent/base-agent', () => ({
  BaseAgent: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock('@/lib/tools/tool', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
  })),
}));

vi.mock('@/lib/tools/scrape-tool', () => ({
  ScrapeTool: vi.fn(),
}));

vi.mock('@/lib/tools/crawl-tool', () => ({
  CrawlTool: vi.fn(),
}));

vi.mock('@/lib/rag', () => ({
  RAGService: vi.fn().mockImplementation(() => ({
    addDocument: vi.fn(),
  })),
}));

describe('API Route - Mode Detection', () => {
  let mockAgent: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear the global agent singleton
    const globalForAgent = global as any;
    globalForAgent.agent = undefined;
    globalForAgent.isInitialized = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode determination logic', () => {
    it('should return mode="rag" when only RAG is used (no tools)', async () => {
      // Setup mock for RAG-only response
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockResolvedValue({
          answer: 'This is from the knowledge base',
          confidence: 0.85,
          sources: ['internal://agent-docs'],
          chunks: [],
          // Add execution metrics to track what was used
          metrics: {
            toolsUsed: false,
            ragUsed: true,
            urlsDetected: false,
          },
        }),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is the BaseAgent architecture?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Currently returns 'agent' but SHOULD return 'rag'
      // This test will fail initially, demonstrating the bug
      expect(data.mode).toBe('rag'); // This will fail with current implementation
      expect(data.confidence).toBe(0.85);
      expect(mockAgent.execute).toHaveBeenCalledWith('What is the BaseAgent architecture?');
    });

    it('should return mode="agent" when tools are used', async () => {
      // Setup mock for tool usage (URL scraping)
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockResolvedValue({
          answer: 'I scraped the website and found this information...',
          confidence: 0.92,
          sources: ['https://example.com/page'],
          chunks: [],
          metrics: {
            toolsUsed: true,
            ragUsed: true,
            urlsDetected: true,
          },
        }),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Scrape https://example.com/page',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mode).toBe('agent');
      expect(data.confidence).toBe(0.92);
      expect(mockAgent.execute).toHaveBeenCalledWith('Scrape https://example.com/page');
    });

    it('should return mode="direct" when neither tools nor RAG are used', async () => {
      // Setup mock for direct GPT response (hypothetical case)
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockResolvedValue({
          answer: 'Direct response without RAG or tools',
          confidence: 0.95,
          sources: [],
          chunks: [],
          metrics: {
            toolsUsed: false,
            ragUsed: false,
            urlsDetected: false,
          },
        }),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Simple direct question',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Currently returns 'agent' but SHOULD return 'direct'
      expect(data.mode).toBe('direct'); // This will fail with current implementation
      expect(data.confidence).toBe(0.95);
    });
  });

  describe('Edge cases', () => {
    it('should handle queries with URLs that use RAG after scraping', async () => {
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockResolvedValue({
          answer: 'Information from scraped content',
          confidence: 0.88,
          sources: ['https://scraped.com'],
          chunks: [],
          metrics: {
            toolsUsed: true, // Used scraping tool
            ragUsed: true, // Then used RAG
            urlsDetected: true,
          },
        }),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What does https://scraped.com say about testing?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mode).toBe('agent'); // Tools were used
      expect(data.sources).toContain('https://scraped.com');
    });

    it('should handle missing message parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });

    it('should handle agent execution errors', async () => {
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockRejectedValue(new Error('Agent execution failed')),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate response');
      expect(data.details).toBe('Agent execution failed');
    });
  });

  describe('Metrics tracking', () => {
    it('should include execution metrics in response when available', async () => {
      const { BaseAgent } = await import('@/lib/agent/base-agent');
      mockAgent = {
        execute: vi.fn().mockResolvedValue({
          answer: 'Response with metrics',
          confidence: 0.9,
          sources: [],
          chunks: [],
          metrics: {
            toolsUsed: false,
            ragUsed: true,
            urlsDetected: false,
            responseTime: 245,
            tokensUsed: 150,
          },
        }),
      };
      vi.mocked(BaseAgent).mockImplementation(() => mockAgent as any);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test with metrics',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // When we implement metrics, these should be included
      // expect(data.metrics).toBeDefined();
      // expect(data.metrics.responseTime).toBe(245);
      // expect(data.metrics.tokensUsed).toBe(150);
    });
  });
});
