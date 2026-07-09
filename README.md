# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Stars"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Last Commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-why-coding-agent-free"><strong>Why This Agent?</strong></a> •
  <a href="#-requirements--installation"><strong>Install</strong></a> •
  <a href="#-usage-guide"><strong>Usage</strong></a> •
  <a href="#%EF%B8%8F-cli-interface"><strong>CLI</strong></a> •
  <a href="#-web-interface"><strong>Web</strong></a> •
  <a href="docs/GUIDE.md"><strong>📘 Guide</strong></a>
</p>

An interactive AI coding assistant that runs in your **terminal** or **web browser** — powered by **free** cloud APIs and **local** models (Ollama, LM Studio, Llama.cpp). It reads, writes, searches, copies, moves, and deletes files, and runs shell commands — all through natural language tool calling. Includes **MCP** (Model Context Protocol) and **LSP** (Language Server Protocol) support for extensibility and deep code understanding.

> 💡 **Offline-ready**: With a local server, the agent works fully offline — no internet required, no data leaves your machine.

---

## 🧠 Why Coding Agent Free?

| Problem | Solution |
|---------|----------|
| Coding assistants cost $20/month (ChatGPT+, Claude Pro) | **100% free** — uses free-tier OpenRouter, Groq, Google, DeepSeek, Mistral + local models |
| One provider goes down / rate-limited | **13 providers** — auto-fallback on 429 + auto-routing (`auto/coding`, `auto/fast`, etc.) + manual `/model <n>` |
| No internet access / restricted region | **Local models** (Ollama, LM Studio, Llama.cpp) — fully offline |
| Privacy concerns with cloud APIs | Run **local models only** — zero data leaves your machine |
| Setup is too complex | **`npm run setup`** — interactive wizard, no manual `.env` editing |
| AI runs dangerous commands | **Safe mode** (`/safe`) — whitelist-only shell commands |
| Agent gets stuck in loops | **Smart detection** — stops after 3× identical tool calls |
| Provider rate-limited | **Auto-fallback** — switches provider automatically on 429 |
| Long tool results waste tokens | **Token compression** — head+tail truncation + duplicate removal |
| Want to extend with external tools | **MCP support** — connect any Model Context Protocol server |
| Need deep code understanding | **LSP support** — go to definition, find references, hover info |
| Want to use your IDE with free models | **OpenAI-compatible API** — `npm run setup-ide` connects Cline, Continue.dev, Cursor |

### Key Features

