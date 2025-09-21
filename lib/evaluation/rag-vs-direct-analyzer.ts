import { EvalDataset, EvalQuery } from './eval-dataset';
import { MetricsCollector, PerformanceMetrics } from './metrics-collector';

export interface APIResponse {
  response: string;
  confidence: number;
  mode: string;
  metrics?: {
    responseTime?: number;
    tokensUsed?: number;
    estimatedCost?: number;
  };
  sources?: string[];
}

export interface ComparisonResult {
  queryId: string;
  query: string;
  category: string;
  ragResponse: APIResponse;
  directResponse: APIResponse;
  metrics: {
    ragMetrics: PerformanceMetrics;
    directMetrics: PerformanceMetrics;
  };
  winner: 'rag' | 'direct' | 'tie';
  winnerReason: string;
}

export interface BenchmarkReport {
  totalQueries: number;
  comparisons: ComparisonResult[];
  aggregatedMetrics: Record<string, any>;
  recommendations: string[];
  timestamp: Date;
}

export interface DecisionMatrix {
  speedCritical: string;
  accuracyCritical: string;
  costSensitive: string;
  balanced: string;
  recommendations: {
    queryType: string;
    recommendedMode: string;
    reason: string;
  }[];
}

export class RAGvsDirectAnalyzer {
  private apiEndpoint = '/api/chat';
  private benchmarkReport?: BenchmarkReport;

  constructor(
    private dataset: EvalDataset,
    private collector: MetricsCollector
  ) {}

  getDataset(): EvalDataset {
    return this.dataset;
  }

  getCollector(): MetricsCollector {
    return this.collector;
  }

  setApiEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }

  getApiEndpoint(): string {
    return this.apiEndpoint;
  }

  async runQueryInMode(query: string, mode: 'rag' | 'direct'): Promise<APIResponse> {
    const startTime = Date.now();

    try {
      // For testing, we'll simulate the API call
      // In production, this would make an actual HTTP request
      const response = await this.simulateAPICall(query, mode);
      const responseTime = Date.now() - startTime;

      return {
        ...response,
        metrics: {
          ...response.metrics,
          responseTime,
        },
      };
    } catch (error) {
      throw new Error(`Failed to run query in ${mode} mode: ${error}`);
    }
  }

  private async simulateAPICall(query: string, mode: 'rag' | 'direct'): Promise<APIResponse> {
    // Simulate different responses based on mode
    // In production, this would be an actual fetch call

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, mode === 'rag' ? 200 : 100));

    return {
      response: `${mode.toUpperCase()} response for: ${query}`,
      confidence: mode === 'rag' ? 0.85 : 0.75,
      mode,
      metrics: {
        tokensUsed: mode === 'rag' ? 100 : 80,
        estimatedCost: mode === 'rag' ? 0.002 : 0.0015,
      },
    };
  }

  async runComparison(query: EvalQuery): Promise<ComparisonResult> {
    // Run query in both modes
    const [ragResponse, directResponse] = await Promise.all([
      this.runQueryInMode(query.query, 'rag'),
      this.runQueryInMode(query.query, 'direct'),
    ]);

    // Create metrics records
    const ragMetrics: PerformanceMetrics = {
      queryId: query.id,
      mode: 'rag',
      responseTime: ragResponse.metrics?.responseTime || 0,
      tokensUsed: ragResponse.metrics?.tokensUsed || 0,
      estimatedCost: ragResponse.metrics?.estimatedCost || 0,
      confidence: ragResponse.confidence,
      timestamp: new Date(),
    };

    const directMetrics: PerformanceMetrics = {
      queryId: query.id,
      mode: 'direct',
      responseTime: directResponse.metrics?.responseTime || 0,
      tokensUsed: directResponse.metrics?.tokensUsed || 0,
      estimatedCost: directResponse.metrics?.estimatedCost || 0,
      confidence: directResponse.confidence,
      timestamp: new Date(),
    };

    // Record metrics
    this.collector.recordMetrics(ragMetrics);
    this.collector.recordMetrics(directMetrics);

    // Determine winner
    const { winner, reason } = this.determineWinner(ragMetrics, directMetrics, query);

    return {
      queryId: query.id,
      query: query.query,
      category: query.category,
      ragResponse,
      directResponse,
      metrics: {
        ragMetrics,
        directMetrics,
      },
      winner,
      winnerReason: reason,
    };
  }

  private determineWinner(
    ragMetrics: PerformanceMetrics,
    directMetrics: PerformanceMetrics,
    query: EvalQuery
  ): { winner: 'rag' | 'direct' | 'tie'; reason: string } {
    let ragScore = 0;
    let directScore = 0;
    const reasons: string[] = [];

    // Speed comparison (30% weight)
    if (ragMetrics.responseTime < directMetrics.responseTime) {
      ragScore += 30;
      reasons.push('RAG was faster');
    } else {
      directScore += 30;
      reasons.push('Direct was faster');
    }

    // Confidence comparison (40% weight)
    if (ragMetrics.confidence > directMetrics.confidence) {
      ragScore += 40;
      reasons.push('RAG had higher confidence');
    } else {
      directScore += 40;
      reasons.push('Direct had higher confidence');
    }

    // Cost comparison (30% weight)
    if (ragMetrics.estimatedCost < directMetrics.estimatedCost) {
      ragScore += 30;
      reasons.push('RAG was more cost-effective');
    } else {
      directScore += 30;
      reasons.push('Direct was more cost-effective');
    }

    if (Math.abs(ragScore - directScore) < 10) {
      return { winner: 'tie', reason: 'Scores too close to determine clear winner' };
    }

    return {
      winner: ragScore > directScore ? 'rag' : 'direct',
      reason: reasons.join('; '),
    };
  }

  async runBenchmark(sampleSize: number): Promise<BenchmarkReport> {
    const queries = this.dataset.getBalancedSample(sampleSize);
    const comparisons: ComparisonResult[] = [];

    // Run comparisons
    for (const query of queries) {
      const comparison = await this.runComparison(query);
      comparisons.push(comparison);
    }

    // Get aggregated metrics
    const aggregatedMetrics = this.collector.aggregateByMode();

    // Generate recommendations
    const recommendations = this.generateRecommendations(comparisons);

    this.benchmarkReport = {
      totalQueries: sampleSize,
      comparisons,
      aggregatedMetrics,
      recommendations,
      timestamp: new Date(),
    };

    return this.benchmarkReport;
  }

  private generateRecommendations(comparisons: ComparisonResult[]): string[] {
    const recommendations: string[] = [];

    // Analyze by category
    const categoryWinners: Record<string, Record<string, number>> = {};

    comparisons.forEach((comp) => {
      if (!categoryWinners[comp.category]) {
        categoryWinners[comp.category] = { rag: 0, direct: 0, tie: 0 };
      }
      categoryWinners[comp.category][comp.winner]++;
    });

    // Generate category-based recommendations
    Object.entries(categoryWinners).forEach(([category, winners]) => {
      const total = winners.rag + winners.direct + winners.tie;
      const ragPct = (winners.rag / total) * 100;
      const directPct = (winners.direct / total) * 100;

      if (ragPct > 60) {
        recommendations.push(
          `Use RAG for ${category} queries (won ${ragPct.toFixed(0)}% of tests)`
        );
      } else if (directPct > 60) {
        recommendations.push(
          `Use Direct for ${category} queries (won ${directPct.toFixed(0)}% of tests)`
        );
      } else {
        recommendations.push(`${category} queries show mixed results - consider query complexity`);
      }
    });

    // Overall performance recommendations
    const summary = this.collector.getComparisonSummary();
    recommendations.push(...summary.recommendations);

    return recommendations;
  }

  generateDecisionMatrix(): DecisionMatrix {
    const summary = this.collector.getComparisonSummary();

    return {
      speedCritical: summary.fastest,
      accuracyCritical: summary.mostAccurate,
      costSensitive: summary.mostCostEffective,
      balanced: this.determineBalancedMode(),
      recommendations: [
        {
          queryType: 'factual',
          recommendedMode: 'direct',
          reason: 'Simple factual queries are handled efficiently by direct mode',
        },
        {
          queryType: 'retrieval',
          recommendedMode: 'rag',
          reason: 'RAG excels at finding information from knowledge base',
        },
        {
          queryType: 'reasoning',
          recommendedMode: 'direct',
          reason: 'Complex reasoning benefits from full model capabilities',
        },
        {
          queryType: 'creative',
          recommendedMode: 'direct',
          reason: 'Creative tasks need unrestricted generation',
        },
      ],
    };
  }

  private determineBalancedMode(): string {
    const aggregated = this.collector.aggregateByMode();

    // Calculate balanced score for each mode
    const scores: Record<string, number> = {};

    Object.entries(aggregated).forEach(([mode, metrics]) => {
      // Balanced scoring: speed (25%), cost (25%), confidence (50%)
      const speedScore = 1000 / metrics.avgResponseTime; // Inverse for speed
      const costScore = 1 / metrics.avgEstimatedCost; // Inverse for cost
      const confidenceScore = metrics.avgConfidence * 100;

      scores[mode] = speedScore * 0.25 + costScore * 0.25 + confidenceScore * 0.5;
    });

    // Return mode with highest balanced score
    return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  scoreQueryComplexity(query: string): number {
    let score = 0;

    // Length factor
    if (query.length > 100) score += 0.3;
    else if (query.length > 50) score += 0.2;
    else score += 0.1;

    // Question complexity
    const complexWords = [
      'explain',
      'analyze',
      'compare',
      'evaluate',
      'implications',
      'relationship',
    ];
    complexWords.forEach((word) => {
      if (query.toLowerCase().includes(word)) score += 0.1;
    });

    // Technical terms
    const techTerms = ['algorithm', 'architecture', 'implementation', 'optimization', 'framework'];
    techTerms.forEach((term) => {
      if (query.toLowerCase().includes(term)) score += 0.05;
    });

    return Math.min(1, score);
  }

  recommendMode(query: string): 'rag' | 'direct' {
    // Check for factual patterns first (these should use Direct)
    const factualPatterns = [
      /what is the capital/i,
      /who is/i,
      /when did/i,
      /where is/i,
      /what year/i,
      /how many/i,
    ];
    const isFactual = factualPatterns.some((pattern) => pattern.test(query));

    if (isFactual) return 'direct';

    // Check for RAG indicators (knowledge base queries)
    const ragIndicators = [
      'documentation',
      'baseagent',
      'system',
      'configuration',
      'api',
      'say about',
    ];
    const hasRagIndicator = ragIndicators.some((indicator) =>
      query.toLowerCase().includes(indicator)
    );

    if (hasRagIndicator) return 'rag';

    // Check query complexity
    const complexity = this.scoreQueryComplexity(query);

    // Simple queries go to direct
    return complexity < 0.5 ? 'direct' : 'rag';
  }

  generateMarkdownReport(): string {
    if (!this.benchmarkReport) {
      return '# No benchmark data available\n\nRun a benchmark first using `runBenchmark()`';
    }

    const { totalQueries, comparisons, aggregatedMetrics, recommendations } = this.benchmarkReport;
    const matrix = this.generateDecisionMatrix();

    let report = '# RAG vs Direct Comparison Analysis\n\n';
    report += `*Generated: ${new Date().toISOString()}*\n\n`;

    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `- **Total Queries Tested**: ${totalQueries}\n`;
    report += `- **Fastest Mode**: ${matrix.speedCritical}\n`;
    report += `- **Most Accurate Mode**: ${matrix.accuracyCritical}\n`;
    report += `- **Most Cost-Effective**: ${matrix.costSensitive}\n`;
    report += `- **Best Balanced Mode**: ${matrix.balanced}\n\n`;

    // Performance Metrics
    report += '## Performance Metrics\n\n';
    report += '| Metric | RAG | Direct |\n';
    report += '|--------|-----|--------|\n';

    if (aggregatedMetrics.rag && aggregatedMetrics.direct) {
      report += `| Avg Response Time | ${aggregatedMetrics.rag.avgResponseTime.toFixed(0)}ms | ${aggregatedMetrics.direct.avgResponseTime.toFixed(0)}ms |\n`;
      report += `| Avg Tokens Used | ${aggregatedMetrics.rag.avgTokensUsed.toFixed(0)} | ${aggregatedMetrics.direct.avgTokensUsed.toFixed(0)} |\n`;
      report += `| Avg Cost | $${aggregatedMetrics.rag.avgEstimatedCost.toFixed(4)} | $${aggregatedMetrics.direct.avgEstimatedCost.toFixed(4)} |\n`;
      report += `| Avg Confidence | ${(aggregatedMetrics.rag.avgConfidence * 100).toFixed(1)}% | ${(aggregatedMetrics.direct.avgConfidence * 100).toFixed(1)}% |\n\n`;
    }

    // Cost Analysis
    report += '## Cost Analysis\n\n';
    const costAnalysis = this.collector.getCostAnalysis();
    const projection1k = this.collector.projectCosts(1000);
    const projection10k = this.collector.projectCosts(10000);

    report += '| Scale | RAG Cost | Direct Cost | Savings |\n';
    report += '|-------|----------|-------------|----------|\n';
    report += `| Current | $${costAnalysis.rag?.totalCost.toFixed(4) || '0'} | $${costAnalysis.direct?.totalCost.toFixed(4) || '0'} | - |\n`;
    report += `| 1K queries | $${projection1k.rag?.toFixed(2) || '0'} | $${projection1k.direct?.toFixed(2) || '0'} | $${Math.abs((projection1k.rag || 0) - (projection1k.direct || 0)).toFixed(2)} |\n`;
    report += `| 10K queries | $${projection10k.rag?.toFixed(2) || '0'} | $${projection10k.direct?.toFixed(2) || '0'} | $${Math.abs((projection10k.rag || 0) - (projection10k.direct || 0)).toFixed(2)} |\n\n`;

    // Recommendations
    report += '## Recommendations\n\n';
    recommendations.forEach((rec) => {
      report += `- ${rec}\n`;
    });
    report += '\n';

    // Decision Matrix
    report += '## Decision Matrix\n\n';
    report += '| Query Type | Recommended Mode | Reason |\n';
    report += '|------------|------------------|--------|\n';
    matrix.recommendations.forEach((rec) => {
      report += `| ${rec.queryType} | ${rec.recommendedMode} | ${rec.reason} |\n`;
    });

    return report;
  }

  exportResults(): any {
    return {
      benchmark: this.benchmarkReport,
      decisionMatrix: this.generateDecisionMatrix(),
      metrics: this.collector.toJSON(),
      timestamp: new Date().toISOString(),
    };
  }
}
