# Quality Standards & Development Practices

## Code Conciseness Rules
- **Functions**: Max 15 lines (excluding types/comments)
- **Files**: Max 100 lines total
- **Classes**: Max 50 lines, single responsibility only
- **No nested ternaries**: Use early returns instead
- **Single-purpose modules**: One export per file
- **Composition over inheritance**: Pure functions preferred

## Code Quality Example
```typescript
// Example concise function structure
export const embedText = async (text: string): Promise<number[]> => {
  if (!text?.trim()) throw new Error('Empty text');
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
};
```

## Testing Requirements (TDD with Vitest)
```typescript
// test/embedding.test.ts
describe('embedText', () => {
  it('should generate 1536-dim vector for valid text', async () => {
    const result = await embedText('test content');
    expect(result).toHaveLength(1536);
    expect(result.every(n => typeof n === 'number')).toBe(true);
  });

  it('should throw error for empty text', async () => {
    await expect(embedText('')).rejects.toThrow('Empty text');
  });
});
```

## ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended-strict",
    "@typescript-eslint/stylistic"
  ],
  "rules": {
    "max-lines-per-function": ["error", 15],
    "max-lines": ["error", 100],
    "complexity": ["error", 3],
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

## Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

## Git Workflow Standards
### Branch Naming
- `feature/<slug>` for new features
- `bugfix/<slug>` for bug fixes
- `chore/<slug>` for maintenance

### Commit Message Format
```
<type>: <short imperative summary>

Types: feat, fix, chore, docs, refactor, test
Examples:
- feat: add content scraper
- fix: handle empty chunks
- test: add embedding validation
```

## AI Agent Guardrails
### Input Validation
- Sanitize all URLs before scraping
- Rate limiting: max 10 requests/minute per IP
- Content size limits: 10MB per scrape session
- Malicious content detection (basic regex patterns)

### Accuracy Requirements
- Agent MUST only answer when confidence score ≥ 0.9
- If confidence < 0.9, respond: "I don't have enough information to answer accurately"
- Include confidence score in all responses
- Log all low-confidence queries for analysis

## Monitoring & Evaluation
- Log all queries, responses, and confidence scores
- Track embedding generation performance
- Monitor vector search latency
- Alert on confidence score degradation
- Performance benchmarks for each component

## Development Tools
- [Vitest](https://vitest.dev/) - Fast unit testing
- [TypeScript ESLint](https://typescript-eslint.io/) - Strict linting
- [Prettier](https://prettier.io/) - Code formatting
- [Husky](https://typicode.github.io/husky/) - Git hooks for quality gates
