import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the vector stores before importing anything else
vi.mock('../vector-store', () => ({
  VectorStore: vi.fn(),
}));

vi.mock('../vector-store-persistent', () => ({
  PersistentVectorStore: vi.fn(),
}));

// Mock embeddings to prevent OpenAI initialization
vi.mock('../embeddings', () => ({
  getEmbedding: vi.fn(),
}));

// Now import the module under test
import { MemoryStorage, PersistentStorage, StorageFactory } from './storage-strategy';
import { VectorStore } from '../vector-store';
import { PersistentVectorStore } from '../vector-store-persistent';

describe('Storage Strategy Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.USE_PERSISTENT_STORAGE;
  });

  /*
   * ACTUAL VectorStore Interface Documentation:
   * - search(embedding: number[], topK: number, threshold: number): Promise<SearchResult[]>
   * - getAllDocuments(): Document[]
   * - addDocument(doc: Document): void
   * - addDocuments(docs: Document[]): void
   * - clear(): void
   *
   * Document Interface:
   * - id: string
   * - content: string (NOT pageContent!)
   * - embedding?: number[]
   * - metadata?: Record<string, any>
   *
   * SearchResult Interface:
   * - document: Document
   * - similarity: number
   * - confidence: number
   */

  describe('MemoryStorage', () => {
    let storage: MemoryStorage;
    let mockVectorStoreInstance: any;

    beforeEach(() => {
      mockVectorStoreInstance = {
        addDocument: vi.fn(),
        addDocuments: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getAllDocuments: vi.fn().mockReturnValue([]),
        clear: vi.fn(),
      };
      vi.mocked(VectorStore).mockImplementation(() => mockVectorStoreInstance);
      storage = new MemoryStorage();
    });

    it('should initialize with VectorStore', async () => {
      await storage.initialize();
      expect(VectorStore).toHaveBeenCalled();
    });

    it('should add document with embedding', async () => {
      await storage.initialize();
      const doc = { id: 'test-1', content: 'Test content', metadata: { url: 'test.com' } };
      const embedding = [0.1, 0.2, 0.3];

      await storage.addDocument(doc, embedding);

      expect(mockVectorStoreInstance.addDocuments).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-1',
          content: 'Test content',
          metadata: { url: 'test.com' },
          embedding,
        }),
      ]);
    });

    it('should search for similar documents', async () => {
      await storage.initialize();
      const embedding = [0.1, 0.2, 0.3];
      mockVectorStoreInstance.search.mockResolvedValue([
        {
          document: { id: 'test-1', content: 'Test', metadata: { url: 'test.com' } },
          similarity: 0.9,
          confidence: 0.9,
        },
      ]);

      const results = await storage.search(embedding, 5);

      expect(mockVectorStoreInstance.search).toHaveBeenCalledWith(embedding, 5, 0.0);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'test-1',
        content: 'Test',
        metadata: { url: 'test.com' },
        similarity: 0.9,
      });
    });

    it('should delete a document', async () => {
      await storage.initialize();
      mockVectorStoreInstance.getAllDocuments.mockReturnValue([
        { id: 'test-1', content: 'Test 1' },
        { id: 'test-2', content: 'Test 2' },
      ]);

      await storage.deleteDocument('test-1');

      // Should get all docs, clear, and re-add except deleted one
      expect(mockVectorStoreInstance.getAllDocuments).toHaveBeenCalled();
      expect(mockVectorStoreInstance.clear).toHaveBeenCalled();
      expect(mockVectorStoreInstance.addDocument).toHaveBeenCalledWith({
        id: 'test-2',
        content: 'Test 2',
      });
      expect(mockVectorStoreInstance.addDocument).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-1' })
      );
    });

    it('should list all documents', async () => {
      await storage.initialize();
      mockVectorStoreInstance.getAllDocuments.mockReturnValue([
        { id: 'test-1', content: 'Test', metadata: { url: 'test.com' } },
      ]);

      const docs = await storage.listDocuments();

      expect(mockVectorStoreInstance.getAllDocuments).toHaveBeenCalled();
      expect(docs).toHaveLength(1);
      expect(docs[0]).toEqual({
        id: 'test-1',
        content: 'Test',
        metadata: { url: 'test.com' },
      });
    });

    it('should handle close operation', async () => {
      await storage.initialize();
      await expect(storage.close()).resolves.not.toThrow();
    });
  });

  describe('PersistentStorage', () => {
    let storage: PersistentStorage;
    let mockPersistentStoreInstance: any;

    beforeEach(() => {
      mockPersistentStoreInstance = {
        connect: vi.fn(),
        initializeSchema: vi.fn(),
        addDocument: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        deleteDocument: vi.fn(),
        listDocuments: vi.fn().mockResolvedValue([]),
        close: vi.fn(),
        isConnected: vi.fn().mockReturnValue(false),
      };
      vi.mocked(PersistentVectorStore).mockImplementation(() => mockPersistentStoreInstance);
      storage = new PersistentStorage();
    });

    it('should initialize with connection and schema', async () => {
      await storage.initialize();
      expect(PersistentVectorStore).toHaveBeenCalled();
      expect(mockPersistentStoreInstance.connect).toHaveBeenCalled();
      expect(mockPersistentStoreInstance.initializeSchema).toHaveBeenCalled();
    });

    it('should add document with embedding', async () => {
      await storage.initialize();
      const doc = { id: 'test-1', content: 'Test content', metadata: { url: 'test.com' } };
      const embedding = [0.1, 0.2, 0.3];

      await storage.addDocument(doc, embedding);

      expect(mockPersistentStoreInstance.addDocument).toHaveBeenCalledWith(doc, embedding);
    });

    it('should search for similar documents', async () => {
      await storage.initialize();
      const embedding = [0.1, 0.2, 0.3];
      mockPersistentStoreInstance.search.mockResolvedValue([
        { id: 'test-1', content: 'Test', metadata: {}, similarity: 0.9 },
      ]);

      const results = await storage.search(embedding, 5);

      expect(mockPersistentStoreInstance.search).toHaveBeenCalledWith(embedding, 5);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-1');
    });

    it('should delete a document', async () => {
      await storage.initialize();
      await storage.deleteDocument('test-1');
      expect(mockPersistentStoreInstance.deleteDocument).toHaveBeenCalledWith('test-1');
    });

    it('should list all documents', async () => {
      await storage.initialize();
      mockPersistentStoreInstance.listDocuments.mockResolvedValue([
        { id: 'test-1', content: 'Test', metadata: {} },
      ]);

      const docs = await storage.listDocuments();

      expect(mockPersistentStoreInstance.listDocuments).toHaveBeenCalled();
      expect(docs).toHaveLength(1);
    });

    it('should handle close operation', async () => {
      await storage.initialize();
      await storage.close();
      expect(mockPersistentStoreInstance.close).toHaveBeenCalled();
    });

    it('should reconnect if connection is lost', async () => {
      await storage.initialize();

      // First call returns false (not connected), second returns true
      mockPersistentStoreInstance.isConnected.mockReturnValueOnce(false).mockReturnValueOnce(true);

      await storage.addDocument({ id: 'test', content: 'test' }, [0.1]);

      expect(mockPersistentStoreInstance.connect).toHaveBeenCalledTimes(2); // Initial + reconnect
    });
  });

  describe('StorageFactory', () => {
    it('should create MemoryStorage for development environment', () => {
      process.env.NODE_ENV = 'development';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should create MemoryStorage for test environment', () => {
      process.env.NODE_ENV = 'test';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should create PersistentStorage for production environment', () => {
      process.env.NODE_ENV = 'production';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(PersistentStorage);
    });

    it('should create PersistentStorage when USE_PERSISTENT_STORAGE is true', () => {
      process.env.USE_PERSISTENT_STORAGE = 'true';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(PersistentStorage);
    });

    it('should create MemoryStorage when USE_PERSISTENT_STORAGE is false', () => {
      process.env.USE_PERSISTENT_STORAGE = 'false';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should prioritize USE_PERSISTENT_STORAGE over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_PERSISTENT_STORAGE = 'false';
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should default to MemoryStorage when no environment is set', () => {
      const storage = StorageFactory.createStorage();
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should create storage with custom options', () => {
      const storage = StorageFactory.createStorage({
        forceMemory: true,
      });
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    it('should create persistent storage with custom options', () => {
      const storage = StorageFactory.createStorage({
        forcePersistent: true,
      });
      expect(storage).toBeInstanceOf(PersistentStorage);
    });
  });

  describe('StorageStrategy Interface', () => {
    it('should ensure both implementations follow the same interface', async () => {
      const memoryStorage = new MemoryStorage();
      const persistentStorage = new PersistentStorage();

      // Check that both have the same methods
      const methods = [
        'initialize',
        'addDocument',
        'search',
        'deleteDocument',
        'listDocuments',
        'close',
      ];

      for (const method of methods) {
        expect(memoryStorage).toHaveProperty(method);
        expect(persistentStorage).toHaveProperty(method);
        expect(typeof (memoryStorage as any)[method]).toBe('function');
        expect(typeof (persistentStorage as any)[method]).toBe('function');
      }
    });
  });
});
