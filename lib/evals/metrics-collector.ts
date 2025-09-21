export interface PerformanceMetrics {
  queryId: string;
  mode: 'rag' | 'direct';
  responseTime: number;
  tokensUsed: number;
  estimatedCost: number;
  confidence: number;
  accuracy?: number;
  relevance?: number;
  timestamp?: number;
}

interface ModeComparison {
  rag: { avgResponseTime: number; avgTokens: number; avgCost: number; avgConfidence: number };
  direct: { avgResponseTime: number; avgTokens: number; avgCost: number; avgConfidence: number };
  speedup: number;
  costRatio: number;
  confidenceDiff: number;
}

interface MetricsSummary {
  totalQueries: number;
  byMode: { rag: number; direct: number };
  avgResponseTime: number;
  totalCost: number;
}

export class MetricsCollector {
  private timers = new Map<string, number>();
  private metrics = new Map<string, PerformanceMetrics>();

  startTimer(id: string): void {
    this.timers.set(id, Date.now());
  }

  stopTimer(id: string): number {
    const start = this.timers.get(id);
    if (!start) return -1;

    this.timers.delete(id);
    return Date.now() - start;
  }

  addMetrics(metrics: PerformanceMetrics): void {
    if (!metrics.timestamp) {
      metrics.timestamp = Date.now();
    }
    this.metrics.set(metrics.queryId, metrics);
  }

  getMetrics(queryId: string): PerformanceMetrics | undefined {
    return this.metrics.get(queryId);
  }

  getMetricsByMode(mode: 'rag' | 'direct'): PerformanceMetrics[] {
    return Array.from(this.metrics.values()).filter((m) => m.mode === mode);
  }

  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getAverageMetrics(mode: 'rag' | 'direct'): {
    responseTime: number;
    tokensUsed: number;
    estimatedCost: number;
    confidence: number;
  } {
    const modeMetrics = this.getMetricsByMode(mode);
    const count = modeMetrics.length;

    if (count === 0) {
      return { responseTime: 0, tokensUsed: 0, estimatedCost: 0, confidence: 0 };
    }

    return {
      responseTime: modeMetrics.reduce((sum, m) => sum + m.responseTime, 0) / count,
      tokensUsed: modeMetrics.reduce((sum, m) => sum + m.tokensUsed, 0) / count,
      estimatedCost: modeMetrics.reduce((sum, m) => sum + m.estimatedCost, 0) / count,
      confidence: modeMetrics.reduce((sum, m) => sum + m.confidence, 0) / count,
    };
  }

  getPercentile(field: keyof PerformanceMetrics, percentile: number): number {
    const values = Array.from(this.metrics.values())
      .map((m) => m[field] as number)
      .filter((v) => typeof v === 'number')
      .sort((a, b) => a - b);

    if (values.length === 0) return 0;

    if (percentile === 50) {
      // For median, use interpolation between middle values
      const midIndex = (values.length - 1) / 2;
      if (values.length % 2 === 0) {
        const lower = Math.floor(midIndex);
        const upper = Math.ceil(midIndex);
        return (values[lower] + values[upper]) / 2;
      } else {
        return values[Math.round(midIndex)];
      }
    }

    // For other percentiles, use interpolation
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return values[lower];
    }

    const weight = index - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  getStandardDeviation(field: keyof PerformanceMetrics): number {
    const values = Array.from(this.metrics.values())
      .map((m) => m[field] as number)
      .filter((v) => typeof v === 'number');

    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  compareModesReport(mode1: 'rag' | 'direct', mode2: 'rag' | 'direct'): ModeComparison {
    const avg1 = this.getAverageMetrics(mode1);
    const avg2 = this.getAverageMetrics(mode2);

    return {
      [mode1]: {
        avgResponseTime: avg1.responseTime,
        avgTokens: avg1.tokensUsed,
        avgCost: avg1.estimatedCost,
        avgConfidence: avg1.confidence,
      },
      [mode2]: {
        avgResponseTime: avg2.responseTime,
        avgTokens: avg2.tokensUsed,
        avgCost: avg2.estimatedCost,
        avgConfidence: avg2.confidence,
      },
      speedup: Math.round((avg1.responseTime / avg2.responseTime) * 100) / 100,
      costRatio: Math.round((avg1.estimatedCost / avg2.estimatedCost) * 100) / 100,
      confidenceDiff: Math.round((avg1.confidence - avg2.confidence) * 100) / 100,
    } as ModeComparison;
  }

  estimateCost(tokens: number, model: string): number {
    const rates = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    };

    const rate = rates[model as keyof typeof rates] || rates['gpt-4'];
    // Use input rate only for estimation (1500 * 0.03 / 1000 = 0.045)
    return (tokens / 1000) * rate.input;
  }

  exportToCSV(): string {
    const headers =
      'queryId,mode,responseTime,tokensUsed,estimatedCost,confidence,accuracy,relevance,timestamp';
    const rows = Array.from(this.metrics.values()).map(
      (m) =>
        `${m.queryId},${m.mode},${m.responseTime},${m.tokensUsed},${m.estimatedCost},${m.confidence},${m.accuracy || ''},${m.relevance || ''},${m.timestamp || ''}`
    );

    return [headers, ...rows].join('\n');
  }

  getSummary(): MetricsSummary {
    const allMetrics = this.getAllMetrics();
    const ragCount = this.getMetricsByMode('rag').length;
    const directCount = this.getMetricsByMode('direct').length;

    return {
      totalQueries: allMetrics.length,
      byMode: { rag: ragCount, direct: directCount },
      avgResponseTime:
        allMetrics.reduce((sum, m) => sum + m.responseTime, 0) / allMetrics.length || 0,
      totalCost: allMetrics.reduce((sum, m) => sum + m.estimatedCost, 0),
    };
  }

  getMetricsInTimeRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return Array.from(this.metrics.values()).filter(
      (m) => m.timestamp && m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  clear(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}
