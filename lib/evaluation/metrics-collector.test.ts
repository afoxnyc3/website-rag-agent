import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, PerformanceMetrics, AggregatedMetrics } from './metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('metrics collection', () => {
    it('should record performance metrics', () => {
      const metrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
        tokensUsed: 100,
        estimatedCost: 0.002,
        confidence: 0.85,
        timestamp: new Date(),
      };

      collector.recordMetrics(metrics);
      const allMetrics = collector.getAllMetrics();
      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0]).toMatchObject({
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
      });
    });

    it('should record multiple metrics for same query', () => {
      const ragMetrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
        tokensUsed: 100,
        estimatedCost: 0.002,
        confidence: 0.85,
        timestamp: new Date(),
      };

      const directMetrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'direct',
        responseTime: 150,
        tokensUsed: 80,
        estimatedCost: 0.0015,
        confidence: 0.7,
        timestamp: new Date(),
      };

      collector.recordMetrics(ragMetrics);
      collector.recordMetrics(directMetrics);

      const queryMetrics = collector.getMetricsByQuery('test-1');
      expect(queryMetrics).toHaveLength(2);
      expect(queryMetrics.map((m) => m.mode)).toContain('rag');
      expect(queryMetrics.map((m) => m.mode)).toContain('direct');
    });
  });

  describe('metrics retrieval', () => {
    beforeEach(() => {
      // Add sample metrics
      const metrics: PerformanceMetrics[] = [
        {
          queryId: 'q1',
          mode: 'rag',
          responseTime: 300,
          tokensUsed: 120,
          estimatedCost: 0.0024,
          confidence: 0.9,
          timestamp: new Date(),
        },
        {
          queryId: 'q1',
          mode: 'direct',
          responseTime: 100,
          tokensUsed: 50,
          estimatedCost: 0.001,
          confidence: 0.7,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'agent',
          responseTime: 5000,
          tokensUsed: 500,
          estimatedCost: 0.01,
          confidence: 0.95,
          timestamp: new Date(),
        },
      ];

      metrics.forEach((m) => collector.recordMetrics(m));
    });

    it('should get metrics by mode', () => {
      const ragMetrics = collector.getMetricsByMode('rag');
      expect(ragMetrics).toHaveLength(1);
      expect(ragMetrics[0].mode).toBe('rag');
    });

    it('should get metrics by query ID', () => {
      const q1Metrics = collector.getMetricsByQuery('q1');
      expect(q1Metrics).toHaveLength(2);
      expect(q1Metrics.every((m) => m.queryId === 'q1')).toBe(true);
    });

    it('should get all metrics', () => {
      const allMetrics = collector.getAllMetrics();
      expect(allMetrics).toHaveLength(3);
    });
  });

  describe('metrics aggregation', () => {
    beforeEach(() => {
      const metrics: PerformanceMetrics[] = [
        {
          queryId: 'q1',
          mode: 'rag',
          responseTime: 200,
          tokensUsed: 100,
          estimatedCost: 0.002,
          confidence: 0.8,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'rag',
          responseTime: 300,
          tokensUsed: 150,
          estimatedCost: 0.003,
          confidence: 0.9,
          timestamp: new Date(),
        },
        {
          queryId: 'q3',
          mode: 'rag',
          responseTime: 250,
          tokensUsed: 125,
          estimatedCost: 0.0025,
          confidence: 0.85,
          timestamp: new Date(),
        },
        {
          queryId: 'q1',
          mode: 'direct',
          responseTime: 100,
          tokensUsed: 50,
          estimatedCost: 0.001,
          confidence: 0.6,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'direct',
          responseTime: 150,
          tokensUsed: 75,
          estimatedCost: 0.0015,
          confidence: 0.7,
          timestamp: new Date(),
        },
      ];

      metrics.forEach((m) => collector.recordMetrics(m));
    });

    it('should aggregate metrics by mode', () => {
      const aggregated = collector.aggregateByMode();

      expect(aggregated).toHaveProperty('rag');
      expect(aggregated).toHaveProperty('direct');

      expect(aggregated.rag.count).toBe(3);
      expect(aggregated.rag.avgResponseTime).toBe(250);
      expect(aggregated.rag.avgTokensUsed).toBe(125);
      expect(aggregated.rag.avgConfidence).toBeCloseTo(0.85, 2);

      expect(aggregated.direct.count).toBe(2);
      expect(aggregated.direct.avgResponseTime).toBe(125);
    });

    it('should calculate statistics for a mode', () => {
      const stats = collector.getStatistics('rag');

      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('median');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('stdDev');

      expect(stats.mean.responseTime).toBe(250);
      expect(stats.median.responseTime).toBe(250);
      expect(stats.min.responseTime).toBe(200);
      expect(stats.max.responseTime).toBe(300);
    });

    it('should calculate overall statistics', () => {
      const stats = collector.getStatistics();

      expect(stats.mean.responseTime).toBe(200); // (200+300+250+100+150) / 5
      expect(stats.min.responseTime).toBe(100);
      expect(stats.max.responseTime).toBe(300);
    });
  });

  describe('comparison analysis', () => {
    beforeEach(() => {
      // Add paired metrics for same queries
      const metrics: PerformanceMetrics[] = [
        {
          queryId: 'q1',
          mode: 'rag',
          responseTime: 300,
          tokensUsed: 120,
          estimatedCost: 0.0024,
          confidence: 0.9,
          timestamp: new Date(),
        },
        {
          queryId: 'q1',
          mode: 'direct',
          responseTime: 100,
          tokensUsed: 50,
          estimatedCost: 0.001,
          confidence: 0.7,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'rag',
          responseTime: 250,
          tokensUsed: 100,
          estimatedCost: 0.002,
          confidence: 0.85,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'direct',
          responseTime: 120,
          tokensUsed: 60,
          estimatedCost: 0.0012,
          confidence: 0.65,
          timestamp: new Date(),
        },
      ];

      metrics.forEach((m) => collector.recordMetrics(m));
    });

    it('should compare two modes', () => {
      const comparison = collector.compareMode('rag', 'direct');

      expect(comparison).toHaveProperty('mode1Stats');
      expect(comparison).toHaveProperty('mode2Stats');
      expect(comparison).toHaveProperty('differences');

      expect(comparison.differences.responseTime).toBeGreaterThan(0); // RAG slower
      expect(comparison.differences.tokensUsed).toBeGreaterThan(0); // RAG uses more tokens
      expect(comparison.differences.confidence).toBeGreaterThan(0); // RAG more confident
    });

    it('should identify best mode for each metric', () => {
      const best = collector.getBestModeByMetric('responseTime');
      expect(best).toBe('direct'); // Direct is faster

      const bestConfidence = collector.getBestModeByMetric('confidence');
      expect(bestConfidence).toBe('rag'); // RAG has higher confidence
    });

    it('should generate comparison summary', () => {
      const summary = collector.getComparisonSummary();

      expect(summary).toHaveProperty('fastest');
      expect(summary).toHaveProperty('mostAccurate');
      expect(summary).toHaveProperty('mostCostEffective');
      expect(summary).toHaveProperty('recommendations');

      expect(summary.fastest).toBe('direct');
      expect(summary.mostAccurate).toBe('rag');
      expect(summary.mostCostEffective).toBe('direct');
    });
  });

  describe('export functionality', () => {
    it('should export metrics to CSV format', () => {
      const metrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
        tokensUsed: 100,
        estimatedCost: 0.002,
        confidence: 0.85,
        timestamp: new Date('2025-01-01T12:00:00Z'),
      };

      collector.recordMetrics(metrics);
      const csv = collector.toCSV();

      expect(csv).toContain('queryId,mode,responseTime,tokensUsed,estimatedCost,confidence');
      expect(csv).toContain('test-1,rag,250,100,0.002,0.85');
    });

    it('should export metrics to JSON', () => {
      const metrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
        tokensUsed: 100,
        estimatedCost: 0.002,
        confidence: 0.85,
        timestamp: new Date(),
      };

      collector.recordMetrics(metrics);
      const json = collector.toJSON();

      expect(json).toHaveProperty('metrics');
      expect(json).toHaveProperty('summary');
      expect(json.metrics).toHaveLength(1);
      expect(json.summary).toHaveProperty('totalQueries');
    });
  });

  describe('cost analysis', () => {
    beforeEach(() => {
      const metrics: PerformanceMetrics[] = [
        {
          queryId: 'q1',
          mode: 'rag',
          responseTime: 200,
          tokensUsed: 100,
          estimatedCost: 0.002,
          confidence: 0.8,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'rag',
          responseTime: 300,
          tokensUsed: 150,
          estimatedCost: 0.003,
          confidence: 0.9,
          timestamp: new Date(),
        },
        {
          queryId: 'q1',
          mode: 'direct',
          responseTime: 100,
          tokensUsed: 200,
          estimatedCost: 0.004,
          confidence: 0.6,
          timestamp: new Date(),
        },
        {
          queryId: 'q2',
          mode: 'direct',
          responseTime: 150,
          tokensUsed: 250,
          estimatedCost: 0.005,
          confidence: 0.7,
          timestamp: new Date(),
        },
      ];

      metrics.forEach((m) => collector.recordMetrics(m));
    });

    it('should calculate total cost by mode', () => {
      const costByMode = collector.getCostAnalysis();

      expect(costByMode.rag.totalCost).toBeCloseTo(0.005, 4); // 0.002 + 0.003
      expect(costByMode.direct.totalCost).toBeCloseTo(0.009, 4); // 0.004 + 0.005
    });

    it('should project costs for larger scale', () => {
      const projection = collector.projectCosts(1000); // Project for 1000 queries

      expect(projection).toHaveProperty('rag');
      expect(projection).toHaveProperty('direct');

      // Average cost per query * 1000
      expect(projection.rag).toBeCloseTo(2.5, 1); // (0.002 + 0.003) / 2 * 1000
      expect(projection.direct).toBeCloseTo(4.5, 1); // (0.004 + 0.005) / 2 * 1000
    });
  });
});
