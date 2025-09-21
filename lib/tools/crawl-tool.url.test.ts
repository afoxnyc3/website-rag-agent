import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlTool } from './crawl-tool';

// Mock global fetch to prevent real HTTP requests
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('robots.txt')) {
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    } as Response);
  }
  if (url.includes('sitemap.xml')) {
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    } as Response);
  }
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve('<html><body>Test content</body></html>'),
  } as Response);
});

// Mock ScrapeTool with proper URL preservation
vi.mock('./scrape-tool', () => ({
  ScrapeTool: vi.fn().mockImplementation(() => ({
    name: 'scrape',
    execute: vi.fn().mockImplementation(({ url }: { url: string }) => {
      // Return different content based on URL to simulate crawling
      if (url === 'https://docs.example.com/api/methods/getUserData') {
        return Promise.resolve({
          success: true,
          data: {
            url: url, // Preserve full URL
            title: 'getUserData API Method',
            content: 'This is documentation about getUserData method',
          },
        });
      }

      if (url === 'https://search.example.com/results?q=test&page=2#result-5') {
        return Promise.resolve({
          success: true,
          data: {
            url: url, // Preserve complex URL
            title: 'Search Results',
            content: 'Search result content',
          },
        });
      }

      if (url === 'https://subdomain.example.com/path/to/deep/page') {
        return Promise.resolve({
          success: true,
          data: {
            url: url, // Preserve deep path URL
            title: 'Deep Page',
            content: 'Deep page content',
          },
        });
      }

      if (url === 'https://docs.example.com') {
        return Promise.resolve({
          success: true,
          data: {
            url: url,
            title: 'Home Page',
            content:
              '<a href="/api/users">Users</a><a href="/api/posts">Posts</a>Main documentation',
          },
        });
      }

      if (url === 'https://docs.example.com/api/users') {
        return Promise.resolve({
          success: true,
          data: {
            url: url,
            title: 'Users API',
            content: 'Users API documentation',
          },
        });
      }

      if (url === 'https://docs.example.com/api/posts') {
        return Promise.resolve({
          success: true,
          data: {
            url: url,
            title: 'Posts API',
            content: 'Posts API documentation',
          },
        });
      }

      if (url === 'https://docs.example.com/guides') {
        return Promise.resolve({
          success: true,
          data: {
            url: url,
            title: 'Guides',
            content:
              '<a href="/guides/authentication">Auth Guide</a><a href="/guides/authorization">Auth Guide</a><a href="/guides/api-keys">API Keys</a>',
          },
        });
      }

      // Default response for any other URL
      return Promise.resolve({
        success: true,
        data: {
          url: url, // Always preserve the full URL
          title: 'Page',
          content: 'Page content',
        },
      });
    }),
  })),
}));

describe('CrawlTool URL Preservation', () => {
  let crawlTool: CrawlTool;

  beforeEach(() => {
    vi.clearAllMocks();
    crawlTool = new CrawlTool();
  });

  it('should preserve full URL in crawled page metadata', async () => {
    const fullUrl = 'https://docs.example.com/api/methods/getUserData';
    const result = await crawlTool.execute({
      url: fullUrl,
      maxPages: 1,
      maxDepth: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.pages).toHaveLength(1);
    expect(result.data.pages[0].url).toBe(fullUrl);
  });

  it('should preserve full URLs for multiple crawled pages', async () => {
    const startUrl = 'https://docs.example.com';

    const result = await crawlTool.execute({
      url: startUrl,
      maxPages: 3,
      maxDepth: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Check that full URLs are preserved, not truncated to domain
    const urls = result.data.pages.map((p) => p.url);
    expect(urls).toContain('https://docs.example.com');

    // When crawling discovers linked pages, they should have full paths
    urls.forEach((url) => {
      expect(url).toMatch(/^https?:\/\//); // Full URL, not relative
      expect(url).toContain('docs.example.com'); // Domain preserved
    });
  });

  it('should handle complex URLs with query params and fragments', async () => {
    const complexUrl = 'https://search.example.com/results?q=test&page=2#result-5';
    const result = await crawlTool.execute({
      url: complexUrl,
      maxPages: 1,
      maxDepth: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data.pages[0].url).toBe(complexUrl);
    expect(result.data.pages[0].url).toContain('?q=test');
    expect(result.data.pages[0].url).toContain('#result-5');
  });

  it('should not truncate URLs to base domain in metadata', async () => {
    const deepUrl = 'https://subdomain.example.com/path/to/deep/page';
    const result = await crawlTool.execute({
      url: deepUrl,
      maxPages: 1,
      maxDepth: 1,
    });

    expect(result.success).toBe(true);
    const pageUrl = result.data.pages[0].url;

    // Should NOT be truncated
    expect(pageUrl).toBe(deepUrl);
    expect(pageUrl).not.toBe('example.com');
    expect(pageUrl).not.toBe('subdomain.example.com');
    expect(pageUrl).toContain('/path/to/deep/page');
  });

  it('should preserve distinct URLs from same domain', async () => {
    const startUrl = 'https://docs.example.com/guides';

    const result = await crawlTool.execute({
      url: startUrl,
      maxPages: 4,
      maxDepth: 2,
    });

    expect(result.success).toBe(true);

    const urls = result.data.pages.map((p) => p.url);

    // All discovered URLs should be full URLs with paths preserved
    urls.forEach((url) => {
      expect(url).toMatch(/^https?:\/\//); // Full URL format
      expect(url.startsWith('https://docs.example.com')).toBe(true);
    });

    // The start URL should be in the results
    expect(urls).toContain(startUrl);
  });
});
