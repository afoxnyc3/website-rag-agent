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
}