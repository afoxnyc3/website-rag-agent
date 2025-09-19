import { NextRequest } from 'next/server';
import { CrawlTool } from '@/lib/tools/crawl-tool';
import { getRAGService } from '@/app/api/chat/route';
import { SemanticChunker } from '@/lib/chunking/semantic-chunker';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { url, options = {} } = await request.json();

        if (!url) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'URL is required'
          })}\n\n`));
          controller.close();
          return;
        }

        // Send starting event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'starting',
          message: 'Initializing crawler...'
        })}\n\n`));

        const crawlTool = new CrawlTool();
        const startTime = Date.now();

        // Create a modified execute that can send progress updates
        const result = await crawlTool.executeWithProgress(
          {
            url,
            maxDepth: options.maxDepth !== undefined ? options.maxDepth : 2,
            maxPages: options.maxPages || 50,
            respectRobotsTxt: options.respectRobotsTxt !== false,
            crawlDelay: options.crawlDelay || 1000,
            followSitemap: options.followSitemap || false,
            includePatterns: options.includePatterns,
            excludePatterns: options.excludePatterns || ['.pdf', '.zip', '.tar', '.gz'],
          },
          (update: any) => {
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: 'in-progress',
              currentPage: update.currentUrl,
              pagesProcessed: update.pagesVisited,
              totalPages: options.maxPages || 50,
              currentDepth: update.depth,
              maxDepth: options.maxDepth || 2,
              startTime
            })}\n\n`));
          }
        );

        if (!result.success) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: result.error
          })}\n\n`));
          controller.close();
          return;
        }

        const crawlResult = result.data;

        // Process and add to knowledge base
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'in-progress',
          message: 'Processing content and adding to knowledge base...'
        })}\n\n`));

        const chunker = new SemanticChunker();
        const ragService = await getRAGService();
        let documentsAdded = 0;

        for (const page of crawlResult.pages) {
          const isMarkdown = page.content.includes('```') || page.content.includes('#');
          const chunkOptions = {
            maxSize: options.chunkSize || 3000,
            minSize: 500,
            overlap: 200,
            strategy: isMarkdown ? 'markdown' as const : 'semantic' as const,
            preserveCodeBlocks: true
          };

          const chunks = chunker.chunk(page.content, chunkOptions);

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
                hasOverlap: chunk.metadata?.hasOverlap
              }
            });
            documentsAdded++;
          }
        }

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          status: 'completed',
          pagesVisited: crawlResult.pagesVisited,
          documentsAdded,
          crawlTime: crawlResult.crawlTime,
          message: `Successfully crawled ${crawlResult.pagesVisited} pages and added ${documentsAdded} documents to knowledge base`
        })}\n\n`));

        controller.close();
      } catch (error) {
        console.error('Crawling error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}