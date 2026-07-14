# Coding Agent Free v1.31.0

This is the Coding Agent Free project itself.

## Key files
- `docs/GUIDE.md` — comprehensive user guide with step-by-step tutorials and 5 example projects
- `src/config/models.ts` — providers, presets, system prompt (no tool names listed; agent relies on `tools[]` array)
- `src/agent.ts` — CLI entry point (handles /commands, auto-fallback)
- `src/CodingAgent.ts` — tool-call loop, stuck detection, streaming
- `src/ConversationState.ts` — sliding window, token compression
- `src/server.ts` — Express + SSE + OpenAI-compatible API + session management + diff events + disk persistence
- `src/tools/fileManager.ts` — all 18 file/shell tools (including git_diff, git_commit, git_log, web_search, run_tests)
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools
- `src/detectLocalModel.ts` — auto-detect local models (Ollama, LM Studio, llama.cpp)
- `src/loadProjectContext.ts` — loads AGENTS.md / .coding-agent.md + auto-generates Project Map (config files, dirs, entry points)
- `src/mcp/` — MCP support (types, StdioTransport, HTTPTransport, MCPManager, config loader)
- `src/lsp/` — LSP support (LSPClient, LSPManager, tool definitions: code_definition/references/hover/lookup_symbol/get_diagnostics)
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `src/PlanManager.ts` — parse, track, and match plan steps; auto-progress injection
- `src/ProjectManager.ts` — create/list/load/save/delete projects on disk, linked to PlanManager; auto-generates spec docs (prd.md, tech_design.md, api_spec.md, test_plan.md)
- `src/AgentMode.ts` — build/plan mode definitions, `switch_mode` tool definition, `detectIntent()`, `filterToolsForMode()`
- `src/validation.ts` — Zod schemas for tool input/output validation
- `scripts/setup.js` — interactive setup wizard

## Tests
- `npm run test:unit` — **357** unit tests (19 files, `--test-timeout=15000`)
- `npm run test:integration` — 26 provider integration tests
- `npm test` — 35 integration tests
- CI: `.github/workflows/ci.yml` runs all tests on push/PR
- **Note:** The `projectManager` atomic‑rename (`.tmp → .json`) test sometimes flakes with `EPERM` on Windows — rerun CI if that happens.

## v1.31.0 changes
(no changes yet — stable release from v1.30.0)
- **CI green** ✅ — all 357 unit tests pass, IPC serialization flake documented
- **LSPManager fix** — restored `startForProject` early return, added `startAllServers` for unconditional startup
- **`/add` case‑insensitive** — model/provider matching now case‑insensitive with trimmed whitespace
- **357 unit tests** (unchanged)

## v1.30.0 changes
- **5 code-level guards** 🛡️ — enforced before tool execution (not just prompt):
  - `pipAttempted` flag — blocks 2nd+ `pip install`, suggests stdlib instead
  - `writtenFiles` Map — blocks `write_file`/`replace_in_file`/`append_file` with identical content
  - Source-code workaround guard — blocks `.py` files containing `sys.path.append`/`sys.path.insert`
  - Question + tools same-turn detection — if model asks a question AND calls tools, injects wait reminder
  - Broadened auto-LSP — triggers on ANY `[Command Failed]`, not just Python tracebacks
- **System prompt strengthened** — creation-first, wait-for-answer, mandatory LSP, requirements.txt edit limit
- **Doc generation improved** — tech design and API spec no longer filter steps; PRD auto-fills Target Users
- **CI fixes** — 3 tests using `.ts` extension changed to `.xyz` to prevent `autoInstallAndStart` from launching real LSP server, causing timeouts in CI
- **21 built-in tools** (unchanged)
- **357 unit tests** (was 359, -2 from LSPManager refactor) // Note: v1.30.0 release had 357 after CI stabilization

## v1.29.0 changes
- **Blocked calls guard** 🛑 — after stuck detection fires, the exact `callKey` is added to a `blockedCalls` Set. If the model repeats the same tool call, it gets a hard error instead of executing. Prevents the agent from getting stuck in loops (e.g., repeated `flake8` calls).
- **Project specification documents** 📋 — `create_project` auto-generates `docs/prd.md`, `docs/tech_design.md`, `docs/api_spec.md`, `docs/test_plan.md` with content from the plan. Presented to the user for review/approval before implementation begins.
  - `read_project_docs` (new tool) — read spec docs during implementation
  - `update_project_docs` (new tool) — update docs when requirements change
  - `verify_project_spec` (new tool) — final evaluation comparing implementation against spec docs and plan steps; shows plan step status, file list, and completion percentage
