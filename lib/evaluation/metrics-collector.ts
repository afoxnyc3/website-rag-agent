export interface PerformanceMetrics {
  queryId: string;
  mode: 'rag' | 'direct' | 'agent';
  responseTime: number; // milliseconds
  tokensUsed: number;
  estimatedCost: number; // dollars
  confidence: number; // 0-1
  timestamp: Date;
  accuracy?: number; // 0-1, if ground truth available
  relevance?: number; // 0-1, if evaluated
}

export interface AggregatedMetrics {
  count: number;
  avgResponseTime: number;
  avgTokensUsed: number;
  avgEstimatedCost: number;
  avgConfidence: number;
  totalCost: number;
  minResponseTime: number;
  maxResponseTime: number;
}

export interface Statistics {
  mean: {
    responseTime: number;
    tokensUsed: number;
    confidence: number;
    cost: number;
  };
  median: {
    responseTime: number;
    tokensUsed: number;
    confidence: number;
    cost: number;
  };
  min: {
    responseTime: number;
    tokensUsed: number;
    confidence: number;
    cost: number;
  };
  max: {
    responseTime: number;
    tokensUsed: number;
    confidence: number;
    cost: number;
  };
  stdDev: {
    responseTime: number;
    tokensUsed: number;
    confidence: number;
    cost: number;
  };
}

export interface ModeComparison {
  mode1Stats: AggregatedMetrics;
  mode2Stats: AggregatedMetrics;
  differences: {
    responseTime: number;
    tokensUsed: number;
    estimatedCost: number;
    confidence: number;
  };
}

export interface ComparisonSummary {
  fastest: string;
  mostAccurate: string;
  mostCostEffective: string;
  recommendations: string[];
}

export interface CostAnalysis {
  [mode: string]: {
    totalCost: number;
    avgCostPerQuery: number;
    queriesProcessed: number;
  };
}

