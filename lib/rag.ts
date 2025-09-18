import { generateEmbedding } from './embeddings';
import { StorageFactory, StorageStrategy } from './storage/storage-strategy';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface RAGResponse {
  answer: string;
  confidence: number;
  sources: string[];
  chunks: any[];
}

export class RAGService {
  private storage: StorageStrategy;
  private readonly confidenceThreshold = 0.5;
  private initialized = false;

  constructor(options?: { forceMemory?: boolean; forcePersistent?: boolean }) {
    this.storage = StorageFactory.createStorage(options);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.storage.initialize();
      this.initialized = true;

      const storageType = StorageFactory.getStorageType();
      console.log(`🗄️ RAGService initialized with ${storageType} storage`);
    }
  }

  async addDocument(doc: { id?: string; content: string; metadata?: any }): Promise<void> {
    await this.ensureInitialized();

    const docId = doc.id || Date.now().toString();
    const { embedding } = await generateEmbedding(doc.content);

    await this.storage.addDocument(
      {
        id: docId,
        content: doc.content,
        metadata: {
          timestamp: new Date().toISOString(),
          ...doc.metadata
        }
      },
      embedding
    );
  }

  async addDocuments(contents: string[]): Promise<void> {
    for (const content of contents) {
      await this.addDocument({ content });
    }
  }

  async query(question: string): Promise<RAGResponse> {
    await this.ensureInitialized();

    console.log(`\n🔍 RAG Query: "${question}"`);

    const { embedding } = await generateEmbedding(question);
    console.log(`📊 Generated embedding with ${embedding.length} dimensions`);

    // Search for similar documents
    const searchResults = await this.storage.search(embedding, 5);

    console.log(`📚 Found ${searchResults.length} results`);
    searchResults.forEach((r, i) => {
      console.log(`  ${i+1}. Score: ${r.similarity.toFixed(3)} - "${r.content.substring(0, 50)}..."`);
    });

    if (searchResults.length === 0) {
      console.log(`❌ No results found`);
      return {
        answer: "I don't have enough information to answer accurately.",
        confidence: 0,
        sources: [],
        chunks: []
      };
    }

    // Filter by confidence threshold
    const relevantResults = searchResults.filter(r => r.similarity >= this.confidenceThreshold);

    if (relevantResults.length === 0) {
      const maxConfidence = Math.max(...searchResults.map(r => r.similarity));
      console.log(`⚠️ No results above confidence threshold (${this.confidenceThreshold})`);
      return {
        answer: "I don't have enough information to answer accurately.",
        confidence: maxConfidence,
        sources: [],
        chunks: searchResults
      };
    }

    const maxConfidence = Math.max(...relevantResults.map(r => r.similarity));
    console.log(`✨ Max confidence: ${maxConfidence.toFixed(3)}`);

    const context = relevantResults
      .map(r => r.content)
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
      sources: relevantResults.map(r => r.id),
      chunks: relevantResults
    };
  }

  async getDocumentCount(): Promise<number> {
    await this.ensureInitialized();
    const docs = await this.storage.listDocuments();
    return docs.length;
  }

  async clearDocuments(): Promise<void> {
    await this.ensureInitialized();
    const docs = await this.storage.listDocuments();
    for (const doc of docs) {
      await this.storage.deleteDocument(doc.id);
    }
  }

  async close(): Promise<void> {
    if (this.initialized) {
      await this.storage.close();
      this.initialized = false;
    }
  }

  getStorageType(): 'memory' | 'persistent' {
    return StorageFactory.getStorageType();
  }
}

// For backward compatibility, export a default instance
export const ragService = new RAGService();