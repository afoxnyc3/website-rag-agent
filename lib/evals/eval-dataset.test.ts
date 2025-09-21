import { describe, it, expect, beforeEach } from 'vitest';
import { EvalDataset, EvalQuery } from './eval-dataset';

describe('EvalDataset', () => {
  let dataset: EvalDataset;

  beforeEach(() => {
    dataset = new EvalDataset();
  });

  describe('Initialization', () => {
    it('should load default queries on initialization', () => {
      const queries = dataset.getQueries();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should have queries for all categories', () => {
      const queries = dataset.getQueries();
      const categories = new Set(queries.map((q) => q.category));

      expect(categories.has('factual')).toBe(true);
      expect(categories.has('reasoning')).toBe(true);
      expect(categories.has('creative')).toBe(true);
      expect(categories.has('retrieval')).toBe(true);
    });

    it('should assign unique IDs to each query', () => {
      const queries = dataset.getQueries();
      const ids = queries.map((q) => q.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Query Management', () => {
    it('should add custom queries', () => {
      const customQuery: EvalQuery = {
        id: 'custom-1',
        query: 'What is TypeScript?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'TypeScript is a typed superset of JavaScript',
      };

      dataset.addQuery(customQuery);
      const queries = dataset.getQueries();

      expect(queries).toContainEqual(customQuery);
    });

    it('should get queries by category', () => {
      const factualQueries = dataset.getQueriesByCategory('factual');

      expect(factualQueries.length).toBeGreaterThan(0);
      expect(factualQueries.every((q) => q.category === 'factual')).toBe(true);
    });

    it('should get queries by expected mode', () => {
      const ragQueries = dataset.getQueriesByMode('rag');

      expect(ragQueries.length).toBeGreaterThan(0);
      expect(ragQueries.every((q) => q.expectedMode === 'rag')).toBe(true);
    });

    it('should get a random query', () => {
      const query1 = dataset.getRandomQuery();
      const query2 = dataset.getRandomQuery();

      expect(query1).toBeDefined();
      expect(query1.id).toBeDefined();
      expect(query1.query).toBeDefined();
    });

    it('should get a random query from specific category', () => {
      const query = dataset.getRandomQuery('factual');

      expect(query).toBeDefined();
      expect(query.category).toBe('factual');
    });
  });

  describe('Default Query Validation', () => {
    it('should have well-formed factual queries', () => {
      const factualQueries = dataset.getQueriesByCategory('factual');

      factualQueries.forEach((q) => {
        expect(q.id).toMatch(/^factual-\d+$/);
        expect(q.query.length).toBeGreaterThan(5);
        expect(['direct', 'rag']).toContain(q.expectedMode);
      });
    });

    it('should have well-formed retrieval queries', () => {
      const retrievalQueries = dataset.getQueriesByCategory('retrieval');

      retrievalQueries.forEach((q) => {
        expect(q.id).toMatch(/^retrieval-\d+$/);
        expect(q.expectedMode).toBe('rag');
        expect(q.query.toLowerCase()).toContain('document');
      });
    });

    it('should have well-formed reasoning queries', () => {
      const reasoningQueries = dataset.getQueriesByCategory('reasoning');

      reasoningQueries.forEach((q) => {
        expect(q.id).toMatch(/^reasoning-\d+$/);
        expect(['direct', 'agent']).toContain(q.expectedMode);
        expect(q.query).toContain('?');
      });
    });

    it('should have well-formed creative queries', () => {
      const creativeQueries = dataset.getQueriesByCategory('creative');

      creativeQueries.forEach((q) => {
        expect(q.id).toMatch(/^creative-\d+$/);
        expect(q.expectedMode).toBe('direct');
        expect(q.query.toLowerCase()).toMatch(/generate|create|write/);
      });
    });
  });

  describe('Query Sampling', () => {
    it('should get a stratified sample across categories', () => {
      const sample = dataset.getStratifiedSample(4);

      expect(sample.length).toBe(4);

      const categories = sample.map((q) => q.category);
      expect(new Set(categories).size).toBe(4);
    });

    it('should handle sample size larger than categories', () => {
      const sample = dataset.getStratifiedSample(8);

      expect(sample.length).toBe(8);

      const categoryCounts = sample.reduce(
        (acc, q) => {
          acc[q.category] = (acc[q.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Each category should have 2 queries
      Object.values(categoryCounts).forEach((count) => {
        expect(count).toBe(2);
      });
    });

    it('should handle partial sample sizes', () => {
      const sample = dataset.getStratifiedSample(3);

      expect(sample.length).toBe(3);
      const categories = new Set(sample.map((q) => q.category));
      expect(categories.size).toBe(3);
    });
  });

  describe('Dataset Statistics', () => {
    it('should provide dataset statistics', () => {
      const stats = dataset.getStatistics();

      expect(stats.totalQueries).toBe(dataset.getQueries().length);
      expect(stats.byCategory).toBeDefined();
      expect(stats.byMode).toBeDefined();

      expect(stats.byCategory.factual).toBeGreaterThan(0);
      expect(stats.byCategory.retrieval).toBeGreaterThan(0);
      expect(stats.byCategory.reasoning).toBeGreaterThan(0);
      expect(stats.byCategory.creative).toBeGreaterThan(0);

      expect(stats.byMode.direct).toBeGreaterThan(0);
      expect(stats.byMode.rag).toBeGreaterThan(0);
    });
  });

  describe('Export and Import', () => {
    it('should export dataset to JSON', () => {
      const exported = dataset.toJSON();

      expect(exported).toBeDefined();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBe(dataset.getQueries().length);
    });

    it('should import dataset from JSON', () => {
      const customQueries: EvalQuery[] = [
        {
          id: 'test-1',
          query: 'Test query 1',
          category: 'factual',
          expectedMode: 'direct',
        },
        {
          id: 'test-2',
          query: 'Test query 2',
          category: 'retrieval',
          expectedMode: 'rag',
        },
      ];

      const newDataset = EvalDataset.fromJSON(customQueries);
      expect(newDataset.getQueries()).toEqual(customQueries);
    });
  });
});
