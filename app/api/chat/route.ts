import { NextRequest, NextResponse } from 'next/server';
import { RAGService } from '@/lib/rag';

// Use global to persist across hot reloads in development
const globalForRag = global as unknown as {
  ragService: RAGService | undefined;
  isInitialized: boolean | undefined;
};

// Initialize RAG service as a singleton that persists
export async function getRAGService(): Promise<RAGService> {
  if (!globalForRag.ragService) {
    globalForRag.ragService = new RAGService();
    globalForRag.isInitialized = false;
  }

  if (!globalForRag.isInitialized) {
    await initializeKnowledgeBase(globalForRag.ragService);
    globalForRag.isInitialized = true;
  }

  return globalForRag.ragService;
}

async function initializeKnowledgeBase(service: RAGService) {
  // Sample knowledge base about our RAG system
  const sampleDocs = [
    {
      content: "This is a RAG (Retrieval-Augmented Generation) system that combines document retrieval with AI generation for accurate responses.",
      metadata: {
        url: "internal://project-docs",
        title: "RAG System Overview",
        source: "Project Documentation"
      }
    },
    {
      content: "The system uses OpenAI's text-embedding-3-small model to convert text into 1536-dimensional vectors for similarity search.",
      metadata: {
        url: "internal://project-docs",
        title: "Embedding Model",
        source: "Project Documentation"
      }
    },
    {
      content: "Documents are stored in an in-memory vector database using a Map data structure for fast retrieval.",
      metadata: {
        url: "internal://project-docs",
        title: "Storage Architecture",
        source: "Project Documentation"
      }
    },
    {
      content: "The confidence threshold is set to 0.3, allowing the system to provide answers when moderately confident.",
      metadata: {
        url: "internal://project-docs",
        title: "Confidence Settings",
        source: "Project Documentation"
      }
    },
    {
      content: "When confidence is below the threshold, the system responds with 'I don't have enough information to answer accurately.'",
      metadata: {
        url: "internal://project-docs",
        title: "Low Confidence Handling",
        source: "Project Documentation"
      }
    },
    {
      content: "The RAG system searches for the top 5 most relevant documents using cosine similarity to find the best matches.",
      metadata: {
        url: "internal://project-docs",
        title: "Search Algorithm",
        source: "Project Documentation"
      }
    },
    {
      content: "This application is built with Next.js 15, TypeScript, and uses the Vercel AI SDK for AI integrations.",
      metadata: {
        url: "internal://project-docs",
        title: "Technology Stack",
        source: "Project Documentation"
      }
    },
    {
      content: "The chat interface uses AI Elements components from Vercel for a polished user experience.",
      metadata: {
        url: "internal://project-docs",
        title: "UI Components",
        source: "Project Documentation"
      }
    },
    {
      content: "All code follows strict quality standards: functions max 15 lines, files max 100 lines, single responsibility principle.",
      metadata: {
        url: "internal://project-docs",
        title: "Code Standards",
        source: "Project Documentation"
      }
    },
    {
      content: "The project roadmap includes web scraping with Playwright, web crawling for multi-page sites, and persistent storage with pgvector.",
      metadata: {
        url: "internal://project-docs",
        title: "Project Roadmap",
        source: "Project Documentation"
      }
    }
  ];

  try {
    // Add each document with proper metadata
    for (const doc of sampleDocs) {
      await service.addDocument(doc);
    }
    const docCount = await service.getDocumentCount();
    console.log(`Initialized knowledge base with ${docCount} documents`);
    console.log(`Storage type: ${service.getStorageType()}`);
  } catch (error) {
    console.error('Failed to initialize knowledge base:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, useRAG = true } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const service = await getRAGService();

    // Use RAG for response generation
    if (useRAG) {
      const ragResponse = await service.query(message);

      return NextResponse.json({
        response: ragResponse.answer,
        confidence: ragResponse.confidence,
        sources: ragResponse.sources,
        mode: 'rag'
      });
    }

    // Fallback to direct GPT-5 (if RAG is disabled)
    const { generateText } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');

    const { text } = await generateText({
      model: openai('gpt-5'),
      prompt: message,
    });

    return NextResponse.json({
      response: text,
      confidence: 1.0,
      sources: [],
      mode: 'direct'
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}