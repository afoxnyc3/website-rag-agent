# Scratchpad - Planning & Notes

## 🔬 ULTRATHINK: RAG vs Direct Comparison Analysis

### Problem Statement

We need comprehensive performance comparison between RAG-based and Direct approaches to provide clear guidance on when to use each method. Currently we have three modes (Agent, RAG, Direct) but no quantitative analysis of their trade-offs.

### Objectives

1. **Benchmark Performance**: Measure response times, accuracy, token usage
2. **Create Decision Matrix**: Clear guidelines for approach selection
3. **Document Trade-offs**: Cost vs quality vs speed analysis
4. **Build Evaluation Framework**: Automated testing pipeline
5. **Provide Recommendations**: Use case mapping to optimal approach

### Architecture Design

#### 1. Evaluation Dataset Creation

```typescript
interface EvalQuery {
  id: string;
  query: string;
  category: 'factual' | 'reasoning' | 'creative' | 'retrieval';
  expectedMode: 'rag' | 'direct' | 'agent';
  groundTruth?: string;
  acceptableAnswers?: string[];
}
```

#### 2. Metrics Collection

```typescript
interface PerformanceMetrics {
  mode: string;
  responseTime: number;
  tokensUsed: number;
  estimatedCost: number;
  confidence: number;
  accuracy?: number;
  relevance?: number;
}
```

#### 3. Comparison Framework

```typescript
class RAGvsDirectAnalyzer {
  async runComparison(query: EvalQuery): Promise<ComparisonResult>;
  async runBenchmark(dataset: EvalQuery[]): Promise<BenchmarkReport>;
  async generateDecisionMatrix(): Promise<DecisionMatrix>;
}
```

### Implementation Strategy (TDD)

#### Phase 1: Create Evaluation Infrastructure

- Build EvalDataset class with test queries
- Create MetricsCollector for performance tracking
- Implement ResultAnalyzer for statistical analysis

#### Phase 2: Design Test Scenarios

- **Factual Queries**: "What is the capital of France?"
- **Retrieval Queries**: "What did the documentation say about X?"
- **Reasoning Queries**: "Why would someone choose Y over Z?"
- **Creative Queries**: "Generate a story about..."

#### Phase 3: Implement Comparison Logic

- Execute same query in both modes
- Collect comprehensive metrics
- Statistical analysis of results
- Generate comparison reports

#### Phase 4: Build Decision Matrix

- Query complexity scoring
- Knowledge base relevance detection
- Cost-benefit analysis
- Mode recommendation engine

#### Phase 5: Create Visualization & Reports

- Performance charts
- Cost analysis graphs
- Decision flow diagrams
- Markdown report generation

### Success Metrics

1. **Response Time**: RAG < 500ms, Direct < 200ms average
2. **Accuracy**: Document which mode performs better for each category
3. **Cost Efficiency**: Token usage comparison with $ estimates
4. **Decision Clarity**: 90% of queries should have clear mode recommendation
5. **Documentation**: Complete analysis report with visualizations

### Test-First Development Plan

1. Write tests for EvalDataset class
2. Write tests for MetricsCollector
3. Write tests for comparison logic
4. Write tests for decision matrix generation
5. Write tests for report generation
6. Implement each component to pass tests

### Expected Outcomes

- **Decision Matrix**: Clear guidelines when to use RAG vs Direct
- **Performance Benchmarks**: Quantitative comparison data
- **Cost Analysis**: Token usage and API cost comparison
- **Use Case Mapping**: Specific scenarios mapped to optimal approach
- **API Enhancement**: Optional mode parameter for manual override

## 2025-09-21 - Enhance Confidence Scoring ✅ COMPLETED

### Implementation Summary

✅ Created ConfidenceCalculator class with multi-factor scoring
✅ Implemented weighted formula (similarity 40%, sources 20%, recency 20%, diversity 20%)
✅ Three clear confidence levels (HIGH/MEDIUM/LOW)
✅ Human-readable explanations in responses
✅ Fixed edge cases where low-relevance queries got inflated scores
✅ 24 tests written and passing (100% coverage)
✅ Successfully integrated into RAG pipeline

---

## 2025-09-21 - RAG vs Direct Comparison Analysis 🚀 IN PROGRESS

### Problem Analysis

