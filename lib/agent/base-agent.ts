import { ToolRegistry } from '../tools/tool';
import { RAGService } from '../rag';

// Agent Configuration Interface
export interface AgentConfig {
  name: string;
  description?: string;
  toolRegistry?: ToolRegistry;
  ragService?: RAGService;
  confidenceThreshold?: number;
}

// Intent Types for parsing user queries
export type IntentType = 'url' | 'question' | 'command' | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  query: string;
  urls?: string[];
  keywords?: string[];
}

// Base Agent Class
export class BaseAgent {
  public readonly name: string;
  public readonly description?: string;
  public readonly confidenceThreshold: number;
  protected toolRegistry?: ToolRegistry;
  protected ragService?: RAGService;

  constructor(private config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.5;
    this.toolRegistry = config.toolRegistry;
    this.ragService = config.ragService;
  }

  parseIntent(query: string): ParsedIntent {
    const result: ParsedIntent = {
      type: 'unknown',
      query,
    };

    // Check for URLs
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
    const urls = query.match(urlPattern);
    if (urls && urls.length > 0) {
      result.type = 'url';
      result.urls = urls;
      return result;
    }

    // Check for questions
    const questionPattern = /^(what|who|where|when|why|how|is|are|can|could|would|should|do|does)/i;
    if (questionPattern.test(query)) {
      result.type = 'question';
      return result;
    }

    // Check for commands
    const commandKeywords = ['add', 'remove', 'delete', 'clear', 'show', 'list', 'create', 'update'];
    const lowerQuery = query.toLowerCase();
    const foundKeywords = commandKeywords.filter(keyword => lowerQuery.includes(keyword));

    if (foundKeywords.length > 0) {
      result.type = 'command';
      result.keywords = foundKeywords;
      return result;
    }

    return result;
  }
}