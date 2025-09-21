# Agent Behavioral Contract

**PURPOSE**: This is your PRIMARY guide. Read this FIRST before ANY task.

## 🚨 MANDATORY PRE-FLIGHT CHECKLIST

Before ANY coding or changes:

- [ ] Read last `scratchpad.md` entry for context
- [ ] Check `todo.md` for current tasks and status
- [ ] Review recent `change-log.md` entries
- [ ] **ASK YOURSELF**: "Have I planned this in scratchpad.md?"

**⛔ If ANY box unchecked → STOP and complete it first**

## 📋 WORKFLOW ENFORCEMENT

### Phase 1: PLANNING (Always First!)

1. Open `scratchpad.md`
2. Document your plan using this template:

   ```markdown
   ## [Date] - [Task Name]

   ### Problem/Goal

   - What needs to be done and why

   ### Approach

   - Step-by-step plan
   - Key files to modify

   ### Risk Analysis

   - What could break?
   - Dependencies to check

   ### Success Criteria

   - How will I know it works?
   ```

3. Break down into tasks in `todo.md`

### Phase 2: EXECUTION

1. Update `todo.md` task to `in_progress`
2. Follow TDD approach - write tests first
3. Make changes following existing patterns
4. Test your changes work
5. Record decisions in `decision-log.md`

### Phase 3: DOCUMENTATION

1. Update `change-log.md` with what changed
2. Mark `todo.md` tasks as `completed`
3. Update any affected documentation
4. Commit with descriptive message

## ⚠️ COMMON MISTAKES TO AVOID

### The Fatal Five:

1. **Skipping scratchpad planning** → Leads to forgotten requirements
2. **Not updating todo.md** → Loses track of progress
3. **Coding without tests** → Creates hidden bugs
4. **Forgetting change-log** → Can't track what broke
5. **Making assumptions** → Always verify with existing code

### Quick Saves:

- Unsure about a pattern? → Check existing implementations
- Don't know where something is? → Use Grep/Glob tools
- Breaking changes? → Update decision-log.md
- Large refactor? → Break into smaller tasks

## 🔧 TOOL USAGE GUIDE

### When to Use Each Tool:

- **TodoWrite**: Start of EVERY session and task change
- **Grep**: Finding patterns across files
- **Glob**: Locating files by name/extension
- **Read**: Understanding file contents
- **MultiEdit**: Multiple changes to same file
- **Bash**: Running tests, checking status

### File Operation Limits:

- Functions: Max 15 lines
- Files: Max 100 lines
- Always prefer editing over creating new files

## 📚 DOCUMENTATION FILES

### Your Daily Companions:

| File              | Purpose             | When to Update                     |
| ----------------- | ------------------- | ---------------------------------- |
| `scratchpad.md`   | Planning & thinking | BEFORE starting any task           |
| `todo.md`         | Task tracking       | Before, during, and after tasks    |
| `decision-log.md` | Technical choices   | When making architecture decisions |
| `change-log.md`   | What changed        | After implementing features        |
| `CLAUDE.md`       | Technical reference | When you need project details      |

## ✅ DEVELOPMENT CHECKLIST

### Before Starting Any Task:

1. ✅ Update `scratchpad.md` with plan
2. ✅ Add tasks to `todo.md`
3. ✅ Check code quality standards
4. ✅ Verify you understand requirements

### During Development:

1. ✅ Mark todo items `in_progress`
2. ✅ Update `decision-log.md` for choices
3. ✅ Follow TDD - tests first
4. ✅ Use existing patterns

### After Implementation:

1. ✅ Update `change-log.md`
2. ✅ Mark todos `completed`
3. ✅ Run tests (`pnpm test`)
4. ✅ Verify feature works

## 🎯 AGENT CONFIGURATION

### Current Setup:

- **Model**: Claude (claude-opus-4-1-20250805)
- **Context**: 200k tokens
- **Purpose**: Software engineering assistance
- **Project Model**: OpenAI GPT-4 (not GPT-5)

### Integration Points:

- **Main Chat**: `/api/chat` using BaseAgent
- **Knowledge Base**: RAG with confidence scoring
- **Storage**: Dual strategy (memory/persistent)

## 🔗 QUICK LINKS

- **Technical Details**: See [CLAUDE.md](./CLAUDE.md)
- **API Reference**: See [API.md](./API.md)
- **Project README**: See [README.md](./README.md)
- **Quality Standards**: Built into workflow above

---

**REMEMBER**: This file is your behavioral contract. Follow it religiously to maintain code quality and project consistency. When in doubt, plan first in scratchpad.md!
