import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlTool } from './crawl-tool';
import { ToolRegistry } from './tool';

// Mock global fetch to prevent real HTTP requests
global.fetch = vi.fn();

// Mock ScrapeTool
vi.mock('./scrape-tool', () => ({
  ScrapeTool: vi.fn().mockImplementation(() => ({
    name: 'scrape',
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {
        url: 'https://example.com',
        title: 'Example Page',
        content: '<a href="/page1">Page 1</a><a href="/page2">Page 2</a>Content here',
      },
    }),
  })),
}));

describe('CrawlTool', () => {
  let tool: CrawlTool;
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    tool = new CrawlTool(registry);
    vi.clearAllMocks();

    // Reset fetch mock to avoid real network calls
    (global.fetch as any).mockReset();
  });

  describe('Tool Properties', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('crawl');
      expect(tool.description).toContain('Crawl websites');
      expect(tool.capabilities).toContain('web-crawling');
    });

    it('should have valid schema', () => {
      expect(tool.schema.input.properties).toHaveProperty('url');
      expect(tool.schema.input.properties).toHaveProperty('maxDepth');
      expect(tool.schema.input.properties).toHaveProperty('maxPages');
      expect(tool.schema.output.properties).toHaveProperty('pages');
    });
  });

  describe('Basic Crawling', () => {
    it('should crawl a single page when maxDepth is 0', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.pagesVisited).toBe(1);
      expect(result.data?.pages).toHaveLength(1);
    });

    it('should discover and crawl linked pages', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 1,
        maxPages: 3,
      });

      expect(result.success).toBe(true);
      expect(result.data?.pagesVisited).toBeGreaterThanOrEqual(1);
      expect(result.data?.pages[0].url).toBe('https://example.com');
      expect(result.data?.pages[0].links).toBeDefined();
    });
  });

  describe('Crawl Options', () => {
    it('should respect maxDepth limit', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 2,
        maxPages: 100,
      });

      expect(result.success).toBe(true);
      result.data?.pages.forEach((page: any) => {
        expect(page.depth).toBeLessThanOrEqual(2);
      });
    });

    it('should crawl to exactly maxDepth levels (not maxDepth-1)', async () => {
      // Create a mock that returns different links for each depth level
      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(({ url }: { url: string }) => {
        if (url === 'https://example.com') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://example.com',
              title: 'Root Page',
              content: '<a href="/level1">Level 1</a>',
            },
          });
        } else if (url === 'https://example.com/level1') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://example.com/level1',
              title: 'Level 1 Page',
              content: '<a href="/level2">Level 2</a>',
            },
          });
        } else if (url === 'https://example.com/level2') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://example.com/level2',
              title: 'Level 2 Page',
              content: '<a href="/level3">Level 3</a>',
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: { url, title: 'Other Page', content: 'No links' },
        });
      });

      // Replace the scrape tool execute method
      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 2,
        maxPages: 10,
      });

      expect(result.success).toBe(true);
      const pages = result.data?.pages || [];
      const urls = pages.map((p: any) => p.url);

      // Should have crawled:
      // Depth 0: https://example.com
      // Depth 1: https://example.com/level1
      // Depth 2: https://example.com/level2
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('https://example.com/level1');
      expect(urls).toContain('https://example.com/level2');

      // Should NOT have crawled level3 (depth would be 3)
      expect(urls).not.toContain('https://example.com/level3');

      // Verify depth values
      const rootPage = pages.find((p: any) => p.url === 'https://example.com');
      const level1Page = pages.find((p: any) => p.url === 'https://example.com/level1');
      const level2Page = pages.find((p: any) => p.url === 'https://example.com/level2');

      expect(rootPage?.depth).toBe(0);
      expect(level1Page?.depth).toBe(1);
      expect(level2Page?.depth).toBe(2);
    });

    it('should respect maxPages limit', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 10,
        maxPages: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data?.pagesVisited).toBeLessThanOrEqual(5);
      expect(result.data?.pages.length).toBeLessThanOrEqual(5);
    });

    it('should apply include patterns', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 1,
        includePatterns: ['/blog/', '/docs/'],
      });

      expect(result.success).toBe(true);
      // Pages should match include patterns if any were discovered
    });

    it('should apply exclude patterns', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 1,
        excludePatterns: ['/admin/', '.pdf'],
      });

      expect(result.success).toBe(true);
      result.data?.pages.forEach((page: any) => {
        expect(page.url).not.toMatch(/\/admin\//);
        expect(page.url).not.toMatch(/\.pdf$/);
      });
    });
  });

  describe('Robots.txt Compliance', () => {
    it('should respect robots.txt when enabled', async () => {
      // Mock robots.txt fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'User-agent: *\nAllow: /',
      });

      const result = await tool.execute({
        url: 'https://example.com',
        respectRobotsTxt: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.robotsChecked).toBe(true);
    });

    it('should skip robots.txt when disabled', async () => {
      // No fetch should be called for robots.txt
      const result = await tool.execute({
        url: 'https://example.com',
        respectRobotsTxt: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.robotsChecked).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply crawl delay', async () => {
      const startTime = Date.now();

      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 1,
        maxPages: 2,
        crawlDelay: 100, // 100ms delay
      });

      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should take at least 100ms if crawling multiple pages
      if (result.data?.pagesVisited > 1) {
        expect(elapsed).toBeGreaterThanOrEqual(100);
      }
    });
  });

  describe('URL Management', () => {
    it('should track visited URLs to avoid duplicates', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 2,
      });

      expect(result.success).toBe(true);

      const urls = result.data?.pages.map((p: any) => p.url);
      const uniqueUrls = new Set(urls);
      expect(urls.length).toBe(uniqueUrls.size); // No duplicates
    });

    it('should normalize URLs correctly', () => {
      expect(tool.normalizeUrl('page.html', 'https://example.com/dir/')).toBe(
        'https://example.com/dir/page.html'
      );

      expect(tool.normalizeUrl('/absolute/path', 'https://example.com/dir/')).toBe(
        'https://example.com/absolute/path'
      );

      expect(tool.normalizeUrl('https://other.com', 'https://example.com')).toBe(
        'https://other.com'
      );
    });

    it('should extract links from content', () => {
      const html = `
        <a href="/page1">Link 1</a>
        <a href="page2.html">Link 2</a>
        <a href="https://external.com">External</a>
        <a href="mailto:test@example.com">Email</a>
      `;

      const links = tool.extractLinks(html, 'https://example.com');

      expect(links).toContain('https://example.com/page1');
      expect(links).toContain('https://example.com/page2.html');
      expect(links).toContain('https://external.com');
      expect(links).not.toContain('mailto:test@example.com');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs', async () => {
      const result = await tool.execute({
        url: 'not-a-url',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should handle scraping errors gracefully', async () => {
      // Mock scraper to fail with a network error
      tool['scrapeTool'].execute = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network timeout: Failed to load page',
        metadata: {
          toolName: 'scrape',
        },
      });

      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 0, // Limit to single page for fast test
        maxPages: 1,
      });

      // Crawl should complete successfully even with scraping error
      expect(result.success).toBe(true);
      expect(result.data?.pagesVisited).toBe(0); // No pages successfully scraped
      expect(result.data?.errors).toBeDefined();
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.errors[0]).toContain('Network timeout');
    });
  });

  describe('Sitemap Support', () => {
    it('should follow sitemap when enabled', async () => {
      // Mock sitemap.xml fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/page1</loc></url>
        </urlset>`,
      });

      const result = await tool.execute({
        url: 'https://example.com',
        followSitemap: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.sitemapChecked).toBe(true);
    });

    it('should parse sitemap XML', () => {
      const sitemapXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/page1</loc></url>
          <url><loc>https://example.com/page2</loc></url>
        </urlset>
      `;

      const urls = tool.parseSitemap(sitemapXml);

      expect(urls).toContain('https://example.com/page1');
      expect(urls).toContain('https://example.com/page2');
    });
  });

  describe('Statistics and Metadata', () => {
    it('should provide crawl statistics', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data?.startUrl).toBe('https://example.com');
      expect(result.data?.pagesVisited).toBeGreaterThan(0);
      expect(result.data?.crawlTime).toBeGreaterThan(0);
      expect(result.metadata?.toolName).toBe('crawl');
    });

    it('should track depth for each page', async () => {
      const result = await tool.execute({
        url: 'https://example.com',
        maxDepth: 2,
      });

      expect(result.success).toBe(true);
      result.data?.pages.forEach((page: any) => {
        expect(page.depth).toBeDefined();
        expect(page.depth).toBeGreaterThanOrEqual(0);
        expect(page.depth).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Tool Integration', () => {
    it('should validate input schema', async () => {
      const isValid = await tool.validateInput({
        url: 'https://example.com',
        maxDepth: 2,
      });
      expect(isValid).toBe(true);

      const isInvalid = await tool.validateInput({ notUrl: 'test' });
      expect(isInvalid).toBe(false);
    });

    it('should format output correctly', () => {
      const result = {
        success: true,
        data: {
          startUrl: 'https://example.com',
          pagesVisited: 5,
          pages: [],
          crawlTime: 1234,
        },
      };

      const formatted = tool.formatOutput(result);
      expect(formatted).toContain('Pages Crawled: 5');
      expect(formatted).toContain('1.234s');
    });
  });

  describe('URL Preservation Diagnostics', () => {
    it('should preserve full URLs for each crawled page', async () => {
      // Mock ScrapeTool to return different URLs with paths
      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(({ url }: { url: string }) => {
        if (url === 'https://docs.example.com/guide/introduction') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://docs.example.com/guide/introduction',
              title: 'Introduction Guide',
              content:
                '<a href="/guide/getting-started">Getting Started</a><a href="/guide/advanced">Advanced</a>',
            },
          });
        } else if (url === 'https://docs.example.com/guide/getting-started') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://docs.example.com/guide/getting-started',
              title: 'Getting Started',
              content: '<a href="/guide/installation">Installation</a>',
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: { url, title: 'Page', content: 'Content' },
        });
      });

      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: 'https://docs.example.com/guide/introduction',
        maxDepth: 1,
        maxPages: 10,
      });

      expect(result.success).toBe(true);
      const pages = result.data?.pages || [];

      // Check that each page has its full URL preserved
      const page1 = pages.find((p: any) => p.title === 'Introduction Guide');
      expect(page1?.url).toBe('https://docs.example.com/guide/introduction');
      expect(page1?.url).toContain('/guide/introduction');

      const page2 = pages.find((p: any) => p.title === 'Getting Started');
      if (page2) {
        expect(page2.url).toBe('https://docs.example.com/guide/getting-started');
        expect(page2.url).toContain('/guide/getting-started');
      }
    });

    it('should preserve URLs with query parameters during crawl', async () => {
      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(({ url }: { url: string }) => {
        if (url === 'https://example.com/search?q=baseagent&page=1') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://example.com/search?q=baseagent&page=1',
              title: 'Search Results Page 1',
              content: '<a href="/search?q=baseagent&page=2">Next Page</a>',
            },
          });
        } else if (url === 'https://example.com/search?q=baseagent&page=2') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://example.com/search?q=baseagent&page=2',
              title: 'Search Results Page 2',
              content: 'Results here',
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: { url, title: 'Page', content: 'Content' },
        });
      });

      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: 'https://example.com/search?q=baseagent&page=1',
        maxDepth: 1,
      });

      expect(result.success).toBe(true);
      const pages = result.data?.pages || [];

      const firstPage = pages.find((p: any) => p.title === 'Search Results Page 1');
      expect(firstPage?.url).toBe('https://example.com/search?q=baseagent&page=1');
      expect(firstPage?.url).toContain('?q=baseagent');
      expect(firstPage?.url).toContain('&page=1');

      const secondPage = pages.find((p: any) => p.title === 'Search Results Page 2');
      if (secondPage) {
        expect(secondPage.url).toBe('https://example.com/search?q=baseagent&page=2');
        expect(secondPage.url).toContain('?q=baseagent');
        expect(secondPage.url).toContain('&page=2');
      }
    });

    it('should preserve URLs with fragments during crawl', async () => {
      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(({ url }: { url: string }) => {
        return Promise.resolve({
          success: true,
          data: {
            url: url, // Preserve whatever URL was passed
            title: `Page for ${url}`,
            content: '<a href="/docs#section2">Section 2</a>',
          },
        });
      });

      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: 'https://example.com/docs#section1',
        maxDepth: 1,
      });

      expect(result.success).toBe(true);
      const pages = result.data?.pages || [];

      const firstPage = pages[0];
      expect(firstPage?.url).toBe('https://example.com/docs#section1');
      expect(firstPage?.url).toContain('#section1');
    });

    it('should preserve different subdomain URLs', async () => {
      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(({ url }: { url: string }) => {
        if (url === 'https://api.example.com/v2/endpoints') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://api.example.com/v2/endpoints',
              title: 'API Endpoints',
              content: '<a href="/v2/users">Users API</a>',
            },
          });
        } else if (url === 'https://api.example.com/v2/users') {
          return Promise.resolve({
            success: true,
            data: {
              url: 'https://api.example.com/v2/users',
              title: 'Users API',
              content: 'User endpoints documentation',
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: { url, title: 'Page', content: 'Content' },
        });
      });

      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: 'https://api.example.com/v2/endpoints',
        maxDepth: 1,
      });

      expect(result.success).toBe(true);
      const pages = result.data?.pages || [];

      const apiPage = pages.find((p: any) => p.title === 'API Endpoints');
      expect(apiPage?.url).toBe('https://api.example.com/v2/endpoints');
      expect(apiPage?.url).toContain('api.example.com');
      expect(apiPage?.url).toContain('/v2/endpoints');

      const usersPage = pages.find((p: any) => p.title === 'Users API');
      if (usersPage) {
        expect(usersPage.url).toBe('https://api.example.com/v2/users');
        expect(usersPage.url).toContain('/v2/users');
      }
    });

    it('should preserve full URLs in crawl result data structure', async () => {
      const testUrl = 'https://docs.example.com/reference/api/authentication#oauth2';

      const mockScrapeTool = vi.fn();
      mockScrapeTool.mockImplementation(() => {
        return Promise.resolve({
          success: true,
          data: {
            url: testUrl,
            title: 'OAuth2 Authentication',
            content: 'OAuth2 authentication guide',
          },
        });
      });

      tool['scrapeTool'].execute = mockScrapeTool;

      const result = await tool.execute({
        url: testUrl,
        maxDepth: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.startUrl).toBe(testUrl);
      expect(result.data?.pages[0]?.url).toBe(testUrl);
      expect(result.data?.pages[0]?.url).toContain('/reference/api/authentication');
      expect(result.data?.pages[0]?.url).toContain('#oauth2');
    });

    it('should preserve URLs when formatted for output', async () => {
      const result = {
        success: true,
        data: {
          startUrl: 'https://docs.example.com/guide/getting-started',
          pagesVisited: 3,
          pages: [
            {
              url: 'https://docs.example.com/guide/getting-started',
              depth: 0,
              links: [],
            },
            {
              url: 'https://docs.example.com/guide/installation#requirements',
              depth: 1,
              links: [],
            },
            {
              url: 'https://docs.example.com/guide/configuration?env=production',
              depth: 1,
              links: [],
            },
          ],
          crawlTime: 1234,
          errors: [],
        },
      };

      const formatted = tool.formatOutput(result);

      expect(formatted).toContain('https://docs.example.com/guide/getting-started');
      expect(formatted).toContain('https://docs.example.com/guide/installation#requirements');
      expect(formatted).toContain('https://docs.example.com/guide/configuration?env=production');
      expect(formatted).toContain('/guide/getting-started');
      expect(formatted).toContain('#requirements');
      expect(formatted).toContain('?env=production');
    });
  });
});
