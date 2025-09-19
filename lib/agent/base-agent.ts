import { ToolRegistry } from '../tools/tool';
import { RAGService } from '../rag';

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
}