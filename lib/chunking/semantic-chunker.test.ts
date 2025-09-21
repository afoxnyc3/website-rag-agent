import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticChunker, ChunkOptions, Chunk } from './semantic-chunker';

describe('SemanticChunker', () => {
  let chunker: SemanticChunker;

  beforeEach(() => {
    chunker = new SemanticChunker();
  });

  describe('Basic Chunking', () => {
    it('should chunk text respecting max size', () => {
      const text = 'a'.repeat(1000);
      const options: ChunkOptions = { maxSize: 300, minSize: 100 };

      const chunks = chunker.chunk(text, options);

      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(300);
      });
    });

    it('should not create chunks smaller than minSize unless necessary', () => {
      const text = 'This is a test. '.repeat(50); // ~750 chars
      const options: ChunkOptions = { maxSize: 400, minSize: 100 };

      const chunks = chunker.chunk(text, options);

      // All chunks except possibly the last should be >= minSize
      chunks.slice(0, -1).forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(100);
      });
    });

    it('should handle empty text', () => {
      const chunks = chunker.chunk('', {});
      expect(chunks).toEqual([]);
    });

    it('should handle text smaller than maxSize', () => {
      const text = 'Small text';
      const chunks = chunker.chunk(text, { maxSize: 1000 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
    });
  });

  describe('Semantic Boundary Detection', () => {
    it('should prefer splitting at sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const options: ChunkOptions = {
        maxSize: 35,
        strategy: 'semantic',
      };

      const chunks = chunker.chunk(text, options);

      expect(chunks[0].content).toBe('First sentence. Second sentence.');
      expect(chunks[1].content).toBe('Third sentence. Fourth sentence.');
    });

    it('should prefer splitting at paragraph boundaries', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const options: ChunkOptions = {
        maxSize: 40,
        strategy: 'semantic',
      };

      const chunks = chunker.chunk(text, options);

      expect(chunks[0].content).toContain('First paragraph.');
      expect(chunks[0].content).toContain('Second paragraph.');
      expect(chunks[1].content).toBe('Third paragraph.');
    });

    it('should handle multiple newlines as paragraph boundaries', () => {
      const text = 'Para 1\n\n\nPara 2\n\nPara 3';
      const options: ChunkOptions = {
        maxSize: 15,
        strategy: 'semantic',
      };

      const chunks = chunker.chunk(text, options);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Para 1');
      expect(chunks[1].content).toBe('Para 2');
      expect(chunks[2].content).toBe('Para 3');
    });
  });

  describe('Markdown Support', () => {
    it('should keep headers with their content', () => {
      const text = '# Header 1\nContent for header 1.\n\n# Header 2\nContent for header 2.';
      const options: ChunkOptions = {
        maxSize: 40,
        strategy: 'markdown',
      };

      const chunks = chunker.chunk(text, options);

      expect(chunks[0].content).toContain('# Header 1');
      expect(chunks[0].content).toContain('Content for header 1');
      expect(chunks[1].content).toContain('# Header 2');
      expect(chunks[1].content).toContain('Content for header 2');
    });

    it('should keep code blocks intact', () => {
      const text = 'Text before\n```javascript\nconst x = 1;\nconst y = 2;\n```\nText after';
      const options: ChunkOptions = {
        maxSize: 30,
        strategy: 'markdown',
        preserveCodeBlocks: true,
      };

      const chunks = chunker.chunk(text, options);

      // Code block should be kept together
      const codeChunk = chunks.find((c) => c.content.includes('```javascript'));
      expect(codeChunk?.content).toContain('const x = 1');
      expect(codeChunk?.content).toContain('const y = 2');
    });

    it('should handle inline code spans', () => {
      const text = 'Use `npm install` to install. Then run `npm start`.';
      const options: ChunkOptions = {
        maxSize: 30,
        strategy: 'markdown',
      };

      const chunks = chunker.chunk(text, options);

      // Inline code should not be split
      chunks.forEach((chunk) => {
        const backticks = chunk.content.match(/`/g) || [];
        expect(backticks.length % 2).toBe(0); // Even number of backticks
      });
    });

    it('should respect list structure', () => {
      const text = '- Item 1\n- Item 2\n- Item 3\n\nNext paragraph';
      const options: ChunkOptions = {
        maxSize: 30,
        strategy: 'markdown',
      };

      const chunks = chunker.chunk(text, options);

      expect(chunks[0].content).toContain('- Item 1');
      expect(chunks[0].content).toContain('- Item 2');
      expect(chunks[0].content).toContain('- Item 3');
    });
  });

  describe('Overlap Functionality', () => {
    it('should add overlap between chunks', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
      const options: ChunkOptions = {
        maxSize: 30,
        overlap: 10,
        strategy: 'semantic',
      };

      const chunks = chunker.chunk(text, options);

      // Check that end of first chunk appears at start of second
      if (chunks.length > 1) {
        const firstEnd = chunks[0].content.slice(-10);
        expect(chunks[1].content.startsWith(firstEnd)).toBe(true);
      }
    });

    it('should limit overlap to reasonable size', () => {
      const text = 'Short. Text.';
      const options: ChunkOptions = {
        maxSize: 10,
        overlap: 100, // Unreasonably large
        strategy: 'semantic',
      };

      const chunks = chunker.chunk(text, options);

      // Overlap should be limited to prevent infinite loops
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata', () => {
    it('should include chunk metadata', () => {
      const text = 'Test content for metadata';
      const chunks = chunker.chunk(text, { maxSize: 10 });

      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
        expect(chunk.startOffset).toBeDefined();
        expect(chunk.endOffset).toBeDefined();
        expect(chunk.totalChunks).toBe(chunks.length);
      });
    });

    it('should track original position offsets', () => {
      const text = 'First chunk. Second chunk.';
      const chunks = chunker.chunk(text, { maxSize: 15 });

      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBe(12); // "First chunk."
      expect(chunks[1].startOffset).toBe(13);
      expect(chunks[1].endOffset).toBe(26);
    });
  });

  describe('Edge Cases', () => {
    it('should handle text with only whitespace', () => {
      const text = '   \n\n   \t\t   ';
      const chunks = chunker.chunk(text, {});

      expect(chunks).toEqual([]);
    });

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(1000);
      const chunks = chunker.chunk(longWord, { maxSize: 100 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(100);
      });
    });

    it('should handle mixed content types', () => {
      const text = `
# Documentation

This is a paragraph with **bold** and *italic*.

\`\`\`python
def hello():
    print("Hello")
\`\`\`

- List item 1
- List item 2

Another paragraph.
      `.trim();

      const chunks = chunker.chunk(text, {
        maxSize: 100,
        strategy: 'markdown',
        preserveCodeBlocks: true,
      });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);

      // Verify code block is preserved
      const codeChunk = chunks.find((c) => c.content.includes('```python'));
      expect(codeChunk).toBeDefined();
      expect(codeChunk?.content).toContain('print("Hello")');
    });

    it('should handle special characters and unicode', () => {
      const text = 'Hello 世界! 🌍 Special chars: @#$%^&*()';
      const chunks = chunker.chunk(text, { maxSize: 20 });

      expect(chunks).toBeDefined();
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large documents efficiently', () => {
      const largeText = 'Lorem ipsum dolor sit amet. '.repeat(10000);
      const startTime = Date.now();

      const chunks = chunker.chunk(largeText, {
        maxSize: 3000,
        strategy: 'semantic',
      });

      const duration = Date.now() - startTime;

      expect(chunks).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Configuration Validation', () => {
    it('should use default options when none provided', () => {
      const text = 'a'.repeat(5000);
      const chunks = chunker.chunk(text);

      expect(chunks).toBeDefined();
      expect(chunks[0].content.length).toBeLessThanOrEqual(3000); // Default maxSize
    });

    it('should validate maxSize limits', () => {
      const text = 'Test text';

      // Too small
      expect(() => {
        chunker.chunk(text, { maxSize: 10 });
      }).not.toThrow();

      // Too large
      const chunks = chunker.chunk(text, { maxSize: 10000 });
      expect(chunks[0].content.length).toBeLessThanOrEqual(8000); // Max allowed
    });

    it('should handle conflicting options gracefully', () => {
      const text = 'Test content';
      const chunks = chunker.chunk(text, {
        maxSize: 5, // Very small
        minSize: 10, // Larger than max
      });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});

describe('Chunk Type Interface', () => {
  it('should have correct structure', () => {
    const chunk: Chunk = {
      content: 'test',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      totalChunks: 1,
      metadata: {
        strategy: 'semantic',
        hasOverlap: false,
      },
    };

    expect(chunk.content).toBe('test');
    expect(chunk.index).toBe(0);
    expect(chunk.metadata).toBeDefined();
  });
});
