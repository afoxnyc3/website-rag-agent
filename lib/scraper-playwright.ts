import { chromium, Browser, Page } from 'playwright';
import { ScrapedContent } from './scraper';

export class PlaywrightScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isValidUrl(url: string): boolean {
    if (!url) return false;

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  getContentSelectors(): string[] {
    return [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.entry-content',
      'body', // fallback
    ];
  }

  async scrape(url: string): Promise<ScrapedContent> {
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
      if (!this.page) {
        await this.initialize();
      }

      if (!this.page) {
        throw new Error('Failed to initialize browser');
      }

      // Navigate to the page
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Get title
      const title = await this.page.title();

      // Try to get main content using various selectors
      let content = '';
      const selectors = this.getContentSelectors();

      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const text = await element.textContent();
            if (text && text.trim().length > content.length) {
              content = text.trim();
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Clean content
      content = this.cleanText(content);

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
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}