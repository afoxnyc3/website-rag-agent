import { Tool, ToolResult, ToolSchema, ToolOptions } from './tool';
import { PlaywrightScraper } from '@/lib/scraper-playwright';
import { FetchScraper } from '@/lib/scraper-fetch';
import { ScrapedContent } from '@/lib/scraper';

interface ScrapeInput {
  url: string;
  strategy?: 'fetch' | 'playwright' | 'auto';
  maxLength?: number;
  cache?: boolean;
}

interface ScrapeCache {
  [url: string]: {
    data: ScrapedContent;
    timestamp: number;
    ttl: number;
  };
}

export class ScrapeTool extends Tool {
  name = 'scrape';
  description = 'Scrape web pages using fetch or Playwright strategies';
  capabilities = ['web-scraping', 'html-extraction', 'content-processing'];
  confidence = 0.95;

  private cache: ScrapeCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        url: { type: 'string', required: true },
        strategy: { type: 'string', required: false },
        maxLength: { type: 'number', required: false },
        cache: { type: 'boolean', required: false },
      },
    },
    output: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        scrapedAt: { type: 'date' },
      },
    },
  };

  async execute(input: ScrapeInput, options?: ToolOptions): Promise<ToolResult> {
    const { url, strategy = 'auto', maxLength, cache = false } = input;

    // Validate URL
    if (!this.isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL format or protocol',
      };
    }

    // Check cache if enabled
    if (cache && this.isCached(url)) {
      const cached = this.getFromCache(url);
      if (cached) {
        return {
          success: true,
          data: this.processContent(cached, maxLength),
          metadata: {
            toolName: this.name,
            strategy: 'cache',
            fromCache: true,
            executedAt: new Date(),
          },
        };
      }
    }

    // Handle timeout if specified
    if (options?.timeout) {
      return this.executeWithTimeout(input, options.timeout);
    }

    let result: ScrapedContent | null = null;
    let usedStrategy: string = '';
    let fallback = false;

    try {
      if (strategy === 'fetch' || strategy === 'auto') {
        // Try fetch first (faster)
        result = await this.scrapeWithFetch(url);
        usedStrategy = 'fetch';

        // If fetch fails or gets minimal content in auto mode, try playwright
        if (strategy === 'auto' && (!result || result.error || result.content.length < 100)) {
          result = await this.scrapeWithPlaywright(url);
          usedStrategy = 'playwright';
          fallback = true;
        }
      } else if (strategy === 'playwright') {
        result = await this.scrapeWithPlaywright(url);
        usedStrategy = 'playwright';
      }

      if (!result || result.error) {
        return {
          success: false,
          error: result?.error || 'Failed to scrape website',
          metadata: {
            toolName: this.name,
            strategy: usedStrategy,
            attemptedStrategies: fallback ? ['fetch', 'playwright'] : [usedStrategy],
          },
        };
      }

      // Cache if enabled
      if (cache) {
        this.addToCache(url, result);
      }

      return {
        success: true,
        data: this.processContent(result, maxLength),
        metadata: {
          toolName: this.name,
          strategy: usedStrategy,
          fallback,
          contentLength: result.content.length,
          executedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape website',
        metadata: {
          toolName: this.name,
          strategy: usedStrategy || 'unknown',
        },
      };
    }
  }

  private async executeWithTimeout(input: ScrapeInput, timeout: number): Promise<ToolResult> {
    return Promise.race([
      this.execute(input),
      new Promise<ToolResult>((resolve) =>
        setTimeout(() => resolve({
          success: false,
          error: `Scraping timeout after ${timeout}ms`,
        }), timeout)
      ),
    ]);
  }

  private async scrapeWithFetch(url: string): Promise<ScrapedContent> {
    try {
      const scraper = new FetchScraper();
      return await scraper.scrape(url);
    } catch (error) {
      return {
        url,
        title: '',
        content: '',
        scrapedAt: new Date(),
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  private async scrapeWithPlaywright(url: string): Promise<ScrapedContent> {
    const scraper = new PlaywrightScraper();
    try {
      await scraper.initialize();
      const result = await scraper.scrape(url);
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private processContent(scraped: ScrapedContent, maxLength?: number): any {
    let content = scraped.content;

    // Clean and normalize content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with double newline
      .trim();

    // Apply max length if specified
    if (maxLength && content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    return {
      url: scraped.url,
      title: scraped.title,
      content,
      scrapedAt: scraped.scrapedAt,
    };
  }

  // Cache management
  private isCached(url: string): boolean {
    const cached = this.cache[url];
    if (!cached) return false;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      delete this.cache[url];
      return false;
    }

    return true;
  }

  private getFromCache(url: string): ScrapedContent | null {
    const cached = this.cache[url];
    return cached ? cached.data : null;
  }

  private addToCache(url: string, data: ScrapedContent): void {
    this.cache[url] = {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    };
  }

  // Override formatOutput for better display
  formatOutput(result: ToolResult): string {
    if (!result.success) {
      return `❌ Scraping failed: ${result.error}`;
    }

    const { url, title, content } = result.data;
    const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');

    return `
✅ Scraped Successfully
URL: ${url}
Title: ${title}
Content Preview: ${preview}
Strategy: ${result.metadata?.strategy}
${result.metadata?.fromCache ? '(From cache)' : ''}
    `.trim();
  }
}