import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceCalculator, ConfidenceLevel, ConfidenceResult } from './confidence-calculator';

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for multiple relevant sources with high similarity', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [0.95, 0.92, 0.88, 0.85],
        sourceTimestamps: [
          new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        ],
        sourceDomains: [
          'docs.example.com',
          'api.example.com',
          'docs.example.com',
          'blog.example.com',
        ],
        queryLength: 50,
        responseLength: 200,
      });

      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.explanation).toContain('high confidence');
    });

    it('should return medium confidence for moderate sources with average similarity', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [0.65, 0.6],
        sourceTimestamps: [
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
        ],
        sourceDomains: ['docs.example.com', 'docs.example.com'],
        queryLength: 50,
        responseLength: 150,
      });

      expect(result.score).toBeGreaterThanOrEqual(0.4);
      expect(result.score).toBeLessThan(0.7);
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.explanation).toContain('moderate confidence');
    });

    it('should return low confidence for few sources with low similarity', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [0.35],
        sourceTimestamps: [
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 1 month ago
        ],
        sourceDomains: ['random.example.com'],
        queryLength: 50,
        responseLength: 100,
      });

      expect(result.score).toBeLessThan(0.4);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.explanation).toContain('low confidence');
    });

    it('should return zero confidence when no sources are found', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [],
        sourceTimestamps: [],
        sourceDomains: [],
        queryLength: 50,
        responseLength: 0,
      });

      expect(result.score).toBe(0);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.explanation).toContain('no relevant sources');
    });
  });

  describe('similarity factor calculation', () => {
    it('should calculate high similarity score for high similarity values', () => {
      const score = calculator['calculateSimilarityScore']([0.95, 0.9, 0.85]);
      expect(score).toBeCloseTo(0.9, 1);
    });

    it('should handle empty similarity scores', () => {
      const score = calculator['calculateSimilarityScore']([]);
      expect(score).toBe(0);
    });

    it('should average multiple similarity scores', () => {
      const score = calculator['calculateSimilarityScore']([0.8, 0.6, 0.4]);
      expect(score).toBeCloseTo(0.6, 1);
    });
  });

  describe('source count factor calculation', () => {
    it('should give maximum score for 5+ sources', () => {
      const score = calculator['calculateSourceCountScore'](5);
      expect(score).toBe(1.0);
    });

    it('should scale linearly for 1-4 sources', () => {
      expect(calculator['calculateSourceCountScore'](1)).toBeCloseTo(0.2, 1);
      expect(calculator['calculateSourceCountScore'](2)).toBeCloseTo(0.4, 1);
      expect(calculator['calculateSourceCountScore'](3)).toBeCloseTo(0.6, 1);
      expect(calculator['calculateSourceCountScore'](4)).toBeCloseTo(0.8, 1);
    });

    it('should return 0 for no sources', () => {
      const score = calculator['calculateSourceCountScore'](0);
      expect(score).toBe(0);
    });
  });

  describe('recency factor calculation', () => {
    it('should give high score for very recent sources', () => {
      const timestamps = [
        new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      ];
      const score = calculator['calculateRecencyScore'](timestamps);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should give medium score for week-old sources', () => {
      const timestamps = [
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
      ];
      const score = calculator['calculateRecencyScore'](timestamps);
      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.8);
    });

    it('should give low score for month-old sources', () => {
      const timestamps = [
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 1 month ago
      ];
      const score = calculator['calculateRecencyScore'](timestamps);
      expect(score).toBeLessThan(0.4);
    });

    it('should handle empty timestamps', () => {
      const score = calculator['calculateRecencyScore']([]);
      expect(score).toBe(0);
    });
  });

  describe('diversity factor calculation', () => {
    it('should give high score for diverse sources', () => {
      const domains = [
        'docs.example.com',
        'api.example.com',
        'blog.example.com',
        'forum.example.com',
      ];
      const score = calculator['calculateDiversityScore'](domains);
      expect(score).toBe(1.0);
    });

    it('should give lower score for repeated sources', () => {
      const domains = [
        'docs.example.com',
        'docs.example.com',
        'docs.example.com',
        'api.example.com',
      ];
      const score = calculator['calculateDiversityScore'](domains);
      expect(score).toBeCloseTo(0.75, 1); // 2 unique out of 4 total: 0.5 + (0.5 * 0.5) = 0.75
    });

    it('should give minimum score for repeated source', () => {
      const domains = ['docs.example.com', 'docs.example.com'];
      const score = calculator['calculateDiversityScore'](domains);
      expect(score).toBe(0.75); // 1 unique out of 2: 0.5 + (0.5 * 0.5) = 0.75
    });

    it('should handle empty domains', () => {
      const score = calculator['calculateDiversityScore']([]);
      expect(score).toBe(0);
    });
  });

  describe('confidence level determination', () => {
    it('should categorize scores correctly', () => {
      expect(calculator['determineLevel'](0.9)).toBe(ConfidenceLevel.HIGH);
      expect(calculator['determineLevel'](0.7)).toBe(ConfidenceLevel.HIGH);
      expect(calculator['determineLevel'](0.69)).toBe(ConfidenceLevel.MEDIUM);
      expect(calculator['determineLevel'](0.4)).toBe(ConfidenceLevel.MEDIUM);
      expect(calculator['determineLevel'](0.39)).toBe(ConfidenceLevel.LOW);
      expect(calculator['determineLevel'](0.0)).toBe(ConfidenceLevel.LOW);
    });
  });

  describe('confidence explanation generation', () => {
    it('should provide detailed explanation for high confidence', () => {
      const explanation = calculator['generateExplanation']({
        score: 0.85,
        level: ConfidenceLevel.HIGH,
        factors: {
          similarity: 0.9,
          sourceCount: 0.8,
          recency: 0.85,
          diversity: 0.85,
        },
        sourceCount: 4,
      });

      expect(explanation).toContain('high confidence');
      expect(explanation).toContain('4 relevant sources');
      expect(explanation).toContain('recent');
      expect(explanation).toContain('diverse');
    });

    it('should provide cautionary explanation for low confidence', () => {
      const explanation = calculator['generateExplanation']({
        score: 0.25,
        level: ConfidenceLevel.LOW,
        factors: {
          similarity: 0.3,
          sourceCount: 0.2,
          recency: 0.3,
          diversity: 0.2,
        },
        sourceCount: 1,
      });

      expect(explanation).toContain('low confidence');
      expect(explanation).toContain('limited sources');
      expect(explanation).toContain('may not be complete');
    });

    it('should handle no sources case', () => {
      const explanation = calculator['generateExplanation']({
        score: 0,
        level: ConfidenceLevel.LOW,
        factors: {
          similarity: 0,
          sourceCount: 0,
          recency: 0,
          diversity: 0,
        },
        sourceCount: 0,
      });

      expect(explanation).toContain('no relevant sources');
      expect(explanation).toContain('unable to provide');
    });
  });

  describe('edge cases', () => {
    it('should handle very old sources gracefully', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [0.9],
        sourceTimestamps: [
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 365), // 1 year ago
        ],
        sourceDomains: ['ancient.example.com'],
        queryLength: 50,
        responseLength: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(0.4); // Should still be medium confidence despite age
      expect(result.score).toBeLessThan(0.7); // But not high confidence
      expect(result.level).toBe(ConfidenceLevel.MEDIUM); // Medium due to high similarity offsetting age
      expect(result.explanation).toContain('older information');
    });

    it('should handle invalid timestamps', () => {
      const result = calculator.calculateConfidence({
        similarityScores: [0.8],
        sourceTimestamps: [new Date('invalid')],
        sourceDomains: ['example.com'],
        queryLength: 50,
        responseLength: 100,
      });

      expect(result.score).toBeGreaterThan(0); // Should not crash
      expect(result.level).toBeDefined();
    });
  });
});
