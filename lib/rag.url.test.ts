import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RAGService } from './rag';

// Mock the embeddings module
vi.mock('./embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
  }),
}));

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked response for testing URL preservation',
  }),
  openai: vi.fn(() => ({
    name: 'mock-openai-provider',
  })),
}));

// Mock the storage factory to use in-memory storage
vi.mock('./storage/storage-strategy', () => {
  const mockStorage = {
    initialize: vi.fn().mockResolvedValue(undefined),
    addDocument: vi.fn().mockResolvedValue(undefined),
    search: vi.fn(),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    listDocuments: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    StorageFactory: {
      createStorage: vi.fn().mockReturnValue(mockStorage),
      getStorageType: vi.fn().mockReturnValue('memory'),
    },
    // Export mockStorage for test access
    __mockStorage: mockStorage,
  };
});

describe('RAGService URL Preservation', () => {
  let ragService: RAGService;

  beforeEach(() => {
    vi.clearAllMocks();
    ragService = new RAGService({ forceMemory: true });
  });

  it('should preserve full URL in document metadata during storage', async () => {
    const mockStorage = (await import('./storage/storage-strategy')).__mockStorage;
    const fullUrl = 'https://docs.example.com/api/methods/getUserData';
    const document = {
      content: 'This is documentation about getUserData method',
      metadata: {
        url: fullUrl,
        title: 'getUserData API Method',
        source: 'API Documentation',
      },
    };

    await ragService.addDocument(document);

    // Check that addDocument was called with the full URL in metadata
    expect(mockStorage.addDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: document.content,
        metadata: expect.objectContaining({
          url: fullUrl,
        }),
      }),
      expect.any(Array) // embedding
    );
  });

  it('should return full URLs in sources array from query', async () => {
    const mockStorage = (await import('./storage/storage-strategy')).__mockStorage;
    const fullUrl1 = 'https://api.example.com/v2/users/profile';
    const fullUrl2 = 'https://docs.example.com/getting-started/installation';

    // Mock search to return documents with full URLs
    mockStorage.search.mockResolvedValue([
      {
        id: '1',
        content: 'User profile endpoint documentation',
        metadata: {
          url: fullUrl1,
          title: 'User Profile API',
        },
        similarity: 0.85,
      },
      {
        id: '2',
        content: 'Installation guide for the API',
        metadata: {
          url: fullUrl2,
          title: 'Installation Guide',
        },
        similarity: 0.75,
      },
    ]);

    const response = await ragService.query('How do I get user profile?');

    // Check that sources contain full URLs
    expect(response.sources).toBeDefined();
    expect(response.sources).toContain(fullUrl1);
    expect(response.sources).toContain(fullUrl2);
  });

  it('should handle documents with complex URLs including query params and fragments', async () => {
    const mockStorage = (await import('./storage/storage-strategy')).__mockStorage;
    const complexUrl = 'https://search.example.com/results?q=test&page=2#result-5';

    mockStorage.search.mockResolvedValue([
      {
        id: '1',
        content: 'Search result content',
        metadata: {
          url: complexUrl,
          source: 'Search Results',
        },
        similarity: 0.8,
      },
    ]);

    const response = await ragService.query('What are the search results?');

    expect(response.sources).toContain(complexUrl);
    expect(response.sources[0]).toMatch(/\?q=test/);
    expect(response.sources[0]).toMatch(/#result-5/);
  });

  it('should not truncate URLs to base domain', async () => {
    const mockStorage = (await import('./storage/storage-strategy')).__mockStorage;
    const fullUrl = 'https://subdomain.example.com/path/to/deep/page';

    mockStorage.search.mockResolvedValue([
      {
        id: '1',
        content: 'Deep page content',
        metadata: {
          url: fullUrl,
          source: 'Deep Page',
        },
        similarity: 0.9,
      },
    ]);

    const response = await ragService.query('What is on the deep page?');

    // Should NOT be truncated to just 'example.com' or 'subdomain.example.com'
    expect(response.sources[0]).toBe(fullUrl);
    expect(response.sources[0]).not.toBe('example.com');
    expect(response.sources[0]).not.toBe('subdomain.example.com');
    expect(response.sources[0]).toContain('/path/to/deep/page');
  });

  it('should handle multiple documents from same domain with different paths', async () => {
    const mockStorage = (await import('./storage/storage-strategy')).__mockStorage;
    const url1 = 'https://docs.example.com/api/users';
    const url2 = 'https://docs.example.com/api/posts';
    const url3 = 'https://docs.example.com/guides/authentication';

    mockStorage.search.mockResolvedValue([
      {
        id: '1',
        content: 'Users API',
        metadata: { url: url1, source: 'API Docs' },
        similarity: 0.9,
      },
      {
        id: '2',
        content: 'Posts API',
        metadata: { url: url2, source: 'API Docs' },
        similarity: 0.85,
      },
      {
        id: '3',
        content: 'Auth Guide',
        metadata: { url: url3, source: 'Guides' },
        similarity: 0.8,
      },
    ]);

    const response = await ragService.query('Tell me about the APIs');

    // All three distinct URLs should be present
    expect(response.sources).toHaveLength(3);
    expect(response.sources).toContain(url1);
    expect(response.sources).toContain(url2);
    expect(response.sources).toContain(url3);

    // They should not all be collapsed to the same base domain
    const uniqueUrls = new Set(response.sources);
    expect(uniqueUrls.size).toBe(3);
  });
});
