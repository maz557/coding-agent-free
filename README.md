# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Stars"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Last Commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <br/>
  <a href="#-why-this-agent"><strong>Why This Agent?</strong></a> •
  <a href="#quick-start"><strong>Quick Start</strong></a> •
  <a href="#local-models-ollama-lm-studio-llamacpp"><strong>Local Models</strong></a> •
  <a href="#example-session"><strong>Demo</strong></a>
</p>

An interactive AI coding assistant that runs in your terminal — powered by **free** cloud APIs (OpenRouter, Groq, Google, DeepSeek, Mistral) and **local** models (Ollama, LM Studio, Llama.cpp). It reads, writes, searches, copies, moves, and deletes files, and runs shell commands — all through natural language tool calling.

> 💡 **Offline-ready**: With a local server, the agent works fully offline — no internet required, no data leaves your machine.

## 🧠 Why This Agent?

| Problem | How This Agent Solves It |
|---------|--------------------------|
| Coding assistants cost $20/month (ChatGPT+, Claude Pro) | **100% free** — uses free-tier OpenRouter, Groq, Google, DeepSeek, Mistral + local models |
| One provider goes down / rate-limited | **8 providers** — switch instantly with `/model <n>` |
| No internet access / restricted region | **Local models** (Ollama, LM Studio, Llama.cpp) — fully offline |
| Privacy concerns with cloud APIs | Run **local models only** — zero data leaves your machine |
| Setup is too complex | **`npm run setup`** — interactive wizard, no manual `.env` editing |
| AI runs dangerous commands | **Safe mode** (`/safe`) — whitelist-only shell commands |
| Agent gets stuck in loops | **Smart detection** — stops after 3× identical tool calls |

## Quick Start

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

Run the interactive setup wizard (recommended):
```bash
npm run setup
```

Or create `.env` manually (pick at least one provider):
```bash
# OpenRouter (easiest — single key for 18+ free tool-calling models)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# Optional providers:
echo "GROQ_API_KEY=gsk_..." >> .env      # Ultra-fast inference
echo "GOOGLE_API_KEY=AIza..." >> .env     # Gemini models
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Mistral models
```

**Fully offline (no API keys needed):**
```bash
# 1. Clone and install (requires internet once)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. Start your local model server (pick one):
#    ollama run qwen3:14b           # Ollama
#    # or run LM Studio / llama-server

# 3. Launch the agent:
npm start

# 4. Inside the agent, add your local model:
#    You: /add 6 ollama:auto
#    You: /model 6
```

```bash
npm start
```

> On Windows, you can also double-click `run-agent.bat`.

## Example Interactions

**"Create a Python script that prints Fibonacci numbers"**

The agent will create the file, write the code, then run it to verify:

```
You: write a fibonacci.py that prints first 20 numbers
⏳ Thinking...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
Agent: Done! Created fibonacci.py and verified output: 0, 1, 1, 2, 3, 5...
```

**"Find all TypeScript files that call fetch() and replace it with axios"**

```
You: find all .ts files with fetch() calls and change them to axios
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
Agent: Updated 3 files (api.ts, users.ts, auth.ts).
```

**"Debug this error: Cannot read property 'map' of undefined"**

The agent reads the relevant file, analyzes the code, suggests and applies a fix.

## Features

