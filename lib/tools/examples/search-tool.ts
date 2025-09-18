import { Tool, ToolResult, ToolSchema } from '../tool';
import { getRAGService } from '@/app/api/chat/route';

export class SearchTool extends Tool {
  name = 'search';
  description = 'Search the knowledge base for relevant information';

  capabilities = ['knowledge-search', 'rag-query'];
  confidence = 0.95;

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        query: { type: 'string', required: true },
        maxResults: { type: 'number', required: false },
        threshold: { type: 'number', required: false },
      },
    },
    output: {
      type: 'object',
      properties: {
        results: { type: 'array' },
        confidence: { type: 'number' },
        sources: { type: 'array' },
      },
    },
  };

  async execute(input: { query: string; maxResults?: number; threshold?: number }): Promise<ToolResult> {
    try {
      const { query, maxResults = 3, threshold = 0.5 } = input;

      const ragService = await getRAGService();
      const response = await ragService.query(query);

      if (response.confidence < threshold) {
        return {
          success: false,
          error: `No results found with confidence above ${threshold}`,
          metadata: {
            confidence: response.confidence,
            threshold,
          },
        };
      }

      return {
        success: true,
        data: {
          results: response.chunks.slice(0, maxResults),
          confidence: response.confidence,
          sources: response.sources,
          answer: response.answer,
        },
        metadata: {
          toolName: this.name,
          queryLength: query.length,
          resultsFound: response.chunks.length,
          executedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }
}