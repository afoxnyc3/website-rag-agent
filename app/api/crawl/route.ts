import { NextRequest, NextResponse } from 'next/server';
import { PlaywrightCrawler } from '@/lib/crawler-playwright';
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

    // Default crawl options
    const crawlOptions = {
      maxDepth: options.maxDepth || 1,
      maxPages: options.maxPages || 10,
      respectRobotsTxt: options.respectRobotsTxt !== false,
      crawlDelay: options.crawlDelay || 1000, // 1 second default
      followSitemap: options.followSitemap || false,
      includePatterns: options.includePatterns,
      excludePatterns: options.excludePatterns || [/\.(pdf|zip|tar|gz)$/i],
    };

    const crawler = new PlaywrightCrawler();

    // Crawl the website
    const crawlResult = await crawler.crawl(url, crawlOptions);

    if (crawlResult.errors.length > 0 && crawlResult.pagesVisited === 0) {
      return NextResponse.json(
        { error: crawlResult.errors[0] },
        { status: 400 }
      );
    }

    // Add crawled pages to RAG knowledge base
    const ragService = await getRAGService();
    let documentsAdded = 0;

    for (const page of crawlResult.pages) {
      // Chunk content if needed
      const MAX_CHUNK_SIZE = 3000;

      if (page.content.length > MAX_CHUNK_SIZE) {
        // Split into chunks
        let currentPosition = 0;
        let chunkIndex = 0;

        while (currentPosition < page.content.length) {
          const chunk = page.content.slice(currentPosition, currentPosition + MAX_CHUNK_SIZE);

          await ragService.addDocument({
            id: `crawled-${Date.now()}-${documentsAdded}-${chunkIndex}`,
            content: chunk,
            metadata: {
              url: page.url,
              title: page.title,
              depth: page.depth,
              crawledAt: new Date(),
              source: 'web-crawler',
              chunkIndex,
              totalChunks: Math.ceil(page.content.length / MAX_CHUNK_SIZE),
            }
          });

          currentPosition += MAX_CHUNK_SIZE;
          chunkIndex++;
          documentsAdded++;
        }
      } else {
        // Content is small enough, add as single document
        await ragService.addDocument({
          id: `crawled-${Date.now()}-${documentsAdded}`,
          content: page.content,
          metadata: {
            url: page.url,
            title: page.title,
            depth: page.depth,
            crawledAt: new Date(),
            source: 'web-crawler',
          }
        });
        documentsAdded++;
      }
    }

    return NextResponse.json({
      success: true,
      pagesVisited: crawlResult.pagesVisited,
      documentsAdded,
      crawlTime: crawlResult.crawlTime,
      errors: crawlResult.errors,
      message: `Successfully crawled ${crawlResult.pagesVisited} pages and added ${documentsAdded} documents to knowledge base`,
      details: {
        startUrl: crawlResult.startUrl,
        pages: crawlResult.pages.map(p => ({
          url: p.url,
          title: p.title,
          contentLength: p.content.length,
          depth: p.depth,
          linksFound: p.links.length,
        })),
      },
    });
  } catch (error) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { error: 'Failed to crawl website' },
      { status: 500 }
    );
  }
}