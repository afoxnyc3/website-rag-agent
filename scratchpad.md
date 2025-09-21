# Scratchpad - Planning & Notes

## 2025-09-21 - Playwright Installation Fix ✅ COMPLETED

### Problem Solved

**Issue**: New users experienced crashes when scraping due to missing Playwright browser binaries
**Solution**: Added postinstall script and updated documentation
**Status**: Ready for commit and PR

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
