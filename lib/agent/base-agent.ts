import { Tool, ToolRegistry, ToolResult } from '../tools/tool';
import { RAGService, RAGResponse } from '../rag';

// Agent Configuration Interface
export interface AgentConfig {
  name: string;
  description?: string;
  toolRegistry?: ToolRegistry;
  ragService?: RAGService;
  confidenceThreshold?: number;
}

// Intent Types for parsing user queries
export type IntentType = 'url' | 'question' | 'command' | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  query: string;
  urls?: string[];
  keywords?: string[];
}

// Tool Execution Options
export interface ToolExecutionOptions {
  timeout?: number;
}

// Processed content from tool results
export interface ProcessedContent {
  content: string;
  chunks?: string[];
  metadata: Record<string, any>;
}

// Base Agent Class
export class BaseAgent {
  public readonly name: string;
  public readonly description?: string;
  public readonly confidenceThreshold: number;
  protected toolRegistry?: ToolRegistry;
  protected ragService?: RAGService;

  constructor(private config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.5;
    this.toolRegistry = config.toolRegistry;
    this.ragService = config.ragService;
  }

  private urlCache: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  parseIntent(query: string): ParsedIntent {
    const result: ParsedIntent = {
      type: 'unknown',
      query,
    };

    // Check for URLs
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
    const urls = query.match(urlPattern);
    if (urls && urls.length > 0) {
      result.type = 'url';
      result.urls = urls;
      return result;
    }

    // Check for questions
    const questionPattern = /^(what|who|where|when|why|how|is|are|can|could|would|should|do|does)/i;
    if (questionPattern.test(query)) {
      result.type = 'question';
      return result;
    }

    // Check for commands
    const commandKeywords = ['add', 'remove', 'delete', 'clear', 'show', 'list', 'create', 'update'];
    const lowerQuery = query.toLowerCase();
    const foundKeywords = commandKeywords.filter(keyword => lowerQuery.includes(keyword));

    if (foundKeywords.length > 0) {
      result.type = 'command';
      result.keywords = foundKeywords;
      return result;
    }

    return result;
  }

  async shouldFetchNewData(intent: ParsedIntent): Promise<boolean> {
    // Only fetch for URL intents
    if (intent.type !== 'url') {
      return false;
    }

    // Check cache for each URL
    if (intent.urls) {
      for (const url of intent.urls) {
        const cachedTime = this.urlCache.get(url);

        // Not cached or expired
        if (!cachedTime || Date.now() - cachedTime > this.CACHE_TTL) {
          return true;
        }
      }
    }

    // All URLs are cached and valid
    return false;
  }

  // Helper method for testing
  setCacheEntry(url: string, timestamp: number): void {
    this.urlCache.set(url, timestamp);
  }

  selectTool(intent: ParsedIntent): string | null {
    // Only select tools for URL intents
    if (intent.type !== 'url' || !intent.urls) {
      return null;
    }

    // Analyze the query and URLs to determine tool
    const query = intent.query.toLowerCase();
    const firstUrl = intent.urls[0];

    // Explicit crawl keywords or base domain URLs
    if (query.includes('crawl') || query.includes('entire') || query.includes('all pages')) {
      return 'CrawlTool';
    }

    // Check if URL looks like a specific page (has path beyond domain)
    try {
      const url = new URL(firstUrl.startsWith('http') ? firstUrl : `https://${firstUrl}`);
      // If URL has a specific path (not just domain), use ScrapeTool
      if (url.pathname && url.pathname !== '/') {
        return 'ScrapeTool';
      }
    } catch {
      // If URL parsing fails, default to ScrapeTool
      return 'ScrapeTool';
    }

    // Default to CrawlTool for domain-level URLs
    return 'CrawlTool';
  }

  async executeTool(
    toolName: string,
    input: any,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    // Check if registry exists
    if (!this.toolRegistry) {
      return {
        success: false,
        error: 'No tool registry configured'
      };
    }

    // Get tool from registry
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`
      };
    }

    // Execute with timeout if specified
    if (options.timeout) {
      return this.executeWithTimeout(tool, input, options.timeout);
    }

    // Execute normally
    try {
      const result = await tool.execute(input);

      // Update cache if this was a URL fetch
      if (result.success && input.url) {
        this.urlCache.set(input.url, Date.now());
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  private async executeWithTimeout(
    tool: Tool,
    input: any,
    timeout: number
  ): Promise<ToolResult> {
    return Promise.race([
      tool.execute(input),
      new Promise<ToolResult>((resolve) =>
        setTimeout(() => resolve({
          success: false,
          error: `Tool execution timeout after ${timeout}ms`
        }), timeout)
      )
    ]);
  }

  async processToolResult(toolResult: ToolResult): Promise<ProcessedContent> {
    // Handle failed results
    if (!toolResult.success || !toolResult.data) {
      return {
        content: '',
        metadata: { error: toolResult.error || 'No data returned' }
      };
    }

    const data = toolResult.data;
    const content = data.content || '';

    // Extract all metadata from the result
    const metadata: Record<string, any> = {};
    for (const key in data) {
      if (key !== 'content') {
        metadata[key] = data[key];
      }
    }

    // Chunk large content (> 3000 chars)
    const CHUNK_SIZE = 3000;
    let chunks: string[] | undefined;

    if (content.length > CHUNK_SIZE) {
      chunks = [];
      for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        chunks.push(content.slice(i, i + CHUNK_SIZE));
      }
    }

    return {
      content,
      chunks,
      metadata
    };
  }

  async ingestToRAG(processed: ProcessedContent): Promise<void> {
    if (!this.ragService) {
      throw new Error('No RAG service configured');
    }

    // If content is chunked, ingest each chunk separately
    if (processed.chunks && processed.chunks.length > 0) {
      for (let i = 0; i < processed.chunks.length; i++) {
        await this.ragService.addDocument({
          content: processed.chunks[i],
          metadata: {
            ...processed.metadata,
            chunkIndex: i,
            totalChunks: processed.chunks.length
          }
        });
      }
    } else {
      // Ingest as single document
      await this.ragService.addDocument({
        content: processed.content,
        metadata: processed.metadata
      });
    }
  }

  async searchKnowledge(query: string): Promise<RAGResponse> {
    if (!this.ragService) {
      return {
        answer: "I don't have access to a knowledge base",
        confidence: 0,
        sources: [],
        chunks: []
      };
    }

    return this.ragService.query(query);
  }
}