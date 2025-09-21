import { ScrapedContent } from './scraper';

export class FetchScraper {
  async scrape(url: string): Promise<ScrapedContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RAGBot/1.0; +https://example.com/bot)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

      // Extract text content (basic HTML stripping)
      const content = html
        // Remove script and style elements
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();

      return {
        url,
        title,
        content,
        scrapedAt: new Date(),
      };
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
}
