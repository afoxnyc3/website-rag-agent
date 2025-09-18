// Tool Foundation - Base classes and interfaces for tool-based architecture

export interface ToolSchema {
  input: {
    type: string;
    properties: Record<string, any>;
  };
  output: {
    type: string;
    properties: Record<string, any>;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ToolOptions {
  timeout?: number;
  maxRetries?: number;
  stopOnError?: boolean;
}

export interface ToolError {
  code: string;
  message: string;
  timestamp: Date;
  details?: any;
}

// Base Tool class that all tools extend
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract schema: ToolSchema;

  capabilities?: string[];
  confidence?: number;

  // Core execution method that all tools must implement
  abstract execute(input: any): Promise<ToolResult>;

  // Validate input against schema
  async validateInput(input: any): Promise<boolean> {
    const required = Object.entries(this.schema.input.properties)
      .filter(([_, prop]) => prop.required)
      .map(([key]) => key);

    for (const field of required) {
      if (!(field in input)) {
        return false;
      }
    }

    return true;
  }

  // Format output for display
  formatOutput(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    return JSON.stringify(result.data, null, 2);
  }

  // Format errors consistently
  formatError(error: Error): ToolError {
    return {
      code: 'TOOL_ERROR',
      message: error.message,
      timestamp: new Date(),
      details: error.stack,
    };
  }

  // Execute with retry logic
  async executeWithRetry(input: any, options: ToolOptions = {}): Promise<ToolResult> {
    const { maxRetries = 3 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(input);
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          return {
            success: false,
            error: lastError.message,
          };
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  // Static method to compose tools into a pipeline
  static compose(tools: Tool[]): Tool {
    return new ComposedTool(tools);
  }
}

// Composed tool for pipelines
class ComposedTool extends Tool {
  name = 'composed-tool';
  description = 'A pipeline of multiple tools';
  schema: ToolSchema;

  constructor(private tools: Tool[]) {
    super();
    this.name = tools.map(t => t.name).join('-');
    // Use the first tool's input schema and last tool's output schema
    this.schema = {
      input: tools[0]?.schema.input || { type: 'object', properties: {} },
      output: tools[tools.length - 1]?.schema.output || { type: 'object', properties: {} },
    };
  }

  async execute(input: any): Promise<ToolResult> {
    let currentInput = input;
    const pipelineNames: string[] = [];

    for (const tool of this.tools) {
      const result = await tool.execute(currentInput);
      pipelineNames.push(tool.name);

      if (!result.success) {
        return {
          ...result,
          metadata: { pipeline: pipelineNames },
        };
      }

      currentInput = result.data;
    }

    return {
      success: true,
      data: currentInput,
      metadata: { pipeline: pipelineNames },
    };
  }
}

// Tool Registry for managing available tools
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  findByCapability(capability: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.capabilities?.includes(capability) || false
    );
  }
}

// Tool Executor for running tools
export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(toolName: string, input: any, options: ToolOptions = {}): Promise<ToolResult> {
    const tool = this.registry.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
      };
    }

    // Validate input
    const isValid = await tool.validateInput(input);
    if (!isValid) {
      return {
        success: false,
        error: `Input validation failed for tool ${toolName}`,
      };
    }

    // Handle timeout
    if (options.timeout) {
      return this.executeWithTimeout(tool, input, options.timeout);
    }

    return tool.execute(input);
  }

  private async executeWithTimeout(tool: Tool, input: any, timeout: number): Promise<ToolResult> {
    return Promise.race([
      tool.execute(input),
      new Promise<ToolResult>((resolve) =>
        setTimeout(() => resolve({
          success: false,
          error: `Tool execution timeout after ${timeout}ms`,
        }), timeout)
      ),
    ]);
  }

  async executeChain(
    chain: Array<{ tool: string; input: any }>,
    options: ToolOptions = {}
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const step of chain) {
      const result = await this.execute(step.tool, step.input, options);
      results.push(result);

      if (!result.success && options.stopOnError) {
        break;
      }
    }

    return results;
  }

  async executeParallel(
    tasks: Array<{ tool: string; input: any }>,
    options: ToolOptions = {}
  ): Promise<ToolResult[]> {
    const promises = tasks.map(task =>
      this.execute(task.tool, task.input, options)
    );

    return Promise.all(promises);
  }

  selectTool(capability: string): Tool | undefined {
    const tools = this.registry.findByCapability(capability);

    if (tools.length === 0) {
      return undefined;
    }

    // Select tool with highest confidence
    return tools.reduce((best, current) => {
      const bestConfidence = best.confidence || 0;
      const currentConfidence = current.confidence || 0;
      return currentConfidence > bestConfidence ? current : best;
    });
  }
}