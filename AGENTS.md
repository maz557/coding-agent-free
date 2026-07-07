# Coding Agent Free

This is the Coding Agent Free project itself.

## Key files
- `src/config/models.ts` — providers, presets, system prompt
- `src/agent.ts` — CLI entry point (handles /commands, auto-fallback)
- `src/CodingAgent.ts` — tool-call loop, stuck detection, streaming
- `src/ConversationState.ts` — sliding window, token compression
- `src/server.ts` — Express + SSE + OpenAI-compatible API + session management + diff events
- `src/tools/fileManager.ts` — all 13 file/shell tools
- `src/loadProjectContext.ts` — loads AGENTS.md / .coding-agent.md from project root
- `scripts/setup.js` — interactive setup wizard

## Web UI features (public/index.html)
- **Diff viewer** — line-level diffs (LCS) for write_file, replace_in_file, append_file
- **Session manager** — create/switch/list sessions with auto-title & metadata
- **Slash commands** — `/active`, `/model <n>`, `/safe`, `/allow`, `/reset`, `/models`, `/exit`
- **Help modal** — usage guide, model switching, commands reference, diff viewer explanation
- **SSE streaming** — raw fetch + ReadableStream (no EventSource dependency)

## Tests
- `npm run test:unit` — 137 unit tests pass (7 files: ConversationState, comprehensive, CodingAgent, loadProjectContext, fileManager, agent, server)
- `npm run test:integration` — 26 provider integration tests
- `npm test` — 35 integration tests
- CI: `.github/workflows/ci.yml` runs all tests on push/PR

## Conventions
- No comments in code unless necessary
- Use async/await, not raw promises
- Immutable state in ConversationState
- All module imports at top of files
- Use pino for logging, console.log for user output
- Keep agent.ts thin — logic goes in separate modules
- Web UI must use plain JS (no TypeScript in public/)
- Batch files for Windows launchers
