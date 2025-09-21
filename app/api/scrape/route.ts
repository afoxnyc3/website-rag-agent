import { NextRequest, NextResponse } from 'next/server';
import { ScrapeTool } from '@/lib/tools/scrape-tool';
import { getRAGService } from '@/app/api/chat/route';
import { SemanticChunker } from '@/lib/chunking/semantic-chunker';

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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

    // Use semantic chunking for better context preservation
    const chunker = new SemanticChunker();
    const ragService = await getRAGService();
    const { url: scrapedUrl, title, content, scrapedAt } = result.data;

    // Determine strategy based on content type
    const isMarkdown = content.includes('```') || content.includes('#');
    const chunkOptions = {
      maxSize: options.chunkSize || 3000,
      minSize: 500,
      overlap: 200,
      strategy: isMarkdown ? ('markdown' as const) : ('semantic' as const),
      preserveCodeBlocks: true,
    };

    const chunks = chunker.chunk(content, chunkOptions);

    // Add each chunk as a separate document
    for (const chunk of chunks) {
      await ragService.addDocument({
        id: `scraped-${Date.now()}-${chunk.index}`,
        content: chunk.content,
        metadata: {
          url: scrapedUrl,
          title,
          scrapedAt,
          source: 'web-scraper',
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          chunkStrategy: chunk.metadata?.strategy,
          hasOverlap: chunk.metadata?.hasOverlap,
        },
      });
    }

    return NextResponse.json({
      success: true,
      title,
      contentLength: content.length,
      url: scrapedUrl,
      scraperUsed,
      message: `Successfully scraped and added "${title}" to knowledge base`,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to scrape website',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