Current confidence scoring is too simplistic - only uses vector similarity. Users need:

- Multi-factor confidence calculation
- Clear visual indicators (green/yellow/red)
- Explanations for confidence levels
- Better handling of low-confidence responses

### Solution Design

#### Multi-Factor Confidence Formula

```
confidence = (
  similarityScore * 0.4 +    // Vector similarity weight
  sourceCountScore * 0.2 +    // Number of sources weight
  recencyScore * 0.2 +        // How recent sources are
  diversityScore * 0.2        // Source diversity weight
)
```

#### Confidence Levels

- **High** (0.7-1.0): ✅ Green - "I'm confident in this answer"
- **Medium** (0.4-0.69): ⚠️ Yellow - "I found some relevant information"
- **Low** (0.0-0.39): ❌ Red - "I don't have enough information"

#### Implementation Plan (TDD)

1. Create ConfidenceCalculator class with tests
2. Implement multi-factor calculation
3. Add confidence explanations
4. Integrate with RAG service
5. Update UI with visual indicators
6. Add calibration tests

### Test-First Development

- Write comprehensive tests for each factor
- Test edge cases (no sources, old sources, etc.)
- Test threshold boundaries
- Test explanation generation
- Test UI component rendering

---

## 2025-09-21 - Playwright Installation Fix ✅ COMPLETED

### Problem Solved

**Issue**: New users experienced crashes when scraping due to missing Playwright browser binaries
**Solution**: Added postinstall script and updated documentation
**Status**: ✅ MERGED to main branch

### Changes Made

1. Added `postinstall` script to package.json: `"postinstall": "npx playwright install"`
2. Updated README.md Prerequisites to mention automatic browser installation
3. Added comment in Quick Start that browsers install automatically
4. Updated Tech Stack section to clarify browsers are auto-installed

### Test Results

- Postinstall script runs successfully on `pnpm install`
- Playwright v1.55.0 confirmed working
- No more manual `npx playwright install` needed

---

## 2025-09-21 - Source Attribution Fix ✅ COMPLETED

### Problem Solved

**Issue**: Sources were showing only hostnames (e.g., "example.com") instead of full URLs
**Solution**: Fixed UI component and BaseAgent tool selection
**Status**: PR #8 merged

### Root Causes Fixed

1. `InlineCitationCardTrigger` was extracting hostname with `new URL(sources[0]).hostname`
2. BaseAgent `selectTool()` was returning wrong tool names

### Test Results

- All 15 new URL preservation tests passing
- API verification successful
- Manual testing confirms full URLs displayed

---

## Next Focus Areas (from roadmap.md)

### 1. Enhance Confidence Scoring (HIGH PRIORITY)

- Implement multi-factor calculation
- Add visual indicators in UI
- Create calibration tests

### 2. Documentation Cleanup (MEDIUM PRIORITY)

- Resolve discrepancies between claude.md and agents.md
- Standardize output format documentation

### 3. Implement Evals Framework (MEDIUM PRIORITY)

- Design evaluation pipeline
- Create initial test dataset
- Implement basic metrics

---

## Previous Completions

### 2025-09-21 - RAG vs Direct Mode Analysis ✅

- Fixed mode detection (was hardcoded as 'agent')
- Added ExecutionMetrics tracking in BaseAgent
- Created comprehensive mode detection tests (7/7 passing)
- UI now shows three distinct modes with color-coded badges

### 2025-09-21 - Critical Bug Fixes ✅

- Fixed web crawling depth off-by-one error
- Added SSRF protection with URL validation
- Integrated comprehensive development roadmap

### 2025-09-20 - Code Quality & Testing ✅

- Added ESLint, Prettier, and Husky pre-commit hooks
- Fixed storage strategy tests (23/23 passing)
- Fixed BaseAgent tests (31/31 passing)
- 97 total tests passing

---

## Project Status Summary

**Production Ready** with:

- ✅ BaseAgent orchestration system
- ✅ RAG pipeline with confidence scoring
- ✅ Web scraping/crawling with dual strategies
- ✅ Knowledge Base management UI
- ✅ Source attribution with full URLs
- ✅ Mode detection (Agent/RAG/Direct)
- ✅ Storage strategy pattern (dev/prod)
- ✅ Comprehensive test coverage
- ✅ Professional code quality tooling
