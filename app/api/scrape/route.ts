import { NextRequest, NextResponse } from 'next/server';
import { PlaywrightScraper } from '@/lib/scraper-playwright';
import { FetchScraper } from '@/lib/scraper-fetch';
import { getRAGService } from '@/app/api/chat/route';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let result;
    let scraperUsed = 'fetch';

    // Try simple fetch first (faster)
    const fetchScraper = new FetchScraper();
    result = await fetchScraper.scrape(url);

    // If fetch fails or gets minimal content, try Playwright
    if (result.error || result.content.length < 100) {
      scraperUsed = 'playwright';
      console.log(`Fetch scraper failed or got minimal content for ${url}, trying Playwright...`);

      const playwrightScraper = new PlaywrightScraper();
      try {
        await playwrightScraper.initialize();
        result = await playwrightScraper.scrape(url);
        await playwrightScraper.close();
      } catch (error) {
        await playwrightScraper.close();
        throw error;
      }
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error, scraperUsed },
        { status: 400 }
      );
    }

      // Chunk content if it's too large (max 3000 chars per chunk for embeddings)
      const MAX_CHUNK_SIZE = 3000;
      const ragService = await getRAGService();

      if (result.content.length > MAX_CHUNK_SIZE) {
        // Split into chunks
        const chunks: string[] = [];
        let currentPosition = 0;

        while (currentPosition < result.content.length) {
          const chunk = result.content.slice(currentPosition, currentPosition + MAX_CHUNK_SIZE);
          chunks.push(chunk);
          currentPosition += MAX_CHUNK_SIZE;
        }

        // Add each chunk as a separate document
        for (let i = 0; i < chunks.length; i++) {
          await ragService.addDocument({
            id: `scraped-${Date.now()}-${i}`,
            content: chunks[i],
            metadata: {
              url: result.url,
              title: result.title,
              scrapedAt: result.scrapedAt,
              source: 'web-scraper',
              chunkIndex: i,
              totalChunks: chunks.length
            }
          });
        }
      } else {
        // Content is small enough, add as single document
        await ragService.addDocument({
          id: `scraped-${Date.now()}`,
          content: result.content,
          metadata: {
            url: result.url,
            title: result.title,
            scrapedAt: result.scrapedAt,
            source: 'web-scraper'
          }
        });
      }

      return NextResponse.json({
        success: true,
        title: result.title,
        contentLength: result.content.length,
        url: result.url,
        scraperUsed,
        message: `Successfully scraped and added "${result.title}" to knowledge base`
      });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape website' },
      { status: 500 }
    );
  }
}