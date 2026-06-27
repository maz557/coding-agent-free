# Coding Agent Free

An interactive AI coding agent that uses **free** API models from multiple providers with real tool calling — read, write, list, delete files, and execute shell commands. Works on Windows, macOS, and Linux.

## Features

- **Multi-provider** — OpenRouter, Google AI Studio, Groq, DeepSeek, Mistral (free tiers)
- **Multi-model support** with fallback chain — if one model fails, it falls back to another
- **5 built-in presets** including `openrouter/free` discovery router
- **User-defined presets** — save, add, and remove your own models (`/save`, `/add`, `/remove`)
- **Persistent presets** — saved to `presets.json` across sessions
- **Smart loop detection** — detects 3+ identical calls or 5+ same-tool calls and stops
- **Zod validation** — runtime type-checking of all tool inputs and outputs
- **Automatic retry** — exponential backoff with timeout for flaky free API endpoints
- **Immutable conversation state** — prevents accidental mutation bugs in message history
- **Structured logging** — via `pino` with pretty-print output
- **File management tools** — `read_file`, `write_file`, `list_files`, `create_folder`, `delete_file`, `run_command`
- **TypeScript** — clean, class-based architecture

## Requirements

- [Node.js](https://nodejs.org/) 18+
- At least one API key from a supported provider

## Quick Start

```bash
# Clone
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free

# Install
npm install

# Configure — add at least one API key to .env
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
echo "GROQ_API_KEY=gsk_..." >> .env
echo "GOOGLE_API_KEY=AIza..." >> .env
echo "DEEPSEEK_API_KEY=sk-..." >> .env
echo "MISTRAL_API_KEY=..." >> .env
echo "ALLOWED_DIR=./workspace" >> .env

# Run
npm start
```

Or double-click `run-agent.bat`.

## Commands

| Command | Description |
|---------|-------------|
| `/model <n>` | Switch to preset n |
| `/save <n>` | Save last used model as preset n |
| `/add <n> <m>` | Manually add model m as preset n (`provider:model` or just `model`) |
| `/remove <n>` | Remove a user preset |
| `/models` | Show all presets |
| `/list-providers` | Show available providers and key status |
| `/exit` | Quit |

## Built-in Presets

| # | Model | Notes |
|---|-------|-------|
| 1 | `openrouter/free` | Discovery router (default) |
| 2 | Qwen 3 Next 80B | Good general purpose |
| 3 | Nemotron 3 Super 120B | 1M context |
| 4 | OpenAI GPT-OSS 120B | Strong reasoning |
| 5 | Nemotron 3 Ultra 550B | Largest free model with tools |

## Example

```
You: /model 4

✅ Switched to preset 4: openai/gpt-oss-120b:free

You: create a folder named demo and write a hello.py to it

⏳ Thinking...
  [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  [Model: openai/gpt-oss-120b:free]
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
  [Model: openai/gpt-oss-120b:free]

Agent: Created demo/hello.py with a Hello World script.

You: run the file

⏳ Thinking...
  [Model: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
  [Model: openai/gpt-oss-120b:free]

Agent: Hello, world! — the script runs correctly.
```

## Project Structure

```
coding-agent-free/
├── src/
│   ├── agent.ts           # Main agent: CLI, presets, loop detection, retry logic, validation
│   └── tools/
│       └── fileManager.ts # File operations & shell execution
├── scripts/
│   ├── check_models.js    # Utility to list free OpenRouter models
│   └── test.js            # Non-interactive test script
├── local/                  # Local tools & backups (gitignored)
│   ├── backup/             # Snapshot of last working version
│   │   └── src/            # Restore with: powershell .\local\restore.ps1
│   ├── update.ps1          # Pull latest from GitHub
│   └── restore.ps1         # Restore src/ from local backup
├── workspace/             # Default working directory
├── .env                   # API keys & config (gitignored)
├── presets.json           # User presets (gitignored)
├── tsconfig.json
└── run-agent.bat          # Double-click launcher
```

## Logging

Set `LOG_LEVEL=debug` or `LOG_LEVEL=warn` in `.env` to control verbosity. Default level is `info`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | — | OpenRouter API key (https://openrouter.ai/keys) |
| `GROQ_API_KEY` | — | Groq API key (https://console.groq.com/keys) |
| `GOOGLE_API_KEY` | — | Google AI Studio key (https://aistudio.google.com/apikey) |
| `DEEPSEEK_API_KEY` | — | DeepSeek API key (https://platform.deepseek.com) |
| `MISTRAL_API_KEY` | — | Mistral API key (https://console.mistral.ai) |
| `ALLOWED_DIR` | `./workspace` | Directory for file operations |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

> You only need keys for the providers you want to use. If no keys are found, the agent will show available providers on startup.

## OpenRouter Free Tier Limitations

This package relies on OpenRouter's free API tier. These limitations are **not bugs in the package** but constraints of the free tier:

| Limitation | Description |
|------------|-------------|
| **Daily rate limit** | Free tier is limited to ~20–200 requests/day depending on model. You'll see `429 Rate limit exceeded: free-models-per-day`. Adding $10+ credits increases this to 1000/day. |
| **Slow responses** | Free queries are deprioritized. Large models (e.g., Nemotron 550B) and fallback chains can take 30–120s. |
| **Model availability** | Free models come and go without notice. A model that works today may be gone tomorrow. |
| **Routing unpredictability** | `openrouter/free` routes to any available free model; not all support tool calling (only ~18 of ~23). |
| **Tool support gaps** | Some free models returned by the router do not support function calling, causing malformed tool calls or empty arguments. |
| **Context window limits** | Varies by model. Large file reads may exceed context limits. |
| **No SLA** | Free models have no guaranteed uptime or performance. |

To reduce issues: use `/add <n> <model-id>` to pin models you've confirmed work, and keep `openrouter/free` as a fallback.

## Security

- All file operations are restricted to the `ALLOWED_DIR` directory
- Path traversal attacks are prevented by `sanitizePath`
- Shell commands run inside the workspace directory
- API key is stored in `.env` (gitignored)

## License

MIT
