import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PersistentVectorStore } from './vector-store-persistent';
import { sql } from '@vercel/postgres';

// Mock the Vercel Postgres module
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn(),
  db: {
    connect: vi.fn(),
  },
}));

describe('PersistentVectorStore', () => {
  let store: PersistentVectorStore;

  beforeAll(async () => {
    // Set test environment variables
    process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';
  });

  beforeEach(async () => {
    store = new PersistentVectorStore();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up
    await store?.close();
  });

  describe('Connection Management', () => {
    it('should connect to the database', async () => {
      const mockConnect = vi.fn().mockResolvedValue(true);
      (sql as any).mockImplementation(() => Promise.resolve({ rows: [] }));

      await store.connect();

      expect(store.isConnected()).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const mockError = new Error('Connection failed');
      (sql as any).mockRejectedValue(mockError);

      await expect(store.connect()).rejects.toThrow('Connection failed');
      expect(store.isConnected()).toBe(false);
    });

    it('should close connection properly', async () => {
      await store.connect();
      await store.close();

      expect(store.isConnected()).toBe(false);
    });
  });

  describe('Schema Initialization', () => {
    it('should create tables if they do not exist', async () => {
      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.initializeSchema();

      // Check that CREATE TABLE statements were executed
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS documents')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS embeddings')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS document_versions')
      );
    });

    it('should create pgvector extension', async () => {
      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.initializeSchema();

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS vector')
      );
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      (sql as any).mockResolvedValue({ rows: [] });
      await store.connect();
    });

    it('should add a document with embedding', async () => {
      const document = {
        id: 'doc-1',
        content: 'Test content',
        metadata: { source: 'test' },
      };
      const embedding = new Array(1536).fill(0.1);

      const mockSql = vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // INSERT document
        .mockResolvedValueOnce({ rows: [] }); // INSERT embedding
      (sql as any).mockImplementation(mockSql);

      await store.addDocument(document, embedding);

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documents'),
        expect.arrayContaining(['doc-1', 'Test content'])
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO embeddings'),
        expect.arrayContaining(['doc-1'])
      );
    });

    it('should get document by ID', async () => {
      const mockDocument = {
        id: 'doc-1',
        content: 'Test content',
        metadata: { source: 'test' },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (sql as any).mockResolvedValue({ rows: [mockDocument] });

      const result = await store.getDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM documents'),
        expect.arrayContaining(['doc-1'])
      );
    });

    it('should update existing document and increment version', async () => {
      const updatedContent = 'Updated content';
      const mockSql = vi.fn()
        .mockResolvedValueOnce({ rows: [{ version: 1 }] }) // Get current version
        .mockResolvedValueOnce({ rows: [] }) // Insert into versions
        .mockResolvedValueOnce({ rows: [] }); // Update document

      (sql as any).mockImplementation(mockSql);

      await store.updateDocument('doc-1', updatedContent);

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents'),
        expect.arrayContaining([updatedContent, 2, 'doc-1'])
      );
    });

    it('should delete document and its embeddings', async () => {
      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.deleteDocument('doc-1');

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM embeddings'),
        expect.arrayContaining(['doc-1'])
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM documents'),
        expect.arrayContaining(['doc-1'])
      );
    });

    it('should list all documents', async () => {
      const mockDocuments = [
        { id: 'doc-1', content: 'Content 1' },
        { id: 'doc-2', content: 'Content 2' },
      ];

      (sql as any).mockResolvedValue({ rows: mockDocuments });

      const result = await store.listDocuments();

      expect(result).toEqual(mockDocuments);
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM documents')
      );
    });
  });

  describe('Vector Search', () => {
    beforeEach(async () => {
      (sql as any).mockResolvedValue({ rows: [] });
      await store.connect();
    });

    it('should find similar documents', async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        {
          id: 'doc-1',
          content: 'Similar content',
          similarity: 0.95,
          metadata: { source: 'test' }
        },
        {
          id: 'doc-2',
          content: 'Another similar',
          similarity: 0.85,
          metadata: { source: 'test' }
        },
      ];

      (sql as any).mockResolvedValue({ rows: mockResults });

      const results = await store.search(queryEmbedding, 5);

      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBe(0.95);
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY embedding <->'),
        expect.arrayContaining([`[${queryEmbedding.join(',')}]`, 5])
      );
    });

    it('should respect similarity threshold', async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        { id: 'doc-1', content: 'High similarity', similarity: 0.95 },
        { id: 'doc-2', content: 'Low similarity', similarity: 0.3 },
      ];

      (sql as any).mockResolvedValue({ rows: mockResults });

      const results = await store.searchWithThreshold(queryEmbedding, 0.5, 10);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-1');
    });

    it('should return confidence scores', async () => {
      const queryEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        { id: 'doc-1', content: 'Content', similarity: 0.85 },
      ];

      (sql as any).mockResolvedValue({ rows: mockResults });

      const results = await store.search(queryEmbedding, 1);

      expect(results[0]).toHaveProperty('similarity');
      expect(results[0].similarity).toBe(0.85);
    });

    it('should handle empty search results', async () => {
      const queryEmbedding = new Array(1536).fill(0.1);

      (sql as any).mockResolvedValue({ rows: [] });

      const results = await store.search(queryEmbedding, 5);

      expect(results).toEqual([]);
    });
  });

  describe('Versioning', () => {
    beforeEach(async () => {
      (sql as any).mockResolvedValue({ rows: [] });
      await store.connect();
    });

    it('should track document versions', async () => {
      const versions = [
        { version: 1, content: 'Version 1', created_at: new Date('2024-01-01') },
        { version: 2, content: 'Version 2', created_at: new Date('2024-01-02') },
      ];

      (sql as any).mockResolvedValue({ rows: versions });

      const result = await store.getDocumentVersions('doc-1');

      expect(result).toEqual(versions);
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM document_versions'),
        expect.arrayContaining(['doc-1'])
      );
    });

    it('should retrieve specific version', async () => {
      const version = {
        document_id: 'doc-1',
        version: 2,
        content: 'Version 2 content',
        metadata: { source: 'test' },
        created_at: new Date(),
      };

      (sql as any).mockResolvedValue({ rows: [version] });

      const result = await store.getDocumentVersion('doc-1', 2);

      expect(result).toEqual(version);
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE document_id = $1 AND version = $2'),
        expect.arrayContaining(['doc-1', 2])
      );
    });

    it('should list version history', async () => {
      const history = [
        { version: 3, created_at: new Date('2024-01-03'), changes: 'Update 3' },
        { version: 2, created_at: new Date('2024-01-02'), changes: 'Update 2' },
        { version: 1, created_at: new Date('2024-01-01'), changes: 'Initial' },
      ];

      (sql as any).mockResolvedValue({ rows: history });

      const result = await store.getVersionHistory('doc-1');

      expect(result).toEqual(history);
      expect(result[0].version).toBe(3); // Most recent first
    });
  });

  describe('Migration from In-Memory Store', () => {
    it('should migrate documents from in-memory store', async () => {
      const inMemoryDocuments = [
        {
          id: 'doc-1',
          content: 'Document 1',
          embedding: new Array(1536).fill(0.1),
          metadata: { source: 'memory' },
        },
        {
          id: 'doc-2',
          content: 'Document 2',
          embedding: new Array(1536).fill(0.2),
          metadata: { source: 'memory' },
        },
      ];

      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.migrateFromMemory(inMemoryDocuments);

      // Should insert both documents and embeddings
      expect(mockSql).toHaveBeenCalledTimes(inMemoryDocuments.length * 2);
    });

    it('should handle large dataset migration in batches', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `doc-${i}`,
        content: `Document ${i}`,
        embedding: new Array(1536).fill(0.1),
        metadata: { source: 'memory' },
      }));

      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.migrateFromMemory(largeDataset, { batchSize: 100 });

      // Should process in batches
      expect(mockSql).toHaveBeenCalled();
    });

    it('should preserve metadata during migration', async () => {
      const document = {
        id: 'doc-1',
        content: 'Test content',
        embedding: new Array(1536).fill(0.1),
        metadata: {
          source: 'web-scraper',
          url: 'https://example.com',
          scrapedAt: new Date('2024-01-01'),
        },
      };

      const mockSql = vi.fn().mockResolvedValue({ rows: [] });
      (sql as any).mockImplementation(mockSql);

      await store.migrateFromMemory([document]);

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documents'),
        expect.arrayContaining([
          'doc-1',
          'Test content',
          JSON.stringify(document.metadata),
        ])
      );
    });
  });

  describe('Performance Optimization', () => {
    it('should use connection pooling', async () => {
      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      };

      store = new PersistentVectorStore({ usePool: true });
      await store.connect();

      expect(store.isUsingPool()).toBe(true);
    });

    it('should cache frequently accessed documents', async () => {
      const mockSql = vi.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', content: 'Cached content' }]
      });
      (sql as any).mockImplementation(mockSql);

      // First access - should query database
      await store.getDocument('doc-1');
      expect(mockSql).toHaveBeenCalledTimes(1);

      // Second access - should use cache
      await store.getDocument('doc-1');
      expect(mockSql).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      const mockSql = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ rows: [] });

      (sql as any).mockImplementation(mockSql);

      await store.addDocument(
        { id: 'doc-1', content: 'Test' },
        new Array(1536).fill(0.1),
        { retries: 2 }
      );

      expect(mockSql).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction rollback', async () => {
      const mockSql = vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      (sql as any).mockImplementation(mockSql);

      await expect(
        store.addDocumentWithTransaction({
          id: 'doc-1',
          content: 'Test',
          embedding: new Array(1536).fill(0.1),
        })
      ).rejects.toThrow('Insert failed');

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('ROLLBACK'));
    });
  });
});