import { describe, it, expect } from 'vitest';
import { PlaywrightScraper } from './scraper-playwright';

describe('PlaywrightScraper', () => {
  it('should initialize without browser', () => {
    const scraper = new PlaywrightScraper();
    expect(scraper).toBeDefined();
  });

  it('should validate URLs correctly', () => {
    const scraper = new PlaywrightScraper();
    expect(scraper.isValidUrl('https://example.com')).toBe(true);
    expect(scraper.isValidUrl('not-a-url')).toBe(false);
  });

  it('should extract main content selectors', () => {
    const scraper = new PlaywrightScraper();
    const selectors = scraper.getContentSelectors();

    expect(selectors).toContain('main');
    expect(selectors).toContain('article');
    expect(selectors).toContain('[role="main"]');
    expect(selectors).toContain('.content');
  });

  // Integration test - commented out for CI
  // Uncomment to test with actual browser
  /*
  it('should scrape a real website', async () => {
    const scraper = new PlaywrightScraper();
    await scraper.initialize();

    const result = await scraper.scrape('https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.content).toBeTruthy();
    expect(result.title).toBeTruthy();

    await scraper.close();
  }, 30000);
  */
});