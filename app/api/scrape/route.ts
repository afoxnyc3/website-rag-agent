import { NextRequest, NextResponse } from 'next/server';
import { ScrapeTool } from '@/lib/tools/scrape-tool';
import { getRAGService } from '@/app/api/chat/route';

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Use ScrapeTool with auto strategy (tries fetch first, falls back to playwright)
    const scrapeTool = new ScrapeTool();
    const result = await scrapeTool.execute({
      url,
      strategy: options.strategy || 'auto',
      maxLength: options.maxLength,
      cache: options.cache !== false, // Enable caching by default
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, strategy: result.metadata?.strategy },
        { status: 400 }
      );
    }

    const scraperUsed = result.metadata?.strategy || 'unknown';

      // Chunk content if it's too large (max 3000 chars per chunk for embeddings)
      const MAX_CHUNK_SIZE = 3000;
      const ragService = await getRAGService();
      const { url: scrapedUrl, title, content, scrapedAt } = result.data;

      if (content.length > MAX_CHUNK_SIZE) {
        // Split into chunks
        const chunks: string[] = [];
        let currentPosition = 0;

        while (currentPosition < content.length) {
          const chunk = content.slice(currentPosition, currentPosition + MAX_CHUNK_SIZE);
          chunks.push(chunk);
          currentPosition += MAX_CHUNK_SIZE;
        }

        // Add each chunk as a separate document
        for (let i = 0; i < chunks.length; i++) {
          await ragService.addDocument({
            id: `scraped-${Date.now()}-${i}`,
            content: chunks[i],
            metadata: {
              url: scrapedUrl,
              title,
              scrapedAt,
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
          content,
          metadata: {
            url: scrapedUrl,
            title,
            scrapedAt,
            source: 'web-scraper'
          }
        });
      }

      return NextResponse.json({
        success: true,
        title,
        contentLength: content.length,
        url: scrapedUrl,
        scraperUsed,
        message: `Successfully scraped and added "${title}" to knowledge base`
      });
  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to scrape website',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}