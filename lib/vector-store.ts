import { EmbeddingVector, cosineSimilarity } from './embeddings';

export interface Document {
  id: string;
  content: string;
  embedding?: EmbeddingVector;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  document: Document;
  similarity: number;
  confidence: number;
}

export class VectorStore {
  private documents: Map<string, Document>;

  constructor() {
    this.documents = new Map();
  }

  addDocument(doc: Document): void {
    if (!doc.id || !doc.content) {
      throw new Error('Document must have id and content');
    }
    this.documents.set(doc.id, doc);
  }

  addDocuments(docs: Document[]): void {
    docs.forEach((doc) => this.addDocument(doc));
  }

  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  async search(
    queryEmbedding: EmbeddingVector,
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (!doc.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

      if (similarity >= threshold) {
        results.push({
          document: doc,
          similarity,
          confidence: similarity,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  clear(): void {
    this.documents.clear();
  }

  get size(): number {
    return this.documents.size;
  }
}
