import { NextRequest, NextResponse } from 'next/server';
import { RAGService } from '@/lib/rag';

// Initialize RAG service as a singleton
let ragService: RAGService | null = null;
let isInitialized = false;

export async function getRAGService(): Promise<RAGService> {
  if (!ragService) {
    ragService = new RAGService();
  }

  if (!isInitialized) {
    await initializeKnowledgeBase(ragService);
    isInitialized = true;
  }

  return ragService;
}

async function initializeKnowledgeBase(service: RAGService) {
  // Sample knowledge base about our RAG system
  const sampleDocs = [
    "This is a RAG (Retrieval-Augmented Generation) system that combines document retrieval with AI generation for accurate responses.",
    "The system uses OpenAI's text-embedding-3-small model to convert text into 1536-dimensional vectors for similarity search.",
    "Documents are stored in an in-memory vector database using a Map data structure for fast retrieval.",
    "The confidence threshold is set to 0.9, meaning the system only provides answers when it's 90% confident or higher.",
    "When confidence is below the threshold, the system responds with 'I don't have enough information to answer accurately.'",
    "The RAG system searches for the top 3 most relevant documents using cosine similarity to find the best matches.",
    "This application is built with Next.js 15, TypeScript, and uses the Vercel AI SDK for AI integrations.",
    "The chat interface uses AI Elements components from Vercel for a polished user experience.",
    "All code follows strict quality standards: functions max 15 lines, files max 100 lines, single responsibility principle.",
    "The project roadmap includes web scraping with Playwright, web crawling with Crawl4AI, and persistent storage with pgvector."
  ];

  try {
    await service.addDocuments(sampleDocs);
    console.log(`Initialized knowledge base with ${service.getDocumentCount()} documents`);
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