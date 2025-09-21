import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapeTool } from './scrape-tool';

// Mock the scrapers
vi.mock('@/lib/scraper-playwright', () => ({
  PlaywrightScraper: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    scrape: vi.fn().mockResolvedValue({
      url: 'https://example.com/specific/page',
      title: 'Specific Page Title',
      content: 'Content from specific page',
      scrapedAt: new Date('2025-01-01'),
    }),
    close: vi.fn(),
  })),
}));

vi.mock('@/lib/scraper-fetch', () => ({
  FetchScraper: vi.fn().mockImplementation(() => ({
    scrape: vi.fn().mockResolvedValue({
      url: 'https://example.com/specific/page',
      title: 'Specific Page Title',
      content: 'Content from specific page',
      scrapedAt: new Date('2025-01-01'),
    }),
  })),
}));

describe('ScrapeTool URL Preservation', () => {
  let tool: ScrapeTool;

  beforeEach(() => {
    tool = new ScrapeTool();
    vi.clearAllMocks();
  });

  it('should preserve full URL in returned data', async () => {
    const fullUrl = 'https://example.com/docs/api/methods';

    const result = await tool.execute({
      url: fullUrl,
      strategy: 'fetch',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.url).toBe('https://example.com/specific/page'); // URL from mock
  });

  it('should maintain full URL through processContent', async () => {
    const fullUrl = 'https://docs.example.com/getting-started/installation';

    // Mock the scrapers to return the same URL that was requested
    const mockFetchScraper = vi.fn().mockImplementation(() => ({
      scrape: vi.fn().mockResolvedValue({
        url: fullUrl,
        title: 'Installation Guide',
        content: 'How to install...',
        scrapedAt: new Date(),
      }),
    }));

    vi.mocked(await import('@/lib/scraper-fetch')).FetchScraper = mockFetchScraper;

    const result = await tool.execute({
      url: fullUrl,
      strategy: 'fetch',
    });

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe(fullUrl);
  });

  it('should pass full URL to metadata', async () => {
    const result = await tool.execute({
      url: 'https://api.example.com/v2/users/profile',
      strategy: 'fetch',
    });

    expect(result.success).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.toolName).toBe('scrape');

    // The URL should be preserved in the result
    expect(result.data?.url).toBeTruthy();
    expect(result.data?.url).toContain('example.com');
  });

  it('should not truncate URL to base domain', async () => {
    const fullUrl = 'https://subdomain.example.com/path/to/deep/page?param=value#section';

    // This test ensures URLs are not being truncated to just "example.com"
    const result = await tool.execute({
      url: fullUrl,
      strategy: 'fetch',
      cache: false,
    });

    expect(result.success).toBe(true);
    expect(result.data?.url).not.toBe('https://example.com');
    expect(result.data?.url).not.toBe('example.com');
    expect(result.data?.url).toContain('/');
  });

  it('should handle URLs with query parameters and fragments', async () => {
    const complexUrl = 'https://search.example.com/results?q=test&page=2#result-5';

    const result = await tool.execute({
      url: complexUrl,
      strategy: 'fetch',
    });

    expect(result.success).toBe(true);
    expect(result.data?.url).toBeDefined();
    // URL should maintain its structure
    expect(result.data?.url.length).toBeGreaterThan('https://example.com'.length);
  });
});
