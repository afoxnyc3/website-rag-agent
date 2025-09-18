import { VectorStore } from '../vector-store';
import { PersistentVectorStore } from '../vector-store-persistent';

export interface Document {
  id: string;
  content: string;
  metadata?: any;
}

export interface SearchResult extends Document {
  similarity: number;
}

/**
 * Abstract interface for storage strategies
 */
export interface StorageStrategy {
  initialize(): Promise<void>;
  addDocument(document: Document, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number): Promise<SearchResult[]>;
  deleteDocument(id: string): Promise<void>;
  listDocuments(): Promise<Document[]>;
  close(): Promise<void>;
}

/**
 * In-memory storage implementation using VectorStore
 */
export class MemoryStorage implements StorageStrategy {
  private vectorStore?: VectorStore;

  async initialize(): Promise<void> {
    this.vectorStore = new VectorStore();
  }

  async addDocument(document: Document, embedding: number[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Storage not initialized');
    }

    // Create a document with the embedding pre-calculated
    const docWithEmbedding = {
      pageContent: document.content,
      metadata: {
        id: document.id,
        ...document.metadata,
      },
      embedding,
    };

    // Store with pre-computed embedding
    await this.vectorStore.addDocuments([docWithEmbedding]);
  }

  async search(embedding: number[], limit: number): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      throw new Error('Storage not initialized');
    }

    const results = await this.vectorStore.similaritySearchWithScore(embedding, limit);

    return results.map(([doc, score]) => ({
      id: doc.metadata.id,
      content: doc.pageContent,
      metadata: doc.metadata,
      similarity: score,
    }));
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Storage not initialized');
    }

    await this.vectorStore.delete({ ids: [id] });
  }

  async listDocuments(): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Storage not initialized');
    }

    const docs = this.vectorStore.getDocuments();
    return docs.map(doc => ({
      id: doc.metadata.id,
      content: doc.pageContent,
      metadata: doc.metadata,
    }));
  }

  async close(): Promise<void> {
    // No-op for in-memory storage
  }
}

/**
 * Persistent storage implementation using PersistentVectorStore
 */
export class PersistentStorage implements StorageStrategy {
  private store?: PersistentVectorStore;

  async initialize(): Promise<void> {
    this.store = new PersistentVectorStore({
      usePool: process.env.NODE_ENV === 'production',
      cacheSize: 100,
      retries: 3,
    });

    await this.store.connect();
    await this.store.initializeSchema();
  }

  async addDocument(document: Document, embedding: number[]): Promise<void> {
    if (!this.store) {
      throw new Error('Storage not initialized');
    }

    // Check connection and reconnect if needed
    if (!this.store.isConnected()) {
      await this.store.connect();
    }

    await this.store.addDocument(document, embedding);
  }

  async search(embedding: number[], limit: number): Promise<SearchResult[]> {
    if (!this.store) {
      throw new Error('Storage not initialized');
    }

    // Check connection and reconnect if needed
    if (!this.store.isConnected()) {
      await this.store.connect();
    }

    return await this.store.search(embedding, limit);
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.store) {
      throw new Error('Storage not initialized');
    }

    // Check connection and reconnect if needed
    if (!this.store.isConnected()) {
      await this.store.connect();
    }

    await this.store.deleteDocument(id);
  }

  async listDocuments(): Promise<Document[]> {
    if (!this.store) {
      throw new Error('Storage not initialized');
    }

    // Check connection and reconnect if needed
    if (!this.store.isConnected()) {
      await this.store.connect();
    }

    return await this.store.listDocuments();
  }

  async close(): Promise<void> {
    if (this.store) {
      await this.store.close();
    }
  }
}

export interface StorageFactoryOptions {
  forceMemory?: boolean;
  forcePersistent?: boolean;
}

/**
 * Factory for creating appropriate storage strategy based on environment
 */
export class StorageFactory {
  static createStorage(options?: StorageFactoryOptions): StorageStrategy {
    // Check explicit options first
    if (options?.forcePersistent) {
      return new PersistentStorage();
    }

    if (options?.forceMemory) {
      return new MemoryStorage();
    }

    // Check USE_PERSISTENT_STORAGE environment variable
    if (process.env.USE_PERSISTENT_STORAGE === 'true') {
      return new PersistentStorage();
    }

    if (process.env.USE_PERSISTENT_STORAGE === 'false') {
      return new MemoryStorage();
    }

    // Default based on NODE_ENV
    const env = process.env.NODE_ENV;

    if (env === 'production') {
      return new PersistentStorage();
    }

    // Use memory storage for development, test, or undefined environments
    return new MemoryStorage();
  }

  /**
   * Get storage type based on current configuration
   */
  static getStorageType(): 'memory' | 'persistent' {
    if (process.env.USE_PERSISTENT_STORAGE === 'true') {
      return 'persistent';
    }

    if (process.env.USE_PERSISTENT_STORAGE === 'false') {
      return 'memory';
    }

    return process.env.NODE_ENV === 'production' ? 'persistent' : 'memory';
  }
}