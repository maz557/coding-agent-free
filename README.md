# Coding Agent Free

An interactive AI coding agent powered by **free** API models (OpenRouter, Groq, Google, DeepSeek, Mistral) and **local** models (Ollama, LM Studio, Llama.cpp). Reads, writes, lists, appends, copies, moves, and deletes files, and runs shell commands — all through tool calling.

> 💡 **Offline-ready**: With a local server (Ollama / LM Studio), the agent works fully offline — no international internet required. Ideal for users in regions with restricted access.

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

```bash
npm start
```

## Features

- **5 providers** — switch between OpenRouter, Groq, Google, DeepSeek, Mistral with one command
- **5 built-in presets** — start with `openrouter/free` (discovers working free models automatically)
- **User presets** — save/add/remove your own models with `/save`, `/add`, `/remove`
- **Fallback chain** — if a model fails, it tries the next in the list
- **13 tools** — read, write, list (with details), create_folder, delete_file, delete_folder (recursive), append_file, copy_file, move_file, file_info, search_content, replace_in_file, and run_command
- **Smart loop detection** — stops if a tool is called 3+ times identically or 5+ times consecutively
- **Safe mode** (`--safe` / `/safe`) — whitelist-only shell commands, blocks all unapproved operations
- **Setup wizard** — `npm run setup` interactively configures .env with no manual editing
- **Automatic retry** — exponential backoff + 120s timeout for flaky free APIs (300s for local models)
- **Zod validation** — runtime type-checking of every tool input and output
- **Persistent presets** — saved to `presets.json` and reloaded across sessions
- **Structured logging** — via `pino` (stderr, doesn't interfere with the prompt)
- **TypeScript** — clean, class-based architecture

## Available Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read the contents of a file |
| `write_file` | Write content to a file (creates/overwrites) |
| `list_files` | List files and folders in a directory. Use `details:true` for size + timestamps |
| `create_folder` | Create a new folder |
| `delete_file` | Delete a single file |
| `delete_folder` | Delete a folder. Set `recursive:true` for non‑empty folders |
| `append_file` | Append content to an existing file |
| `copy_file` | Copy a file from source to destination |
| `move_file` | Move or rename a file |
| `file_info` | Get detailed metadata (size, permissions, modified/created timestamps) |
| `search_content` | Search for exact text in files. Supports `filePattern` (e.g. `*.ts`) and `maxResults` (default 50). Skips files >1MB |
| `replace_in_file` | Replace the first occurrence of exact text (case‑sensitive) |
| `run_command` | Run a shell command in the workspace (dangerous commands blocked by denylist)

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
| `/list-providers` | Show providers with valid keys (and local providers) |
| `/exit` | Quit |

## Multi-Provider Usage

Each preset is tied to a provider. Switching presets with `/model <n>` automatically recreates the API client — zero manual steps.

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

## Local Models (Ollama, LM Studio, Llama.cpp, etc.)

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

### Custom ports

Set environment variables in `.env` to change the default port:

```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### Manual model selection

You can also specify the model name directly (no auto-detection):

```
You: /add 6 ollama:llama3.2:latest
You: /add 7 ollama:mistral
```

### Quick start — specific local model

```bash
# Ollama — pull and serve a tool-calling model
ollama pull llama3.2          # 3B, fast, good tool support
ollama serve                  # starts on port 11434

# Llama.cpp — serve a GGUF model directly
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio (Windows/macOS/Linux) — uses the built-in `lms` CLI
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

> `:auto` connects to the local server and detects the loaded model automatically.

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

When the model tries to access a path outside the workspace, it shows an error like:
```
❌ Tool Error: Access denied: "C:\path" is outside the allowed directory.
   Use command: /allow "C:\path"
```

Grant access with:
```
You: /allow "C:\path"
✅ Allowed: C:\path
```

The model can then retry the same request. Permissions last for the current session only.

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
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s — best for coding
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s, parallel tool use
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
Rate limits: 30 RPM, ~1K RPD. All models support tool calling.

### Mistral (EU-hosted, strong coding models)
```
/add 10 mistral:codestral-latest       # Dedicated coding model
/add 11 mistral:mistral-large-latest   # Best quality
/add 12 mistral:mistral-small-latest   # Lightweight & fast
/add 13 mistral:open-mistral-nemo      # 128K context, open-weight
```
Free tier: ~1 req/s, 1B tokens/month. Phone verification required.

### Google AI Studio (Gemini models)
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
|-------|-------------|-----|
| `403 Forbidden` | API key missing or invalid | Check `.env` has the right key for that provider |
| `403 Forbidden` | Internet restrictions blocking API host (even with valid key) | Enable VPN/proxy, set `HTTPS_PROXY`, or use local models: `/add 6 ollama:auto` |
| `400 property 'extra_body' is unsupported` | (Should not happen in latest version) | Update to latest code: `git pull && npm install` |
| `429 Rate limit exceeded` | Free tier daily limit hit | Wait, use a different provider/model, or switch to local models |
| `All 3 attempts failed` | Model unreachable or too slow | Try a different model (e.g. smaller one) or use local models |
| `tool_calls` with empty arguments | Model doesn't support tool calling | Use a different model |
| `ENOTFOUND` / `ECONNREFUSED` / timeout | Internet restrictions blocking API host | Enable VPN/proxy, set `HTTPS_PROXY`, or use local models: `/add 6 ollama:auto` |

### Quick checks
- `/list-providers` — shows which API keys are configured
- `/safe` — toggle safe mode status
- Check `.env` exists and keys are correct
- Run `npm start` after any code update

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
├── local/                  # Local tools (gitignored, not pushed to GitHub)
│   ├── backup/src/         # Snapshot of src/ for quick rollback
│   ├── update.ps1          # git pull + npm install
│   ├── push-to-github.ps1  # git add + commit + push
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
| `LOCAL_TIMEOUT` | No | Timeout (ms) for local model requests (default: 300000 — 5 min) |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` (default: `info`) |

\* At least one API key is required (not needed for local providers). You only need keys for the providers you want to use.

## Security

- All file operations restricted to `ALLOWED_DIR` — `sanitizePath` prevents traversal attacks
- Shell commands run inside the workspace directory
- API keys are stored in `.env` (listed in `.gitignore`, never committed)
- Use `local/` scripts for backup/restore — they're gitignored

## License

MIT
