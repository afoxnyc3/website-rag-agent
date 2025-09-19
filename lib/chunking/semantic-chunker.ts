export interface ChunkOptions {
  maxSize?: number;           // Maximum chunk size (default: 3000, max: 8000)
  minSize?: number;           // Minimum chunk size (default: 500)
  overlap?: number;           // Overlap between chunks (default: 200)
  strategy?: 'semantic' | 'markdown' | 'fixed';  // Chunking strategy
  preserveCodeBlocks?: boolean;  // Keep code blocks intact
}

export interface Chunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  totalChunks: number;
  metadata?: {
    strategy: string;
    hasOverlap: boolean;
    [key: string]: any;
  };
}

export class SemanticChunker {
  private readonly DEFAULT_MAX_SIZE = 3000;
  private readonly MAX_ALLOWED_SIZE = 8000;
  private readonly DEFAULT_MIN_SIZE = 500;
  private readonly DEFAULT_OVERLAP = 200;
  private readonly MAX_OVERLAP_RATIO = 0.25; // Max 25% overlap

  chunk(text: string, options: ChunkOptions = {}): Chunk[] {
    // Handle empty or whitespace-only text
    if (!text || !text.trim()) {
      return [];
    }

    // Normalize and validate options
    const config = this.normalizeOptions(options);

    // Choose chunking strategy
    switch (config.strategy) {
      case 'markdown':
        return this.chunkMarkdown(text, config);
      case 'semantic':
        return this.chunkSemantic(text, config);
      case 'fixed':
      default:
        return this.chunkFixed(text, config);
    }
  }

  private normalizeOptions(options: ChunkOptions): Required<ChunkOptions> {
    const maxSize = Math.min(
      options.maxSize || this.DEFAULT_MAX_SIZE,
      this.MAX_ALLOWED_SIZE
    );

    const minSize = Math.min(
      options.minSize || this.DEFAULT_MIN_SIZE,
      maxSize // minSize can't be larger than maxSize
    );

    const overlap = Math.min(
      options.overlap || 0,
      Math.floor(maxSize * this.MAX_OVERLAP_RATIO)
    );

    return {
      maxSize,
      minSize,
      overlap,
      strategy: options.strategy || 'semantic',
      preserveCodeBlocks: options.preserveCodeBlocks ?? true
    };
  }

  private chunkFixed(text: string, config: Required<ChunkOptions>): Chunk[] {
    const chunks: Chunk[] = [];
    let currentPos = 0;

    // Handle text that needs to be chunked
    if (text.length <= config.maxSize) {
      // Text fits in single chunk
      return [{
        content: text,
        index: 0,
        startOffset: 0,
        endOffset: text.length,
        totalChunks: 1,
        metadata: {
          strategy: 'fixed',
          hasOverlap: false
        }
      }];
    }

    // Text needs multiple chunks
    while (currentPos < text.length) {
      const chunkSize = Math.min(config.maxSize, text.length - currentPos);
      const content = text.slice(currentPos, currentPos + chunkSize);

      chunks.push({
        content,
        index: chunks.length,
        startOffset: currentPos,
        endOffset: currentPos + content.length,
        totalChunks: 0, // Will be updated
        metadata: {
          strategy: 'fixed',
          hasOverlap: false
        }
      });

      currentPos += chunkSize;
    }

    // Update totalChunks
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  private chunkSemantic(text: string, config: Required<ChunkOptions>): Chunk[] {
    // For simple repeating text without semantic boundaries
    const boundaries = this.findSemanticBoundaries(text);

    // If no semantic boundaries found or text is just repeating characters
    if (boundaries.length === 0 || /^(.)\1*$/.test(text)) {
      return this.chunkFixed(text, config);
    }

    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentStartOffset = 0;
    let previousChunkEnd = '';

    // Process text between boundaries
    let lastIndex = 0;

    for (let i = 0; i <= boundaries.length; i++) {
      const boundary = boundaries[i];
      const endIndex = boundary ? boundary.index : text.length;
      const segment = text.slice(lastIndex, endIndex);

      // Check if adding this segment would exceed maxSize
      if (currentChunk && currentChunk.length + segment.length > config.maxSize) {
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk.trim(),
          chunks.length,
          currentStartOffset,
          currentStartOffset + currentChunk.trim().length,
          'semantic',
          false
        ));

        // Handle overlap
        if (config.overlap > 0) {
          previousChunkEnd = currentChunk.slice(-Math.min(config.overlap, currentChunk.length));
          currentChunk = previousChunkEnd + segment;
          currentStartOffset = lastIndex - previousChunkEnd.length;
        } else {
          currentChunk = segment;
          currentStartOffset = lastIndex;
        }
      } else {
        currentChunk += segment;
      }

      if (boundary) {
        lastIndex = boundary.index;
      }
    }

