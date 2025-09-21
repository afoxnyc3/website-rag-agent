# BaseAgent - Development Roadmap

## 🎯 High Priority

### RAG vs Direct Comparison Analysis

**Status**: ✅ COMPLETED (2025-09-21)
**Priority**: HIGH
**Effort**: Medium (2-3 days)

#### Description

Complete and document comprehensive performance comparison between RAG-based and Direct approaches to provide clear guidance on when to use each method.

#### Success Criteria

- [x] Benchmark response times for both approaches
- [x] Measure accuracy and relevance scores
- [x] Document token usage and costs
- [x] Create decision matrix for approach selection
- [x] Provide clear use case recommendations

#### Implementation Notes

- Create evaluation dataset with diverse query types
- Measure metrics: latency, accuracy, cost, confidence
- Document in `/docs/rag-vs-direct-analysis.md`
- Update API to expose mode selection

---

### Confidence Scoring System Enhancement

**Status**: ✅ COMPLETED (2025-09-21)
**Priority**: HIGH
**Effort**: Small (1 day)

#### Description

Improve confidence score calculation and display to provide users with better transparency about response reliability.

#### Current State

- Multi-factor confidence scoring fully implemented
- Three clear confidence levels (HIGH/MEDIUM/LOW)
- Human-readable explanations in responses

#### Success Criteria

- [x] Implement multi-factor confidence calculation
- [x] Define clear confidence thresholds (low/medium/high)
- [x] Add confidence explanations in responses
- [x] Handle low-confidence responses appropriately
- [x] Create confidence calibration tests

#### Implementation Notes

- Consider factors: similarity score, source count, recency
- Add confidence breakdown in API response
- Update UI to show confidence visually (color coding)

---

### Source Attribution Enhancement

**Status**: 🔍 Under Investigation - Debug Logging Added
**Priority**: HIGH
**Effort**: Small (1 day)

#### Description

Fix source citations to link to actual relevant pages instead of website home pages. Currently, sources show base URLs rather than specific pages where content was found.

#### Success Criteria

- [ ] Sources link to exact pages scraped
- [ ] Preserve full URL in document metadata
- [ ] Display page title with source
- [ ] Show relevant excerpt from source
- [ ] Track source freshness (last updated)

#### Implementation Notes

- Update ScrapeTool to preserve full URL
- Modify document metadata structure
- Fix source display in chat responses
- Add source preview on hover

---

### Web Crawling Depth Issues

**Status**: ✅ FIXED (2025-09-21)
**Priority**: HIGH
**Effort**: Medium (2 days)

#### Description

Debug and fix crawling limitation where crawler stops after only a couple of pages despite higher depth settings.

#### Current Issues

- Crawler stops prematurely (2-3 pages max)
- Depth parameter not being respected
- May be related to URL filtering or queue management

#### Success Criteria

- [x] Crawl full sites as configured
- [x] Respect maxDepth parameter accurately
- [x] Process maxPages as specified
- [x] Fix URL queue management
- [x] Add progress tracking for large crawls

#### Implementation Notes

- Debug CrawlTool queue processing
- Check URL normalization issues
- Verify robots.txt isn't over-blocking
- Add detailed crawl logging
- Consider implementing resume capability

---

## 📚 Documentation

### Documentation Cleanup & Standardization

**Status**: Identified Issues
**Priority**: MEDIUM
**Effort**: Small (1 day)

#### Tasks

- [ ] Resolve discrepancies between `claude.md` and `agents.md`
- [ ] Clarify purpose and hierarchy of each doc
- [ ] Standardize output format documentation
- [ ] Create documentation map/index
- [ ] Add examples for all features

#### Success Criteria

- Clear separation of concerns between docs
- No conflicting information
- Easy navigation for new developers
- Complete API documentation

---

### Create Documentation Slash Command

**Status**: Not Started
**Priority**: MEDIUM
**Effort**: Small (4 hours)

#### Description

Create `/doc-update` slash command to automatically update documentation based on code changes.

#### Features