- **System prompt improvements**:
  - "Make the MINIMAL change necessary — do NOT add new features, dependencies, or refactoring the user didn't ask for"
  - "Do NOT create test files or write unit tests unless the user explicitly asks"
  - "If you modify the same file more than 3 times, stop and reassess"
  - "Always verify the LAST change before declaring done"
  - "Remove unused imports and dead code"
  - Docs workflow: present docs → get approval → read before changes → update on change → verify at end
- **21 built-in tools** (was 20)
- **359 unit tests** (19 → 20 files, +11 tests)

## Web UI features (public/index.html)
- **Diff viewer** — line-level diffs (LCS) for write_file, replace_in_file, append_file
- **Session manager** — create/switch/list/rename/export/import/delete sessions with auto-title, metadata, disk persistence across restarts; tool messages stripped from persisted sessions
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
- **Project panel** — sidebar with project list, detail view, progress bars, status management, create/delete

## Key modules
- `src/mcp/` — MCP support (types, StdioTransport, HTTPTransport, MCPManager, config loader)
- `src/lsp/` — LSP support (LSPClient, LSPManager, tool definitions: code_definition/references/hover/lookup_symbol/get_diagnostics; multi-language via entries[] matching filePatterns)
- `src/persistence.ts` — multi-session persistence (sessions/ dir, auto-title, modelPreset)
- `src/tools/toolRegistry.ts` — central tool registry combining builtin + MCP + LSP tools
- `src/ProjectManager.ts` — create/list/load/save/delete projects on disk, linked to PlanManager

## Known limitations
- **Windows LSP binary spawn** — `spawn()` can't find global npm `.cmd` files; shell fallback sometimes causes exit race. Mitigated with `shell: true`. LSP works in tests (mock server) and on Linux/macOS.
- **CI timeout** — `CodingAgent.test.ts`, `agent.test.ts`, `server.test.ts` use real API keys and can timeout in CI when rate-limited. Mitigated with `--test-timeout=15000`.
- **Node 24 issue** — Node 24 test runner has IPC serialization issues with `ts-node/register` (`Unable to deserialize cloned data`). CI uses Node 22 only. **Note:** Still sometimes flakes on Node 22 too — rerun CI if that happens.
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

## v1.26.0 changes
- **Governance system** 🛡️ — per-tool approval workflow: safe (auto), sensitive (ask), dangerous (block)
  - `src/tools/governance.ts`: `ToolSafetyLevel`, `ApprovalStore` for permanent allow/deny
  - CLI prompt on sensitive tools (`y`=once, `Y`=always, `n`=no, `N`=never)
  - `/gov` toggle command, `/trust` list permanently allowed tools
  - `executeTool()` checks approval before running sensitive tools
  - API endpoints: `POST /api/approve/:sessionId`, `GET/POST /api/gov`, `GET /api/trust`
  - Web UI auto-approves when governance disabled; SSE `approval_request` event when enabled
  - `setApprovalCallback()` returns previous callback for save/restore
  - `governanceEnabled` default: `true` (CLI & server mode); `/gov` toggles at runtime
  - Global pending approvals map (`globalPendingApproves`) resolves across SSE/boundaries
  - 120s approval timeout with `.unref()`
  - Tests: 14 governance tests
- **Task Planner** 📋 — automatic planning phase before execution loop
  - `CodingAgent.plan()`: extra API call at start of `execute()` outputs numbered plan
  - `PlanManager` (`src/PlanManager.ts`): parse steps, track status (pending/in_progress/completed/skipped), auto-match tool calls to steps
  - Progress summary injected every 3 steps or on completion
  - Non-blocking: silently skipped if planning call fails
  - 25 unit tests + 4 integration tests
- **PlanManager** (`src/PlanManager.ts`):
  - `parsePlan()`: parses numbered lists (1. or 1)) into `PlanStep[]`
  - `matchToolToStep()`: keyword/path matching to auto-assign tool calls to steps
  - `recordToolCall()` / `markCompleted()` / `markSkipped()`: status tracking
  - `getProgressSummary()`: formatted `[Progress X% (M/N)]` with checkmarks
  - `toJSON()` / `fromJSON()`: serialization for session persistence
