# Coding Agent Free

This is the Coding Agent Free project itself.

## Key files
- `docs/GUIDE.md` — comprehensive user guide with step-by-step tutorials and 5 example projects
- `src/config/models.ts` — providers, presets, system prompt
- `src/agent.ts` — CLI entry point (handles /commands, auto-fallback)
- `src/CodingAgent.ts` — tool-call loop, stuck detection, streaming
- `src/ConversationState.ts` — sliding window, token compression
- `src/server.ts` — Express + SSE + OpenAI-compatible API + session management + diff events
- `src/tools/fileManager.ts` — all 13 file/shell tools
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools
- `src/detectLocalModel.ts` — auto-detect local models (Ollama, LM Studio, llama.cpp)
- `src/loadProjectContext.ts` — loads AGENTS.md / .coding-agent.md from project root
- `src/mcp/config.ts` — loads MCP servers from .coding-agent.json
- `src/lsp/config.ts` — loads LSP servers from .coding-agent.json
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `scripts/setup.js` — interactive setup wizard

## Web UI features (public/index.html)
- **Diff viewer** — line-level diffs (LCS) for write_file, replace_in_file, append_file
- **Session manager** — create/switch/list sessions with auto-title & metadata
- **Slash commands** — `/active`, `/model <n>`, `/safe`, `/allow`, `/reset`, `/models`, `/exit`
- **Help modal** — usage guide, model switching, commands reference, diff viewer explanation
- **SSE streaming** — raw fetch + ReadableStream (no EventSource dependency)

## Tests
- `npm run test:unit` — **222+** unit tests pass (13 files, with `--test-timeout=15000`)
- `npm run test:integration` — 26 provider integration tests
- `npm test` — 35 integration tests
- CI: `.github/workflows/ci.yml` runs all tests on push/PR

## Key modules
- `src/mcp/` — MCP support (types, StdioTransport, HTTPTransport, MCPManager, config loader)
- `src/lsp/` — LSP support (LSPClient, LSPManager, tool definitions: code_definition/references/hover)
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools

## Known limitations
- **Windows LSP binary spawn** — `spawn()` can't find global npm `.cmd` files; shell fallback sometimes causes exit race. LSP works in tests (mock server) and on Linux/macOS. Tracked as issue for v1.18.0.
- **CI timeout** — `CodingAgent.test.ts`, `agent.test.ts`, `server.test.ts` use real API keys and can timeout in CI when rate-limited. Mitigated with `--test-timeout=15000`.
- **Node 24 issue** — Node 24 test runner has IPC serialization issues with `ts-node/register` (`Unable to deserialize cloned data`). CI uses Node 22 only.

## Conventions
- No comments in code unless necessary
- Use async/await, not raw promises
- Immutable state in ConversationState
- All module imports at top of files
- Use pino for logging, console.log for user output
- Keep agent.ts thin — logic goes in separate modules
- Web UI must use plain JS (no TypeScript in public/)
- Batch files for Windows launchers
