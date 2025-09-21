import { Tool, ToolResult, ToolSchema } from '../tool';

export class CalculateTool extends Tool {
  name = 'calculate';
  description = 'Perform mathematical calculations';

  capabilities = ['math', 'calculation'];
  confidence = 1.0;

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        expression: { type: 'string', required: true },
        precision: { type: 'number', required: false },
      },
    },
    output: {
      type: 'object',
      properties: {
        result: { type: 'number' },
        expression: { type: 'string' },
        steps: { type: 'array' },
      },
    },
  };

  async execute(input: { expression: string; precision?: number }): Promise<ToolResult> {
    try {
      const { expression, precision = 2 } = input;

      // Sanitize expression to only allow safe math operations
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

      if (sanitized !== expression) {
        return {
          success: false,
          error: 'Invalid characters in expression',
        };
      }

      // Use Function constructor safely for math evaluation
      const result = new Function('return ' + sanitized)();

      if (typeof result !== 'number' || isNaN(result)) {
        return {
          success: false,
          error: 'Invalid mathematical expression',
        };
      }

      const rounded = parseFloat(result.toFixed(precision));

      return {
        success: true,
        data: {
          result: rounded,
          expression: sanitized,
          steps: this.breakdownExpression(sanitized),
        },
        metadata: {
          toolName: this.name,
          precision,
          originalExpression: expression,
          executedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to evaluate expression',
      };
    }
  }

  private breakdownExpression(expr: string): string[] {
    // Simple breakdown for demonstration
    const steps: string[] = [];

    // Check for parentheses
    if (expr.includes('(')) {
      steps.push('Evaluate expressions in parentheses first');
    }

    // Check for operations in order
    if (expr.includes('*') || expr.includes('/')) {
      steps.push('Perform multiplication and division');
    }

    if (expr.includes('+') || expr.includes('-')) {
      steps.push('Perform addition and subtraction');
    }

    return steps;
  }
}
