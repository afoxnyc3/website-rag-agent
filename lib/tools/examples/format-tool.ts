import { Tool, ToolResult, ToolSchema } from '../tool';

export class FormatTool extends Tool {
  name = 'format';
  description = 'Format text in various styles (markdown, json, code)';

  capabilities = ['formatting', 'text-processing'];
  confidence = 0.9;

  schema: ToolSchema = {
    input: {
      type: 'object',
      properties: {
        text: { type: 'string', required: true },
        format: { type: 'string', required: true }, // 'markdown', 'json', 'code', 'uppercase', 'lowercase'
        language: { type: 'string', required: false }, // For code formatting
      },
    },
    output: {
      type: 'object',
      properties: {
        formatted: { type: 'string' },
        format: { type: 'string' },
        originalLength: { type: 'number' },
        formattedLength: { type: 'number' },
      },
    },
  };

  async execute(input: { text: string; format: string; language?: string }): Promise<ToolResult> {
    try {
      const { text, format, language = 'javascript' } = input;

      let formatted: string;

      switch (format.toLowerCase()) {
        case 'markdown':
          formatted = this.formatMarkdown(text);
          break;

        case 'json':
          formatted = this.formatJson(text);
          break;

        case 'code':
          formatted = this.formatCode(text, language);
          break;

        case 'uppercase':
          formatted = text.toUpperCase();
          break;

        case 'lowercase':
          formatted = text.toLowerCase();
          break;

        case 'title':
          formatted = this.toTitleCase(text);
          break;

        default:
          return {
            success: false,
            error: `Unsupported format: ${format}`,
          };
      }

      return {
        success: true,
        data: {
          formatted,
          format,
          originalLength: text.length,
          formattedLength: formatted.length,
        },
        metadata: {
          toolName: this.name,
          processingTime: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Formatting failed',
      };
    }
  }

  private formatMarkdown(text: string): string {
    // Simple markdown formatting
    const lines = text.split('\n');
    const formatted: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        formatted.push(line); // Already a header
      } else if (line.trim() === '') {
        formatted.push(''); // Keep empty lines
      } else if (line.match(/^\d+\./)) {
        formatted.push(line); // Already a numbered list
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        formatted.push(line); // Already a bullet list
      } else {
        formatted.push(line); // Regular paragraph
      }
    }

    return formatted.join('\n');
  }

  private formatJson(text: string): string {
    try {
      // Try to parse and format as JSON
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, try to convert to JSON
      return JSON.stringify({ text }, null, 2);
    }
  }

  private formatCode(text: string, language: string): string {
    // Add code fence
    return `\`\`\`${language}\n${text}\n\`\`\``;
  }

  private toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}