# Coding Agent Free

An interactive AI coding agent that uses **free** OpenRouter models with real tool calling — read, write, list, delete files, and execute shell commands. Works on Windows, macOS, and Linux.

## Features

- **Multi-model support** with fallback chain — if one model fails, it falls back to another
- **5 built-in presets** including `openrouter/free` discovery router
- **User-defined presets** — save, add, and remove your own models (`/save`, `/add`, `/remove`)
- **Persistent presets** — saved to `presets.json` across sessions
- **Smart loop detection** — detects 3+ identical calls or 5+ same-tool calls and stops
- **File management tools** — `read_file`, `write_file`, `list_files`, `create_folder`, `delete_file`, `run_command`
- **TypeScript** — clean, class-based architecture

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [OpenRouter](https://openrouter.ai/) API key (free tier)

## Quick Start

```bash
# Clone
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free

# Install
npm install

# Configure
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
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
| `/add <n> <m>` | Manually add model m as preset n |
| `/remove <n>` | Remove a user preset |
| `/models` | Show all presets |
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
│   ├── agent.ts           # Main agent: CLI, presets, loop detection
│   └── tools/
│       └── fileManager.ts # File operations & shell execution
├── scripts/
│   └── check_models.js    # Utility to list free OpenRouter models
├── workspace/             # Default working directory
├── .env                   # API key & config (gitignored)
├── presets.json           # User presets (gitignored)
└── run-agent.bat          # Double-click launcher
```

## Security

- All file operations are restricted to the `ALLOWED_DIR` directory
- Path traversal attacks are prevented by `sanitizePath`
- Shell commands run inside the workspace directory
- API key is stored in `.env` (gitignored)

## License

MIT
