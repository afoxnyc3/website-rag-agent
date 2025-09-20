# Slash Command Ideas

## /dev-workflow - Complete Development Workflow

### Purpose
Executes the complete development workflow as documented in agents.md, ensuring consistent adherence to best practices.

### Full Command Prompt
```
Execute the complete development workflow from agents.md:

1. PRE-FLIGHT CHECK:
   - Read last scratchpad.md entry
   - Review todo.md for current tasks
   - Check recent change-log.md

2. PLANNING PHASE:
   - Create new branch: `[branch-type]/[task-name]`
   - Document plan in scratchpad.md with:
     * Problem/Goal analysis
     * Approach (step-by-step)
     * Risk Analysis (what could break)
     * Success Criteria
   - Update todo.md with granular tasks

3. EXECUTION PHASE (TDD):
   - Mark tasks as in_progress in todo.md
   - Write tests FIRST before implementation
   - Implement following existing patterns
   - Run tests to verify
   - Record technical decisions in decision-log.md

4. DOCUMENTATION PHASE:
   - Update change-log.md with changes made
   - Mark todo.md tasks as completed
   - Update README.md if needed
   - Update scratchpad.md with completion notes

5. COMMIT & MERGE:
   - Stage changes with descriptive commit
   - Merge to main branch
   - Push to remote
   - Clean up feature branch

Task: [USER_INPUT]

Use ULTRATHINK for complex problems. Follow TDD strictly. Maintain all documentation files throughout.
```

### Short Version
```
Follow agents.md workflow: Plan in scratchpad → Update todo → TDD implementation → Update logs → Commit. Task: [USER_INPUT]
```

### Key Elements
- **Explicit reference to agents.md** (the behavioral contract)
- **Scratchpad planning requirement** (makes it unavoidable)
- **TDD emphasis** (write tests first)
- **Documentation updates** (all 4 files)
- **Branch strategy** (feature branches)
- **ULTRATHINK directive** (for complex analysis)

---

## /fix-tests - Test Failure Analysis & Fix

### Purpose
Analyzes failing tests, identifies root causes, and fixes them following TDD principles.

### Command Prompt
```
Analyze and fix failing tests:
1. Run test suite and identify failures
2. ULTRATHINK to determine if issue is in tests or production code
3. Document analysis in scratchpad.md
4. Create granular fix tasks in todo.md
5. Fix following TDD principles (tests reflect reality)
6. Update documentation
Task: [TEST_FILE or ALL]
```

---

## /doc-review - Documentation Consistency Check

### Purpose
Reviews all documentation files for accuracy and consistency with current implementation.

### Command Prompt
```
Review and update project documentation:
1. Compare README.md against actual implementation
2. Verify todo.md reflects current status
3. Check if change-log.md is up to date
4. Ensure decision-log.md captures recent decisions
5. Update any discrepancies found
6. Commit with "docs: " prefix
```

---

## Future Command Ideas

- **/refactor** - Safely refactor code with test coverage
- **/add-feature** - Add new feature following full workflow
- **/optimize** - Performance optimization workflow
- **/security-review** - Security audit and fixes