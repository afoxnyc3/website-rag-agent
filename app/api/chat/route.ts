import { NextRequest, NextResponse } from 'next/server';
import { BaseAgent } from '@/lib/agent/base-agent';
import { ToolRegistry } from '@/lib/tools/tool';
import { ScrapeTool } from '@/lib/tools/scrape-tool';
import { CrawlTool } from '@/lib/tools/crawl-tool';
import { RAGService } from '@/lib/rag';

// Use global to persist across hot reloads
const globalForAgent = global as unknown as {
  agent: BaseAgent | undefined;
  isInitialized: boolean | undefined;
};

// Initialize agent as a singleton
export async function getAgent(): Promise<BaseAgent> {
  if (!globalForAgent.agent) {
    // Create tool registry with our web tools
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new ScrapeTool());
    toolRegistry.register(new CrawlTool());

    // Create RAG service
    const ragService = new RAGService();

    // Initialize with sample knowledge base
    await initializeKnowledgeBase(ragService);

    // Create our intelligent agent
    globalForAgent.agent = new BaseAgent({
      name: 'WebRAGAgent',
      description: 'An intelligent agent that can fetch web content and answer questions',
      toolRegistry,
      ragService,
      confidenceThreshold: 0.3
    });

    globalForAgent.isInitialized = true;
    console.log('✅ BaseAgent initialized successfully!');
  }

  return globalForAgent.agent;
}

async function initializeKnowledgeBase(service: RAGService) {
  // Sample knowledge base about the agent and system
  const sampleDocs = [
    {
      content: "I am an intelligent BaseAgent that orchestrates web scraping, content processing, and knowledge retrieval using RAG (Retrieval-Augmented Generation).",
      metadata: {
        url: "internal://agent-docs",
        title: "Agent Overview",
        source: "Agent Documentation"
      }
    },
    {
      content: "I can recognize different types of queries: URLs (for fetching web content), questions (for knowledge retrieval), and commands (for actions). When you provide a URL, I'll fetch and analyze the content.",
      metadata: {
        url: "internal://agent-docs",
        title: "Intent Recognition",
        source: "Agent Documentation"
      }
    },
    {
      content: "For single page URLs (with a path like /page), I use ScrapeTool. For domain-level URLs, I use CrawlTool to explore multiple pages.",
      metadata: {
        url: "internal://agent-docs",
        title: "Tool Selection",
        source: "Agent Documentation"
      }
    },
    {
      content: "I implement intelligent caching with a 5-minute TTL to avoid redundant fetches. Once I've fetched a URL, I can answer multiple questions about it without re-fetching.",
      metadata: {
        url: "internal://agent-docs",
        title: "Caching Strategy",
        source: "Agent Documentation"
      }
    },
    {
      content: "The system uses OpenAI's text-embedding-3-small model to convert text into 1536-dimensional vectors for semantic similarity search.",
      metadata: {
        url: "internal://project-docs",
        title: "Embedding Model",
        source: "Project Documentation"
      }
    },
    {
      content: "This application is built with Next.js 15, TypeScript, and uses a custom BaseAgent architecture with Tool orchestration.",
      metadata: {
        url: "internal://project-docs",
        title: "Technology Stack",
        source: "Project Documentation"
      }
    },
    {
      content: "The BaseAgent was built using Test-Driven Development (TDD) with 31 tests covering all functionality at 100% coverage.",
      metadata: {
        url: "internal://project-docs",
        title: "Development Process",
        source: "Project Documentation"
      }
    }
  ];

  try {
    for (const doc of sampleDocs) {
      await service.addDocument(doc);
    }
    console.log(`📚 Knowledge base initialized with ${sampleDocs.length} documents`);
  } catch (error) {
    console.error('Failed to initialize knowledge base:', error);
  }
}

// Keep the old RAG service export for backward compatibility
export async function getRAGService(): Promise<RAGService> {
  const agent = await getAgent();
  // @ts-ignore - accessing private property for compatibility
  return agent.ragService;
}

export async function POST(request: NextRequest) {
  try {
    const { message, useRAG = true } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Always use the agent now (it's our new orchestration layer!)
    const agent = await getAgent();

    // Execute the agent's full orchestration pipeline
    const response = await agent.execute(message);

    // Return response in the expected format for the UI
    return NextResponse.json({
      response: response.answer,
      confidence: response.confidence,
      sources: response.sources,
      mode: 'agent' // Changed from 'rag' to 'agent' to reflect new architecture
    });
  } catch (error) {
    console.error('Agent API error:', error);

    // Provide more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}