export class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
  }

  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getMetricsByMode(mode: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.mode === mode);
  }

  getMetricsByQuery(queryId: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.queryId === queryId);
  }

  aggregateByMode(): Record<string, AggregatedMetrics> {
    const modes = ['rag', 'direct', 'agent'];
    const result: Record<string, AggregatedMetrics> = {};

    modes.forEach((mode) => {
      const modeMetrics = this.getMetricsByMode(mode);
      if (modeMetrics.length > 0) {
        result[mode] = this.calculateAggregates(modeMetrics);
      }
    });

    return result;
  }

  private calculateAggregates(metrics: PerformanceMetrics[]): AggregatedMetrics {
    const count = metrics.length;
    const responseTimes = metrics.map((m) => m.responseTime);
    const tokensUsed = metrics.map((m) => m.tokensUsed);
    const costs = metrics.map((m) => m.estimatedCost);
    const confidences = metrics.map((m) => m.confidence);

    return {
      count,
      avgResponseTime: this.average(responseTimes),
      avgTokensUsed: this.average(tokensUsed),
      avgEstimatedCost: this.average(costs),
      avgConfidence: this.average(confidences),
      totalCost: costs.reduce((a, b) => a + b, 0),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
    };
  }

  getStatistics(mode?: string): Statistics {
    const metrics = mode ? this.getMetricsByMode(mode) : this.metrics;

    if (metrics.length === 0) {
      return this.emptyStatistics();
    }

    const responseTimes = metrics.map((m) => m.responseTime);
    const tokensUsed = metrics.map((m) => m.tokensUsed);
    const confidences = metrics.map((m) => m.confidence);
    const costs = metrics.map((m) => m.estimatedCost);

    return {
      mean: {
        responseTime: this.average(responseTimes),
        tokensUsed: this.average(tokensUsed),
        confidence: this.average(confidences),
        cost: this.average(costs),
      },
      median: {
        responseTime: this.median(responseTimes),
        tokensUsed: this.median(tokensUsed),
        confidence: this.median(confidences),
        cost: this.median(costs),
      },
      min: {
        responseTime: Math.min(...responseTimes),
        tokensUsed: Math.min(...tokensUsed),
        confidence: Math.min(...confidences),
        cost: Math.min(...costs),
      },
      max: {
        responseTime: Math.max(...responseTimes),
        tokensUsed: Math.max(...tokensUsed),
        confidence: Math.max(...confidences),
        cost: Math.max(...costs),
      },
      stdDev: {
        responseTime: this.standardDeviation(responseTimes),
        tokensUsed: this.standardDeviation(tokensUsed),
        confidence: this.standardDeviation(confidences),
        cost: this.standardDeviation(costs),
      },
    };
  }

  compareMode(mode1: string, mode2: string): ModeComparison {
    const mode1Metrics = this.getMetricsByMode(mode1);
    const mode2Metrics = this.getMetricsByMode(mode2);

    const mode1Stats = this.calculateAggregates(mode1Metrics);
    const mode2Stats = this.calculateAggregates(mode2Metrics);

    return {
      mode1Stats,
      mode2Stats,
      differences: {
        responseTime: mode1Stats.avgResponseTime - mode2Stats.avgResponseTime,
        tokensUsed: mode1Stats.avgTokensUsed - mode2Stats.avgTokensUsed,
        estimatedCost: mode1Stats.avgEstimatedCost - mode2Stats.avgEstimatedCost,
        confidence: mode1Stats.avgConfidence - mode2Stats.avgConfidence,
      },
    };
  }

  getBestModeByMetric(
    metric: 'responseTime' | 'tokensUsed' | 'estimatedCost' | 'confidence'
  ): string {
    const aggregated = this.aggregateByMode();
    let bestMode = '';
    let bestValue = metric === 'confidence' ? -Infinity : Infinity;

    Object.entries(aggregated).forEach(([mode, stats]) => {
      const value =
        metric === 'responseTime'
          ? stats.avgResponseTime
          : metric === 'tokensUsed'
            ? stats.avgTokensUsed
            : metric === 'estimatedCost'
              ? stats.avgEstimatedCost
              : stats.avgConfidence;

      const isBetter = metric === 'confidence' ? value > bestValue : value < bestValue;

      if (isBetter) {
        bestValue = value;
        bestMode = mode;
      }
    });

    return bestMode;
  }

  getComparisonSummary(): ComparisonSummary {
    return {
      fastest: this.getBestModeByMetric('responseTime'),
      mostAccurate: this.getBestModeByMetric('confidence'),
      mostCostEffective: this.getBestModeByMetric('estimatedCost'),
      recommendations: this.generateRecommendations(),
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const aggregated = this.aggregateByMode();

    // Analyze trade-offs
    if (aggregated.rag && aggregated.direct) {
      const ragStats = aggregated.rag;
      const directStats = aggregated.direct;

      if (ragStats.avgConfidence > directStats.avgConfidence * 1.2) {
        recommendations.push('Use RAG for queries requiring high accuracy');
      }

      if (directStats.avgResponseTime < ragStats.avgResponseTime * 0.5) {
        recommendations.push('Use Direct for time-sensitive queries');
      }

      if (directStats.avgEstimatedCost < ragStats.avgEstimatedCost * 0.7) {
        recommendations.push('Use Direct for cost optimization');
      }
    }

    if (aggregated.agent) {
      recommendations.push('Use Agent mode for complex queries requiring web data');
    }

    return recommendations;
  }

  getCostAnalysis(): CostAnalysis {
    const result: CostAnalysis = {};
    const modes = ['rag', 'direct', 'agent'];

    modes.forEach((mode) => {
      const modeMetrics = this.getMetricsByMode(mode);
      if (modeMetrics.length > 0) {
        const totalCost = modeMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
        result[mode] = {
          totalCost,
          avgCostPerQuery: totalCost / modeMetrics.length,
          queriesProcessed: modeMetrics.length,
        };
      }
    });

    return result;
  }

  projectCosts(numQueries: number): Record<string, number> {
    const costAnalysis = this.getCostAnalysis();
    const projections: Record<string, number> = {};

    Object.entries(costAnalysis).forEach(([mode, analysis]) => {
      projections[mode] = analysis.avgCostPerQuery * numQueries;
    });

    return projections;
  }

  toCSV(): string {
    const headers = [
      'queryId',
      'mode',
      'responseTime',
      'tokensUsed',
      'estimatedCost',
      'confidence',
      'timestamp',
    ];
    const rows = this.metrics.map((m) => [
      m.queryId,
      m.mode,
      m.responseTime,
      m.tokensUsed,
      m.estimatedCost,
      m.confidence,
      m.timestamp.toISOString(),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  toJSON(): { metrics: PerformanceMetrics[]; summary: any } {
    return {
      metrics: this.metrics,
      summary: {
        totalQueries: new Set(this.metrics.map((m) => m.queryId)).size,
        totalMetrics: this.metrics.length,
        byMode: this.aggregateByMode(),
        comparisonSummary: this.getComparisonSummary(),
        costAnalysis: this.getCostAnalysis(),
      },
    };
  }

  // Utility functions
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  private emptyStatistics(): Statistics {
    return {
      mean: { responseTime: 0, tokensUsed: 0, confidence: 0, cost: 0 },
      median: { responseTime: 0, tokensUsed: 0, confidence: 0, cost: 0 },
      min: { responseTime: 0, tokensUsed: 0, confidence: 0, cost: 0 },
      max: { responseTime: 0, tokensUsed: 0, confidence: 0, cost: 0 },
      stdDev: { responseTime: 0, tokensUsed: 0, confidence: 0, cost: 0 },
    };
  }
}