    // Add final chunk if there's content
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        chunks.length,
        currentStartOffset,
        currentStartOffset + currentChunk.trim().length,
        'semantic',
        config.overlap > 0 && chunks.length > 0
      ));
    }

    // Update totalChunks and fix offsets
    chunks.forEach((chunk, i) => {
      chunk.totalChunks = chunks.length;
      // Recalculate offsets for simple cases
      if (i === 0) {
        chunk.startOffset = 0;
        chunk.endOffset = chunk.content.length;
      } else if (!chunk.metadata?.hasOverlap) {
        const prevChunk = chunks[i - 1];
        chunk.startOffset = prevChunk.endOffset;
        chunk.endOffset = chunk.startOffset + chunk.content.length;
      }
    });

    return chunks;
  }

  private chunkMarkdown(text: string, config: Required<ChunkOptions>): Chunk[] {
    // Extract code blocks first if preserving them
    const codeBlocks: Array<{ start: number; end: number; content: string }> = [];

    if (config.preserveCodeBlocks) {
      const codeBlockRegex = /```[\s\S]*?```/g;
      let match;
      while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    }

    const chunks: Chunk[] = [];
    const sections = this.splitByMarkdownSections(text, codeBlocks);

    sections.forEach((section) => {
      if (section.content.length <= config.maxSize) {
        chunks.push(this.createChunk(
          section.content,
          chunks.length,
          section.start,
          section.end,
          'markdown',
          false
        ));
      } else {
        // Section too large, need to split it
        const subChunks = this.chunkSemantic(section.content, { ...config, strategy: 'semantic' });
        subChunks.forEach((subChunk) => {
          chunks.push(this.createChunk(
            subChunk.content,
            chunks.length,
            section.start + subChunk.startOffset,
            section.start + subChunk.endOffset,
            'markdown',
            subChunk.metadata?.hasOverlap || false
          ));
        });
      }
    });

    // Update totalChunks
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  private splitByMarkdownSections(
    text: string,
    codeBlocks: Array<{ start: number; end: number; content: string }>
  ): Array<{ content: string; start: number; end: number }> {
    const sections: Array<{ content: string; start: number; end: number }> = [];

    // Find headers and their content
    const headerRegex = /^(#{1,6}\s+.+)$/gm;
    const headers: Array<{ index: number; level: number; text: string }> = [];

    let match;
    while ((match = headerRegex.exec(text)) !== null) {
      const level = match[0].match(/^#+/)?.[0].length || 1;
      headers.push({
        index: match.index,
        level,
        text: match[0]
      });
    }

    if (headers.length === 0) {
      // No headers, treat entire text as one section
      return [{ content: text, start: 0, end: text.length }];
    }

    // Split by headers, keeping header with its content
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const nextHeader = headers[i + 1];
      const end = nextHeader ? nextHeader.index : text.length;

      sections.push({
        content: text.slice(header.index, end).trim(),
        start: header.index,
        end
      });
    }

    // Add any content before first header
    if (headers[0].index > 0) {
      const preContent = text.slice(0, headers[0].index).trim();
      if (preContent) {
        sections.unshift({
          content: preContent,
          start: 0,
          end: headers[0].index
        });
      }
    }

    return sections;
  }

  private findSemanticBoundaries(text: string): Array<{ index: number; type: string }> {
    const boundaries: Array<{ index: number; type: string }> = [];

    // Find paragraph boundaries (double newlines)
    const paragraphRegex = /\n\n+/g;
    let match;
    while ((match = paragraphRegex.exec(text)) !== null) {
      boundaries.push({ index: match.index + match[0].length, type: 'paragraph' });
    }

    // Find sentence boundaries
    const sentenceRegex = /[.!?]+\s+/g;
    while ((match = sentenceRegex.exec(text)) !== null) {
      boundaries.push({ index: match.index + match[0].length, type: 'sentence' });
    }

    // Sort boundaries by index and remove duplicates
    boundaries.sort((a, b) => a.index - b.index);

    // Remove duplicate boundaries at same index
    const uniqueBoundaries = boundaries.filter((boundary, index) => {
      if (index === 0) return true;
      return boundary.index !== boundaries[index - 1].index;
    });

    return uniqueBoundaries;
  }

  private createChunk(
    content: string,
    index: number,
    startOffset: number,
    endOffset: number,
    strategy: string,
    hasOverlap: boolean
  ): Chunk {
    return {
      content,
      index,
      startOffset,
      endOffset,
      totalChunks: 0, // Will be updated
      metadata: {
        strategy,
        hasOverlap
      }
    };
  }
}