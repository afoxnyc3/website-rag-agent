# Agents Configuration

## AI Agent Specifications

### Primary Agent - Claude Code
- **Model**: claude-opus-4-1-20250805
- **Context Window**: 200k tokens
- **Primary Function**: Software engineering assistance
- **Capabilities**: Code generation, refactoring, debugging, documentation

### Agent Behavior Guidelines

1. **Planning Phase**
   - Document all planning in `scratchpad.md`
   - Break down tasks into actionable items
   - Consider edge cases and dependencies

2. **Execution Phase**
   - Follow established patterns in codebase
   - Maintain consistency with existing architecture
   - Test changes before marking tasks complete

3. **Documentation Phase**
   - Update relevant documentation files
   - Record decisions and rationale
   - Maintain change history

## Integration Points

- **Chat API**: `/api/chat` endpoint
- **Model Provider**: OpenAI (GPT-5)
- **Response Type**: Non-streaming text generation
- **UI Framework**: AI Elements components
