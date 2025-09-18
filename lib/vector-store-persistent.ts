import { sql } from '@vercel/postgres';
import { Pool } from 'pg';
import pgvector from 'pgvector/pg';

export interface Document {
  id: string;
  content: string;
  metadata?: any;
  version?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SearchResult extends Document {
  similarity: number;
}

export interface PersistentVectorStoreOptions {
  usePool?: boolean;
  cacheSize?: number;
  retries?: number;
}

export interface MigrationOptions {
  batchSize?: number;
}

/**
 * Persistent vector store implementation using Vercel Postgres with pgvector
 */
export class PersistentVectorStore {
  private connected: boolean = false;
  private pool?: Pool;
  private cache: Map<string, Document> = new Map();
  private options: PersistentVectorStoreOptions;

  constructor(options: PersistentVectorStoreOptions = {}) {
    this.options = {
      usePool: false,
      cacheSize: 100,
      retries: 3,
      ...options,
    };

    if (this.options.usePool) {
      this.pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      });
      pgvector.registerTypes(this.pool);
    }
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      // Test connection
      await sql`SELECT 1`;
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  /**
   * Check if connected to database
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if using connection pooling
   */
  isUsingPool(): boolean {
    return !!this.pool;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    this.connected = false;
    this.cache.clear();
  }

  /**
   * Initialize database schema
   */
  async initializeSchema(): Promise<void> {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create embeddings table
    await sql`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create document versions table
    await sql`
      CREATE TABLE IF NOT EXISTS document_versions (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255),
        version INTEGER,
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_id, version)
      )
    `;
  }

  /**
   * Add a document with its embedding
   */
  async addDocument(
    document: Omit<Document, 'version' | 'created_at' | 'updated_at'>,
    embedding: number[],
    options?: { retries?: number }
  ): Promise<void> {
    const retries = options?.retries ?? this.options.retries ?? 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        // Insert document
        await sql`
          INSERT INTO documents (id, content, metadata)
          VALUES (${document.id}, ${document.content}, ${JSON.stringify(document.metadata || {})})
          ON CONFLICT (id) DO UPDATE
          SET content = EXCLUDED.content,
              metadata = EXCLUDED.metadata,
              version = documents.version + 1,
              updated_at = NOW()
        `;

        // Insert embedding
        const embeddingVector = `[${embedding.join(',')}]`;
        await sql`
          INSERT INTO embeddings (document_id, embedding)
          VALUES (${document.id}, ${embeddingVector}::vector)
        `;

        // Clear cache for this document
        this.cache.delete(document.id);
        return;
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    throw lastError;
  }

  /**
   * Add document with transaction support
   */
  async addDocumentWithTransaction(params: {
    id: string;
    content: string;
    embedding: number[];
    metadata?: any;
  }): Promise<void> {
    try {
      await sql`BEGIN`;

      await sql`
        INSERT INTO documents (id, content, metadata)
        VALUES (${params.id}, ${params.content}, ${JSON.stringify(params.metadata || {})})
      `;

      const embeddingVector = `[${params.embedding.join(',')}]`;
      await sql`
        INSERT INTO embeddings (document_id, embedding)
        VALUES (${params.id}, ${embeddingVector}::vector)
      `;

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const result = await sql`
      SELECT * FROM documents
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const document = result.rows[0] as Document;

    // Update cache
    if (this.cache.size < (this.options.cacheSize ?? 100)) {
      this.cache.set(id, document);
    }

    return document;
  }

  /**
   * Update existing document
   */
  async updateDocument(id: string, content: string): Promise<void> {
    // Get current version
    const currentDoc = await this.getDocument(id);
    if (!currentDoc) {
      throw new Error(`Document ${id} not found`);
    }

    const newVersion = (currentDoc.version || 1) + 1;

    // Save to version history
    await sql`
      INSERT INTO document_versions (document_id, version, content, metadata)
      VALUES (${id}, ${currentDoc.version}, ${currentDoc.content}, ${currentDoc.metadata})
    `;

    // Update document
    await sql`
      UPDATE documents
      SET content = ${content},
          version = ${newVersion},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    // Clear cache
    this.cache.delete(id);
  }

  /**
   * Delete document and its embeddings
   */
  async deleteDocument(id: string): Promise<void> {
    await sql`DELETE FROM embeddings WHERE document_id = ${id}`;
    await sql`DELETE FROM documents WHERE id = ${id}`;
    this.cache.delete(id);
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<Document[]> {
    const result = await sql`
      SELECT * FROM documents
      ORDER BY updated_at DESC
    `;
    return result.rows as Document[];
  }

  /**
   * Search for similar documents
   */
  async search(embedding: number[], limit: number = 5): Promise<SearchResult[]> {
    const embeddingVector = `[${embedding.join(',')}]`;

    const result = await sql`
      SELECT
        d.*,
        1 - (e.embedding <=> ${embeddingVector}::vector) as similarity
      FROM embeddings e
      JOIN documents d ON e.document_id = d.id
      ORDER BY e.embedding <=> ${embeddingVector}::vector
      LIMIT ${limit}
    `;

    return result.rows as SearchResult[];
  }

  /**
   * Search with similarity threshold
   */
  async searchWithThreshold(
    embedding: number[],
    threshold: number,
    limit: number = 10
  ): Promise<SearchResult[]> {
    const results = await this.search(embedding, limit);
    return results.filter(r => r.similarity >= threshold);
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string): Promise<any[]> {
    const result = await sql`
      SELECT * FROM document_versions
      WHERE document_id = ${documentId}
      ORDER BY version DESC
    `;
    return result.rows;
  }

  /**
   * Get specific version of a document
   */
  async getDocumentVersion(documentId: string, version: number): Promise<any> {
    const result = await sql`
      SELECT * FROM document_versions
      WHERE document_id = ${documentId} AND version = ${version}
    `;
    return result.rows[0] || null;
  }

  /**
   * Get version history
   */
  async getVersionHistory(documentId: string): Promise<any[]> {
    const result = await sql`
      SELECT
        version,
        created_at,
        jsonb_object_keys(metadata) as changes
      FROM document_versions
      WHERE document_id = ${documentId}
      ORDER BY version DESC
    `;
    return result.rows;
  }

  /**
   * Migrate documents from in-memory store
   */
  async migrateFromMemory(
    documents: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata?: any;
    }>,
    options?: MigrationOptions
  ): Promise<void> {
    const batchSize = options?.batchSize ?? 100;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      for (const doc of batch) {
        await this.addDocument(
          {
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata,
          },
          doc.embedding
        );
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      await sql`TRUNCATE TABLE embeddings CASCADE`;
      await sql`TRUNCATE TABLE document_versions CASCADE`;
      await sql`TRUNCATE TABLE documents CASCADE`;
      this.cache.clear();
    }
  }
}