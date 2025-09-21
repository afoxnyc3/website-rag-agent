import { describe, it, expect, beforeEach } from 'vitest';
import { EvalDataset, EvalQuery, QueryCategory } from './eval-dataset';

describe('EvalDataset', () => {
  let dataset: EvalDataset;

  beforeEach(() => {
    dataset = new EvalDataset();
  });

  describe('dataset initialization', () => {
    it('should initialize with default queries', () => {
      const queries = dataset.getAllQueries();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should have queries from all categories', () => {
      const categories = dataset.getCategories();
      expect(categories).toContain('factual');
      expect(categories).toContain('retrieval');
      expect(categories).toContain('reasoning');
      expect(categories).toContain('creative');
    });
  });

  describe('query management', () => {
    it('should add a new query to the dataset', () => {
      const newQuery: EvalQuery = {
        id: 'test-1',
        query: 'What is the capital of France?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'Paris',
        acceptableAnswers: ['Paris', 'Paris, France'],
      };

      dataset.addQuery(newQuery);
      const query = dataset.getQuery('test-1');
      expect(query).toEqual(newQuery);
    });

    it('should get queries by category', () => {
      const factualQueries = dataset.getQueriesByCategory('factual');
      expect(factualQueries.length).toBeGreaterThan(0);
      expect(factualQueries.every((q) => q.category === 'factual')).toBe(true);
    });

    it('should get a random query', () => {
      const query = dataset.getRandomQuery();
      expect(query).toBeDefined();
      expect(query?.id).toBeDefined();
    });

    it('should get a random query from specific category', () => {
      const query = dataset.getRandomQuery('factual');
      expect(query).toBeDefined();
      expect(query?.category).toBe('factual');
    });
  });

  describe('default queries', () => {
    it('should include factual queries', () => {
      const factual = dataset.getQueriesByCategory('factual');
      const capitalQuery = factual.find((q) => q.query.includes('capital'));
      expect(capitalQuery).toBeDefined();
    });

    it('should include retrieval queries', () => {
      const retrieval = dataset.getQueriesByCategory('retrieval');
      const ragQuery = retrieval.find((q) => q.query.toLowerCase().includes('baseagent'));
      expect(ragQuery).toBeDefined();
      expect(ragQuery?.expectedMode).toBe('rag');
    });

    it('should include reasoning queries', () => {
      const reasoning = dataset.getQueriesByCategory('reasoning');
      expect(reasoning.length).toBeGreaterThan(0);
      const whyQuery = reasoning.find((q) => q.query.toLowerCase().includes('why'));
      expect(whyQuery).toBeDefined();
    });

    it('should include creative queries', () => {
      const creative = dataset.getQueriesByCategory('creative');
      expect(creative.length).toBeGreaterThan(0);
      const generateQuery = creative.find(
        (q) =>
          q.query.toLowerCase().includes('generate') || q.query.toLowerCase().includes('create')
      );
      expect(generateQuery).toBeDefined();
    });
  });

  describe('query validation', () => {
    it('should validate query has required fields', () => {
      const validQuery: EvalQuery = {
        id: 'valid-1',
        query: 'Test query',
        category: 'factual',
        expectedMode: 'direct',
      };

      expect(dataset.isValidQuery(validQuery)).toBe(true);
    });

    it('should reject invalid query category', () => {
      const invalidQuery = {
        id: 'invalid-1',
        query: 'Test query',
        category: 'invalid' as any,
        expectedMode: 'direct' as const,
      };

      expect(dataset.isValidQuery(invalidQuery)).toBe(false);
    });

    it('should reject invalid expected mode', () => {
      const invalidQuery = {
        id: 'invalid-2',
        query: 'Test query',
        category: 'factual' as const,
        expectedMode: 'invalid' as any,
      };

      expect(dataset.isValidQuery(invalidQuery)).toBe(false);
    });
  });

  describe('dataset statistics', () => {
    it('should provide dataset statistics', () => {
      const stats = dataset.getStatistics();

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('byExpectedMode');

      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(Object.keys(stats.byCategory).length).toBe(4);
      expect(Object.keys(stats.byExpectedMode).length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate category distribution', () => {
      const stats = dataset.getStatistics();
      const totalByCategory = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
      expect(totalByCategory).toBe(stats.totalQueries);
    });
  });

  describe('query sampling', () => {
    it('should get a balanced sample across categories', () => {
      const sample = dataset.getBalancedSample(4);
      expect(sample.length).toBe(4);

      const categories = sample.map((q) => q.category);
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(4);
    });

    it('should handle sample size larger than available queries', () => {
      const sample = dataset.getBalancedSample(1000);
      expect(sample.length).toBeLessThanOrEqual(dataset.getAllQueries().length);
    });
  });

  describe('export and import', () => {
    it('should export dataset to JSON', () => {
      const exported = dataset.toJSON();
      expect(exported).toHaveProperty('queries');
      expect(exported).toHaveProperty('metadata');
      expect(exported.metadata).toHaveProperty('version');
      expect(exported.metadata).toHaveProperty('createdAt');
    });

    it('should import dataset from JSON', () => {
      const original = dataset.getAllQueries();
      const exported = dataset.toJSON();

      const newDataset = new EvalDataset();
      newDataset.fromJSON(exported);

      const imported = newDataset.getAllQueries();
      expect(imported.length).toBe(original.length);
    });
  });
});
