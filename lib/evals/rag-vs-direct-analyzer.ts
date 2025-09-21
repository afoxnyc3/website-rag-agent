import { EvalDataset, EvalQuery } from './eval-dataset';
import { MetricsCollector, PerformanceMetrics } from './metrics-collector';

export interface QueryResponse {
  answer: string;
  confidence: number;
  sources: string[];
  responseTime: number;
  tokensUsed: number;
}

export interface QueryPair {
  query: string;
  rag: QueryResponse | null;
  direct: QueryResponse | null;
  error?: string;
}

export interface AnalysisConfig {
  sampleSize?: number;
  confidenceThreshold?: number;
  includeAccuracy?: boolean;
  continueOnError?: boolean;
}

export interface PerformanceComparison {
  rag: { avgResponseTime: number; avgTokens: number; avgCost: number; avgConfidence: number };
  direct: { avgResponseTime: number; avgTokens: number; avgCost: number; avgConfidence: number };
  speedImprovement: number;
  costReduction: number;
  confidenceChange: number;
}

export interface StatisticalTest {
  pValue: number;
  significant: boolean;
  confidenceInterval: [number, number];
}

export interface AnalysisSummary {
  totalQueries: number;
  ragQueries: number;
  directQueries: number;
  errors: number;
  successRate: number;
  avgResponseTime: { rag: number; direct: number };
  avgConfidence: { rag: number; direct: number };
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  queryPairs: QueryPair[];
  performance: PerformanceComparison;
  statistics?: { [metric: string]: StatisticalTest };
  timestamp: number;
}

export type QueryFunction = (query: string, mode: 'rag' | 'direct') => Promise<QueryResponse>;

export class RAGvsDirectAnalyzer {
  private config: AnalysisConfig = {
    sampleSize: 10,
    confidenceThreshold: 0.7,
    includeAccuracy: false,
    continueOnError: false,
  };

  constructor(
    private dataset: EvalDataset,
    private collector: MetricsCollector
  ) {}

