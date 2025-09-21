import { NextRequest, NextResponse } from 'next/server';
import { CrawlTool } from '@/lib/tools/crawl-tool';
import { getRAGService } from '@/app/api/chat/route';
import { SemanticChunker } from '@/lib/chunking/semantic-chunker';

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Use CrawlTool with improved default limits
    const crawlTool = new CrawlTool();
    const result = await crawlTool.execute({
      url,
      maxDepth: options.maxDepth !== undefined ? options.maxDepth : 2, // Increased from 1
      maxPages: options.maxPages || 50, // Increased from 10
      respectRobotsTxt: options.respectRobotsTxt !== false,
      crawlDelay: options.crawlDelay || 1000,
      followSitemap: options.followSitemap || false,
      includePatterns: options.includePatterns,
      excludePatterns: options.excludePatterns || ['.pdf', '.zip', '.tar', '.gz'],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const crawlResult = result.data;

    // Add crawled pages to RAG knowledge base
    const chunker = new SemanticChunker();
    const ragService = await getRAGService();
    let documentsAdded = 0;

    for (const page of crawlResult.pages) {
      // Use semantic chunking for better context preservation
      const isMarkdown = page.content.includes('```') || page.content.includes('#');
      const chunkOptions = {
        maxSize: options.chunkSize || 3000,
        minSize: 500,
        overlap: 200,
        strategy: isMarkdown ? ('markdown' as const) : ('semantic' as const),
        preserveCodeBlocks: true,
      };

      const chunks = chunker.chunk(page.content, chunkOptions);

      // Debug logging for URL preservation
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API/crawl] Storing page ${page.url} at depth ${page.depth}`);
      }

      // Add each chunk as a separate document
      for (const chunk of chunks) {
        await ragService.addDocument({
          id: `crawled-${Date.now()}-${documentsAdded}-${chunk.index}`,
          content: chunk.content,
          metadata: {
            url: page.url,
            title: page.title,
            depth: page.depth,
            crawledAt: new Date(),
            source: 'web-crawler',
            chunkIndex: chunk.index,
            totalChunks: chunk.totalChunks,
            chunkStrategy: chunk.metadata?.strategy,
            hasOverlap: chunk.metadata?.hasOverlap,
          },
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
        pages: crawlResult.pages.map((p: any) => ({
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to crawl website',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
