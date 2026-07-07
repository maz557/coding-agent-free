# Coding Agent Free

This is the Coding Agent Free project itself.

## Key files
- `src/config/models.ts` — providers, presets, system prompt
- `src/agent.ts` — CLI entry point (handles /commands, auto-fallback)
- `src/CodingAgent.ts` — tool-call loop, stuck detection, streaming
- `src/ConversationState.ts` — sliding window, token compression
- `src/server.ts` — Express + SSE + OpenAI-compatible API
- `src/tools/fileManager.ts` — all 13 file/shell tools
- `src/loadProjectContext.ts` — loads AGENTS.md / .coding-agent.md from project root
- `scripts/setup.js` — interactive setup wizard

## Conventions
- No comments in code unless necessary
- Use async/await, not raw promises
- Immutable state in ConversationState
- All module imports at top of files
- Use pino for logging, console.log for user output
- Keep agent.ts thin — logic goes in separate modules
- Web UI must use plain JS (no TypeScript in public/)
- Batch files for Windows launchers
