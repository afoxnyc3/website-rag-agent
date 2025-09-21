export interface EvalQuery {
  id: string;
  query: string;
  category: 'factual' | 'reasoning' | 'creative' | 'retrieval';
  expectedMode: 'rag' | 'direct' | 'agent';
  groundTruth?: string;
  acceptableAnswers?: string[];
}

interface DatasetStatistics {
  totalQueries: number;
  byCategory: Record<string, number>;
  byMode: Record<string, number>;
}

export class EvalDataset {
  private queries: EvalQuery[] = [];

  constructor() {
    this.loadDefaultQueries();
  }

  private loadDefaultQueries(): void {
    this.queries = [
      // Factual queries - best for Direct mode
      {
        id: 'factual-1',
        query: 'What is the capital of France?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'Paris',
      },
      {
        id: 'factual-2',
        query: 'How many continents are there?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'Seven',
      },
      {
        id: 'factual-3',
        query: 'What year did World War II end?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: '1945',
      },

      // Retrieval queries - require RAG mode
      {
        id: 'retrieval-1',
        query: 'What does the documentation say about BaseAgent?',
        category: 'retrieval',
        expectedMode: 'rag',
      },
      {
        id: 'retrieval-2',
        query: 'According to the documentation, how do I configure storage?',
        category: 'retrieval',
        expectedMode: 'rag',
      },
      {
        id: 'retrieval-3',
        query: 'What features are mentioned in the documentation?',
        category: 'retrieval',
        expectedMode: 'rag',
      },

      // Reasoning queries - may use Agent or Direct
      {
        id: 'reasoning-1',
        query: 'Why would someone choose TypeScript over JavaScript?',
        category: 'reasoning',
        expectedMode: 'direct',
      },
      {
        id: 'reasoning-2',
        query: 'What are the trade-offs between RAG and Direct mode?',
        category: 'reasoning',
        expectedMode: 'agent',
      },
      {
        id: 'reasoning-3',
        query: 'How does caching improve performance?',
        category: 'reasoning',
        expectedMode: 'direct',
      },

      // Creative queries - typically Direct mode
      {
        id: 'creative-1',
        query: 'Generate a haiku about programming',
        category: 'creative',
        expectedMode: 'direct',
      },
      {
        id: 'creative-2',
        query: 'Write a short story about an AI assistant',
        category: 'creative',
        expectedMode: 'direct',
      },
      {
        id: 'creative-3',
        query: 'Create a metaphor for cloud computing',
        category: 'creative',
        expectedMode: 'direct',
      },
    ];
  }

  getQueries(): EvalQuery[] {
    return [...this.queries];
  }

  addQuery(query: EvalQuery): void {
    this.queries.push(query);
  }

  getQueriesByCategory(category: EvalQuery['category']): EvalQuery[] {
    return this.queries.filter((q) => q.category === category);
  }

  getQueriesByMode(mode: EvalQuery['expectedMode']): EvalQuery[] {
    return this.queries.filter((q) => q.expectedMode === mode);
  }

  getRandomQuery(category?: EvalQuery['category']): EvalQuery {
    const pool = category ? this.getQueriesByCategory(category) : this.queries;

    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  getStratifiedSample(sampleSize: number): EvalQuery[] {
    const categories: EvalQuery['category'][] = ['factual', 'reasoning', 'creative', 'retrieval'];
    const sample: EvalQuery[] = [];
    const perCategory = Math.floor(sampleSize / categories.length);
    const remainder = sampleSize % categories.length;

    categories.forEach((category, index) => {
      const categoryQueries = this.getQueriesByCategory(category);
      const count = perCategory + (index < remainder ? 1 : 0);

      for (let i = 0; i < count && i < categoryQueries.length; i++) {
        sample.push(categoryQueries[i]);
      }
    });

    return sample;
  }

  getStatistics(): DatasetStatistics {
    const stats: DatasetStatistics = {
      totalQueries: this.queries.length,
      byCategory: {},
      byMode: {},
    };

    this.queries.forEach((query) => {
      stats.byCategory[query.category] = (stats.byCategory[query.category] || 0) + 1;
      stats.byMode[query.expectedMode] = (stats.byMode[query.expectedMode] || 0) + 1;
    });

    return stats;
  }

  toJSON(): EvalQuery[] {
    return this.getQueries();
  }

  static fromJSON(queries: EvalQuery[]): EvalDataset {
    const dataset = new EvalDataset();
    dataset.queries = queries;
    return dataset;
  }
}