- **Idle timeout fix** (CodingAgent.ts): absolute 120s → per-token reset (matches server.ts pattern)
- **Removed duplicate LSP languages** — `addConfig()` replaces default when same `languageId` (typescript from `.coding-agent.json` overrides hardcoded default)
- **Test fixes**: all CodingAgent tests updated for `plan()` call (shifted counters + planOk mock), self-reflection test fixed for validation schema
- **ProjectManager** 📁 (`src/ProjectManager.ts`):
  - Create/list/load/save/delete projects on disk (`projects/` dir), linked to PlanManager
  - `create()`: saves plan steps, status, session linkage
  - `loadAll()` / `get()` / `getAll()`: in-memory + disk persistence
  - `setStatus()`: lifecycle management (active/paused/completed/abandoned)
  - `addSession()` / `findForSession()`: multi-session project association
  - `restorePlan()`: reconstruct PlanManager from saved project
  - `toSummary()` / `listSummaries()`: progress percentages for UI
  - `updatePlan()`: sync plan step status to disk
  - Sorted by `updatedAt` (newest first)
- **Project API** (server.ts):
  - `GET /api/projects` — list summaries
  - `GET /api/projects/:id` — get full project
  - `POST /api/projects` — create (requires title, sessionId, planSteps)
  - `POST /api/projects/:id/status` — update status
  - `DELETE /api/projects/:id` — delete
  - Session `meta.projectId` links sessions to projects
- **CLI commands** (`agent.ts`):
  - `/project list` — list all projects with progress
  - `/project show <id>` — full detail + plan steps
  - `/project status <id> <val>` — update lifecycle status
  - `/project delete <id>` — remove project
  - Projects loaded from disk at startup via `projectManager.loadAll()()`
- **Web UI project panel** (`public/index.html`):
  - 📋 Projects button in toolbar + status indicator
  - Slide-out sidebar with project list, progress bars, status colors
  - Detail view with step-by-step plan, status selector, delete button
  - "Projects" button toggles panel; overlay click / Escape closes
  - `/project list` command shows panel
  - Create button with title/description prompt
- **11 unit tests** (`projectManager.test.ts`) — creation, persistence, status, session linking, plan restoration, summary, sorting
- **9 integration tests** (`sessionProjectPlan.test.ts`) — Session ↔ Project ↔ Plan lifecycle: create without project, create project with plan, link new session to project, sync plan completion, restore plan state, find by session, multi-session projects

## v1.25.0 changes
- **Cerebras provider** 🆕 — 14th provider, API key `CEREBRAS_API_KEY`, 3 models (`gpt-oss-120b`, `gemma-4-31b`, `zai-glm-4.7`)
- **Proactive model discovery** — `runDiscovery()` at startup populates `bestModels` map; `resolveRoute()` in autoRouter checks it first, using best discovered model per provider
- **11/10 provider discoverers** (10 cloud + Cerebras) — mistral, openrouter, groq, google, xai, cohere, deepseek, anthropic, together, perplexity, cerebras
- **Known-model fallback** — Google, xAI, Cohere, DeepSeek, Anthropic, Together, Perplexity, Cerebras have static model lists for when APIs restrict `/v1/models`
- **Google discovery fix** — uses URL-based auth (no `Authorization: Bearer` header)
- **Auto-correct** — 400 invalid model → auto-discover → retry
- **Auto-fallback** — 2 consecutive text-only turns → switch provider
- **`POST /api/presets` & `DELETE /api/presets/:num`** — API endpoints for user preset management

## v1.24.0 changes
- **`run_tests` built-in tool** — auto-detects test framework and runs tests
- **Self-Reflection** — CodingAgent retries failed tool calls with error feedback
- **System prompt**: models instructed to run tests after writing code; step-by-step reasoning framework
- **Project Map** — auto-scans project structure (config files, source dirs, entry points, test dirs) and injects as context
- **18 built-in tools** (was 17)

## v1.23.0 changes
- **`web_search` built-in tool** — searches DuckDuckGo first, falls back to Bing, then Google (if configured). Free, no API key.
- **`/tools` command** — lists all available tools directly without contacting the model
- **`/help` command** — opens help modal directly (no model involvement)
- **MCP status in UI** — shows connected server names (like LSP shows languages)
- **System prompt**: models told to use `tools[]` directly, not read source files
- **Google Custom Search** — optional final fallback for web_search (requires GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX)
- **17 built-in tools** (was 16)

## v1.22.0 changes
- **Git tools**: `git_diff`, `git_commit`, `git_log` built-in tools in fileManager.ts
- **Docker sandbox**: optional command isolation via `DOCKER_SANDBOX_ENABLED=true` and `DOCKER_IMAGE`
- **Session export/import**: `GET /api/sessions/:id/export`, `POST /api/sessions/import`, Web UI 💾/📥 buttons
- **Tool messages stripped**: sessions no longer persist tool messages (only user/assistant)
- **Test-like sessions filtered**: titles matching `update *.txt`, `create *.txt` etc hidden from session list
- **Empty sessions not persisted**: sessions with no user messages are not saved
- **Delete-all safety**: Web UI requires typing "DELETE", CLI requires "yes"

