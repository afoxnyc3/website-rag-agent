import { Tool, ToolResult, ToolSchema, ToolRegistry } from './tool';
import { ScrapeTool } from './scrape-tool';

interface CrawlInput {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt?: boolean;
  followSitemap?: boolean;
  crawlDelay?: number;
}

interface CrawlPage {
  url: string;
  title: string;
  content: string;
  depth: number;
  links: string[];
}

interface CrawlResult {
  startUrl: string;
  pagesVisited: number;
  pages: CrawlPage[];
  errors: string[];
  crawlTime: number;
}

export class CrawlTool extends Tool {
  name = 'crawl';
  description = 'Crawl websites with depth control, robots.txt compliance, and rate limiting';
  capabilities = ['web-crawling', 'site-navigation', 'link-discovery'];
  confidence = 0.9;

  private visitedUrls: Set<string>;
  private urlQueue: Array<{ url: string; depth: number }>;
  private scrapeTool: ScrapeTool;
  private lastRequestTime: number;

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        url: { type: 'string', required: true },
        maxDepth: { type: 'number', required: false },
        maxPages: { type: 'number', required: false },
        includePatterns: { type: 'array', required: false },
        excludePatterns: { type: 'array', required: false },
        respectRobotsTxt: { type: 'boolean', required: false },
        followSitemap: { type: 'boolean', required: false },
        crawlDelay: { type: 'number', required: false },
      },
    },
    output: {
      type: 'object',
      properties: {
        startUrl: { type: 'string' },
        pagesVisited: { type: 'number' },
        pages: { type: 'array' },
        errors: { type: 'array' },
        crawlTime: { type: 'number' },
      },
    },
  };

  constructor(registry?: ToolRegistry) {
    super();
    this.visitedUrls = new Set();
    this.urlQueue = [];
    this.scrapeTool = new ScrapeTool();
    this.lastRequestTime = 0;

    // Register scrape tool if registry provided
    if (registry && !registry.has('scrape')) {
      registry.register(this.scrapeTool);
    }
  }

  async execute(input: CrawlInput): Promise<ToolResult> {
    return this.executeWithProgress(input);
  }

  async executeWithProgress(
    input: CrawlInput,
    progressCallback?: (update: any) => void
  ): Promise<ToolResult> {
    const {
      url,
      maxDepth = 2, // Increased default depth
      maxPages = 50, // Increased default page limit
      includePatterns = [],
      excludePatterns = [],
      respectRobotsTxt = true,
      followSitemap = false,
      crawlDelay = 1000,
    } = input;

    // Validate URL
    if (!this.isValidUrl(url)) {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    const startTime = Date.now();
    const result: CrawlResult = {
      startUrl: url,
      pagesVisited: 0,
      pages: [],
      errors: [],
      crawlTime: 0,
    };

    // Reset state
    this.visitedUrls.clear();
    this.urlQueue = [];

    try {
      // Check robots.txt if enabled
      let robotsRules = null;
      if (respectRobotsTxt) {
        robotsRules = await this.fetchRobotsTxt(url);
        if (robotsRules && !this.isAllowedByRobots(url, robotsRules)) {
          return {
            success: false,
            error: 'URL disallowed by robots.txt',
            metadata: { robotsChecked: true },
          };
        }
      }

      // Check sitemap if enabled
      if (followSitemap) {
        const sitemapUrls = await this.fetchSitemap(url);
        sitemapUrls.forEach((sitemapUrl) => {
          this.addToQueue(sitemapUrl, 1);
        });
      }

      // Add start URL to queue
      this.addToQueue(url, 0);

      // Process queue
      while (this.urlQueue.length > 0 && result.pagesVisited < maxPages) {
        const current = this.urlQueue.shift();
        if (!current) break;

        const { url: currentUrl, depth } = current;

        // Skip if already visited
        if (this.visitedUrls.has(currentUrl)) continue;

        // Skip if exceeds max depth
        if (depth > maxDepth) continue;

        // Apply include/exclude patterns
        if (!this.matchesPatterns(currentUrl, includePatterns, excludePatterns)) continue;

        // Enforce rate limiting
        if (crawlDelay > 0) {
          await this.enforceRateLimit(crawlDelay);
        }

        // Send progress update if callback provided
        if (progressCallback) {
          progressCallback({
            currentUrl,
            depth,
            pagesVisited: result.pagesVisited,
            totalQueued: this.urlQueue.length,
          });
        }

        // Scrape the page
        const scrapeResult = await this.scrapeTool.execute({ url: currentUrl });

        if (scrapeResult.success) {
          this.visitedUrls.add(currentUrl);
          result.pagesVisited++;

          const content = scrapeResult.data.content || '';
          const links = this.extractLinks(content, currentUrl);

          // Filter links by domain
          const domain = new URL(url).hostname;
          const sameDomainLinks = links.filter((link) => {
            try {
              return new URL(link).hostname === domain;
            } catch {
              return false;
            }
          });

          result.pages.push({
            url: currentUrl,
            title: scrapeResult.data.title || '',
            content,
            depth,
            links: sameDomainLinks,
          });

          // Add discovered links to queue
          if (depth < maxDepth) {
            sameDomainLinks.forEach((link) => {
              if (!this.visitedUrls.has(link)) {
                this.addToQueue(link, depth + 1);
              }
            });
          }
        } else {
          result.errors.push(`Failed to scrape ${currentUrl}: ${scrapeResult.error}`);
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.crawlTime = Date.now() - startTime;

    return {
      success: true,
      data: result,
      metadata: {
        toolName: this.name,
        robotsChecked: respectRobotsTxt,
        sitemapChecked: followSitemap,
        executedAt: new Date(),
      },
    };
  }

  // Helper methods
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private addToQueue(url: string, depth: number): void {
    if (!this.visitedUrls.has(url) && !this.urlQueue.some((item) => item.url === url)) {
      this.urlQueue.push({ url, depth });
    }
  }

  private async enforceRateLimit(delayMs: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.lastRequestTime > 0 && timeSinceLastRequest < delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  private matchesPatterns(
    url: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): boolean {
    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (url.includes(pattern)) return false;
    }

    // If no include patterns, allow all (except excluded)
    if (includePatterns.length === 0) return true;

    // Check include patterns
    for (const pattern of includePatterns) {
      if (url.includes(pattern)) return true;
    }

    return false;
  }

  extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];

      // Skip non-HTTP links
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        continue;
      }

      const normalizedUrl = this.normalizeUrl(href, baseUrl);
      if (normalizedUrl) {
        links.push(normalizedUrl);
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  normalizeUrl(url: string, baseUrl: string): string {
    try {
      // Absolute URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      const base = new URL(baseUrl);

      // Root-relative URL
      if (url.startsWith('/')) {
        return `${base.protocol}//${base.host}${url}`;
      }

      // Relative URL
      const basePath = base.pathname.endsWith('/')
        ? base.pathname
        : base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);

      return `${base.protocol}//${base.host}${basePath}${url}`;
    } catch {
      return '';
    }
  }

  parseSitemap(xml: string): string[] {
    const urls: string[] = [];
    const urlRegex = /<loc>([^<]+)<\/loc>/gi;
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    return urls;
  }

  private async fetchRobotsTxt(url: string): Promise<any> {
    try {
      const robotsUrl = new URL(url);
      robotsUrl.pathname = '/robots.txt';

      const response = await fetch(robotsUrl.toString());
      if (response.ok) {
        const text = await response.text();
        return this.parseRobotsTxt(text);
      }
    } catch {
      // Ignore robots.txt fetch errors
    }
    return null;
  }

  private parseRobotsTxt(text: string): any {
    const rules = {
      disallow: [] as string[],
      allow: [] as string[],
      crawlDelay: 0,
    };

    const lines = text.split('\n');
    let isRelevant = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('User-agent:')) {
        const agent = trimmed.substring('User-agent:'.length).trim();
        isRelevant = agent === '*';
      } else if (isRelevant) {
        if (trimmed.startsWith('Disallow:')) {
          const path = trimmed.substring('Disallow:'.length).trim();
          if (path) rules.disallow.push(path);
        } else if (trimmed.startsWith('Allow:')) {
          const path = trimmed.substring('Allow:'.length).trim();
          if (path) rules.allow.push(path);
        } else if (trimmed.startsWith('Crawl-delay:')) {
          const delay = trimmed.substring('Crawl-delay:'.length).trim();
          rules.crawlDelay = parseInt(delay, 10) * 1000 || 0;
        }
      }
    }

    return rules;
  }

  private isAllowedByRobots(url: string, rules: any): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      for (const disallowed of rules.disallow) {
        if (path.startsWith(disallowed)) {
          // Check if there's an allow rule that overrides
          for (const allowed of rules.allow) {
            if (path.startsWith(allowed)) {
              return true;
            }
          }
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async fetchSitemap(url: string): Promise<string[]> {
    try {
      const sitemapUrl = new URL(url);
      sitemapUrl.pathname = '/sitemap.xml';

      const response = await fetch(sitemapUrl.toString());
      if (response.ok) {
        const xml = await response.text();
        return this.parseSitemap(xml);
      }
    } catch {
      // Ignore sitemap fetch errors
    }
    return [];
  }

  // Override formatOutput for better display
  formatOutput(result: ToolResult): string {
    if (!result.success) {
      return `❌ Crawl failed: ${result.error}`;
    }

    const { startUrl, pagesVisited, pages, errors, crawlTime } = result.data;
    const timeInSeconds = (crawlTime / 1000).toFixed(3);

    let output = `
✅ Crawl Complete
Start URL: ${startUrl}
Pages Crawled: ${pagesVisited}
Time: ${timeInSeconds}s
`;

    if (pages && pages.length > 0) {
      output += '\nPages:\n';
      pages.forEach((page: any) => {
        output += `  - ${page.url} (depth: ${page.depth}, ${page.links.length} links)\n`;
      });
    }

    if (errors && errors.length > 0) {
      output += `\nErrors (${errors.length}):\n`;
      errors.forEach((error: any) => {
        output += `  - ${error}\n`;
      });
    }

    return output.trim();
  }
}
