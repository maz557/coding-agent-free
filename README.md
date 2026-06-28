# Coding Agent Free

An interactive AI coding agent powered by **free** API models from multiple providers — OpenRouter, Groq, Google AI Studio, DeepSeek, Mistral. Reads, writes, lists, and deletes files, and runs shell commands — all through tool calling.

## Quick Start

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

Create `.env` (pick at least one provider):
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
- **Tool calling** — read, write, delete, list files, and run shell commands
- **Smart loop detection** — stops if a tool is called 3+ times identically or 5+ times consecutively
- **Automatic retry** — exponential backoff + 120s timeout for flaky free APIs
- **Zod validation** — runtime type-checking of every tool input and output
- **Persistent presets** — saved to `presets.json` and reloaded across sessions
- **Structured logging** — via `pino` (stderr, doesn't interfere with the prompt)
- **TypeScript** — clean, class-based architecture

## Commands

| Command | Description |
|---------|-------------|
| `/model <n>` | Switch to preset n |
| `/save <n>` | Save current model as preset n |
| `/add <n> <m>` | Add model m as preset n (`provider:model` or just `model`) |
| `/remove <n>` | Remove a user preset |
| `/allow <p>` | Allow model to access a path outside workspace |
| `/models` | Show all presets |
| `/list-providers` | Show providers with valid keys |
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
| `400 property 'extra_body' is unsupported` | (Should not happen in latest version) | Update to latest code: `git pull && npm install` |
| `429 Rate limit exceeded` | Free tier daily limit hit | Wait or use a different provider/model |
| `All 3 attempts failed` | Model unreachable or too slow | Try a different model (e.g. smaller one) |
| `tool_calls` with empty arguments | Model doesn't support tool calling | Use a different model |

### Quick checks
- `/list-providers` — shows which API keys are configured
- Check `.env` exists and keys are correct
- Run `npm start` after any code update

## Project Structure

```
coding-agent-free/
├── src/
│   ├── agent.ts           # Main agent: CLI, presets, loop detection, retry, validation
│   └── tools/
│       └── fileManager.ts # File ops & shell commands (read, write, delete, list, run)
├── scripts/
│   ├── check_models.js    # List free OpenRouter models with tool support
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
| `ALLOWED_DIR` | No | Directory for file operations (default: `./workspace`) |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` (default: `info`) |

\* At least one API key is required. You only need keys for the providers you want to use.

## Security

- All file operations restricted to `ALLOWED_DIR` — `sanitizePath` prevents traversal attacks
- Shell commands run inside the workspace directory
- API keys are stored in `.env` (listed in `.gitignore`, never committed)
- Use `local/` scripts for backup/restore — they're gitignored

## License

MIT