## v1.27.0 changes
- **Multi-agent mode switching** 🎛️ — `build` (full access) / `plan` (read-only) modes
  - `src/AgentMode.ts`: mode types, `filterToolsForMode()`, `detectIntent()`, `SWITCH_MODE_TOOL`
  - `CodingAgent` accepts `mode` parameter; `buildRequest()` filters tools per mode
  - Intent detection: read-only keywords → auto `plan`, write keywords → auto `build`
  - `switch_mode` tool: agent autonomously escalates plan→build or build→plan with reason
  - Is available in both modes — plan mode is not a cage
- **`@explore` subagent** — user types `@explore <query>`, spawns read-only CodingAgent, results injected as system message
- **CLI**: `/mode build|plan` command
- **Web UI**: mode toggle button (blue=Build, yellow=Plan)
- **API**: `GET/POST /api/mode/:sessionId` endpoints
- **Server**: `switch_mode` handled internally in chat endpoint; tools filtered per mode
- **334 tests** (332 original + 2 smoke mode tests; 0 fail)

## v1.28.0 changes
- **Event callback interface** (`src/CodingAgent.ts`): `AgentCallbacks` with `onToken`, `onToolCall`, `onToolResult`, `onDiff`, `onStatus`, `onModel`, `onPlan`, `onError` for SSE integration
- **`CodingAgent.execute()` now invokes callbacks** at all key points: streaming tokens, model selection, plan generation, tool execution, diffs, errors
- **server.ts refactored** to use `CodingAgent.execute()` with callbacks instead of a manual depth loop:
  - Replaced ~180 lines of manual stream parsing, tool execution, diff computation, keepalive, and fallback routing with a single `new CodingAgent(...)` + `agent.execute(message)`
  - Removed `tryNextRouteEntry()`, `MAX_DEPTH`, dead imports (`executeTool`, `getRouteEntries`)
  - Added 15s keepalive SSE interval during agent execution
  - Plan steps are synced back to session + linked project after execution
  - Governance approval callback preserved (set before CodingAgent creation)
- **Diff capture in CodingAgent**: resolves file paths via `ALLOWED_DIR` before reading for diff events
- **Session-Project-Plan integrity** 🛡️ — atomic reference lifecycle across all three entities:
  - `projectId` persisted in session disk files (survives restart)
  - Session deletion cleans up `sessionIds[]` in linked project via `removeSession()`
  - Project deletion clears `projectId` from all linked sessions
  - `create_project` tool callback links `s.meta.projectId` (both API and tool path work)
  - Empty sessionId (`""`) filtered in `create()`, `addSession()`, `loadAll()`
  - `setCurrentSessionId()` global prevents orphan projects from agent-dispatched `create_project`
- **Atomic file writes** — `write .tmp → rename` pattern in `ProjectManager._save()` and `saveSessionToDisk()` prevents corrupt JSON on crash
- **PROJECTS_DIR always aligned** with `ALLOWED_DIR` (removed `if` guard + removed `PROJECTS_DIR=./projects` from `.env`)
- **Continue button** in Web UI project detail panel (green `▶ Continue` → `switchToSession(p.sessionIds[0])`)
- **Tool call display** simplified: `🔧` icon-only collapse (was full header)
- **System prompt** updated: commands to use LSP diagnostics when scripts fail (instead of retrying pip install/environments)
- **Self-reflection recovery** enhanced: suggests `code_get_diagnostics` after 3 consecutive tool failures
- **Auto-inject LSP diagnostics**: when `run_command`/`run_tests` fails with Python errors (ImportError, SyntaxError, etc.), CodingAgent automatically calls `code_get_diagnostics` on the failing file and injects results as a system message — no model involvement needed
- **LSP auto-install on write**: `KNOWN_LSP_SERVERS` registry maps file types to npm packages (TypeScript, Python, JSON, HTML, CSS). When agent writes a file matching a known type, `autoInstallAndStart()` installs the npm package, registers the LSP server config, and starts it — all automatic, no model involvement.
- **API endpoint** `POST /api/lsp/install { filePath }` — manual trigger for pre-existing files
- **341 unit tests** + 26 integration tests (was 334 + 26)

## Conventions
- No comments in code unless necessary
- Use async/await, not raw promises
- Immutable state in ConversationState
- All module imports at top of files
- Use pino for logging, console.log for user output
- Keep agent.ts thin — logic goes in separate modules
- Web UI must use plain JS (no TypeScript in public/)
- Batch files for Windows launchers
