import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGvsDirectAnalyzer, ComparisonResult, BenchmarkReport } from './rag-vs-direct-analyzer';
import { EvalDataset } from './eval-dataset';
import { MetricsCollector } from './metrics-collector';

// Mock the chat API
vi.mock('@/app/api/chat/route', () => ({
  POST: vi.fn(),
}));

describe('RAGvsDirectAnalyzer', () => {
  let analyzer: RAGvsDirectAnalyzer;
  let dataset: EvalDataset;
  let collector: MetricsCollector;

  beforeEach(() => {
    dataset = new EvalDataset();
    collector = new MetricsCollector();
    analyzer = new RAGvsDirectAnalyzer(dataset, collector);
  });

  describe('initialization', () => {
    it('should initialize with dataset and collector', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.getDataset()).toBe(dataset);
      expect(analyzer.getCollector()).toBe(collector);
    });

    it('should set API endpoint', () => {
      analyzer.setApiEndpoint('http://localhost:3000/api/chat');
      expect(analyzer.getApiEndpoint()).toBe('http://localhost:3000/api/chat');
    });
  });

  describe('query execution', () => {
    it('should run a query in specific mode', async () => {
      const mockResponse = {
        response: 'Test response',
        confidence: 0.85,
        mode: 'rag',
        metrics: {
          responseTime: 250,
        },
      };

      // Mock the API call
      const runQuerySpy = vi
        .spyOn(analyzer as any, 'runQueryInMode')
        .mockResolvedValue(mockResponse);

      const result = await analyzer.runQueryInMode('Test query', 'rag');

      expect(runQuerySpy).toHaveBeenCalledWith('Test query', 'rag');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      const runQuerySpy = vi
        .spyOn(analyzer as any, 'runQueryInMode')
        .mockRejectedValue(new Error('API Error'));

      await expect(analyzer.runQueryInMode('Test query', 'rag')).rejects.toThrow('API Error');
    });
  });

  describe('comparison execution', () => {
    it('should run comparison for a single query', async () => {
      const query = dataset.getQuery('factual-1');
      if (!query) throw new Error('Query not found');

      // Mock API responses
      const mockRagResponse = {
        response: 'Paris is the capital',
        confidence: 0.9,
        mode: 'rag',
        metrics: { responseTime: 300 },
      };

      const mockDirectResponse = {
        response: 'Paris',
        confidence: 0.95,
        mode: 'direct',
        metrics: { responseTime: 100 },
      };

      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => {
          return mode === 'rag' ? mockRagResponse : mockDirectResponse;
        }
      );

      const result = await analyzer.runComparison(query);

      expect(result).toHaveProperty('queryId', 'factual-1');
      expect(result).toHaveProperty('ragResponse');
      expect(result).toHaveProperty('directResponse');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('ragMetrics');
      expect(result.metrics).toHaveProperty('directMetrics');
    });

    it('should calculate winner based on criteria', async () => {
      const query = dataset.getQuery('factual-1');
      if (!query) throw new Error('Query not found');

      const mockRagResponse = {
        response: 'Paris',
        confidence: 0.9,
        mode: 'rag',
        metrics: { responseTime: 300 },
      };

      const mockDirectResponse = {
        response: 'Paris',
        confidence: 0.95,
        mode: 'direct',
        metrics: { responseTime: 100 },
      };

      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => {
          return mode === 'rag' ? mockRagResponse : mockDirectResponse;
        }
      );

      const result = await analyzer.runComparison(query);

      expect(result).toHaveProperty('winner');
      expect(result.winner).toBe('direct'); // Direct wins on speed and confidence
    });
  });

  describe('benchmark execution', () => {
    it('should run benchmark on sample queries', async () => {
      // Mock API responses for all queries
      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => ({
          response: 'Test response',
          confidence: mode === 'rag' ? 0.85 : 0.75,
          mode,
          metrics: {
            responseTime: mode === 'rag' ? 250 : 150,
            tokensUsed: mode === 'rag' ? 100 : 80,
            estimatedCost: mode === 'rag' ? 0.002 : 0.0015,
          },
        })
      );

      const sampleSize = 4;
      const report = await analyzer.runBenchmark(sampleSize);

      expect(report).toHaveProperty('totalQueries', sampleSize);
      expect(report).toHaveProperty('comparisons');
      expect(report.comparisons).toHaveLength(sampleSize);
      expect(report).toHaveProperty('aggregatedMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('timestamp');
    });

    it('should aggregate metrics across all comparisons', async () => {
      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => ({
          response: 'Test response',
          confidence: mode === 'rag' ? 0.85 : 0.75,
          mode,
          metrics: {
            responseTime: mode === 'rag' ? 250 : 150,
            tokensUsed: mode === 'rag' ? 100 : 80,
            estimatedCost: mode === 'rag' ? 0.002 : 0.0015,
          },
        })
      );

      const report = await analyzer.runBenchmark(2);

      expect(report.aggregatedMetrics).toHaveProperty('rag');
      expect(report.aggregatedMetrics).toHaveProperty('direct');
      expect(report.aggregatedMetrics.rag.avgResponseTime).toBeCloseTo(250);
      expect(report.aggregatedMetrics.direct.avgResponseTime).toBeCloseTo(150);
    });
  });

  describe('decision matrix', () => {
    it('should generate decision matrix based on benchmarks', async () => {
      // Run a small benchmark first
      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => ({
          response: 'Test response',
          confidence: mode === 'rag' ? 0.85 : 0.75,
          mode,
          metrics: {
            responseTime: mode === 'rag' ? 250 : 150,
            tokensUsed: mode === 'rag' ? 100 : 80,
            estimatedCost: mode === 'rag' ? 0.002 : 0.0015,
          },
        })
      );

      await analyzer.runBenchmark(4);
      const matrix = analyzer.generateDecisionMatrix();

      expect(matrix).toHaveProperty('speedCritical', 'direct');
      expect(matrix).toHaveProperty('accuracyCritical', 'rag');
      expect(matrix).toHaveProperty('costSensitive', 'direct');
      expect(matrix).toHaveProperty('balanced');
      expect(matrix).toHaveProperty('recommendations');
    });

    it('should provide query complexity scoring', () => {
      const simpleQuery = 'What is 2+2?';
      const complexQuery = 'Explain the implications of quantum computing on cryptography';

      const simpleScore = analyzer.scoreQueryComplexity(simpleQuery);
      const complexScore = analyzer.scoreQueryComplexity(complexQuery);

      expect(simpleScore).toBeLessThan(complexScore);
      expect(simpleScore).toBeGreaterThanOrEqual(0);
      expect(simpleScore).toBeLessThanOrEqual(1);
    });

    it('should recommend mode based on query characteristics', () => {
      const factualQuery = 'What is the capital of France?';
      const retrievalQuery = 'What does the documentation say about BaseAgent?';

      const factualRecommendation = analyzer.recommendMode(factualQuery);
      const retrievalRecommendation = analyzer.recommendMode(retrievalQuery);

      expect(factualRecommendation).toBe('direct');
      expect(retrievalRecommendation).toBe('rag');
    });
  });

  describe('report generation', () => {
    it('should generate markdown report', async () => {
      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => ({
          response: 'Test response',
          confidence: mode === 'rag' ? 0.85 : 0.75,
          mode,
          metrics: {
            responseTime: mode === 'rag' ? 250 : 150,
            tokensUsed: mode === 'rag' ? 100 : 80,
            estimatedCost: mode === 'rag' ? 0.002 : 0.0015,
          },
        })
      );

      await analyzer.runBenchmark(2);
      const report = analyzer.generateMarkdownReport();

      expect(report).toContain('# RAG vs Direct Comparison Analysis');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Performance Metrics');
      expect(report).toContain('## Cost Analysis');
      expect(report).toContain('## Recommendations');
      expect(report).toContain('## Decision Matrix');
    });

    it('should export results to JSON', async () => {
      vi.spyOn(analyzer as any, 'runQueryInMode').mockImplementation(
        async (query: string, mode: string) => ({
          response: 'Test response',
          confidence: mode === 'rag' ? 0.85 : 0.75,
          mode,
          metrics: { responseTime: mode === 'rag' ? 250 : 150 },
        })
      );

      await analyzer.runBenchmark(2);
      const json = analyzer.exportResults();

      expect(json).toHaveProperty('benchmark');
      expect(json).toHaveProperty('decisionMatrix');
      expect(json).toHaveProperty('metrics');
      expect(json).toHaveProperty('timestamp');
    });
  });
});
