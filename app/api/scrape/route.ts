import { NextRequest, NextResponse } from 'next/server';
import { PlaywrightScraper } from '@/lib/scraper-playwright';
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

    const scraper = new PlaywrightScraper();

    try {
      // Initialize browser
      await scraper.initialize();

      // Scrape the website
      const result = await scraper.scrape(url);

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
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
        message: `Successfully scraped and added "${result.title}" to knowledge base`
      });
    } finally {
      // Always close the browser
      await scraper.close();
    }
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape website' },
      { status: 500 }
    );
  }
}