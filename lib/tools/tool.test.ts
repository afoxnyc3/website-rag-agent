import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tool, ToolExecutor, ToolRegistry, ToolResult, ToolSchema } from './tool';

// Test implementation of a simple tool
class TestTool extends Tool {
  name = 'test-tool';
  description = 'A test tool for unit tests';

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        message: { type: 'string', required: true },
        count: { type: 'number', required: false },
      },
    },
    output: {
      type: 'object',
      properties: {
        result: { type: 'string' },
        processedCount: { type: 'number' },
      },
    },
  };

  async execute(input: any): Promise<ToolResult> {
    const { message, count = 1 } = input;

    if (!message) {
      return {
        success: false,
        error: 'Message is required',
      };
    }

    return {
      success: true,
      data: {
        result: message.toUpperCase(),
        processedCount: count,
      },
      metadata: {
        executedAt: new Date(),
        toolName: this.name,
      },
    };
  }
}

describe('Tool Base Class', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
  });

  it('should have required properties', () => {
    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBe('A test tool for unit tests');
    expect(tool.schema).toBeDefined();
  });

  it('should validate input against schema', async () => {
    const isValid = await tool.validateInput({ message: 'test' });
    expect(isValid).toBe(true);

    const isInvalid = await tool.validateInput({ invalid: 'field' });
    expect(isInvalid).toBe(false);
  });

  it('should execute successfully with valid input', async () => {
    const result = await tool.execute({ message: 'hello', count: 5 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      result: 'HELLO',
      processedCount: 5,
    });
    expect(result.metadata?.toolName).toBe('test-tool');
  });

  it('should handle execution errors gracefully', async () => {
    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message is required');
  });

  it('should format output correctly', () => {
    const result: ToolResult = {
      success: true,
      data: { test: 'data' },
    };

    const formatted = tool.formatOutput(result);
    expect(formatted).toContain('test');
    expect(formatted).toContain('data');
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register and retrieve tools', () => {
    const tool = new TestTool();
    registry.register(tool);

    expect(registry.get('test-tool')).toBe(tool);
    expect(registry.has('test-tool')).toBe(true);
  });

  it('should list all registered tools', () => {
    const tool1 = new TestTool();
    const tool2 = new TestTool();
    tool2.name = 'test-tool-2';

    registry.register(tool1);
    registry.register(tool2);

    const tools = registry.list();
    expect(tools).toHaveLength(2);
    expect(tools).toContain('test-tool');
    expect(tools).toContain('test-tool-2');
  });

  it('should prevent duplicate registrations', () => {
    const tool = new TestTool();
    registry.register(tool);

    expect(() => registry.register(tool)).toThrow('Tool test-tool already registered');
  });

  it('should unregister tools', () => {
    const tool = new TestTool();
    registry.register(tool);

    expect(registry.has('test-tool')).toBe(true);

    registry.unregister('test-tool');

    expect(registry.has('test-tool')).toBe(false);
  });

  it('should find tools by capability', () => {
    const scrapeTool = new TestTool();
    scrapeTool.name = 'scrape-tool';
    scrapeTool.capabilities = ['web-scraping', 'html-parsing'];

    const crawlTool = new TestTool();
    crawlTool.name = 'crawl-tool';
    crawlTool.capabilities = ['web-crawling', 'site-navigation'];

    registry.register(scrapeTool);
    registry.register(crawlTool);

    const scrapingTools = registry.findByCapability('web-scraping');
    expect(scrapingTools).toHaveLength(1);
    expect(scrapingTools[0].name).toBe('scrape-tool');
  });
});

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor(registry);
  });

  it('should execute a registered tool', async () => {
    const tool = new TestTool();
    registry.register(tool);

    const result = await executor.execute('test-tool', { message: 'hello' });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('HELLO');
  });

  it('should handle tool not found', async () => {
    const result = await executor.execute('non-existent', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool not found');
  });

  it('should validate input before execution', async () => {
    const tool = new TestTool();
    registry.register(tool);

    const result = await executor.execute('test-tool', { invalid: 'input' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should support tool chaining', async () => {
    const tool1 = new TestTool();
    tool1.name = 'tool1';

    const tool2 = new TestTool();
    tool2.name = 'tool2';

    registry.register(tool1);
    registry.register(tool2);

    const chain = [
      { tool: 'tool1', input: { message: 'hello' } },
      { tool: 'tool2', input: { message: 'world' } },
    ];

    const results = await executor.executeChain(chain);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it('should stop chain on error if configured', async () => {
    const tool = new TestTool();
    registry.register(tool);

    const chain = [
      { tool: 'test-tool', input: {} }, // Will fail
      { tool: 'test-tool', input: { message: 'hello' } },
    ];

    const results = await executor.executeChain(chain, { stopOnError: true });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
  });

  it('should execute tools in parallel', async () => {
    const tool = new TestTool();
    registry.register(tool);

    const tasks = [
      { tool: 'test-tool', input: { message: 'task1' } },
      { tool: 'test-tool', input: { message: 'task2' } },
      { tool: 'test-tool', input: { message: 'task3' } },
    ];

    const results = await executor.executeParallel(tasks);

    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result.success).toBe(true);
    });
  });

  it('should select best tool for task', async () => {
    const scrapeTool = new TestTool();
    scrapeTool.name = 'scrape-tool';
    scrapeTool.capabilities = ['web-scraping'];
    scrapeTool.confidence = 0.9;

    const fetchTool = new TestTool();
    fetchTool.name = 'fetch-tool';
    fetchTool.capabilities = ['web-scraping'];
    fetchTool.confidence = 0.7;

    registry.register(scrapeTool);
    registry.register(fetchTool);

    const bestTool = executor.selectTool('web-scraping');
    expect(bestTool?.name).toBe('scrape-tool');
  });

  it('should handle tool timeouts', async () => {
    const slowTool = new TestTool();
    slowTool.name = 'slow-tool';
    slowTool.execute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return { success: true, data: {} };
    };

    registry.register(slowTool);

    const result = await executor.execute('slow-tool', { message: 'test' }, { timeout: 100 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});

describe('Tool Error Handling', () => {
  it('should handle and format errors consistently', () => {
    const error = new Error('Test error');
    const tool = new TestTool();

    const formatted = tool.formatError(error);

    expect(formatted).toHaveProperty('code');
    expect(formatted).toHaveProperty('message');
    expect(formatted).toHaveProperty('timestamp');
    expect(formatted.message).toBe('Test error');
  });

  it('should retry failed executions', async () => {
    const tool = new TestTool();
    let attempts = 0;

    tool.execute = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return { success: true, data: { attempts } };
    });

    const result = await tool.executeWithRetry({}, { maxRetries: 3 });

    expect(result.success).toBe(true);
    expect(result.data?.attempts).toBe(3);
  });
});

describe('Tool Composition', () => {
  it('should compose multiple tools into a pipeline', async () => {
    const preprocessor = new TestTool();
    preprocessor.name = 'preprocessor';
    preprocessor.execute = async (input) => {
      return {
        success: true,
        data: { message: input.message.toUpperCase(), stage: 'preprocessed' },
      };
    };

    const processor = new TestTool();
    processor.name = 'processor';
    processor.execute = async (input) => {
      return {
        success: true,
        data: { result: `Processed: ${input.message}`, stage: input.stage },
      };
    };

    const pipeline = Tool.compose([preprocessor, processor]);

    const result = await pipeline.execute({ message: 'hello' });

    expect(result.success).toBe(true);
    expect(result.metadata?.pipeline).toContain('preprocessor');
    expect(result.metadata?.pipeline).toContain('processor');
    expect(result.data?.result).toBe('Processed: HELLO');
  });
});