- **8 providers** — OpenRouter, Groq, Google, DeepSeek, Mistral + Ollama, LM Studio, Llama.cpp
- **5 built-in presets** — start with `openrouter/free` (auto-discovers working free models)
- **User presets** — save/add/remove your own models with `/save`, `/add`, `/remove`
- **Fallback chain** — if a model fails, it tries the next in the list
- **13 tools** — read, write, list (with details), create_folder, delete_file, delete_folder (recursive), append_file, copy_file, move_file, file_info, search_content, replace_in_file, and run_command
- **Sliding window context** — keeps the last 20 exchanges by default, truncates large tool results, auto-trims to avoid token limit errors (configurable via `MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH`)
- **Smart loop detection** — stops if a tool is called 3+ times identically or 5+ times consecutively
- **Safe mode** (`--safe` / `/safe`) — whitelist-only shell commands
- **Setup wizard** — `npm run setup` interactively configures .env
- **Automatic retry** — exponential backoff + 120s timeout (300s for local models)
- **Zod validation** — runtime type-checking of every tool input and output
- **Conversation persistence** — auto-save/restore sessions across restarts
- **Structured logging** — via `pino` (stderr, doesn't interfere with UI)

## Available Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read contents of a file |
| `write_file` | Write content to a file (creates/overwrites) |
| `list_files` | List directory contents. Use `details:true` for size + timestamps |
| `create_folder` | Create a new folder |
| `delete_file` | Delete a single file |
| `delete_folder` | Delete a folder. Set `recursive:true` for non‑empty folders |
| `append_file` | Append content to an existing file |
| `copy_file` | Copy a file from source to destination |
| `move_file` | Move or rename a file |
| `file_info` | Get detailed metadata (size, permissions, timestamps) |
| `search_content` | Search for exact text in files. Supports `filePattern` (e.g. `*.ts`) and `maxResults` (default 50). Skips files >1MB |
| `replace_in_file` | Replace the first occurrence of exact text (case‑sensitive) |
| `run_command` | Run a shell command in the workspace |

## Commands

| Command | Description |
|---------|-------------|
| `/model <n>` | Switch to preset n |
| `/save <n>` | Save current model as preset n |
| `/add <n> <m>` | Add model m as preset n (`provider:model` or just `model`) |
| `/remove <n>` | Remove a user preset |
| `/allow <p>` | Allow model to access a path outside workspace |
| `/safe` | Toggle safe mode (whitelist-only shell commands) |
| `/models` | Show all presets |
| `/reset` | Clear conversation history (start fresh) |
| `/list-providers` | Show providers with valid keys (and local providers) |
| `/exit` | Quit |

## Multi-Provider Usage

Each preset is tied to a provider. Switching presets with `/model <n>` recreates the API client automatically:

```
You: /add 6 groq:openai/gpt-oss-120b
✅ Added preset 6: [Groq] openai/gpt-oss-120b

You: /model 6
✅ Switched to preset 6: [Groq] openai/gpt-oss-120b
   (now using Groq's API with gpt-oss-120b)

You: /model 1
✅ Switched to preset 1: [OpenRouter] openrouter/free
   (back to OpenRouter)
```

### Adding models from other providers

```
/add <n> <provider>:<model-id>
```

Examples:
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

If you omit the provider (e.g. `/add 10 llama-3.3-70b-versatile`), it defaults to the current preset's provider.

## Local Models (Ollama, LM Studio, Llama.cpp)

The agent supports any OpenAI-compatible local server with zero configuration:

### Quick start

Make sure your local server is running, then:

```
You: /add 6 ollama:auto
✅ Auto-detected model: llama3.2:latest
✅ Added preset 6: [Ollama] llama3.2:latest

You: /model 6
✅ Switched to preset 6: [Ollama] llama3.2:latest
```

Or for LM Studio:

```
You: /add 7 lmstudio:auto
✅ Added preset 7: [LM Studio] qwen2.5-coder-7b-instruct
```

The `:auto` keyword tells the agent to connect to the local server and detect the loaded model automatically.

### Quick start — specific local model

```bash
# Ollama — pull and serve a tool-calling model
ollama pull llama3.2
ollama serve                  # starts on port 11434

# Llama.cpp — serve a GGUF model directly
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — uses the built-in lms CLI
lms get llama-3.2-3b-instruct   # download a model
lms load llama-3.2-3b-instruct  # load into memory
lms server start --port 1234    # start the API server
```

Then add the local model to the agent:
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### Custom ports

Set in `.env`:
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### Requirements

- **Ollama**: [Download](https://ollama.ai) → `ollama pull llama3.2` → `ollama serve`
- **LM Studio**: [Download](https://lmstudio.ai) → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp**: [Download](https://github.com/ggerganov/llama.cpp) → Build or get a binary → `llama-server -m model.gguf --port 8080`
- The model must support **tool calling** (function calling) for full agent functionality.
- No API key required — local providers are skipped during startup key validation.
- All local providers use the OpenAI-compatible API, so no additional packages are needed.

## Workspace & Permissions

By default, the agent can only access files inside `./workspace`. To access other paths:

### Option 1: Change default workspace (permanent)

Set `ALLOWED_DIR` in `.env`:
```
ALLOWED_DIR=.          # project root — access everything
ALLOWED_DIR=C:\path    # any absolute path
```

### Option 2: Allow paths on-demand (per session)

When the model tries to access a path outside the workspace:
```
❌ Tool Error: Access denied: "C:\path" is outside the allowed directory.
   Use command: /allow "C:\path"
```

Grant access with:
```
You: /allow "C:\path"
✅ Allowed: C:\path
```

Permissions last for the current session only.

## Built-in Presets

| # | Model | Provider | Speed | Notes |
|---|-------|----------|-------|-------|
| 1 | `openrouter/free` | OpenRouter | varies | Auto-routes to available free models |
| 2 | Qwen 3 Next 80B | OpenRouter | medium | Good general purpose |
| 3 | Nemotron 3 Super 120B | OpenRouter | medium | 1M context |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | fast | Strong reasoning |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | slow | Largest free model with tools |

## Recommended Free Coding Models by Provider

### OpenRouter
Use the `openrouter/free` router, or pin specific models with `/add <n> <model>:free`.

### Groq (fastest — LPU hardware)
```
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
Rate limits: 30 RPM, ~1K RPD. All models support tool calling.

### Mistral (EU-hosted)
```
/add 10 mistral:codestral-latest       # Dedicated coding model
/add 11 mistral:mistral-large-latest   # Best quality
/add 12 mistral:mistral-small-latest   # Lightweight & fast
/add 13 mistral:open-mistral-nemo      # 128K context, open-weight
```
Free tier: ~1 req/s, 1B tokens/month.

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # Fast, good coding
```
Free tier: 5-15 RPM, 100-1K RPD.

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # General purpose
/add 16 deepseek:deepseek-reasoner     # Strong reasoning
```
Free tier: ~500 RPM, 500M tokens/day.

## Example Session

```
You: /model 4
✅ Switched to preset 4: openai/gpt-oss-120b:free

You: create a folder named demo and write a hello.py
⏳ Thinking...
  [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
Agent: Done! Created demo/hello.py with a Hello World script.

You: run the file
⏳ Thinking...
  [Model: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
Agent: Hello, world! — the script runs correctly.

You: /model 6
✅ Switched to preset 6: [Groq] openai/gpt-oss-120b
   (now using Groq — same model, 500 t/s)

You: list files
⏳ Thinking...
  [Model: openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
Agent: demo/hello.py  ...
```

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|------|
| `403 Forbidden` | API key missing or invalid | Check `.env` has the right key for that provider |
| `403 Forbidden` | Internet restrictions blocking API host | Enable VPN/proxy, set `HTTPS_PROXY`, or use local models: `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | Free tier daily limit hit | Wait, use different provider, or switch to local models |
| `All 3 attempts failed` | Model unreachable or too slow | Try a smaller model or use local models |
| `tool_calls` with empty arguments | Model doesn't support tool calling | Use a different model |
| `ENOTFOUND` / `ECONNREFUSED` | Internet restrictions or proxy needed | Enable VPN/proxy, set `HTTPS_PROXY`, or use local models |

### Quick checks
- `/list-providers` — shows which API keys are configured
- `/safe` — toggle safe mode status
- `npm run setup` — re-run the setup wizard
- `npm start` — restart after any code update

## Project Structure

```
coding-agent-free/
├── src/
│   ├── agent.ts           # Main agent: CLI, presets, loop detection, retry, validation
│   └── tools/
│       └── fileManager.ts # 13 tools + dangerous command denylist + safe mode whitelist
├── scripts/
│   ├── check_models.js    # List free OpenRouter models with tool support
│   ├── setup.js           # Interactive setup wizard (npm run setup)
│   └── test.js            # Non-interactive test
├── local/                  # Local tools (gitignored)
│   ├── backup/src/         # Snapshot of src/ for quick rollback
│   └── restore.ps1         # Restore src/ from backup
├── workspace/             # Default working directory
├── .env                   # API keys (gitignored)
├── presets.json           # User presets (gitignored)
├── tsconfig.json
└── run-agent.bat          # Double-click launcher (Windows)
```

## Environment Variables

| Variable | Required? | Description |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | No* | OpenRouter API key — https://openrouter.ai/keys |
| `GROQ_API_KEY` | No* | Groq API key — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | No* | Google AI Studio key — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | No* | DeepSeek API key — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | No* | Mistral API key — https://console.mistral.ai |
| `OLLAMA_HOST` | No | Ollama server URL (default: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | No | LM Studio server URL (default: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | No | Llama.cpp server URL (default: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | No | Directory for file operations (default: `./workspace`) |
| `LOCAL_TIMEOUT` | No | Timeout (ms) for local model requests (default: 300000) |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` (default: `info`) |
| `MAX_EXCHANGES` | No | Max user ↔ assistant exchanges kept in sliding window (default: `20`) |
| `MAX_TOOL_RESULT_LENGTH` | No | Max chars before tool results are truncated (default: `5000`) |

\* At least one API key is required (not needed for local providers).

## Large Projects

For medium-to-large projects, the default sliding window (20 exchanges) may drop older context. Increase these values in `.env`:

```env
# Keep up to 50 user-assistant exchanges
MAX_EXCHANGES=50

# Allow tool results up to 20,000 characters
MAX_TOOL_RESULT_LENGTH=20000
```

You can also reset the conversation mid-session with `/reset` if the model gets confused by stale context.

## Security

- All file operations restricted to `ALLOWED_DIR` — `sanitizePath` prevents traversal attacks
- Shell commands run inside the workspace directory
- API keys are stored in `.env` (listed in `.gitignore`, never committed)
- Safe mode (`/safe`) restricts commands to a whitelist
- Dangerous shell commands blocked by denylist (rm -rf, dd, mkfs, wget, etc.)
- Use `local/` scripts for backup/restore

## Contributing

Contributions are welcome! Feel free to open an [issue](https://github.com/maz557/coding-agent-free/issues) or submit a pull request. Star the repo if you find it useful — it helps others discover it.

## License

MIT
