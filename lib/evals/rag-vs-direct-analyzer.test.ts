import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGvsDirectAnalyzer, AnalysisResult, QueryPair } from './rag-vs-direct-analyzer';
import { EvalDataset } from './eval-dataset';
import { MetricsCollector } from './metrics-collector';

describe('RAGvsDirectAnalyzer', () => {
  let analyzer: RAGvsDirectAnalyzer;
  let mockDataset: EvalDataset;
  let mockCollector: MetricsCollector;

  beforeEach(() => {
    mockDataset = {
      getQueries: vi.fn().mockReturnValue([
        {
          id: 'q1',
          query: 'What is TypeScript?',
          expectedAnswer: 'A typed superset of JavaScript',
          topic: 'programming',
        },
        {
          id: 'q2',
          query: 'How does React work?',
          expectedAnswer: 'Component-based UI library',
          topic: 'frontend',
        },
      ]),
    } as any;

    mockCollector = new MetricsCollector();
    analyzer = new RAGvsDirectAnalyzer(mockDataset, mockCollector);
  });

  describe('Analysis Setup', () => {
    it('should initialize with dataset and collector', () => {
      expect(analyzer).toBeInstanceOf(RAGvsDirectAnalyzer);
    });

    it('should set analysis configuration', () => {
      const config = {
        sampleSize: 10,
        confidenceThreshold: 0.8,
        includeAccuracy: true,
      };

      analyzer.configure(config);
      const result = analyzer.getConfig();

      expect(result.sampleSize).toBe(config.sampleSize);
      expect(result.confidenceThreshold).toBe(config.confidenceThreshold);
      expect(result.includeAccuracy).toBe(config.includeAccuracy);
    });
  });

  describe('Query Execution', () => {
    it('should execute single query in both modes', async () => {
      const mockRAGResponse = {
        answer: 'TypeScript is a typed superset of JavaScript',
        confidence: 0.9,
        sources: ['https://example.com'],
        responseTime: 200,
        tokensUsed: 1000,
      };

      const mockDirectResponse = {
        answer: 'TypeScript adds static typing to JavaScript',
        confidence: 0.85,
        sources: [],
        responseTime: 100,
        tokensUsed: 500,
      };

      const mockQueryFn = vi
        .fn()
        .mockResolvedValueOnce(mockRAGResponse)
        .mockResolvedValueOnce(mockDirectResponse);

      const result = await analyzer.executeQueryPair('What is TypeScript?', mockQueryFn);

      expect(result).toEqual({
        query: 'What is TypeScript?',
        rag: mockRAGResponse,
        direct: mockDirectResponse,
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(2);
      expect(mockQueryFn).toHaveBeenCalledWith('What is TypeScript?', 'rag');
      expect(mockQueryFn).toHaveBeenCalledWith('What is TypeScript?', 'direct');
    });

    it('should handle query execution errors', async () => {
      const mockQueryFn = vi.fn().mockRejectedValue(new Error('API Error'));

      await expect(analyzer.executeQueryPair('Invalid query', mockQueryFn)).rejects.toThrow(
        'API Error'
      );
    });
  });

  describe('Batch Analysis', () => {
    it('should run full comparison analysis', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({
        answer: 'Mock answer',
        confidence: 0.8,
        sources: [],
        responseTime: 150,
        tokensUsed: 750,
      });

      const result = await analyzer.runAnalysis(mockQueryFn, { sampleSize: 2 });

      expect(result.summary.totalQueries).toBe(2);
      expect(result.summary.ragQueries).toBe(2);
      expect(result.summary.directQueries).toBe(2);
      expect(result.queryPairs).toHaveLength(2);
      expect(mockQueryFn).toHaveBeenCalledTimes(4); // 2 queries × 2 modes
    });

    it('should respect sample size configuration', async () => {
      const queries = Array.from({ length: 10 }, (_, i) => ({
        id: `q${i}`,
        query: `Query ${i}`,
        expectedAnswer: `Answer ${i}`,
        topic: 'test',
      }));

      mockDataset.getQueries = vi.fn().mockReturnValue(queries);

      const mockQueryFn = vi.fn().mockResolvedValue({
        answer: 'Mock answer',
        confidence: 0.8,
        sources: [],
        responseTime: 150,
        tokensUsed: 750,
      });

      const result = await analyzer.runAnalysis(mockQueryFn, { sampleSize: 3 });

      expect(result.queryPairs).toHaveLength(3);
      expect(mockQueryFn).toHaveBeenCalledTimes(6); // 3 queries × 2 modes
    });
  });

  describe('Performance Comparison', () => {
    beforeEach(() => {
      // Add mock metrics for comparison
      mockCollector.addMetrics({
        queryId: 'rag-1',
        mode: 'rag',
        responseTime: 300,
        tokensUsed: 1200,
        estimatedCost: 0.024,
        confidence: 0.85,
      });

      mockCollector.addMetrics({
        queryId: 'direct-1',
        mode: 'direct',
        responseTime: 100,
        tokensUsed: 400,
        estimatedCost: 0.008,
        confidence: 0.9,
      });
    });

    it('should generate performance comparison', () => {
      const comparison = analyzer.comparePerformance();

      expect(comparison.rag.avgResponseTime).toBe(300);
      expect(comparison.direct.avgResponseTime).toBe(100);
      expect(comparison.speedImprovement).toBe(3);
      expect(comparison.costReduction).toBe(3);
      expect(comparison.confidenceChange).toBe(-0.05);
    });

    it('should identify performance winners', () => {
      const winners = analyzer.getPerformanceWinners();

      expect(winners.speed).toBe('direct');
      expect(winners.cost).toBe('direct');
      expect(winners.confidence).toBe('direct');
    });
  });

  describe('Statistical Analysis', () => {
    beforeEach(() => {
      // Add more metrics for statistical analysis
      for (let i = 0; i < 10; i++) {
        mockCollector.addMetrics({
          queryId: `rag-${i}`,
          mode: 'rag',
          responseTime: 250 + Math.random() * 100,
          tokensUsed: 1000 + Math.random() * 200,
          estimatedCost: 0.02 + Math.random() * 0.01,
          confidence: 0.8 + Math.random() * 0.1,
        });

        mockCollector.addMetrics({
          queryId: `direct-${i}`,
          mode: 'direct',
          responseTime: 80 + Math.random() * 40,
          tokensUsed: 300 + Math.random() * 100,
          estimatedCost: 0.006 + Math.random() * 0.004,
          confidence: 0.9 + Math.random() * 0.05,
        });
      }
    });

    it('should calculate significance tests', () => {
      const stats = analyzer.calculateStatistics();

      expect(stats.responseTime.pValue).toBeDefined();
      expect(stats.confidence.pValue).toBeDefined();
      expect(stats.cost.pValue).toBeDefined();
      expect(stats.responseTime.significant).toBe(true);
    });

    it('should calculate effect sizes', () => {
      const effectSizes = analyzer.calculateEffectSizes();

      expect(effectSizes.responseTime).toBeGreaterThan(0);
      expect(effectSizes.confidence).toBeDefined();
      expect(effectSizes.cost).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive analysis report', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({
        answer: 'Mock answer',
        confidence: 0.8,
        sources: [],
        responseTime: 150,
        tokensUsed: 750,
      });

      const result = await analyzer.runAnalysis(mockQueryFn, { sampleSize: 2 });
      const report = analyzer.generateReport(result);

      expect(report).toContain('RAG vs Direct Mode Analysis Report');
      expect(report).toContain('Performance Comparison');
      expect(report).toContain('Statistical Significance');
      expect(report).toContain('Recommendations');
    });

    it('should export results to JSON', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue({
        answer: 'Mock answer',
        confidence: 0.8,
        sources: [],
        responseTime: 150,
        tokensUsed: 750,
      });

      const result = await analyzer.runAnalysis(mockQueryFn, { sampleSize: 1 });
      const json = analyzer.exportToJSON(result);

      const parsed = JSON.parse(json);
      expect(parsed.summary).toBeDefined();
      expect(parsed.queryPairs).toBeDefined();
      expect(parsed.performance).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle partial failures gracefully', async () => {
      const mockQueryFn = vi
        .fn()
        .mockResolvedValueOnce({
          // First RAG call succeeds
          answer: 'Success',
          confidence: 0.8,
          sources: [],
          responseTime: 150,
          tokensUsed: 750,
        })
        .mockRejectedValueOnce(new Error('Direct mode failed')); // First direct call fails

      const result = await analyzer.runAnalysis(mockQueryFn, {
        sampleSize: 1,
        continueOnError: true,
      });

      expect(result.summary.errors).toBe(1);
      expect(result.queryPairs[0].direct).toBeNull();
      expect(result.queryPairs[0].rag).toBeDefined();
    });

    it('should collect error statistics', async () => {
      const mockQueryFn = vi.fn().mockRejectedValue(new Error('Timeout'));

      const result = await analyzer.runAnalysis(mockQueryFn, {
        sampleSize: 2,
        continueOnError: true,
      });

      expect(result.summary.errors).toBe(4); // 2 queries × 2 modes
      expect(result.summary.successRate).toBe(0);
    });
  });
});
