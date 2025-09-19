import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../tools/tool';
import type { AgentConfig } from './base-agent';

// Mock RAGService to avoid OpenAI initialization during tests
vi.mock('../rag', () => ({
  RAGService: vi.fn().mockImplementation(() => ({
    addDocument: vi.fn(),
    query: vi.fn(),
    getDocumentCount: vi.fn(),
  }))
}));

// Phase 1: Agent Configuration Tests
describe('AgentConfig', () => {
  it('should accept name property', () => {
    const config: AgentConfig = {
      name: 'TestAgent'
    };
    expect(config.name).toBe('TestAgent');
  });

  it('should accept description property', () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      description: 'A test agent for unit tests'
    };
    expect(config.description).toBe('A test agent for unit tests');
  });

  it('should accept toolRegistry property', () => {
    const registry = new ToolRegistry();
    const config: AgentConfig = {
      name: 'TestAgent',
      toolRegistry: registry
    };
    expect(config.toolRegistry).toBe(registry);
  });

  it('should accept ragService property', async () => {
    const { RAGService } = await import('../rag');
    const ragService = new RAGService();
    const config: AgentConfig = {
      name: 'TestAgent',
      ragService: ragService
    };
    expect(config.ragService).toBe(ragService);
  });

  it('should accept confidenceThreshold property', () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      confidenceThreshold: 0.7
    };
    expect(config.confidenceThreshold).toBe(0.7);
  });
});

// BaseAgent Constructor Tests
describe('BaseAgent', () => {
  it('should accept AgentConfig in constructor', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent'
    };
    const agent = new BaseAgent(config);
    expect(agent).toBeDefined();
  });

  it('should store name from config', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent'
    };
    const agent = new BaseAgent(config);
    expect(agent.name).toBe('TestAgent');
  });

  it('should store description from config', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent',
      description: 'A test agent'
    };
    const agent = new BaseAgent(config);
    expect(agent.description).toBe('A test agent');
  });

  it('should default confidenceThreshold to 0.5', async () => {
    const { BaseAgent } = await import('./base-agent');
    const config: AgentConfig = {
      name: 'TestAgent'
    };
    const agent = new BaseAgent(config);
    expect(agent.confidenceThreshold).toBe(0.5);
  });
});

// Phase 2: Intent Recognition Tests
describe('BaseAgent.parseIntent', () => {
  it('should identify URL in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('Check https://example.com for information');

    expect(result.type).toBe('url');
    expect(result.urls).toContain('https://example.com');
    expect(result.query).toBe('Check https://example.com for information');
  });

  it('should identify question in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('What is the pricing for the premium plan?');

    expect(result.type).toBe('question');
    expect(result.query).toBe('What is the pricing for the premium plan?');
  });

  it('should identify command in query', async () => {
    const { BaseAgent } = await import('./base-agent');
    const agent = new BaseAgent({ name: 'TestAgent' });

    const result = agent.parseIntent('Clear the knowledge base');

    expect(result.type).toBe('command');
    expect(result.query).toBe('Clear the knowledge base');
    expect(result.keywords).toContain('clear');
  });
});