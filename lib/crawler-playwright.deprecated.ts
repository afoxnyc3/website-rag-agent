import { PlaywrightScraper } from './scraper-playwright';
import { WebCrawler, CrawlOptions, CrawlResult } from './crawler';

export class PlaywrightCrawler extends WebCrawler {
  private scraper: PlaywrightScraper;
  private depthMap: Map<string, number>;

  constructor() {
    super();
    this.scraper = new PlaywrightScraper();
    this.depthMap = new Map();
  }

  async initialize(): Promise<void> {
    await this.scraper.initialize();
    this.setScraper(this.scraper);
  }

  async close(): Promise<void> {
    await this.scraper.close();
  }

  async crawlWithDepthTracking(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const startTime = Date.now();
    const result: CrawlResult = {
      startUrl,
      pagesVisited: 0,
      pages: [],
      errors: [],
      crawlTime: 0,
    };

    try {
      // Initialize browser
      await this.initialize();

      // Clear state
      this.depthMap.clear();
      this.depthMap.set(startUrl, 0);

      // Check robots.txt if enabled
      if (options.respectRobotsTxt) {
        try {
          const robotsUrl = new URL(startUrl);
          robotsUrl.pathname = '/robots.txt';

          const response = await fetch(robotsUrl.toString());
          if (response.ok) {
            const robotsTxt = await response.text();
            const rules = this.parseRobotsTxt(robotsTxt);

            if (!this.isAllowedByRobots(startUrl, rules)) {
              result.errors.push(`URL blocked by robots.txt: ${startUrl}`);
              return result;
            }

            // Apply crawl delay from robots.txt
            if (rules.crawlDelay && !options.crawlDelay) {
              options.crawlDelay = rules.crawlDelay * 1000; // Convert to ms
            }
          }
        } catch (error) {
          // Ignore robots.txt fetch errors
        }
      }

      // Check sitemap if enabled
      if (options.followSitemap) {
        try {
          const sitemapUrl = new URL(startUrl);
          sitemapUrl.pathname = '/sitemap.xml';

          const response = await fetch(sitemapUrl.toString());
          if (response.ok) {
            const sitemapXml = await response.text();
            const sitemapUrls = this.parseSitemap(sitemapXml);

            // Add sitemap URLs to queue with depth 1
            sitemapUrls.forEach((url) => {
              this.addToQueue(url);
              this.depthMap.set(url, 1);
            });
          }
        } catch (error) {
          // Ignore sitemap fetch errors
        }
      }

      // Add start URL to queue
      this.addToQueue(startUrl);

      // Process URLs
      while (this.getQueueSize() > 0) {
        const currentUrl = this.getNextUrl();
        if (!currentUrl) break;

        const currentDepth = this.depthMap.get(currentUrl) || 0;

        // Check if we should continue crawling
        if (!this.shouldCrawl(currentUrl, currentDepth, options)) {
          continue;
        }

        // Check if already visited
        if (this.hasVisited(currentUrl)) {
          continue;
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
          const scraped = await this.scraper.scrape(currentUrl);

          if (scraped.error) {
            result.errors.push(`Error scraping ${currentUrl}: ${scraped.error}`);
            continue;
          }

          this.markAsVisited(currentUrl);
          this.incrementRequestCount();
          result.pagesVisited++;

          // Extract links for further crawling
          const links = this.extractLinks(scraped.content, currentUrl);

          // Filter links by same domain
          const domain = new URL(startUrl).hostname;
          const sameDomainLinks = this.filterByDomain(links, domain);

          result.pages.push({
            url: currentUrl,
            title: scraped.title,
            content: scraped.content,
            depth: currentDepth,
            links: sameDomainLinks,
          });

          // Add discovered links to queue (if within depth limit)
          if (currentDepth < (options.maxDepth || 1)) {
            sameDomainLinks.forEach((link) => {
              if (!this.hasVisited(link) && !this.depthMap.has(link)) {
                this.addToQueue(link);
                this.depthMap.set(link, currentDepth + 1);
              }
            });
          }

          // Check if we've reached max pages
          if (options.maxPages && result.pagesVisited >= options.maxPages) {
            break;
          }
        } catch (error) {
          result.errors.push(
            `Error crawling ${currentUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Crawler initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      await this.close();
      result.crawlTime = Date.now() - startTime;
    }

    return result;
  }

  // Override the base crawl method to use depth tracking
  async crawl(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    return this.crawlWithDepthTracking(startUrl, options);
  }
}