- **13 providers** — OpenRouter, Groq, Google, DeepSeek, Mistral, Anthropic, Together AI, Perplexity, xAI (Grok), Cohere + Ollama, LM Studio, Llama.cpp
- **MCP (Model Context Protocol)** — connect external tools (filesystem, GitHub API, databases, custom servers). Stdio + HTTP/SSE transports. `/mcp list/connect/disconnect/toggle`
- **LSP (Language Server Protocol)** — `code_definition`, `code_references`, `code_hover` tools. Supports TypeScript, JavaScript, Python (pyright), Rust (rust-analyzer), Go (gopls). `/lsp` toggle
- **Multi-session management** — named sessions in `sessions/` directory, auto-title, modelPreset metadata. Work on multiple projects independently and switch between them at any time. `/session list/new/rename/delete`
- **7 built-in presets** — start with `openrouter/free` (auto-discovers working free models), plus Google Gemini and Ollama for local/offline use
- **Auto-routing** — 6 quality-filtered routes (`auto/coding`, `auto/fast`, `auto/cheap`, `auto/reasoning`, `auto/vision`, `auto/offline`) with automatic API key detection; user-editable via `route-presets.json`
- **Usage tracking** — per-session and aggregated token/request counts via API (`GET /api/usage`)
- **Collapsible fallback errors** — failed fallback attempts shown as expandable ⚠️ N fallback(s) banner inside the assistant message
- **User presets** — save/add/remove your own models with `/save`, `/add`, `/remove`
- **Fallback chain** — auto-fallback across providers on rate limit (429), plus model-level fallbacks
- **13 built-in tools** — read, write, list, create_folder, delete_file, delete_folder, append_file, copy_file, move_file, file_info, search_content, replace_in_file, run_command
- **Token compression** — head+tail truncation + automatic duplicate removal
- **Sliding window context** — keeps the last 20 exchanges, auto-trims (configurable)
- **Smart loop detection** — stops after 3× identical or 5× consecutive tool calls
- **Safe mode** (`--safe` / `/safe`) — whitelist-only shell commands
- **Setup wizard** — `npm run setup` interactively configures .env
- **Automatic retry** — exponential backoff + 120s timeout (300s for local models)
- **Zod validation** — runtime type-checking of every tool input and output
- **CLI & Web unified** — shared model config, system prompt, tool engine
- **AGENTS.md support** — drop `AGENTS.md` in project root for project-specific context
- **Session disk persistence** (Web UI) — sessions saved to `sessions/` dir, survive restarts
- **Session rename** — rename sessions in Web UI via ✏️ button or API
- **Collapsible tool calls** — ▶/▼ toggle for streaming & history in Web UI
- **Stop button** — abort AI generation mid-stream via AbortController
- **Per-message copy** — 📋 button on every user/assistant message
- **Copy session** — 📄 Copy session as markdown via button or Ctrl+Shift+C
- **Keyboard shortcuts** — Ctrl+N/D/K/B/L, PgUp/PgDn, Home/End, Escape
- **Settings panel** — font-size slider, compact mode, auto-scroll (localStorage)
- **Auto-scroll toggle** — floating ⬇ button when scrolled up
- **Toast notifications** — 3s auto-dismiss feedback
- **Welcome screen** — empty-state guide, removed on first message
- **Diff Viewer** (Web UI) — line-level LCS diffs for file operations
- **Standalone binary** — compile with `npm run build:binary` (no Node.js required)

---

## 🛠️ Requirements & Installation

### Prerequisites

