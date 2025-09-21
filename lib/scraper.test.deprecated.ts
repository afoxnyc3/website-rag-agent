import { describe, it, expect, beforeEach } from 'vitest';
import { WebScraper } from './scraper';

describe('WebScraper', () => {
  let scraper: WebScraper;

  beforeEach(() => {
    scraper = new WebScraper();
  });

  describe('URL validation', () => {
    it('should validate correct URLs', () => {
      expect(scraper.isValidUrl('https://example.com')).toBe(true);
      expect(scraper.isValidUrl('http://test.org')).toBe(true);
      expect(scraper.isValidUrl('https://sub.domain.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(scraper.isValidUrl('not-a-url')).toBe(false);
      expect(scraper.isValidUrl('')).toBe(false);
      expect(scraper.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(scraper.isValidUrl('file:///etc/passwd')).toBe(false);
    });

    it('should only allow http and https protocols', () => {
      expect(scraper.isValidUrl('ftp://example.com')).toBe(false);
      expect(scraper.isValidUrl('ssh://example.com')).toBe(false);
    });
  });

  describe('Content extraction', () => {
    it('should extract text content from HTML', () => {
      const html = `
        <html>
          <body>
            <h1>Test Title</h1>
            <p>Test paragraph content</p>
            <script>console.log('should be ignored')</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;

      const extracted = scraper.extractTextFromHtml(html);
      expect(extracted).toContain('Test Title');
      expect(extracted).toContain('Test paragraph content');
      expect(extracted).not.toContain('console.log');
      expect(extracted).not.toContain('color: red');
    });

    it('should clean and normalize extracted text', () => {
      const html = `
        <p>  Multiple   spaces   </p>
        <p>Line
        breaks</p>
      `;

      const extracted = scraper.extractTextFromHtml(html);
      expect(extracted).toBe('Multiple spaces Line breaks');
    });

    it('should handle empty HTML gracefully', () => {
      expect(scraper.extractTextFromHtml('')).toBe('');
      expect(scraper.extractTextFromHtml('<html></html>')).toBe('');
    });
  });

  describe('Scraping functionality', () => {
    it('should return scraped content with metadata', async () => {
      const result = await scraper.scrape('https://example.com');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('scrapedAt');
      expect(result.url).toBe('https://example.com');
    });

    it('should handle scraping errors gracefully', async () => {
      const result = await scraper.scrape('https://invalid-url-that-does-not-exist.com');

      expect(result).toHaveProperty('error');
      expect(result.content).toBe('');
    });

    it('should respect max content length', async () => {
      const result = await scraper.scrape('https://example.com', { maxLength: 100 });

      expect(result.content.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration with RAG', () => {
    it('should format content for embedding generation', () => {
      const scrapedContent = {
        url: 'https://example.com',
        title: 'Test Page',
        content: 'Test content for embedding',
        scrapedAt: new Date(),
      };

      const formatted = scraper.formatForRAG(scrapedContent);
      expect(formatted).toContain('Test Page');
      expect(formatted).toContain('Test content for embedding');
      expect(formatted).toContain('Source: https://example.com');
    });

    it('should chunk long content appropriately', () => {
      const longContent = 'a'.repeat(5000);
      const chunks = scraper.chunkContent(longContent, 1000);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBeLessThanOrEqual(1000);
    });
  });
});
