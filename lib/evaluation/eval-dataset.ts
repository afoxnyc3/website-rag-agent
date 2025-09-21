export type QueryCategory = 'factual' | 'retrieval' | 'reasoning' | 'creative';
export type ExpectedMode = 'rag' | 'direct' | 'agent';

export interface EvalQuery {
  id: string;
  query: string;
  category: QueryCategory;
  expectedMode: ExpectedMode;
  groundTruth?: string;
  acceptableAnswers?: string[];
  metadata?: Record<string, any>;
}

export interface DatasetStatistics {
  totalQueries: number;
  byCategory: Record<QueryCategory, number>;
  byExpectedMode: Record<ExpectedMode, number>;
}

export interface DatasetExport {
  queries: EvalQuery[];
  metadata: {
    version: string;
    createdAt: string;
    totalQueries: number;
  };
}

export class EvalDataset {
  private queries: Map<string, EvalQuery> = new Map();
  private readonly version = '1.0.0';

  constructor() {
    this.initializeDefaultQueries();
  }

  private initializeDefaultQueries(): void {
    const defaultQueries: EvalQuery[] = [
      // Factual queries - best for Direct mode
      {
        id: 'factual-1',
        query: 'What is the capital of France?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'Paris',
        acceptableAnswers: ['Paris', 'Paris, France'],
      },
      {
        id: 'factual-2',
        query: 'What year did World War II end?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: '1945',
        acceptableAnswers: ['1945', 'September 2, 1945'],
      },
      {
        id: 'factual-3',
        query: 'Who wrote Romeo and Juliet?',
        category: 'factual',
        expectedMode: 'direct',
        groundTruth: 'William Shakespeare',
        acceptableAnswers: ['William Shakespeare', 'Shakespeare'],
      },

      // Retrieval queries - best for RAG mode
      {
        id: 'retrieval-1',
        query: 'What is the BaseAgent in this system?',
        category: 'retrieval',
        expectedMode: 'rag',
        groundTruth:
          'The BaseAgent is the main orchestration class that coordinates web scraping, content processing, and knowledge retrieval',
      },
      {
        id: 'retrieval-2',
        query: 'How does the confidence scoring work?',
        category: 'retrieval',
        expectedMode: 'rag',
        groundTruth:
          'Multi-factor calculation using similarity (40%), source count (20%), recency (20%), and diversity (20%)',
      },
      {
        id: 'retrieval-3',
        query: 'What tools are available in the system?',
        category: 'retrieval',
        expectedMode: 'rag',
        groundTruth: 'ScrapeTool and CrawlTool for web content extraction',
      },

      // Reasoning queries - can use either mode
      {
        id: 'reasoning-1',
        query: 'Why would someone choose TypeScript over JavaScript?',
        category: 'reasoning',
        expectedMode: 'direct',
        metadata: { complexity: 'medium' },
      },
      {
        id: 'reasoning-2',
        query: 'What are the trade-offs between speed and accuracy in AI models?',
        category: 'reasoning',
        expectedMode: 'direct',
        metadata: { complexity: 'high' },
      },
      {
        id: 'reasoning-3',
        query: 'How does caching improve application performance?',
        category: 'reasoning',
        expectedMode: 'direct',
        metadata: { complexity: 'medium' },
      },

      // Creative queries - best for Direct mode
      {
        id: 'creative-1',
        query: 'Generate a haiku about coding',
        category: 'creative',
        expectedMode: 'direct',
        metadata: { format: 'poem' },
      },
      {
        id: 'creative-2',
        query: 'Create a short story about a debugging adventure',
        category: 'creative',
        expectedMode: 'direct',
        metadata: { format: 'story' },
      },
      {
        id: 'creative-3',
        query: 'Write a metaphor comparing software architecture to building construction',
        category: 'creative',
        expectedMode: 'direct',
        metadata: { format: 'metaphor' },
      },
    ];

    defaultQueries.forEach((query) => this.addQuery(query));
  }

  addQuery(query: EvalQuery): void {
    if (!this.isValidQuery(query)) {
      throw new Error(`Invalid query: ${query.id}`);
    }
    this.queries.set(query.id, query);
  }

  getQuery(id: string): EvalQuery | undefined {
    return this.queries.get(id);
  }

  getAllQueries(): EvalQuery[] {
    return Array.from(this.queries.values());
  }

  getQueriesByCategory(category: QueryCategory): EvalQuery[] {
    return this.getAllQueries().filter((q) => q.category === category);
  }

  getCategories(): QueryCategory[] {
    const categories = new Set(this.getAllQueries().map((q) => q.category));
    return Array.from(categories) as QueryCategory[];
  }

  getRandomQuery(category?: QueryCategory): EvalQuery | undefined {
    const queries = category ? this.getQueriesByCategory(category) : this.getAllQueries();

    if (queries.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * queries.length);
    return queries[randomIndex];
  }

  isValidQuery(query: any): query is EvalQuery {
    const validCategories: QueryCategory[] = ['factual', 'retrieval', 'reasoning', 'creative'];
    const validModes: ExpectedMode[] = ['rag', 'direct', 'agent'];

    return (
      typeof query.id === 'string' &&
      typeof query.query === 'string' &&
      validCategories.includes(query.category) &&
      validModes.includes(query.expectedMode)
    );
  }

  getStatistics(): DatasetStatistics {
    const queries = this.getAllQueries();

    const byCategory: Record<QueryCategory, number> = {
      factual: 0,
      retrieval: 0,
      reasoning: 0,
      creative: 0,
    };

    const byExpectedMode: Record<ExpectedMode, number> = {
      rag: 0,
      direct: 0,
      agent: 0,
    };

    queries.forEach((query) => {
      byCategory[query.category]++;
      byExpectedMode[query.expectedMode]++;
    });

    return {
      totalQueries: queries.length,
      byCategory,
      byExpectedMode,
    };
  }

  getBalancedSample(sampleSize: number): EvalQuery[] {
    const categories = this.getCategories();
    const samplesPerCategory = Math.floor(sampleSize / categories.length);
    const sample: EvalQuery[] = [];

    categories.forEach((category) => {
      const categoryQueries = this.getQueriesByCategory(category);
      const shuffled = [...categoryQueries].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, samplesPerCategory);
      sample.push(...selected);
    });

    // Add random queries to reach exact sample size if needed
    while (sample.length < sampleSize && sample.length < this.queries.size) {
      const randomQuery = this.getRandomQuery();
      if (randomQuery && !sample.includes(randomQuery)) {
        sample.push(randomQuery);
      }
    }

    return sample;
  }

  toJSON(): DatasetExport {
    return {
      queries: this.getAllQueries(),
      metadata: {
        version: this.version,
        createdAt: new Date().toISOString(),
        totalQueries: this.queries.size,
      },
    };
  }

  fromJSON(data: DatasetExport): void {
    this.queries.clear();
    data.queries.forEach((query) => this.addQuery(query));
  }
}
