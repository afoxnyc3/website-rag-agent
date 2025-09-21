import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCrawler, CrawlOptions, CrawlResult } from './crawler';

describe('WebCrawler', () => {
  let crawler: WebCrawler;

  beforeEach(() => {
    crawler = new WebCrawler();
  });

  describe('URL Discovery', () => {
    it('should extract links from HTML content', () => {
      const html = `
        <a href="https://example.com/page1">Page 1</a>
        <a href="/page2">Page 2</a>
        <a href="mailto:test@example.com">Email</a>
        <a href="#section">Anchor</a>
      `;
      const baseUrl = 'https://example.com';
      const links = crawler.extractLinks(html, baseUrl);

      expect(links).toContain('https://example.com/page1');
      expect(links).toContain('https://example.com/page2');
      expect(links).not.toContain('mailto:test@example.com');
      expect(links).not.toContain('#section');
    });

    it('should normalize URLs correctly', () => {
      const baseUrl = 'https://example.com/subdir/page.html';

      expect(crawler.normalizeUrl('/about', baseUrl)).toBe('https://example.com/about');
      expect(crawler.normalizeUrl('./contact', baseUrl)).toBe('https://example.com/subdir/contact');
      expect(crawler.normalizeUrl('https://other.com', baseUrl)).toBe('https://other.com');
    });

    it('should filter URLs by domain', () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://other.com/page',
        'https://subdomain.example.com/page',
      ];

      const filtered = crawler.filterByDomain(urls, 'example.com');
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain('https://example.com/page1');
      expect(filtered).toContain('https://example.com/page2');
    });
  });

  describe('Robots.txt Compliance', () => {
    it('should parse robots.txt correctly', () => {
      const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
Crawl-delay: 1
      `;

      const rules = crawler.parseRobotsTxt(robotsTxt);

      expect(rules.disallow).toContain('/admin/');
      expect(rules.disallow).toContain('/private/');
      expect(rules.allow).toContain('/public/');
      expect(rules.crawlDelay).toBe(1);
    });

    it('should check if URL is allowed by robots.txt', () => {
      const rules = {
        disallow: ['/admin/', '/private/'],
        allow: ['/public/'],
        crawlDelay: 1,
      };

      expect(crawler.isAllowedByRobots('https://example.com/page', rules)).toBe(true);
      expect(crawler.isAllowedByRobots('https://example.com/admin/secret', rules)).toBe(false);
      expect(crawler.isAllowedByRobots('https://example.com/private/data', rules)).toBe(false);
      expect(crawler.isAllowedByRobots('https://example.com/public/info', rules)).toBe(true);
    });
  });

  describe('Sitemap Parsing', () => {
    it('should parse XML sitemap', () => {
      const sitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/page2</loc>
    <lastmod>2024-01-02</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
      `;

      const urls = crawler.parseSitemap(sitemapXml);

      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com/page1');
      expect(urls).toContain('https://example.com/page2');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce minimum delay between requests', async () => {
      const startTime = Date.now();

      await crawler.enforceRateLimit(100); // 100ms delay
      await crawler.enforceRateLimit(100);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should track request count', () => {
      expect(crawler.getRequestCount()).toBe(0);

      crawler.incrementRequestCount();
      crawler.incrementRequestCount();

      expect(crawler.getRequestCount()).toBe(2);
    });
  });

  describe('Crawl Options', () => {
    it('should respect maxDepth option', () => {
      const options: CrawlOptions = {
        maxDepth: 2,
        maxPages: 100,
      };

      expect(crawler.shouldCrawl('https://example.com', 0, options)).toBe(true);
      expect(crawler.shouldCrawl('https://example.com', 2, options)).toBe(true);
      expect(crawler.shouldCrawl('https://example.com', 3, options)).toBe(false);
    });

    it('should respect maxPages option', () => {
      const options: CrawlOptions = {
        maxDepth: 10,
        maxPages: 2,
      };

      // Simulate crawling 2 pages
      crawler.incrementRequestCount();
      crawler.incrementRequestCount();

      expect(crawler.shouldCrawl('https://example.com', 1, options)).toBe(false);
    });

    it('should handle includePatterns option', () => {
      const options: CrawlOptions = {
        includePatterns: [/\/blog\//, /\/docs\//],
      };

      expect(crawler.matchesPattern('https://example.com/blog/post', options.includePatterns)).toBe(
        true
      );
      expect(crawler.matchesPattern('https://example.com/docs/api', options.includePatterns)).toBe(
        true
      );
      expect(crawler.matchesPattern('https://example.com/about', options.includePatterns)).toBe(
        false
      );
    });

    it('should handle excludePatterns option', () => {
      const options: CrawlOptions = {
        excludePatterns: [/\.pdf$/, /\/archive\//],
      };

      expect(crawler.shouldExclude('https://example.com/doc.pdf', options.excludePatterns)).toBe(
        true
      );
      expect(
        crawler.shouldExclude('https://example.com/archive/old', options.excludePatterns)
      ).toBe(true);
      expect(crawler.shouldExclude('https://example.com/page', options.excludePatterns)).toBe(
        false
      );
    });
  });

  describe('Crawl Execution', () => {
    it('should return crawl results with metadata', async () => {
      // Mock the scraper
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          url: 'https://example.com',
          title: 'Example Site',
          content: 'Content with <a href="/page2">link</a>',
          scrapedAt: new Date(),
        }),
      };

      crawler.setScraper(mockScraper);

      const result = await crawler.crawl('https://example.com', {
        maxDepth: 1,
        maxPages: 1,
      });

      expect(result.startUrl).toBe('https://example.com');
      expect(result.pagesVisited).toBe(1);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].url).toBe('https://example.com');
      expect(result.pages[0].title).toBe('Example Site');
    });

    it('should handle crawl errors gracefully', async () => {
      const mockScraper = {
        scrape: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      crawler.setScraper(mockScraper);

      const result = await crawler.crawl('https://example.com', {
        maxDepth: 1,
        maxPages: 1,
      });

      expect(result.pagesVisited).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Network error');
    });
  });

  describe('URL Queue Management', () => {
    it('should maintain a queue of URLs to visit', () => {
      crawler.addToQueue('https://example.com/page1');
      crawler.addToQueue('https://example.com/page2');

      expect(crawler.getQueueSize()).toBe(2);

      const next = crawler.getNextUrl();
      expect(next).toBe('https://example.com/page1');
      expect(crawler.getQueueSize()).toBe(1);
    });

    it('should track visited URLs to avoid duplicates', () => {
      crawler.markAsVisited('https://example.com/page1');

      expect(crawler.hasVisited('https://example.com/page1')).toBe(true);
      expect(crawler.hasVisited('https://example.com/page2')).toBe(false);
    });

    it('should not add already visited URLs to queue', () => {
      crawler.markAsVisited('https://example.com/page1');
      crawler.addToQueue('https://example.com/page1');
      crawler.addToQueue('https://example.com/page2');

      expect(crawler.getQueueSize()).toBe(1);
    });
  });
});
