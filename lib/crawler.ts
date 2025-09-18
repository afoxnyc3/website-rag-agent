export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
  respectRobotsTxt?: boolean;
  crawlDelay?: number;
  followSitemap?: boolean;
}

export interface CrawlResult {
  startUrl: string;
  pagesVisited: number;
  pages: Array<{
    url: string;
    title: string;
    content: string;
    depth: number;
    links: string[];
  }>;
  errors: string[];
  crawlTime: number;
}

export interface RobotsTxtRules {
  disallow: string[];
  allow: string[];
  crawlDelay: number;
}

export class WebCrawler {
  private visitedUrls: Set<string>;
  private urlQueue: string[];
  private requestCount: number;
  private lastRequestTime: number;
  private scraper: any;

  constructor() {
    this.visitedUrls = new Set();
    this.urlQueue = [];
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  // URL Discovery Methods
  extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];

      // Skip mailto, tel, and anchor links
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
      // Handle absolute URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      const base = new URL(baseUrl);

      // Handle root-relative URLs
      if (url.startsWith('/')) {
        return `${base.protocol}//${base.host}${url}`;
      }

      // Handle relative URLs
      if (url.startsWith('./')) {
        const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'));
        return `${base.protocol}//${base.host}${basePath}/${url.substring(2)}`;
      }

      // Handle other relative URLs
      const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/'));
      return `${base.protocol}//${base.host}${basePath}/${url}`;
    } catch {
      return '';
    }
  }

  filterByDomain(urls: string[], domain: string): string[] {
    return urls.filter(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === domain || urlObj.hostname === `www.${domain}`;
      } catch {
        return false;
      }
    });
  }

  // Robots.txt Methods
  parseRobotsTxt(robotsTxt: string): RobotsTxtRules {
    const rules: RobotsTxtRules = {
      disallow: [],
      allow: [],
      crawlDelay: 0,
    };

    const lines = robotsTxt.split('\n');
    let isRelevantUserAgent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('User-agent:')) {
        const agent = trimmedLine.substring('User-agent:'.length).trim();
        isRelevantUserAgent = agent === '*';
      } else if (isRelevantUserAgent) {
        if (trimmedLine.startsWith('Disallow:')) {
          const path = trimmedLine.substring('Disallow:'.length).trim();
          if (path) rules.disallow.push(path);
        } else if (trimmedLine.startsWith('Allow:')) {
          const path = trimmedLine.substring('Allow:'.length).trim();
          if (path) rules.allow.push(path);
        } else if (trimmedLine.startsWith('Crawl-delay:')) {
          const delay = trimmedLine.substring('Crawl-delay:'.length).trim();
          rules.crawlDelay = parseInt(delay, 10) || 0;
        }
      }
    }

    return rules;
  }

  isAllowedByRobots(url: string, rules: RobotsTxtRules): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Check disallow rules
      for (const disallowedPath of rules.disallow) {
        if (path.startsWith(disallowedPath)) {
          // Check if there's an allow rule that overrides
          for (const allowedPath of rules.allow) {
            if (path.startsWith(allowedPath)) {
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

  // Sitemap Methods
  parseSitemap(sitemapXml: string): string[] {
    const urls: string[] = [];
    const urlRegex = /<loc>([^<]+)<\/loc>/gi;
    let match;

    while ((match = urlRegex.exec(sitemapXml)) !== null) {
      urls.push(match[1]);
    }

    return urls;
  }

  // Rate Limiting Methods
  async enforceRateLimit(delayMs: number): Promise<void> {
    if (this.lastRequestTime === 0) {
      // First request, no need to wait
      this.lastRequestTime = Date.now();
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  incrementRequestCount(): void {
    this.requestCount++;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  // Crawl Control Methods
  shouldCrawl(url: string, depth: number, options: CrawlOptions): boolean {
    // Check max depth
    if (options.maxDepth !== undefined && depth > options.maxDepth) {
      return false;
    }

    // Check max pages
    if (options.maxPages !== undefined && this.requestCount >= options.maxPages) {
      return false;
    }

    return true;
  }

  matchesPattern(url: string, patterns?: RegExp[]): boolean {
    if (!patterns || patterns.length === 0) {
      return true;
    }

    return patterns.some(pattern => pattern.test(url));
  }

  shouldExclude(url: string, patterns?: RegExp[]): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }

    return patterns.some(pattern => pattern.test(url));
  }

  // Queue Management
  addToQueue(url: string): void {
    if (!this.hasVisited(url) && !this.urlQueue.includes(url)) {
      this.urlQueue.push(url);
    }
  }

  getNextUrl(): string | undefined {
    return this.urlQueue.shift();
  }

  getQueueSize(): number {
    return this.urlQueue.length;
  }

  markAsVisited(url: string): void {
    this.visitedUrls.add(url);
  }

  hasVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  // Scraper Integration
  setScraper(scraper: any): void {
    this.scraper = scraper;
  }

  // Main Crawl Method
  async crawl(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const startTime = Date.now();
    const result: CrawlResult = {
      startUrl,
      pagesVisited: 0,
      pages: [],
      errors: [],
      crawlTime: 0,
    };

    // Initialize crawl
    this.visitedUrls.clear();
    this.urlQueue = [];
    this.requestCount = 0;

    // Add start URL to queue
    this.addToQueue(startUrl);

    // Process URLs
    while (this.urlQueue.length > 0) {
      const currentUrl = this.getNextUrl();
      if (!currentUrl) break;

      // Check if we should continue crawling
      const currentDepth = 0; // Would need to track depth per URL in real implementation
      if (!this.shouldCrawl(currentUrl, currentDepth, options)) {
        break;
      }

      // Check exclude patterns
      if (this.shouldExclude(currentUrl, options.excludePatterns)) {
        continue;
      }

      // Check include patterns
      if (options.includePatterns && !this.matchesPattern(currentUrl, options.includePatterns)) {
        continue;
      }

      try {
        // Enforce rate limiting
        if (options.crawlDelay) {
          await this.enforceRateLimit(options.crawlDelay);
        }

        // Scrape the page
        if (this.scraper) {
          const scraped = await this.scraper.scrape(currentUrl);

          this.markAsVisited(currentUrl);
          this.incrementRequestCount();
          result.pagesVisited++;

          // Extract links for further crawling
          const links = this.extractLinks(scraped.content, currentUrl);

          result.pages.push({
            url: currentUrl,
            title: scraped.title,
            content: scraped.content,
            depth: currentDepth,
            links,
          });

          // Add discovered links to queue (if within depth limit)
          if (currentDepth < (options.maxDepth || 0)) {
            links.forEach(link => this.addToQueue(link));
          }
        }
      } catch (error) {
        result.errors.push(`Error crawling ${currentUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.crawlTime = Date.now() - startTime;
    return result;
  }
}