# Coding Agent Free v1.19.0

This is the Coding Agent Free project itself.

## Key files
- `docs/GUIDE.md` — comprehensive user guide with step-by-step tutorials and 5 example projects
- `src/config/models.ts` — providers, presets, system prompt (no tool names listed; agent relies on `tools[]` array)
- `src/agent.ts` — CLI entry point (handles /commands, auto-fallback)
- `src/CodingAgent.ts` — tool-call loop, stuck detection, streaming
- `src/ConversationState.ts` — sliding window, token compression
- `src/server.ts` — Express + SSE + OpenAI-compatible API + session management + diff events + disk persistence
- `src/tools/fileManager.ts` — all 13 file/shell tools
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools
- `src/detectLocalModel.ts` — auto-detect local models (Ollama, LM Studio, llama.cpp)
- `src/loadProjectContext.ts` — loads AGENTS.md / .coding-agent.md from project root
- `src/mcp/` — MCP support (types, StdioTransport, HTTPTransport, MCPManager, config loader)
- `src/lsp/` — LSP support (LSPClient, LSPManager, tool definitions: code_definition/references/hover/lookup_symbol/get_diagnostics)
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `src/validation.ts` — Zod schemas for tool input/output validation
- `scripts/setup.js` — interactive setup wizard

## Web UI features (public/index.html)
- **Diff viewer** — line-level diffs (LCS) for write_file, replace_in_file, append_file
- **Session manager** — create/switch/list sessions with auto-title, metadata, rename (✏️), disk persistence across restarts
- **Settings panel** — font-size slider, compact mode, auto-scroll toggle (persisted in localStorage)
- **Keyboard shortcuts** — Ctrl+N (new), Ctrl+D/B (sessions), Ctrl+K (focus input), Ctrl+L (reset), Ctrl+Shift+C (copy session), Escape (close panels/cancel), PgUp/PgDn (scroll), Home/End
- **Highlight.js** — syntax highlighting for code blocks (github-dark theme, CDN)
- **Collapsible tool calls** — ▶/▼ toggle header + body for streaming and history
- **Stop button** — abort streaming via AbortController
- **Auto-scroll toggle** — floating ⬇ button appears when user scrolls up
- **Toast notifications** — 3s auto-dismiss feedback
- **Welcome screen** — shown on empty chat, removed on first message
- **Per-message copy** — 📋 button on user/assistant messages (preserved during streaming)
- **Copy session** — 📄 Copy button + Ctrl+Shift+C, formats as markdown-like text
- **Slash commands** — `/active`, `/model <n>`, `/safe`, `/allow`, `/reset`, `/models`, `/exit`, `/mcp list/toggle`, `/lsp`
- **Help modal** — usage guide, model switching, commands reference, keyboard shortcuts, diff viewer explanation
- **SSE streaming** — raw fetch + ReadableStream (no EventSource dependency)
- **LSP toggle** — 🟢ON/⚫OFF status with active languages
- **MCP toggle** — 🟢ON/⚫OFF status

## Tests
- `npm run test:unit` — **220+** unit tests (13 files, `--test-timeout=15000`)
- `npm run test:integration` — 26 provider integration tests
- `npm test` — 35 integration tests
- CI: `.github/workflows/ci.yml` runs all tests on push/PR

## Key modules
- `src/mcp/` — MCP support (types, StdioTransport, HTTPTransport, MCPManager, config loader)
- `src/lsp/` — LSP support (LSPClient, LSPManager, tool definitions: code_definition/references/hover/lookup_symbol/get_diagnostics; multi-language via entries[] matching filePatterns)
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools

## Known limitations
- **Windows LSP binary spawn** — `spawn()` can't find global npm `.cmd` files; shell fallback sometimes causes exit race. Mitigated with `shell: true`. LSP works in tests (mock server) and on Linux/macOS.
- **CI timeout** — `CodingAgent.test.ts`, `agent.test.ts`, `server.test.ts` use real API keys and can timeout in CI when rate-limited. Mitigated with `--test-timeout=15000`.
- **Node 24 issue** — Node 24 test runner has IPC serialization issues with `ts-node/register` (`Unable to deserialize cloned data`). CI uses Node 22 only.
- **Web session persistence** — sessions saved to `sessions/{uuid}.json` after each message. Empty sessions (0 user messages) are not persisted or listed.

## v1.19.0 changes
- **Session disk persistence**: web UI sessions saved to `sessions/` dir, loaded on restart, filter empty sessions
- **Session rename**: `POST /api/sessions/:id/rename` + ✏️ button in session panel
- **Session metadata**: `updatedAt` field, sorted by last update time
- **System prompt**: no longer lists tool names — agent relies solely on `tools[]` array
- **Tool error loop protection**: break after 3 consecutive errors on same tool
- **Streaming copy button**: preserved during streaming (`.msg-content` wrapper)
- **Code block copy button**: semi-transparent background, positioned on start side (RTL-aware), extra top padding to avoid content overlap
- **Help modal**: keyboard shortcuts section added
- **Keyboard shortcut**: Ctrl+Shift+C for copy session
- **Conditional LSP prompt**: removed (not needed; `tools[]` is single source of truth)

## Conventions
- No comments in code unless necessary
- Use async/await, not raw promises
- Immutable state in ConversationState
- All module imports at top of files
- Use pino for logging, console.log for user output
- Keep agent.ts thin — logic goes in separate modules
- Web UI must use plain JS (no TypeScript in public/)
- Batch files for Windows launchers
