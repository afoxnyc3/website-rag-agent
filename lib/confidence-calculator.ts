export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ConfidenceFactors {
  similarity: number;
  sourceCount: number;
  recency: number;
  diversity: number;
}

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  explanation: string;
  factors?: ConfidenceFactors;
}

export interface ConfidenceInput {
  similarityScores: number[];
  sourceTimestamps: Date[];
  sourceDomains: string[];
  queryLength: number;
  responseLength: number;
}

export class ConfidenceCalculator {
  // Weights for different factors
  private readonly SIMILARITY_WEIGHT = 0.4;
  private readonly SOURCE_COUNT_WEIGHT = 0.2;
  private readonly RECENCY_WEIGHT = 0.2;
  private readonly DIVERSITY_WEIGHT = 0.2;

  // Thresholds
  private readonly HIGH_THRESHOLD = 0.7;
  private readonly MEDIUM_THRESHOLD = 0.4;

  calculateConfidence(input: ConfidenceInput): ConfidenceResult {
    const { similarityScores, sourceTimestamps, sourceDomains } = input;

    // Handle no sources case
    if (similarityScores.length === 0) {
      return {
        score: 0,
        level: ConfidenceLevel.LOW,
        explanation:
          'I found no relevant sources to answer your question. I am unable to provide a reliable response.',
        factors: {
          similarity: 0,
          sourceCount: 0,
          recency: 0,
          diversity: 0,
        },
      };
    }

    // Calculate individual factors
    const similarityScore = this.calculateSimilarityScore(similarityScores);
    const sourceCountScore = this.calculateSourceCountScore(similarityScores.length);
    const recencyScore = this.calculateRecencyScore(sourceTimestamps);
    const diversityScore = this.calculateDiversityScore(sourceDomains);

    // Calculate weighted confidence score
    const score =
      similarityScore * this.SIMILARITY_WEIGHT +
      sourceCountScore * this.SOURCE_COUNT_WEIGHT +
      recencyScore * this.RECENCY_WEIGHT +
      diversityScore * this.DIVERSITY_WEIGHT;

    // Determine confidence level
    const level = this.determineLevel(score);

    // Generate explanation
    const explanation = this.generateExplanation({
      score,
      level,
      factors: {
        similarity: similarityScore,
        sourceCount: sourceCountScore,
        recency: recencyScore,
        diversity: diversityScore,
      },
      sourceCount: similarityScores.length,
    });

    return {
      score,
      level,
      explanation,
      factors: {
        similarity: similarityScore,
        sourceCount: sourceCountScore,
        recency: recencyScore,
        diversity: diversityScore,
      },
    };
  }

  private calculateSimilarityScore(scores: number[]): number {
    if (scores.length === 0) return 0;

    // Average similarity scores
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.min(1, Math.max(0, avg));
  }

  private calculateSourceCountScore(count: number): number {
    if (count === 0) return 0;
    if (count >= 5) return 1.0;

    // Linear scale from 0.2 to 1.0 for 1-4 sources
    return count * 0.2;
  }

  private calculateRecencyScore(timestamps: Date[]): number {
    if (timestamps.length === 0) return 0;

    const now = Date.now();
    const avgAge =
      timestamps.reduce((sum, timestamp) => {
        // Handle invalid dates
        const time = timestamp.getTime();
        if (isNaN(time)) return sum;

        const ageInDays = (now - time) / (1000 * 60 * 60 * 24);
        return sum + ageInDays;
      }, 0) / timestamps.length;

    // Score based on average age
    if (avgAge < 1) return 1.0; // Less than 1 day old
    if (avgAge < 7) return 0.8; // Less than 1 week old
    if (avgAge < 30) return 0.5; // Less than 1 month old
    if (avgAge < 90) return 0.3; // Less than 3 months old
    return 0.1; // Older than 3 months
  }

  private calculateDiversityScore(domains: string[]): number {
    if (domains.length === 0) return 0;
    if (domains.length === 1) return 0.5; // Single source gets minimum diversity

    const uniqueDomains = new Set(domains);
    const uniqueRatio = uniqueDomains.size / domains.length;

    // For multiple sources, scale from 0.5 to 1.0
    return 0.5 + uniqueRatio * 0.5;
  }

  private determineLevel(score: number): ConfidenceLevel {
    if (score >= this.HIGH_THRESHOLD) return ConfidenceLevel.HIGH;
    if (score >= this.MEDIUM_THRESHOLD) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  private generateExplanation(params: {
    score: number;
    level: ConfidenceLevel;
    factors: ConfidenceFactors;
    sourceCount: number;
  }): string {
    const { score, level, factors, sourceCount } = params;

    // No sources case
    if (sourceCount === 0) {
      return 'I found no relevant sources to answer your question. I am unable to provide a reliable response.';
    }

    // Build explanation based on confidence level
    let explanation = '';

    if (level === ConfidenceLevel.HIGH) {
      explanation = `I have high confidence in this answer based on ${sourceCount} relevant sources`;
    } else if (level === ConfidenceLevel.MEDIUM) {
      explanation = `I have moderate confidence in this answer based on ${sourceCount} source${sourceCount > 1 ? 's' : ''}`;
    } else {
      explanation = `I have low confidence in this answer due to limited sources (${sourceCount})`;
    }

    // Add details about factors
    const details: string[] = [];

    // Recency detail
    if (factors.recency > 0.7) {
      details.push('recent information');
    } else if (factors.recency < 0.3) {
      details.push('older information');
    }

    // Diversity detail
    if (factors.diversity > 0.7 && sourceCount > 1) {
      details.push('diverse sources');
    }

    // Similarity detail
    if (factors.similarity < 0.4) {
      details.push('limited relevance');
    }

    if (details.length > 0) {
      explanation += ` with ${details.join(', ')}`;
    }

    // Add disclaimer for low confidence
    if (level === ConfidenceLevel.LOW) {
      explanation += '. The answer may not be complete or fully accurate.';
    }

    explanation += '.';

    return explanation;
  }
}
