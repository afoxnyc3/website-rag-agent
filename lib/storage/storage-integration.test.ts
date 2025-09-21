import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StorageFactory } from './storage-strategy';
import { generateEmbedding } from '../embeddings';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Skip these tests in CI environment
const skipInCI = process.env.CI === 'true';

describe.skipIf(skipInCI)('Storage Integration Tests', () => {
  describe('Development Environment (Memory Storage)', () => {
    it('should use memory storage by default in development', async () => {
      process.env.NODE_ENV = 'development';
      const storage = StorageFactory.createStorage();
      await storage.initialize();

      const { embedding } = await generateEmbedding('Test document');
      await storage.addDocument(
        { id: 'test-1', content: 'Test document', metadata: {} },
        embedding
      );

      const results = await storage.search(embedding, 1);
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Test document');

      await storage.close();
    });
  });

  describe('Persistent Storage with Real Database', () => {
    it('should connect to real database and perform operations', async () => {
      // Force persistent storage
      const storage = StorageFactory.createStorage({ forcePersistent: true });

      try {
        await storage.initialize();
        console.log('Connected to database');

        // Add a document
        const { embedding } = await generateEmbedding('Database test document');
        await storage.addDocument(
          {
            id: `test-db-${Date.now()}`,
            content: 'Database test document',
            metadata: { source: 'integration-test' },
          },
          embedding
        );

        // Search for it
        const searchResults = await storage.search(embedding, 5);
        const found = searchResults.find((r) => r.content === 'Database test document');
        expect(found).toBeDefined();
        expect(found?.metadata?.source).toBe('integration-test');

        // Clean up
        if (found) {
          await storage.deleteDocument(found.id);
        }

        await storage.close();
      } catch (error) {
        console.error('Database test failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout for database operations
  });

  describe('Environment Switching', () => {
    it('should switch storage type based on USE_PERSISTENT_STORAGE', async () => {
      // Test memory storage
      process.env.USE_PERSISTENT_STORAGE = 'false';
      expect(StorageFactory.getStorageType()).toBe('memory');

      // Test persistent storage
      process.env.USE_PERSISTENT_STORAGE = 'true';
      expect(StorageFactory.getStorageType()).toBe('persistent');

      // Clean up
      delete process.env.USE_PERSISTENT_STORAGE;
    });

    it('should default to memory storage when no env is set', () => {
      delete process.env.NODE_ENV;
      delete process.env.USE_PERSISTENT_STORAGE;
      expect(StorageFactory.getStorageType()).toBe('memory');
    });
  });
});