  configure(config: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AnalysisConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  async executeQueryPair(query: string, queryFn: QueryFunction): Promise<QueryPair> {
    try {
      const ragResponse = await queryFn(query, 'rag');
      const directResponse = await queryFn(query, 'direct');

      return {
        query,
        rag: ragResponse,
        direct: directResponse,
      };
    } catch (error) {
      throw error;
    }
  }

  async runAnalysis(
    queryFn: QueryFunction,
    options?: Partial<AnalysisConfig>
  ): Promise<AnalysisResult> {
    const config = { ...this.config, ...options };
    const queries = this.dataset.getQueries().slice(0, config.sampleSize);

    const queryPairs: QueryPair[] = [];
    let errors = 0;
    let ragCount = 0;
    let directCount = 0;

    for (const evalQuery of queries) {
      let ragResponse: QueryResponse | null = null;
      let directResponse: QueryResponse | null = null;

      try {
        ragResponse = await this.executeSingleQuery(evalQuery.query, 'rag', queryFn);
        if (ragResponse) ragCount++;
      } catch (error) {
        errors++;
        if (!config.continueOnError) throw error;
      }

      try {
        directResponse = await this.executeSingleQuery(evalQuery.query, 'direct', queryFn);
        if (directResponse) directCount++;
      } catch (error) {
        errors++;
        if (!config.continueOnError) throw error;
      }

      queryPairs.push({
        query: evalQuery.query,
        rag: ragResponse,
        direct: directResponse,
        error: ragResponse === null && directResponse === null ? 'Both queries failed' : undefined,
      });
    }

    const performance = this.comparePerformance();
    const summary = this.calculateSummary(queryPairs, errors);

    return {
      summary,
      queryPairs,
      performance,
      timestamp: Date.now(),
    };
  }

  private async executeSingleQuery(
    query: string,
    mode: 'rag' | 'direct',
    queryFn: QueryFunction
  ): Promise<QueryResponse | null> {
    try {
      const startTime = Date.now();
      const response = await queryFn(query, mode);
      const responseTime = Date.now() - startTime;

      // Add metrics to collector
      this.collector.addMetrics({
        queryId: `${mode}-${Date.now()}-${Math.random()}`,
        mode,
        responseTime: response.responseTime || responseTime,
        tokensUsed: response.tokensUsed,
        estimatedCost: this.collector.estimateCost(response.tokensUsed, 'gpt-4'),
        confidence: response.confidence,
      });

      return response;
    } catch (error) {
      if (this.config.continueOnError) {
        return null;
      }
      throw error;
    }
  }

  private calculateSummary(queryPairs: QueryPair[], errors: number): AnalysisSummary {
    const ragResponses = queryPairs.filter((p) => p.rag).map((p) => p.rag!);
    const directResponses = queryPairs.filter((p) => p.direct).map((p) => p.direct!);

    const totalAttempts = queryPairs.length * 2;
    const successfulResponses = ragResponses.length + directResponses.length;

    return {
      totalQueries: queryPairs.length,
      ragQueries: ragResponses.length,
      directQueries: directResponses.length,
      errors,
      successRate: successfulResponses / totalAttempts,
      avgResponseTime: {
        rag: ragResponses.reduce((sum, r) => sum + r.responseTime, 0) / ragResponses.length || 0,
        direct:
          directResponses.reduce((sum, r) => sum + r.responseTime, 0) / directResponses.length || 0,
      },
      avgConfidence: {
        rag: ragResponses.reduce((sum, r) => sum + r.confidence, 0) / ragResponses.length || 0,
        direct:
          directResponses.reduce((sum, r) => sum + r.confidence, 0) / directResponses.length || 0,
      },
    };
  }

  comparePerformance(): PerformanceComparison {
    const ragAvg = this.collector.getAverageMetrics('rag');
    const directAvg = this.collector.getAverageMetrics('direct');

    const speedImprovement = Math.round(ragAvg.responseTime / directAvg.responseTime);
    const costReduction = Math.round(ragAvg.estimatedCost / directAvg.estimatedCost);
    const confidenceChange = Math.round((ragAvg.confidence - directAvg.confidence) * 100) / 100;

    return {
      rag: {
        avgResponseTime: ragAvg.responseTime,
        avgTokens: ragAvg.tokensUsed,
        avgCost: ragAvg.estimatedCost,
        avgConfidence: ragAvg.confidence,
      },
      direct: {
        avgResponseTime: directAvg.responseTime,
        avgTokens: directAvg.tokensUsed,
        avgCost: directAvg.estimatedCost,
        avgConfidence: directAvg.confidence,
      },
      speedImprovement,
      costReduction,
      confidenceChange,
    };
  }

  getPerformanceWinners(): { speed: string; cost: string; confidence: string } {
    const ragAvg = this.collector.getAverageMetrics('rag');
    const directAvg = this.collector.getAverageMetrics('direct');

    return {
      speed: ragAvg.responseTime < directAvg.responseTime ? 'rag' : 'direct',
      cost: ragAvg.estimatedCost < directAvg.estimatedCost ? 'rag' : 'direct',
      confidence: ragAvg.confidence > directAvg.confidence ? 'rag' : 'direct',
    };
  }

  calculateStatistics(): { [metric: string]: StatisticalTest } {
    const ragMetrics = this.collector.getMetricsByMode('rag');
    const directMetrics = this.collector.getMetricsByMode('direct');

    if (ragMetrics.length < 2 || directMetrics.length < 2) {
      return {};
    }

    return {
      responseTime: this.performTTest(
        ragMetrics.map((m) => m.responseTime),
        directMetrics.map((m) => m.responseTime)
      ),
      confidence: this.performTTest(
        ragMetrics.map((m) => m.confidence),
        directMetrics.map((m) => m.confidence)
      ),
      cost: this.performTTest(
        ragMetrics.map((m) => m.estimatedCost),
        directMetrics.map((m) => m.estimatedCost)
      ),
    };
  }

  private performTTest(sample1: number[], sample2: number[]): StatisticalTest {
    // Simple two-sample t-test implementation
    const mean1 = sample1.reduce((a, b) => a + b, 0) / sample1.length;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / sample2.length;

    const var1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (sample1.length - 1);
    const var2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (sample2.length - 1);

    const pooledSE = Math.sqrt(var1 / sample1.length + var2 / sample2.length);
    const tStat = Math.abs(mean1 - mean2) / pooledSE;

    // Simplified p-value calculation (assumes normal distribution)
    const pValue = 2 * (1 - this.normalCDF(tStat));

    return {
      pValue: Math.max(pValue, 0.001), // Minimum p-value
      significant: pValue < 0.05,
      confidenceInterval: [mean1 - mean2 - 1.96 * pooledSE, mean1 - mean2 + 1.96 * pooledSE],
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of the error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  calculateEffectSizes(): { [metric: string]: number } {
    const ragMetrics = this.collector.getMetricsByMode('rag');
    const directMetrics = this.collector.getMetricsByMode('direct');

    return {
      responseTime: this.cohensD(
        ragMetrics.map((m) => m.responseTime),
        directMetrics.map((m) => m.responseTime)
      ),
      confidence: this.cohensD(
        ragMetrics.map((m) => m.confidence),
        directMetrics.map((m) => m.confidence)
      ),
      cost: this.cohensD(
        ragMetrics.map((m) => m.estimatedCost),
        directMetrics.map((m) => m.estimatedCost)
      ),
    };
  }

  private cohensD(sample1: number[], sample2: number[]): number {
    if (sample1.length === 0 || sample2.length === 0) return 0;

    const mean1 = sample1.reduce((a, b) => a + b, 0) / sample1.length;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / sample2.length;

    const var1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (sample1.length - 1);
    const var2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (sample2.length - 1);

    const pooledSD = Math.sqrt(
      ((sample1.length - 1) * var1 + (sample2.length - 1) * var2) /
        (sample1.length + sample2.length - 2)
    );

    return Math.abs(mean1 - mean2) / pooledSD;
  }

  generateReport(result: AnalysisResult): string {
    const report = [
      '# RAG vs Direct Mode Analysis Report',
      `Generated: ${new Date(result.timestamp).toISOString()}`,
      '',
      '## Summary',
      `- Total Queries: ${result.summary.totalQueries}`,
      `- Success Rate: ${(result.summary.successRate * 100).toFixed(1)}%`,
      `- Errors: ${result.summary.errors}`,
      '',
      '## Performance Comparison',
      '### Response Time',
      `- RAG: ${result.performance.rag.avgResponseTime.toFixed(0)}ms`,
      `- Direct: ${result.performance.direct.avgResponseTime.toFixed(0)}ms`,
      `- Speed Improvement: ${result.performance.speedImprovement}x`,
      '',
      '### Cost Analysis',
      `- RAG: $${result.performance.rag.avgCost.toFixed(4)}`,
      `- Direct: $${result.performance.direct.avgCost.toFixed(4)}`,
      `- Cost Reduction: ${result.performance.costReduction}x`,
      '',
      '### Confidence Scores',
      `- RAG: ${result.performance.rag.avgConfidence.toFixed(3)}`,
      `- Direct: ${result.performance.direct.avgConfidence.toFixed(3)}`,
      `- Confidence Change: ${result.performance.confidenceChange >= 0 ? '+' : ''}${result.performance.confidenceChange.toFixed(3)}`,
      '',
      '## Statistical Significance',
      result.statistics
        ? this.formatStatistics(result.statistics)
        : 'Insufficient data for statistical analysis',
      '',
      '## Recommendations',
      this.generateRecommendations(result),
    ];

    return report.join('\n');
  }

  private formatStatistics(stats: { [metric: string]: StatisticalTest }): string {
    return Object.entries(stats)
      .map(
        ([metric, test]) =>
          `- ${metric}: p=${test.pValue.toFixed(4)} (${test.significant ? 'significant' : 'not significant'})`
      )
      .join('\n');
  }

  private generateRecommendations(result: AnalysisResult): string {
    const winners = this.getPerformanceWinners();
    const recommendations = [];

    if (winners.speed === 'direct') {
      recommendations.push('- Consider using direct mode for time-sensitive queries');
    } else {
      recommendations.push('- RAG mode provides better response times');
    }

    if (winners.cost === 'direct') {
      recommendations.push('- Direct mode is more cost-effective');
    } else {
      recommendations.push('- RAG mode offers better cost efficiency');
    }

    if (winners.confidence === 'rag') {
      recommendations.push('- RAG mode provides higher confidence scores');
    } else {
      recommendations.push('- Direct mode achieves higher confidence');
    }

    if (result.summary.successRate < 0.9) {
      recommendations.push('- Review error handling and retry mechanisms');
    }

    return recommendations.join('\n');
  }

  exportToJSON(result: AnalysisResult): string {
    const exportData = {
      ...result,
      performance: result.performance,
      exportedAt: new Date().toISOString(),
      configuration: this.config,
    };

    return JSON.stringify(exportData, null, 2);
  }
}