- Scan for undocumented functions
- Update API.md automatically
- Sync README with actual features
- Generate change-log entries

---

## 🛡️ Quality & Safety

### Implement Evals Framework

**Status**: Not Started
**Priority**: MEDIUM
**Effort**: Large (1 week)

#### Description

Set up comprehensive evaluation pipeline for agent responses to ensure quality and catch regressions.

#### Components

- [ ] Create evaluation dataset
- [ ] Define success metrics
- [ ] Build automated testing pipeline
- [ ] Create regression test suite
- [ ] Set up continuous evaluation

#### Success Metrics

- Accuracy: >85% on test queries
- Latency: <2s average response
- Confidence calibration: ±10% accuracy
- Source relevance: >90% correct

---

### Add Guardrails

**Status**: Not Started
**Priority**: MEDIUM
**Effort**: Medium (3 days)

#### Description

Implement safety checks and content filtering to ensure responsible AI behavior.

#### Components

- [ ] Input validation and sanitization
- [ ] Content filtering for harmful outputs
- [ ] Rate limiting and abuse prevention
- [ ] Operational boundaries enforcement
- [ ] PII detection and handling

#### Implementation Notes

- Use existing libraries where possible
- Add configuration for guardrail policies
- Log all filtered/blocked requests
- Provide user feedback on blocks

---

## 🔄 GitHub Workflow

### Repository Organization

**Status**: Not Started
**Priority**: LOW
**Effort**: Small (2 hours)

#### Tasks

- [ ] Set up GitHub Projects for task tracking
- [ ] Create Issues for all roadmap items
- [ ] Configure issue templates
- [ ] Set up milestones
- [ ] Create project boards

---

### Code Review Automation

**Status**: Not Started
**Priority**: LOW
**Effort**: Small (2 hours)

#### Tasks

- [ ] Install Claude app on repository
- [ ] Configure PR review triggers
- [ ] Set up Codex integration
- [ ] Create review guidelines
- [ ] Configure auto-merge rules

---

## 📊 Implementation Priority Matrix

| Priority | Effort | Items                                                               |
| -------- | ------ | ------------------------------------------------------------------- |
| HIGH     | Small  | • Source Attribution Fix<br>• ~~Confidence Scoring Enhancement~~ ✅ |
| HIGH     | Medium | • RAG vs Direct Analysis<br>• Web Crawling Depth Fix                |
| MEDIUM   | Small  | • Documentation Cleanup<br>• Doc Slash Command                      |
| MEDIUM   | Medium | • Add Guardrails                                                    |
| MEDIUM   | Large  | • Evals Framework                                                   |
| LOW      | Small  | • GitHub Organization<br>• Review Automation                        |

## 🚀 Recommended Execution Order

### Phase 1: Critical Fixes (Week 1)

1. ~~Fix web crawling depth (2 days)~~ ✅ COMPLETED
2. Fix source attribution (1 day) - Debug logging added, monitoring
3. ~~Enhance confidence scoring (1 day)~~ ✅ COMPLETED

### Phase 2: Analysis & Documentation (Week 2)

4. RAG vs Direct analysis (3 days)
5. Documentation cleanup (1 day)
6. Create doc slash command (0.5 day)

### Phase 3: Quality & Safety (Week 3)

7. Implement basic guardrails (3 days)
8. Start evals framework (remaining time)

### Phase 4: Automation (As Time Permits)

9. GitHub workflow setup
10. Review automation

---

## 📝 Notes

- **Priority**: Address crawling depth and source attribution first as they directly impact user experience
- **Documentation**: Can be done in parallel with development
- **Automation**: Low priority but high value for long-term maintenance
- **Safety**: Important for production but can be iterative

## 🔗 Related Documents

- [todo.md](./todo.md) - Current task tracking
- [scratchpad.md](./scratchpad.md) - Planning and analysis
- [change-log.md](./change-log.md) - Implementation history
- [agents.md](./agents.md) - Behavioral contract
- [CLAUDE.md](./CLAUDE.md) - Technical reference
