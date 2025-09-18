import { generateEmbedding } from './embeddings';
import { VectorStore, Document, SearchResult } from './vector-store';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface RAGResponse {
  answer: string;
  confidence: number;
  sources: string[];
  chunks: SearchResult[];
}

export class RAGService {
  private vectorStore: VectorStore;
  private readonly confidenceThreshold = 0.5; // Adjusted to realistic threshold

  constructor() {
    this.vectorStore = new VectorStore();
  }

  async addDocument(content: string, id?: string): Promise<void> {
    const docId = id || Date.now().toString();
    const { embedding } = await generateEmbedding(content);

    this.vectorStore.addDocument({
      id: docId,
      content,
      embedding,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async addDocuments(contents: string[]): Promise<void> {
    for (const content of contents) {
      await this.addDocument(content);
    }
  }

  async query(question: string): Promise<RAGResponse> {
    console.log(`\n🔍 RAG Query: "${question}"`);

    const { embedding } = await generateEmbedding(question);
    console.log(`📊 Generated embedding with ${embedding.length} dimensions`);

    // Lower threshold for initial search to get results
    const searchResults = await this.vectorStore.search(
      embedding,
      3,
      0.3 // Lowered further for debugging
    );

    console.log(`📚 Found ${searchResults.length} results above 0.3 threshold`);
    searchResults.forEach((r, i) => {
      console.log(`  ${i+1}. Score: ${r.similarity.toFixed(3)} - "${r.document.content.substring(0, 50)}..."`);
    });

    if (searchResults.length === 0) {
      console.log(`❌ No results found above threshold`);
      return {
        answer: "I don't have enough information to answer accurately.",
        confidence: 0,
        sources: [],
        chunks: []
      };
    }

    const maxConfidence = Math.max(...searchResults.map(r => r.confidence));
    console.log(`✨ Max confidence: ${maxConfidence.toFixed(3)}`)

    if (maxConfidence < this.confidenceThreshold) {
      return {
        answer: "I don't have enough information to answer accurately.",
        confidence: maxConfidence,
        sources: [],
        chunks: searchResults
      };
    }

    const context = searchResults
      .map(r => r.document.content)
      .join('\n\n');

    const prompt = `Based on the following context, answer the question.
If the context doesn't contain enough information, say so.

Context:
${context}

Question: ${question}

Answer:`;

    const { text } = await generateText({
      model: openai('gpt-5'),
      prompt
    });

    return {
      answer: text,
      confidence: maxConfidence,
      sources: searchResults.map(r => r.document.id),
      chunks: searchResults
    };
  }

  getDocumentCount(): number {
    return this.vectorStore.size;
  }

  clearDocuments(): void {
    this.vectorStore.clear();
  }
}