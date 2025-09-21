import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsCollector, PerformanceMetrics } from './metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timer Management', () => {
    it('should start and stop a timer', () => {
      const id = 'test-query-1';

      collector.startTimer(id);
      vi.advanceTimersByTime(150);
      const elapsed = collector.stopTimer(id);

      expect(elapsed).toBe(150);
    });

    it('should handle multiple concurrent timers', () => {
      collector.startTimer('query-1');
      vi.advanceTimersByTime(100);

      collector.startTimer('query-2');
      vi.advanceTimersByTime(50);

      const elapsed1 = collector.stopTimer('query-1');
      const elapsed2 = collector.stopTimer('query-2');

      expect(elapsed1).toBe(150);
      expect(elapsed2).toBe(50);
    });

    it('should return -1 for non-existent timer', () => {
      const elapsed = collector.stopTimer('non-existent');
      expect(elapsed).toBe(-1);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect basic metrics', () => {
      const metrics: PerformanceMetrics = {
        queryId: 'test-1',
        mode: 'rag',
        responseTime: 250,
        tokensUsed: 1500,
        estimatedCost: 0.03,
        confidence: 0.85,
      };

      collector.addMetrics(metrics);
      const collected = collector.getMetrics('test-1');

      expect(collected).toEqual(metrics);
    });

    it('should collect metrics with accuracy', () => {
      const metrics: PerformanceMetrics = {
        queryId: 'test-2',
        mode: 'direct',
        responseTime: 100,
        tokensUsed: 500,
        estimatedCost: 0.01,
        confidence: 0.95,
        accuracy: 0.9,
        relevance: 0.85,
      };

      collector.addMetrics(metrics);
      const collected = collector.getMetrics('test-2');

      expect(collected?.accuracy).toBe(0.9);
      expect(collected?.relevance).toBe(0.85);
    });

    it('should get metrics by mode', () => {
      collector.addMetrics({
        queryId: 'rag-1',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
      });

      collector.addMetrics({
        queryId: 'direct-1',
        mode: 'direct',
        responseTime: 50,
        tokensUsed: 300,
        estimatedCost: 0.006,
        confidence: 0.95,
      });

      const ragMetrics = collector.getMetricsByMode('rag');
      const directMetrics = collector.getMetricsByMode('direct');

      expect(ragMetrics.length).toBe(1);
      expect(directMetrics.length).toBe(1);
      expect(ragMetrics[0].mode).toBe('rag');
      expect(directMetrics[0].mode).toBe('direct');
    });
  });

  describe('Statistical Analysis', () => {
    beforeEach(() => {
      // Add sample metrics for analysis
      collector.addMetrics({
        queryId: 'q1',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
      });

      collector.addMetrics({
        queryId: 'q2',
        mode: 'rag',
        responseTime: 300,
        tokensUsed: 1200,
        estimatedCost: 0.024,
        confidence: 0.85,
      });

      collector.addMetrics({
        queryId: 'q3',
        mode: 'direct',
        responseTime: 50,
        tokensUsed: 300,
        estimatedCost: 0.006,
        confidence: 0.95,
      });

      collector.addMetrics({
        queryId: 'q4',
        mode: 'direct',
        responseTime: 100,
        tokensUsed: 400,
        estimatedCost: 0.008,
        confidence: 0.9,
      });
    });

    it('should calculate average metrics by mode', () => {
      const ragAvg = collector.getAverageMetrics('rag');
      const directAvg = collector.getAverageMetrics('direct');

      expect(ragAvg.responseTime).toBe(250);
      expect(ragAvg.tokensUsed).toBe(1100);
      expect(ragAvg.confidence).toBe(0.825);

      expect(directAvg.responseTime).toBe(75);
      expect(directAvg.tokensUsed).toBe(350);
      expect(directAvg.confidence).toBe(0.925);
    });

    it('should calculate percentiles', () => {
      const p50 = collector.getPercentile('responseTime', 50);
      const p90 = collector.getPercentile('responseTime', 90);

      expect(p50).toBe(150); // Median
      expect(p90).toBe(270); // 90th percentile
    });

    it('should calculate standard deviation', () => {
      const stdDev = collector.getStandardDeviation('responseTime');
      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeLessThan(150);
    });

    it('should generate comparison report', () => {
      const comparison = collector.compareModesReport('rag', 'direct');

      expect(comparison.rag.avgResponseTime).toBe(250);
      expect(comparison.direct.avgResponseTime).toBe(75);
      expect(comparison.speedup).toBe(3.33);
      expect(comparison.costRatio).toBe(3.14);
      expect(comparison.confidenceDiff).toBe(-0.1);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost based on tokens', () => {
      const cost = collector.estimateCost(1500, 'gpt-4');
      expect(cost).toBeCloseTo(0.045, 3); // $0.03 per 1K input + $0.06 per 1K output
    });

    it('should use different rates for different models', () => {
      const gpt4Cost = collector.estimateCost(1000, 'gpt-4');
      const gpt35Cost = collector.estimateCost(1000, 'gpt-3.5-turbo');

      expect(gpt4Cost).toBeGreaterThan(gpt35Cost);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics to CSV', () => {
      collector.addMetrics({
        queryId: 'export-1',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
      });

      const csv = collector.exportToCSV();

      expect(csv).toContain('queryId,mode,responseTime,tokensUsed');
      expect(csv).toContain('export-1,rag,200,1000');
    });

    it('should export metrics summary', () => {
      collector.addMetrics({
        queryId: 'summary-1',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
      });

      const summary = collector.getSummary();

      expect(summary.totalQueries).toBe(1);
      expect(summary.byMode.rag).toBe(1);
      expect(summary.avgResponseTime).toBe(200);
      expect(summary.totalCost).toBe(0.02);
    });
  });

  describe('Metrics Filtering', () => {
    it('should filter metrics by time range', () => {
      const now = Date.now();

      collector.addMetrics({
        queryId: 'old',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
        timestamp: now - 10000,
      });

      collector.addMetrics({
        queryId: 'recent',
        mode: 'direct',
        responseTime: 100,
        tokensUsed: 500,
        estimatedCost: 0.01,
        confidence: 0.9,
        timestamp: now - 1000,
      });

      const recentMetrics = collector.getMetricsInTimeRange(now - 5000, now);

      expect(recentMetrics.length).toBe(1);
      expect(recentMetrics[0].queryId).toBe('recent');
    });

    it('should clear all metrics', () => {
      collector.addMetrics({
        queryId: 'clear-1',
        mode: 'rag',
        responseTime: 200,
        tokensUsed: 1000,
        estimatedCost: 0.02,
        confidence: 0.8,
      });

      expect(collector.getAllMetrics().length).toBe(1);

      collector.clear();
      expect(collector.getAllMetrics().length).toBe(0);
    });
  });
});
