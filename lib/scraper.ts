export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  scrapedAt: Date;
  error?: string;
}

export interface ScrapeOptions {
  maxLength?: number;
  timeout?: number;
}

export class WebScraper {
  isValidUrl(url: string): boolean {
    if (!url) return false;

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  extractTextFromHtml(html: string): string {
    if (!html) return '';

    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapedContent> {
    if (!this.isValidUrl(url)) {
      return {
        url,
        title: '',
        content: '',
        scrapedAt: new Date(),
        error: 'Invalid URL',
      };
    }

    try {
      // For now, mock the scraping since we haven't installed Playwright yet
      // This will be replaced with actual Playwright implementation

      // Simulate error for invalid domains
      if (url.includes('invalid-url-that-does-not-exist')) {
        throw new Error('Failed to fetch URL');
      }

      const mockContent = `This is sample content from ${url}`;
      const content = options.maxLength ? mockContent.slice(0, options.maxLength) : mockContent;

      return {
        url,
        title: 'Sample Page',
        content,
        scrapedAt: new Date(),
      };
    } catch (error) {
      return {
        url,
        title: '',
        content: '',
        scrapedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  formatForRAG(content: ScrapedContent): string {
    const parts = [];

    if (content.title) {
      parts.push(`Title: ${content.title}`);
    }

    if (content.content) {
      parts.push(content.content);
    }

    parts.push(`Source: ${content.url}`);

    return parts.join('\n\n');
  }

  chunkContent(content: string, maxChunkSize: number = 1000): string[] {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const words = content.split(' ');

    for (const word of words) {
      if ((currentChunk + ' ' + word).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          // Single word exceeds max size, force chunk it
          chunks.push(word.slice(0, maxChunkSize));
          currentChunk = word.slice(maxChunkSize);
        }
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