- **Node.js 18+** (or use the standalone binary — no Node.js needed)
- **npm** (comes with Node.js)
- **Optional**: One or more API keys (see [Environment Variables](#environment-variables))
- **Optional for local models**: [Ollama](https://ollama.ai), [LM Studio](https://lmstudio.ai), or [Llama.cpp](https://github.com/ggerganov/llama.cpp)
- **Optional for LSP**: `typescript-language-server`, `pyright`, `rust-analyzer`, `gopls`, `clangd`, `solargraph`, `lua-language-server`

### Quick Install

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

### Setup

**Option A — Interactive wizard (recommended):**
```bash
npm run setup
```
The wizard also offers to install LSP servers (`typescript-language-server`, `pyright`, `sql-language-server`) globally for code intelligence (definition, references, hover).

**Option B — Manual `.env` (pick at least one provider):**
```bash
# OpenRouter (easiest — single key for 18+ free tool-calling models)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# Optional providers:
echo "GROQ_API_KEY=gsk_..." >> .env      # Ultra-fast inference
echo "GOOGLE_API_KEY=AIza..." >> .env     # Gemini models
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Mistral models
```

**Option C — Local only (fully offline):**
```bash
# Skip API keys — just start your local model server
ollama run qwen3:14b    # or LM Studio, Llama.cpp
npm start               # Inside agent: /add 6 ollama:auto && /model 6
```

### Standalone Binary (no Node.js)

Build a single executable for Windows, Linux, or macOS:

```bash
npm run build:binary          # All platforms
npm run build:binary:win      # Windows only
npm run build:binary:web      # Web server binary
node scripts/build-binary.js node18-win-x64 coding-agent.exe  # Or via helper
```

### IDE Integration

```bash
npm run setup-ide
```
Configures **Cline**, **Continue.dev**, and **Cursor** to use the local API proxy at `http://localhost:3000/v1/chat/completions`.

### Environment Variables

| Variable | Required? | Free Tier | Description |
|----------|-----------|-----------|-------------|
| `OPENROUTER_API_KEY` | No* | 18+ free models, 1 key | https://openrouter.ai/keys |
| `GROQ_API_KEY` | No* | 30 req/min on many models | https://console.groq.com/keys |
| `GOOGLE_API_KEY` | No* | 60 req/min, generous free tier | https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | No* | Credit-based free tier | https://platform.deepseek.com |
| `MISTRAL_API_KEY` | No* | Free tier available | https://console.mistral.ai |
| `ANTHROPIC_API_KEY` | No* | Limited free tier | https://console.anthropic.com |
| `TOGETHER_API_KEY` | No* | 25 free API calls/day | https://api.together.xyz/settings/api-keys |
| `PERPLEXITY_API_KEY` | No* | $5 free credit | https://www.perplexity.ai/settings/api |
| `XAI_API_KEY` | No* | Free tier (limited) | https://console.x.ai |
| `COHERE_API_KEY` | No* | Free tier (1000 req/month) | https://dashboard.cohere.com/api-keys |
| `OLLAMA_HOST` | No | — | Ollama server URL (default: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | No | — | LM Studio URL (default: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | No | — | Llama.cpp URL (default: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | No | — | Directory for file operations (default: `./workspace`) |
| `LOCAL_TIMEOUT` | No | — | Override timeout (ms) for local models (default from `.coding-agent.json`) |
| `LOG_LEVEL` | No | — | `debug`, `info`, `warn`, `error` (default: `info`) |
| `MAX_EXCHANGES` | No | — | Max exchanges in sliding window (default: `20`) |
| `MAX_TOOL_RESULT_LENGTH` | No | — | Max chars before truncation (default: `5000`) |

\* At least one API key required (not needed for local providers).

See [docs/GUIDE.md](docs/GUIDE.md#comprehensive-free-api-key-guide) for step-by-step key registration guides.

### User Configuration (`.coding-agent.json`)

Hardware-dependent settings go in `.coding-agent.json` (in project root):

```json
{
  "mcpServers": {},
  "lspServers": [...],
  "localTimeoutMs": 600000,
  "cloudTimeoutMs": 120000
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `localTimeoutMs` | `600000` (10 min) | Max wait for local model responses. Increase if running on slow hardware |
| `cloudTimeoutMs` | `120000` (2 min) | Max wait for cloud API responses |

The `LOCAL_TIMEOUT` env var overrides `localTimeoutMs` if set. The timeout resets on each streaming token — it only fires when no data arrives for the full duration.

### Project Structure

```
coding-agent-free/
├── src/
│   ├── agent.ts                # CLI entry point
│   ├── CodingAgent.ts          # Agent loop, tool execution, stuck detection
│   ├── ConversationState.ts    # Sliding window, context trimming
│   ├── server.ts               # Express web server (SSE, sessions, API)
│   ├── persistence.ts          # Multi-session save/load
│   ├── config/models.ts        # Provider definitions, presets, system prompt (no tool names)
│   ├── config/userConfig.ts    # User configuration loader (.coding-agent.json)
│   ├── validation.ts            # Zod schemas for tool I/O validation
│   ├── tools/
│   │   ├── fileManager.ts      # 13 file/shell tools + safe mode
│   │   └── toolRegistry.ts     # Central registry (builtin + MCP + LSP)
│   ├── mcp/                    # MCP support
│   │   ├── types.ts            # JSON-RPC types, Tool, Transport interface
│   │   ├── transport.ts        # StdioTransport (subprocess)
│   │   ├── HTTPTransport.ts    # HTTP/SSE transport
│   │   ├── MCPManager.ts       # Multi-server management
│   │   └── config.ts           # Load MCP servers from .coding-agent.json
│   ├── lsp/                    # LSP support
│   │   ├── LSPClient.ts        # JSON-RPC LSP client over stdio
│   │   ├── LSPManager.ts       # Multi-language LSP server management (entries[] w/ filePatterns)
│   │   ├── config.ts           # Load LSP servers from .coding-agent.json
│   │   └── index.ts            # Tool definitions: code_definition/references/hover/lookup_symbol/get_diagnostics
│   └── __tests__/              # 13 test files, 220+ unit tests
├── public/index.html           # Web UI (plain JS)
├── sessions/                   # Session storage
├── workspace/                  # Default working directory
├── scripts/                    # Setup, build, test, cleanup scripts
├── examples/mcp-echo-server.js # Minimal MCP server example
├── .coding-agent.json          # MCP + LSP server configuration
├── AGENTS.md                   # Auto-loaded project context
├── tsconfig.json
└── package.json
```

---

## 📖 Usage Guide

### ⌨️ CLI Interface

```bash
npm start
```
> On Windows, double-click `run-cli.bat`.
> For RTL languages (Persian, Arabic, Urdu), use `run-cli-rtl.bat` (requires [WezTerm](https://wezfurlong.org/wezterm/)).

The agent automatically connects MCP and LSP servers on startup, loads project context from `AGENTS.md`, and restores the last session.

**Best for:** Quick tasks, terminal-centric workflows, CI/CD automation, RTL language support, low resource usage.
**Has:** Full session CRUD, all slash commands, MCP/LSP management.

### 🌐 Web Interface

```bash
npm run web
# Open http://localhost:3000 in your browser
```
> On Windows, double-click `run-web.bat`.

**Best for:** Visual diff review, session management with persistence, keyboard shortcuts, team collaboration, settings customization — **this interface has the most features overall**.
**Has:** All CLI capabilities + visual diff viewer, settings panel, collapsible tool calls, stop button, auto-scroll toggle, per-message & session copy, welcome screen, toast notifications, keyboard shortcuts, LSP/MCP toggle indicators, route badge, collapsible fallback errors banner.

Web UI features:
- **Streaming responses** — token-by-token via SSE
- **Diff Viewer** — line-level LCS diffs for write/replace/append operations
- **Session Manager** — create, switch, list, rename sessions; disk persistence across restarts
- **Settings Panel** — font-size slider, compact mode, auto-scroll toggle (localStorage)
- **Keyboard Shortcuts** — Ctrl+N (new), Ctrl+D/B (sessions), Ctrl+K (focus), Ctrl+L (reset), Ctrl+Shift+C (copy session), Escape (close), PgUp/PgDn/Home/End
- **Collapsible Tool Calls** — ▶/▼ toggle header + body for streaming and history
- **Stop Button** — abort streaming via AbortController
- **Auto-scroll Toggle** — floating ⬇ button when scrolled up
- **Per-message Copy** — 📋 button on every user/assistant message (preserved during streaming)
- **Copy Session** — 📄 button + Ctrl+Shift+C formats conversation as markdown
- **Toast Notifications** — 3s auto-dismiss feedback
- **Welcome Screen** — shown on empty chat, removed on first message
- **Route Badge** — blue pill showing current auto-route (e.g. "Coding", "Fast") with provider:model tooltip
- **Collapsible Fallback Errors** — ⚠️ N fallback(s) banner inside assistant message, expandable to show error details
- **LSP Toggle** — 🟢ON/⚫OFF status with active languages
- **MCP Toggle** — 🟢ON/⚫OFF status
- **Slash Commands** — `/active`, `/model <n>`, `/safe`, `/allow`, `/reset`, `/models`, `/exit`, `/mcp list/toggle`, `/lsp`
- **Help Modal** — click `?` for usage guide, commands reference, keyboard shortcuts
- **OpenAI-compatible API** — `http://localhost:3000/v1/chat/completions`

**Example session:**
```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│  You: create a hello.py that prints "Hello from Web UI"  │
│  ⏳ Thinking...                                           │
│  🛠  write_file(path="hello.py", content="...")           │
│  ✔  File written (25 bytes)                               │
│  🛠  run_command(command="python hello.py")               │
│  ✔  Hello from Web UI                                     │
│  Done! Created hello.py and verified it prints.           │
│  ──────────────────────────────────────────────────────── │
│  [Message input...                        ] [Send]       │
└──────────────────────────────────────────────────────────┘
```

### Available Tools

#### Built-in Tools (always available)

| Tool | Description |
|------|-------------|
| `read_file` | Read contents of a file |
| `write_file` | Write content to a file (creates/overwrites) |
| `list_files` | List directory contents. Use `details:true` for size + timestamps |
| `create_folder` | Create a new folder |
| `delete_file` | Delete a single file |
| `delete_folder` | Delete a folder. Set `recursive:true` for non-empty folders |
| `append_file` | Append content to an existing file |
| `copy_file` | Copy a file from source to destination |
| `move_file` | Move or rename a file |
| `file_info` | Get detailed metadata (size, permissions, timestamps) |
| `search_content` | Search for exact text in files. Supports `filePattern` and `maxResults` |
| `replace_in_file` | Replace the first occurrence of exact text (case-sensitive) |
| `run_command` | Run a shell command in the workspace |

#### LSP Tools (toggle with `/lsp`)

| Tool | Description |
|------|-------------|
| `code_definition` | Find where a symbol is defined (file:line:column) |
| `code_references` | Find all references to a symbol across the project |
| `code_hover` | Get type signature, documentation, and inline hints |
| `lookup_symbol` | Search for symbols by name (e.g., "find all classes named `User*`") |
| `get_diagnostics` | Get live errors/warnings for a file (like a linter on demand) |

#### MCP Tools (from connected servers)

Tools from connected MCP servers appear automatically alongside built-in tools. See [MCP section](#-mcp-model-context-protocol).

### Commands

| Command | Description |
|---------|-------------|
| `/model <n>` | Switch to preset n (`/model 5`) or auto-route (`/model auto/coding`, `/model auto/fast`, etc.) |
| `/save <n>` | Save current model as preset n |
| `/add <n> <m>` | Add model m as preset n (`provider:model` or just `model`) |
| `/remove <n>` | Remove a user preset |
| `/allow <p>` | Allow model to access a path outside workspace |
| `/safe` | Toggle safe mode |
| `/models` | Show all presets |
| `/active` | Show current active model |
| `/reset` | Clear conversation history |
| `/session list` | List all sessions |
| `/session new <name>` | Create a new session |
| `/session rename <old> <new>` | Rename a session |
| `/session delete <name>` | Delete a session |
| `/mcp list` | List connected MCP servers and their tools |
| `/mcp connect <name> <cmd>` | Connect a new MCP server |
| `/mcp disconnect <name>` | Disconnect an MCP server |
| `/mcp toggle` | Enable / disable all MCP tools |
| `/lsp` | Toggle LSP tools |
| `/list-providers` | Show providers with valid keys |
| `/exit` | Quit |

### 🧩 MCP (Model Context Protocol)

Connect external tools to the agent via MCP servers — filesystem, GitHub API, databases, custom tools, and more. Supports both **stdio** (subprocess) and **HTTP/SSE** (remote) transports.

**Quick start:**
1. Install an MCP server: `npm install -g @modelcontextprotocol/server-filesystem`
2. Add to `.coding-agent.json`:
   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]
       }
     }
   }
   ```
3. Start the agent — it connects automatically: `🔌 MCP "filesystem" connected (2 tools)`

**Example MCP servers:**

| Server | Install | Purpose |
|--------|---------|---------|
| Filesystem | `@modelcontextprotocol/server-filesystem` | Safe file operations with path boundaries |
| GitHub | `@modelcontextprotocol/server-github` | Repository management, PRs, issues |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Read-only database queries |
| Puppeteer | `@modelcontextprotocol/server-puppeteer` | Browser automation, screenshots |

> Create your own MCP server — see [`examples/mcp-echo-server.js`](examples/mcp-echo-server.js) for a minimal example.

### 🔬 LSP (Language Server Protocol)

Deep code understanding via `code_definition`, `code_references`, and `code_hover` tools. Auto-detects project files and starts appropriate LSP servers.

**Supported languages (default):**
| Language | LSP Server | File Patterns |
|----------|-----------|---------------|
| TypeScript/TSX | `typescript-language-server` | `**/*.ts`, `**/*.tsx` |
| JavaScript/JSX | `typescript-language-server` | `**/*.js`, `**/*.jsx`, `**/*.mjs` |
| Python | `pyright` | `**/*.py` |
| Rust | `rust-analyzer` | `**/*.rs` |
| Go | `gopls` | `**/*.go` |
| SQL | `sql-language-server` | `**/*.sql` |
| C | `clangd` | `**/*.c`, `**/*.h` |
| C++ | `clangd` | `**/*.cpp`, `**/*.hpp`, `**/*.cc`, `**/*.cxx` |
| Ruby | `solargraph` | `**/*.rb` |
| Lua | `lua-language-server` | `**/*.lua` |

**Custom LSP servers** — add to `.coding-agent.json`:
```json
{
  "lspServers": [
    {
      "command": "clangd",
      "args": [],
      "languageId": "cpp",
      "filePatterns": ["**/*.cpp", "**/*.h"]
    }
  ]
}
```

Toggle LSP at any time with `/lsp`. Falls back gracefully if no LSP server binary is installed.

### Multi-Provider & Auto-Routing

```bash
# Add a model from any provider
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp

# Use auto-routes (intelligently selects best available model)
/model auto/coding
/model auto/fast

# Switch presets
/model 10
```

Auto-fallback: if a provider returns 429, the agent automatically tries the next model in the auto-route chain. The quality-filtered routes (`auto/coding`, `auto/fast`, `auto/cheap`, `auto/reasoning`, `auto/vision`, `auto/offline`) detect which API keys are available and skip unavailable providers. Edit route priorities in `route-presets.json`.

### Local Models

```bash
# Ollama
ollama pull llama3.2 && ollama serve
# Inside agent: /add 6 ollama:auto

# LM Studio
lms get llama-3.2-3b-instruct && lms server start --port 1234
# Inside agent: /add 7 lmstudio:auto

# Llama.cpp
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080
# Inside agent: /add 8 llamacpp:auto
```

No API key required. The model must support **tool calling** (function calling).

### Workspace & Permissions

By default, the agent can only access files inside `./workspace`. Change with:
- `ALLOWED_DIR=.` in `.env` (access everything)
- `/allow "C:\path"` during a session (temporary)

### Built-in Presets

| # | Model | Provider | Notes |
|---|-------|----------|-------|
| 1 | `openrouter/free` | OpenRouter | Auto-routes to available free models |
| 2 | Qwen 3 Next 80B | OpenRouter | Good general purpose |
| 3 | Nemotron 3 Super 120B | OpenRouter | 1M context |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | Strong reasoning |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | Largest free model with tools |
| 6 | Gemini 2.0 Flash | Google | Fast, strong coding — needs `GOOGLE_API_KEY` |
| 7 | Ornith Agent | Ollama | Local offline model — no API key needed |

> **Auto-routes** (`/model auto/coding`, `/model auto/fast`, etc.) intelligently select the best available model based on quality tiers and API keys. Edit priorities in `route-presets.json`.

### Recommended Free Coding Models

**Groq (fastest):**
```
/add 10 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 11 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
```
**Mistral:**
```
/add 12 mistral:codestral-latest       # Dedicated coding model
/add 13 mistral:mistral-large-latest   # Best quality
```
**Google:**
```
/add 14 google:gemini-2.0-flash-exp    # Fast, good coding
```

> Note: presets 6-7 are reserved for built-in Google Gemini and Ollama models. User presets start at 8+ by convention.

### Example Interactions

```
You: /model auto/coding
✅ Switched to Auto (Coding) — automatically picks best available model

You: create a folder named demo and write a hello.py
⏳ Thinking... [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
Agent: Done! Created demo/hello.py with a Hello World script.

You: run the file
  🔧 run_command({"command":"python demo/hello.py"})
Agent: Hello, world! — the script runs correctly.

You: /model 6
✅ Switched to preset 6: [Groq] openai/gpt-oss-120b
   (now using Groq — same model, 500 t/s)
```

### Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|------|
| `403 Forbidden` | API key missing or invalid | Check `.env` has the right key |
| `429 Rate limit` | Free tier daily limit hit | Wait or use auto-fallback. Manual: `/model <n>` |
| `Agent stopped: stuck detected` | Same tool called 3×+ consecutively | Recovery message injected automatically |
| `All 3 attempts failed` | Model unreachable or too slow | Try smaller model or local model |
| `tool_calls` empty arguments | Model doesn't support tool calling | Use a different model |
| `ENOTFOUND` / `ECONNREFUSED` | Internet restrictions or proxy needed | Enable VPN/proxy or use local models |
| `Request timed out (120s)` | Cloud timeout too short for response | Use local model or provider with faster response |
| `Request timed out (600s)` | Local model too slow on this hardware | Increase `localTimeoutMs` in `.coding-agent.json` |

**Quick checks:** `/list-providers` — shows configured keys. `/safe` — toggle safe mode. `npm run setup` — re-run wizard.

### Limitations

- **System prompt adherence**: Some free models may ignore or partially follow system instructions
- **Rate limits**: Free-tier API keys have daily limits. Retry with backoff (max 3 attempts)
- **Token window**: With 128K context and 20-exchange window, large codebases may hit limits. Increase `MAX_EXCHANGES` and `MAX_TOOL_RESULT_LENGTH`
- **Stuck detection**: Stops after 3× identical or 5× consecutive tool calls — rephrase your request to continue
- **Windows shell**: PowerShell pipeline operators may trigger permission prompts under strict rules
- **LSP availability**: Requires the LSP server binary to be installed (e.g., `typescript-language-server`, `pyright`)
- **MCP servers**: Some servers require internet (GitHub API, etc.) and proper configuration

### Security

- All file operations restricted to `ALLOWED_DIR` — path traversal prevented
- Shell commands run inside the workspace directory
- API keys stored in `.env` (gitignored, never committed)
- Safe mode (`/safe`) restricts commands to a whitelist
- Dangerous commands blocked by denylist (`rm -rf`, `dd`, `mkfs`, `wget`, etc.)

### Large Projects

For medium-to-large projects, increase in `.env`:
```env
MAX_EXCHANGES=50
MAX_TOOL_RESULT_LENGTH=20000
```
Reset mid-session with `/reset` if context gets stale.

---

---

> 💡 **New to Coding Agent Free?** Check the **[Comprehensive User Guide](docs/GUIDE.md)** for step-by-step tutorials, 5 hands-on example projects, and a complete walkthrough from beginner to advanced.

## Tests

- `npm run test:unit` — **220+** unit tests (13 files: ConversationState, comprehensive, CodingAgent, loadProjectContext, fileManager, agent, server, mcp, lsp, persistence, toolRegistry, models, validation)
- `npm run test:integration` — 26 provider integration tests
- `npm test` — 35 integration tests (provider connectivity)
- CI: `.github/workflows/ci.yml` runs all tests on push/PR

## Contributing

Contributions welcome! Open an [issue](https://github.com/maz557/coding-agent-free/issues) or submit a pull request. Star the repo if you find it useful.

## License

MIT
