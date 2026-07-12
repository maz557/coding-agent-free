# Coding Agent Free — Comprehensive User Guide

> **Welcome!** This guide is for everyone — from absolute beginners to advanced users.  
> You'll learn how to install, configure, and master Coding Agent Free through hands-on example projects.

---

## Table of Contents

1. [What is Coding Agent Free?](#what-is-coding-agent-free)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Installation Walkthrough](#installation-walkthrough)
4. [First Interaction](#first-interaction)
5. [Core Concepts](#core-concepts)
6. [Example Projects](#example-projects)
   - [Project 1: Hello Calculator](#project-1-hello-calculator)
   - [Project 2: Static Web Page Builder](#project-2-static-web-page-builder)
   - [Project 3: Code Explorer with LSP](#project-3-code-explorer-with-lsp)
   - [Project 4: MCP-Powered File Manager](#project-4-mcp-powered-file-manager)
   - [Project 5: Full-Stack Todo Application](#project-5-full-stack-todo-application)
7. [Complex & Large Projects: Step-by-Step Guide](#complex--large-projects-step-by-step-guide)
   - [Why Complex Projects Need a Different Approach](#why-complex-projects-need-a-different-approach)
   - [Phase 1: Planning & Architecture](#phase-1-planning--architecture)
   - [Phase 2: Build the Foundation](#phase-2-build-the-foundation)
   - [Phase 3: Feature-by-Feature Development](#phase-3-feature-by-feature-development)
   - [Phase 4: Integration & Testing](#phase-4-integration--testing)
   - [Strategies for Success](#strategies-for-success)
   - [Limitations & How to Work Around Them](#limitations--how-to-work-around-them)
   - [Real-World Workflow Example](#real-world-workflow-example)
   - [Quick-Reference Summary Tables](#quick-reference-summary-tables)
   - [Checklist for Complex Projects](#checklist-for-complex-projects)
8. [Web Interface Guide](#web-interface-guide)
9. [Troubleshooting](#troubleshooting)
10. [Glossary](#glossary)

---

## What is Coding Agent Free?

Coding Agent Free is an **AI coding assistant** that runs in your terminal or web browser. You give it natural language instructions, and it:

- **Reads, writes, and edits files** in your project
- **Runs shell commands** (compile, test, install, etc.)
- **Searches code** across your project
- **Connects to external tools** via MCP (databases, APIs, etc.)
- **Analyzes code deeply** via LSP (go to definition, find references)
- **Switches between 13+ AI providers** automatically

All of this is **free** using free-tier APIs or **fully offline** with local models.

---

## Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. Run the setup wizard
npm run setup

# 3. Start the agent
npm start
```

That's it! The agent will greet you and wait for your instructions.

> **Need a free API key fast?** Go to https://openrouter.ai/keys, create an account, and copy your key. Run `npm run setup` and paste it in.

---

## Installation Walkthrough

### Step 1: Install Node.js

Coding Agent Free requires **Node.js 18 or higher**.

**Windows:**
1. Go to https://nodejs.org
2. Download the LTS version (18.x or 20.x)
3. Run the installer — click "Next" through all steps
4. Open **Command Prompt** or **PowerShell** and type:
   ```
   node --version
   ```
   You should see `v18.x.x` or higher.

**macOS:**
```bash
# Using Homebrew
brew install node@20

# Or download from https://nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Download Coding Agent Free

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
```

> If you don't have Git, download the ZIP from https://github.com/maz557/coding-agent-free and extract it.

### Step 3: Install Dependencies

```bash
npm install
```

This downloads all required packages. You'll see a progress bar and a `node_modules/` folder appears.

### Step 4: Get an API Key (Pick One)

The agent supports **10 cloud providers** and **3 local model servers**. You only need **one API key** to get started — OpenRouter is the easiest.

#### Free Tier Comparison

| Provider | Free Tier Limit | Best For |
|----------|----------------|----------|
| **OpenRouter** | 18+ free models, single key | Best all-rounder — start here |
| **Groq** | 30 req/min on many models | Ultra-fast inference |
| **Google Gemini** | 60 req/min, generous free | Strong coding + vision |
| **DeepSeek** | Credit-based free tier | Good coding models |
| **Mistral** | Free tier (500k tokens) | European provider, good quality |
| **Anthropic** | Limited free trials | Claude models (reasoning) |
| **Together AI** | 25 free API calls/day | Many open-source models |
| **Perplexity** | $5 free credit | Search-augmented models |
| **xAI (Grok)** | Limited free tier | Grok models |
| **Cohere** | 1000 req/month free | Command R models |

> 💡 **Recommendation**: Start with **OpenRouter** — one key gives you access to 18+ free tool-calling models. If you want faster responses, add **Groq** or **Google Gemini**.

#### Comprehensive Free API Key Guide

Each provider is a 2-minute registration. Pick the ones you want:

<details open>
<summary><strong>☁️ OpenRouter</strong> (easiest — 18+ free models)</summary>

1. Go to https://openrouter.ai/keys
2. Click **Sign up** (GitHub or email)
3. Verify your email if needed
4. Click **Create Key**
5. Copy the key (starts with `sk-or-v1-`)
6. Add to `.env`: `OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxx`
</details>

<details>
<summary><strong>⚡ Groq</strong> (fastest inference)</summary>

1. Go to https://console.groq.com/keys
2. Sign up with GitHub or Google
3. Click **Create API Key**
4. Give it a name (e.g., "coding-agent")
5. Copy the key (starts with `gsk_`)
6. Add to `.env`: `GROQ_API_KEY=gsk_xxxxxxxxx`
</details>

<details>
<summary><strong>🔷 Google Gemini</strong> (generous free tier)</summary>

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click **Get API Key** → **Create API key**
4. Select an existing project or create new
5. Copy the key (starts with `AIza`)
6. Add to `.env`: `GOOGLE_API_KEY=AIzaxxxxxxxxx`
</details>

<details>
<summary><strong>🐋 DeepSeek</strong> (credit-based)</summary>

1. Go to https://platform.deepseek.com
2. Sign up with email
3. Go to https://platform.deepseek.com/api_keys
4. Click **Create new API key**
5. Copy the key (starts with `sk-`)
6. Add to `.env`: `DEEPSEEK_API_KEY=sk-xxxxxxxxx`
- 💡 New accounts get free credits (typically ¥5-10 CNY)
</details>

<details>
<summary><strong>🌀 Mistral</strong> (European, good quality)</summary>

1. Go to https://console.mistral.ai
2. Sign up with email or Google
3. Go to https://console.mistral.ai/api-keys
4. Click **Create new key**
5. Select **La Plateforme** project
6. Copy the key and add to `.env`: `MISTRAL_API_KEY=xxxxxxxxx`
- 💡 Free tier: 500k tokens/month (enough to start)
</details>

<details>
<summary><strong>🧠 Anthropic</strong> (Claude models)</summary>

1. Go to https://console.anthropic.com
2. Sign up with email
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-xxxxxxxxx`
- 💡 Limited free trial available for new accounts
</details>

<details>
<summary><strong>🤝 Together AI</strong> (many open-source models)</summary>

1. Go to https://api.together.xyz/settings/api-keys
2. Sign up with email or GitHub
3. Click **Create API Key**
4. Copy the key and add to `.env`: `TOGETHER_API_KEY=xxxxxxxxx`
- 💡 Free tier: 25 API calls/day
</details>

<details>
<summary><strong>🔍 Perplexity</strong> (search-augmented models)</summary>

1. Go to https://www.perplexity.ai/settings/api
2. Sign up for a Perplexity account
3. Under **API Keys**, click **Generate**
4. Copy the key and add to `.env`: `PERPLEXITY_API_KEY=xxxxxxxxx`
- 💡 New accounts get $5 free credit
</details>

<details>
<summary><strong>🤖 xAI (Grok)</strong></summary>

1. Go to https://console.x.ai
2. Sign up with email or X/Twitter account
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key and add to `.env`: `XAI_API_KEY=xxxxxxxxx`
- 💡 Limited free tier available
</details>

<details>
<summary><strong>🌊 Cohere</strong> (Command R models)</summary>

1. Go to https://dashboard.cohere.com/api-keys
2. Sign up with email or Google
3. Click **Create API Key**
4. Copy the key (starts with `CO-`)
5. Add to `.env`: `COHERE_API_KEY=CO-xxxxxxxxx`
- 💡 Free tier: 1000 requests/month
</details>

#### Direct Links (Quick Reference)

| Provider | Environment Variable | Get Your Key |
|----------|---------------------|--------------|
| **OpenRouter** | `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| **Groq** | `GROQ_API_KEY` | https://console.groq.com/keys |
| **Google Gemini** | `GOOGLE_API_KEY` | https://aistudio.google.com/apikey |
| **DeepSeek** | `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api_keys |
| **Mistral** | `MISTRAL_API_KEY` | https://console.mistral.ai/api-keys |
| **Anthropic** | `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| **Together AI** | `TOGETHER_API_KEY` | https://api.together.xyz/settings/api-keys |
| **Perplexity** | `PERPLEXITY_API_KEY` | https://www.perplexity.ai/settings/api |
| **xAI (Grok)** | `XAI_API_KEY` | https://console.x.ai |
| **Cohere** | `COHERE_API_KEY` | https://dashboard.cohere.com/api-keys |

#### Check Which Keys Are Active

After creating your `.env` file (Step 5), check which keys are detected:

```bash
node -e "require('dotenv').config(); Object.entries({OPENROUTER_API_KEY:'OpenRouter',GROQ_API_KEY:'Groq',GOOGLE_API_KEY:'Google',DEEPSEEK_API_KEY:'DeepSeek',MISTRAL_API_KEY:'Mistral',ANTHROPIC_API_KEY:'Anthropic',TOGETHER_API_KEY:'Together',PERPLEXITY_API_KEY:'Perplexity',XAI_API_KEY:'xAI',COHERE_API_KEY:'Cohere'}).forEach(([env,name])=>console.log(process.env[env]?`  ✅ ${name} configured`:`  ❌ ${name} missing`))"
```

You should see green checkmarks next to every provider you've configured:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxx
GROQ_API_KEY=gsk_yyyyyyyyy
```

The agent will automatically use the best available key when you switch models with `/model <n>`. With **auto-routing** (`/model auto/coding`), it even detects which keys are available and skips providers with missing keys.

### Step 5: Run the Setup Wizard

```bash
npm run setup
```

The wizard asks:
- Do you want to configure API keys? **Yes**
- Paste your key(s) when prompted
- Default workspace location: **Press Enter** (uses `./workspace`)
- Any additional settings: **Press Enter** for defaults

After setup, the wizard creates a `.env` file with your configuration.

### Step 6: Verify Everything Works

```bash
npm start
```

You should see:
```
💬 Coding Agent Free
Type your message or /command
Agent: Hello! I'm ready to help. How can I assist you today?
[You]:
```

If you see errors about missing API keys, run `npm run setup` again.

### Which Interface Should You Use?

The agent offers three ways to interact. Here's when to use each:

| Interface | Start Command | Best For | Most Features? |
|-----------|--------------|----------|----------------|
| **CLI (terminal)** | `npm start` | Quick tasks, scripting, terminal-centric workflows, CI/CD automation, RTL language support (Persian/Arabic) | ⭐⭐⭐ Full session CRUD, all slash commands, MCP/LSP management |
| **Web UI** | `npm run web` | Visual diff viewer, session manager with persistence, keyboard shortcuts, team collaboration via browser, settings panel | ⭐⭐⭐⭐⭐ All CLI features + visual diffs, settings panel, collapsible tool calls, stop button, auto-scroll, per-message copy, copy session, toast notifications, welcome screen, LSP/MCP toggle indicators |
| **OpenAI-compatible API** | `npm run web` | Integration with IDEs (Cline, Continue.dev, Cursor), custom tools, programmatic access | ⭐⭐ API-only (no chat interface) |

**Which to choose?**
- **Developers already in the terminal**: Use CLI — it's fast, lightweight, and supports all features
- **Visual learners & diff reviewers**: Use Web UI — the diff viewer, collapsible tool calls, and settings panel make it easier to track what the agent is doing
- **Team collaboration**: Use Web UI — sessions persist on disk and can be shared
- **RTL language users** (Persian, Arabic, Urdu): Use CLI with `run-cli-rtl.bat` + WezTerm
- **IDE integration**: Use the OpenAI-compatible API endpoint at `http://localhost:3000/v1/chat/completions`

> **The Web UI now has the most features overall**, including visual diff viewer, settings panel, collapsible tool calls, stop button, auto-scroll toggle, per-message copy buttons, keyboard shortcuts, and session persistence with rename. The CLI remains best for terminal-native workflows and automation.

**When to build a standalone binary?**

If you want to run the agent without Node.js installed, or distribute it to others:

```bash
# Build CLI binary
npm run build:binary

# Build Web UI binary
npm run build:binary:web
```

This produces `coding-agent.exe` (Windows) or `coding-agent` (Linux/macOS) — a single executable with **no dependencies**. Use the binary when:

- You want to **run on a server** without installing Node.js
- You need to **distribute to teammates** who shouldn't install dev tools
- You want a **portable version** on a USB drive
- You're deploying to **CI/CD pipelines** with minimal setup

The binary works identically to `npm start` — just double-click or run from terminal.

---

## First Interaction

Once the agent is running, try these simple requests:

```
You: what files are in the current directory?
```

The agent will call the `list_files` tool and show you the project structure.

```
You: create a file called hello.txt with the text "Hello, Coding Agent Free!"
```

The agent will:
1. Call `write_file` to create the file
2. Show you the result

```
You: read hello.txt
```

The agent will call `read_file` and display the contents.

```
You: run the command "dir" (or "ls" on Mac/Linux)
```

The agent will call `run_command` and show directory listing.

**Congratulations!** You've just used all the core tools. You can now:
- `/model 3` — switch to a different AI model
- `/safe` — toggle safe mode
- `/models` — see all available presets

---

## Core Concepts

### How the Agent Works

1. You type a **message** in natural language
2. The agent sends it to an **AI model** along with available **tools**
3. The model decides which tool(s) to call (or just replies)
4. The agent executes the tool and sends the **result** back
5. The model uses the result to decide the next action
6. This loop continues until your task is complete

### Tools

Tools are capabilities the AI can use. Think of them as **functions** the AI can call:

| Tool | What it does | Like saying |
|------|-------------|-------------|
| `read_file` | Read a file's contents | "Open this file" |
| `write_file` | Create or overwrite a file | "Save this file" |
| `list_files` | See what's in a folder | "What's in this folder?" |
| `create_folder` | Make a new folder | "Create a new folder" |
| `delete_file` | Delete a file | "Delete this file" |
| `delete_folder` | Delete a folder | "Remove this folder" |
| `append_file` | Add text to a file | "Add this to the file" |
| `copy_file` | Duplicate a file | "Copy this file" |
| `move_file` | Move or rename a file | "Move this file there" |
| `file_info` | Get file details (size, date) | "Tell me about this file" |
| `search_content` | Find text in files | "Search for this text" |
| `replace_in_file` | Replace specific text | "Find and replace" |
| `run_command` | Run a shell command | "Run this command" |
| `git_diff` | Show working tree changes | "What changed?" |
| `git_commit` | Stage and commit files | "Commit this" |
| `git_log` | View commit history | "Show recent commits" |
| `web_search` | Search the web (DuckDuckGo → Bing) | "Search for this topic" |

### Safe Mode

When **safe mode** is on (`[🔒 Safe]`), the agent can only run commands from a whitelist:
- `node`, `npm`, `npx`, `python`, `python3`, `pip`, `pip3`
- `dir`, `ls`, `cat`, `type`, `echo`, `pwd`, `cd`
- `git`, `cargo`, `go`, `rustc`, `gcc`, `clang`
- `mkdir`, `cp`, `mv`, `rm`, `touch`

Toggle with `/safe` or start with `npm start -- --safe`.

### Governance (Tool Approval)

Tools are classified into three safety levels:

| Level | Behavior | Examples |
|-------|----------|---------|
| **Safe** | Auto-approved | `read_file`, `search_content`, `list_files` |
| **Sensitive** | Asks for confirmation | `write_file`, `run_command`, `git_commit` |
| **Dangerous** | Blocked by default | `delete_file`, `delete_folder` |

Commands:

| Command | What it does |
|---------|-------------|
| `/gov` | Toggle governance on/off globally |
| `/trust` | List permanently allowed sensitive tools |
| `/allow` | Permanently allow a tool (used during approval prompt) |

In the **CLI**, sensitive tools prompt: `y` (once), `Y` (always), `n` (no), `N` (never). In the **Web UI**, an approval modal appears when governance is enabled.

### Docker Sandbox

For stronger isolation, set `DOCKER_SANDBOX_ENABLED=true` in `.env`. All `run_command`, `git_diff`, `git_commit`, and `git_log` calls execute inside a disposable Docker container instead of directly on the host. Configure the image via `DOCKER_IMAGE` (default `ubuntu:22.04`).

### Model Presets

A **preset** is a saved model configuration. The agent comes with 5 built-in presets:

| # | Label | Provider:Model |
|---|-------|----------------|
| 1 | `openrouter/free` | OpenRouter (auto-routes to free models) |
| 2 | Qwen 3 Next 80B | OpenRouter |
| 3 | Nemotron 3 Super 120B | OpenRouter (1M context) |
| 4 | OpenAI GPT-OSS 120B | OpenRouter |
| 5 | Nemotron 3 Ultra 550B | OpenRouter (largest free) |

Switch presets with `/model <n>`, e.g., `/model 3`.

### Sessions

Your conversation is automatically saved in the `sessions/` folder. Each session has:
- A **name** (auto-generated from context or manually set)
- The **model preset** you were using
- The full message history

Commands: `/session list`, `/session new my-project`, `/session rename old new`, `/session delete name`

Sessions can be **exported** (💾 per session) as JSON files and **imported** (📥 panel header) for backup or sharing. Sessions link to projects via `meta.projectId` — creating a session from within a project associates them automatically. Test-like titles (e.g. `update test.txt`) are hidden from the session list. Sessions with zero user messages are not saved.

### Project Files

When you run the agent, it creates and manages several files in the project root:

| File / Folder | Purpose | Created By |
|--------------|---------|------------|
| **`.env`** | Stores your API keys and environment variables | `npm run setup` |
| **`.coding-agent.json`** | Configuration for MCP servers and custom LSP servers | You (or the agent) |
| **`sessions/`** | Saved conversation history — each session is a JSON file | Agent (auto) |
| **`workspace/`** | Default working directory where the agent creates projects by default | `npm run setup` |
| **`projects/`** | Saved projects with plan step tracking, session links, and lifecycle status | Agent (auto) |
| **`presets.json`** | Custom model presets you define (overrides built-in presets) | You (optional) |

#### `.env` (API Keys)

Created by `npm run setup`. Contains all your API keys:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
GROQ_API_KEY=gsk_yyyyyyyyy
```

The agent reads this file automatically on startup. **Never commit `.env` to Git** — it's already in `.gitignore`.

#### `.coding-agent.json` (MCP & LSP Config)

Optional file for configuring external tools. The agent looks for it in the project root:

```json
{
  "mcpServers": { ... },
  "lspServers": [ ... ]
}
```

See [MCP](#mcp-model-context-protocol) and [LSP](#lsp-language-server-protocol) sections for details.

#### `sessions/` (Conversation History)

Every conversation is automatically saved here as `sessions/<session-name>.json`. Each file contains:
- The full message history (system, user, assistant, tool messages)
- The model preset used
- A timestamp and auto-generated title

You can share session files between team members — just copy the file into another project's `sessions/` folder.

#### `workspace/` (Working Directory)

The default location where the agent creates new projects. You can change it during `npm run setup` or use absolute paths in your requests to work anywhere.

#### `presets.json` (Custom Model Presets)

If you want custom model combinations beyond the 5 built-in presets, create `presets.json`:

```json
[
  { "id": "my-fast-model", "provider": "groq", "model": "llama-3.3-70b-versatile", "label": "Groq Fast" },
  { "id": "my-cheap-model", "provider": "openrouter", "model": "openrouter/free", "label": "Cheap" }
]
```

These appear alongside built-in presets when you run `/models`.

### Projects & Plans

The agent includes a **Task Planner** and **Project Manager** to help with multi-step tasks.

#### Automatic Planning Phase

Before executing any task, the agent generates a numbered **plan** of steps. This plan is shown inline so you can track progress:

```
[Plan — 4 steps]
1. Create the HTML structure
2. Add CSS styling
3. Write the JavaScript logic
4. Test with live preview
   [Progress 25% (1/4)] ✓ Step 1 complete
```

- The plan is generated by a separate AI call before tool execution begins
- Each tool call is matched to the step it belongs to
- Every 3 steps (or at completion), a progress summary is injected
- If the planning call fails, execution proceeds silently without a plan

#### Sessions ↔ Projects

A **Project** ties together multiple sessions around a single task:

| Command | What it does |
|---------|-------------|
| `/project list` | List all projects with progress bars and status |
| `/project show <id>` | View full detail including all plan steps |
| `/project status <id> <val>` | Set lifecycle status: `active`, `paused`, `completed`, `abandoned` |
| `/project delete <id>` | Remove a project permanently |

Projects are stored in the `projects/` directory (configurable via `PROJECTS_DIR` env var). Each project has:
- A title, description, and creation timestamp
- Linked sessions (multiple sessions can belong to one project)
- A plan with individual step status tracking
- Lifecycle status (active/paused/completed/abandoned)

In the **Web UI**, click the 📋 Projects button to open the project panel. It shows progress bars, step-by-step detail, and lifecycle controls.

#### Projects Directory

| File / Folder | Purpose | Created By |
|--------------|---------|------------|
| **`projects/`** | Saved projects with plan status, session links, lifecycle management | Agent (auto) |

Set `PROJECTS_DIR=/custom/path` in `.env` to change the projects location.

### MCP (Model Context Protocol)

MCP lets you connect **external tools** to the agent. Think of it as a plugin system — anyone can write an MCP server that gives the agent new capabilities.

#### Finding MCP Servers

- **Official MCP repository**: https://github.com/modelcontextprotocol/servers — contains filesystem, GitHub, Git, PostgreSQL, SQLite, Puppeteer, and more
- **MCP marketplace**: https://smithery.ai — community directory of 1000+ MCP servers
- **PulseMCP**: https://pulsemcp.com — searchable directory with reviews
- **Write your own**: MCP servers are easy to build in Python, TypeScript, or any language

#### What the Agent Can Do with MCP

With different MCP servers, the agent can:

| MCP Server | Example Capabilities |
|------------|---------------------|
| **Filesystem** | Read/write files in a sandboxed directory (files outside the sandbox are inaccessible) |
| **GitHub** | Create repos, manage issues/PRs, search code, list branches |
| **Git** | Commit, diff, log, stage files inside your project |
| **PostgreSQL / SQLite** | Run read-only or read-write SQL queries |
| **Puppeteer / Playwright** | Control a headless browser — take screenshots, click buttons, extract data |
| **Brave Search / Web** | Search the web and fetch page content |
| **Memory** | Give the agent persistent memory across conversations |

The agent combines MCP tools with its built-in tools intelligently. For example, it might use `GitHub MCP` to create a PR, then use the built-in `run_command` to install dependencies and `write_file` to add the final files.

#### Configuring MCP Servers

MCP servers are configured in `.coding-agent.json` at your project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./sandbox"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

After adding or changing MCP config, restart the agent. You'll see connected servers on startup:

```
🔌 MCP "filesystem" connected (2 tools)
🔌 MCP "github" connected (5 tools)
```

#### Runtime MCP Commands

| Command | What it does |
|---------|-------------|
| `/mcp list` | List all connected MCP servers and their tools |
| `/mcp toggle` | Enable/disable all MCP tools |
| `/mcp connect <name> <command> [args...]` | Connect a new MCP server on-the-fly |
| `/mcp disconnect <name>` | Remove a connected server |

> **Note for local/offline use**: MCP servers that require internet (GitHub, web search) won't work offline. Filesystem, SQLite, and Memory MCP servers work fully offline.

### LSP (Language Server Protocol)

LSP gives the agent **deep code understanding** — the same technology that powers IDE features like "Go to Definition" in VS Code. When LSP is enabled, the agent can:

- `code_definition` — find where a function, class, or variable is defined
- `code_references` — find every usage of a symbol across the project
- `code_hover` — get type signature, documentation, and inline hints

Toggle LSP on/off with `/lsp`.

#### How the Agent Uses LSP

When you ask questions like:
- "Where is the `calculateTotal` function defined?" → agent calls `code_definition`
- "Find all places that call `parseInput`" → agent calls `code_references`
- "Show me the type signature of the `Config` interface" → agent calls `code_hover`

The agent **automatically starts LSP servers** when it detects matching files in your project. It does NOT require any special configuration for most languages.

#### Installing LSP Servers Per Language

The agent supports these languages out of the box. You just need to install the corresponding LSP server:

| Language | File Types | Install Command |
|----------|-----------|----------------|
| **TypeScript / JavaScript** | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` | `npm install -g typescript typescript-language-server` |
| **Python** | `.py` | `pip install pyright` or `npm install -g pyright` |
| **Rust** | `.rs` | `rustup component add rust-analyzer` |
| **Go** | `.go` | `go install golang.org/x/tools/gopls@latest` |
| **SQL** | `.sql` | `npm install -g sql-language-server` |
| **C / C++** | `.c`, `.h`, `.cpp`, `.hpp`, `.cc`, `.cxx` | Install LLVM/clangd: `winget install LLVM` (Windows), `apt install clangd` (Linux), `brew install llvm` (macOS) |
| **Ruby** | `.rb` | `gem install solargraph` |
| **Lua** | `.lua` | Download from https://github.com/LuaLS/lua-language-server/releases or `brew install lua-language-server` (macOS) |

Once installed, the agent automatically finds and starts the correct LSP server for your project — no configuration files needed. You'll see:

```
🔌 LSP "typescript-language-server" started
```

If the LSP server binary is not found, the agent skips it and uses fallback search (grep-based) instead. You can still ask definition/references questions — the agent will do its best without LSP.

#### LSP in Multi-Language Projects

In a project with Python backend + TypeScript frontend + SQL migrations, the agent:
1. Scans all files in your project
2. Starts a **typescript-language-server** for `.ts`/`.tsx` files
3. Starts a **pyright** server for `.py` files
4. Starts a **sql-language-server** for `.sql` files
5. Routes each LSP query to the correct server based on the file being asked about

You don't need to do anything special — the agent handles it automatically.

#### Custom LSP Configuration

If you need different LSP servers, add them to `.coding-agent.json`:

```json
{
  "lspServers": [
    {
      "command": "my-custom-lsp",
      "args": ["--stdio"],
      "languageId": "mylang",
      "filePatterns": ["**/*.my"]
    }
  ]
}
```

This lets you add LSP support for any language.

---

## Example Projects

### Project 1: Hello Calculator

**Goal**: Create and test a simple Python calculator using only natural language.

**Difficulty**: Beginner  
**Concepts**: `write_file`, `run_command`, `search_content`

#### Step 1: Start the agent
```bash
npm start
```

#### Step 2: Create the calculator
Say:
```
Create a Python calculator program called calculator.py that:
- Takes two numbers and an operator (+, -, *, /) as input
- Performs the operation
- Handles division by zero gracefully
- Shows the result
```

The agent will write the file. Let it finish.

#### Step 3: Run the calculator
Say:
```
Run the calculator and test 5 + 3, then 10 / 0
```

The agent will run the program (it may need to run it twice with different inputs).

#### Step 4: Add a feature
Say:
```
Add a power operator (^) to the calculator that does exponentiation
```

The agent will edit the file using `replace_in_file` or `write_file`.

#### Step 5: Search your code
Say:
```
Search for "division" in calculator.py to see how you handle it
```

The agent uses `search_content` to find the line.

#### Step 6: View file info
Say:
```
Show me details about calculator.py (size, when it was created)
```

The agent calls `file_info`.

#### Step 7: Make a backup
Say:
```
Copy calculator.py to calculator.backup.py
```

The agent uses `copy_file`.

**What you learned**: Using 6 different tools (`write_file`, `run_command`, `replace_in_file`, `search_content`, `file_info`, `copy_file`) to create, test, and manage a project.

---

### Project 2: Static Web Page Builder

**Goal**: Build a complete multi-page static website with HTML, CSS, and JavaScript.

**Difficulty**: Beginner–Intermediate  
**Concepts**: `create_folder`, multi-file projects, `append_file`

#### Step 1: Set up the project

Tell the agent:
```
Create a folder called "my-website" and inside it create:
- index.html
- about.html
- styles/style.css
- scripts/main.js
```

#### Step 2: Create the homepage

```
Write index.html as a complete HTML5 page with:
- A navigation bar linking to Home and About pages
- A hero section with a heading "Welcome to My Site"
- A paragraph explaining this is a demo project
- A button that says "Click Me" linked to an alert
- Link to style.css and main.js
```

#### Step 3: Create the About page

```
Write about.html with:
- Same navigation bar as index.html
- A heading "About Us"
- Three paragraphs of placeholder text (lorem ipsum)
- A link back to the homepage
- Link to style.css
```

#### Step 4: Create the stylesheet

```
Write styles/style.css that makes the site look professional:
- A dark navigation bar with white text
- The navigation links should be horizontal
- A centered hero section
- Nice button styling (blue background, white text, rounded corners)
- Responsive design (looks good on mobile too)
- Consistent font family and colors
```

#### Step 5: Create the JavaScript

```
Write scripts/main.js that:
- Shows an alert when the "Click Me" button is clicked
- Changes the button text to "Clicked!" after the first click
- Logs "Page loaded" to the console
```

#### Step 6: Preview with a local server

```
Run a simple HTTP server to preview the site. Use: npx serve my-website
```

> If safe mode is on, the agent will ask for permission. In safe mode, you need to first `/allow npx`.

#### Step 7: Add a new feature

```
Add a dark/light mode toggle button to the site. Update style.css with dark mode styles and update main.js to handle the toggle.
```

**What you learned**: Creating multi-file projects, organizing files in folders, iterative feature additions across multiple files.

---

### Project 3: Code Explorer with LSP

**Goal**: Use LSP tools to deeply understand a TypeScript project.

**Difficulty**: Intermediate  
**Concepts**: LSP tools (`code_definition`, `code_references`, `code_hover`), multi-language support

> **Try it in your language**: This project uses TypeScript, but the exact same steps work for Python, Rust, Go, C/C++, or SQL — just install the corresponding LSP server (see [LSP section](#lsp-language-server-protocol)) and replace the file contents. The agent auto-detects your language.

#### Prerequisites

Install the TypeScript LSP server:
```bash
npm install -g typescript typescript-language-server
```

For **Python**: `pip install pyright`
For **Rust**: `rustup component add rust-analyzer`
For **Go**: `go install golang.org/x/tools/gopls@latest`
For **C/C++**: `apt install clangd` (Linux), `winget install LLVM` (Windows), `brew install llvm` (macOS)

#### Step 1: Create a TypeScript project

Tell the agent:
```
Create a folder called "ts-explorer" and initialize a TypeScript project:
1. Create ts-explorer/package.json with name "ts-explorer", a "build" script that runs "tsc"
2. Create ts-explorer/tsconfig.json with strict mode enabled and ES2020 target
3. Create ts-explorer/src/ with:
   - src/index.ts (main entry)
   - src/shapes.ts (shape definitions)
   - src/utils.ts (utility functions)
```

#### Step 2: Write the shape library

```
Write src/shapes.ts with:
- An interface Shape with a method area(): number
- A class Circle with constructor(public radius: number) implementing Shape
- A class Rectangle with constructor(public width: number, public height: number) implementing Shape
- Export all three
```

#### Step 3: Write utilities

```
Write src/utils.ts with:
- A function sumAreas(shapes: Shape[]) that returns total area
- A function describeShape(shape: Shape) that returns a string description with the area
- Import from ./shapes
```

#### Step 4: Write the main file

```
Write src/index.ts that:
- Imports Circle, Rectangle from ./shapes
- Imports sumAreas, describeShape from ./utils
- Creates a circle (radius 5) and rectangle (3x4)
- Logs: describeShape for each
- Logs: "Total area: {sumAreas}"
```

#### Step 5: Enable LSP

```
/lsp
```

You should see: `🔄 LSP tools enabled`

#### Step 6: Use code_definition

```
Find the definition of the Shape interface in shapes.ts
```

The agent will use `code_definition` to find the exact line.

#### Step 7: Use code_references

```
Find all references to the area() method across the project
```

The agent will find every usage of `area()`.

#### Step 8: Use code_hover

```
Show the type information for the Circle class
```

The agent will show the full type signature and documentation.

#### Step 9: Build and run

```
Build and run the project:
1. cd ts-explorer && npm run build
2. node src/index.js
```

**What you learned**: LSP tools for code navigation, multi-file TypeScript project, building and running.

---

### Project 4: MCP-Powered File Manager

**Goal**: Use an MCP server for safe, sandboxed file operations.

**Difficulty**: Intermediate  
**Concepts**: MCP configuration, MCP tools alongside built-in tools

> **MCP servers are plugins**: This project uses the filesystem MCP server, but you can apply the same pattern to any MCP server. Browse [official MCP servers](https://github.com/modelcontextprotocol/servers) or the [Smithery marketplace](https://smithery.ai) for 1000+ community servers.

#### Step 1: Install the MCP filesystem server

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

#### Step 2: Configure MCP

Tell the agent to create the configuration:

```
Create a file called .coding-agent.json in the project root with:
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./sandbox"]
    }
  }
}
```

Or manually create `/path/to/coding-agent-free/.coding-agent.json`.

Create the sandbox folder:
```bash
mkdir sandbox
```

#### Step 3: Restart the agent

Exit (`/exit`) and restart.

When the agent starts, you should see:
```
🔌 MCP "filesystem" connected (2 tools)
```

#### Step 4: List MCP tools

```
/mcp list
```

You'll see the MCP filesystem tools alongside the built-in tools.

#### Step 5: Use MCP tools

```
Use the MCP filesystem tools to:
1. Read the file sandbox/hello.txt (create it first with built-in tools if it doesn't exist)
2. List the contents of the sandbox directory using MCP
```

> MCP tools appear alongside built-in tools — the AI can choose either. MCP filesystem tools enforce path boundaries (can't escape the sandbox).

#### Step 6: Toggle MCP off/on

```
/mcp toggle
```

This disables all MCP tools. Try the same request — the agent will use built-in tools instead.

```
/mcp toggle
```

Re-enables MCP.

#### Step 7: Disconnect a server

```
/mcp disconnect filesystem
```

The server is removed. Reconnect with:
```
/mcp connect filesystem npx -y @modelcontextprotocol/server-filesystem ./sandbox
```

**What you learned**: Configuring MCP servers, using MCP tools alongside built-in tools, managing MCP connections at runtime.

---

### Project 5: Full-Stack Todo Application

**Goal**: Build a complete todo app with a Python backend and JavaScript frontend, using all features of the agent.

**Difficulty**: Advanced  
**Concepts**: All tools, LSP, MCP, multi-language, multi-file, sessions

#### Step 1: Create the project structure

```
Create a todo-app project with:
- backend/ folder for Python/Flask API
- frontend/ folder for HTML/CSS/JS
- Make sure to create all necessary subdirectories
```

#### Step 2: Build the backend

```
Create backend/app.py — a Flask REST API:
- GET /api/todos — returns list of todos
- POST /api/todos — creates a todo (body: {title, completed})
- PUT /api/todos/<id> — updates a todo
- DELETE /api/todos/<id> — deletes a todo
- Use an in-memory list (no database needed)
- Return proper JSON responses with status codes
- Handle errors gracefully (try/except)
```

```
Create backend/requirements.txt with:
flask==3.0.0
flask-cors==4.0.0
```

#### Step 3: Build the frontend

```
Create frontend/index.html — a modern todo app:
- Clean, modern design with good UX
- An input field with a button to add todos
- Each todo shows: checkbox, title, delete button
- Completed todos should be visually distinct (strikethrough)
- A counter showing "X items left"
- A filter bar: All / Active / Completed
- Style it with CSS (internal <style> tag is fine)
- Use vanilla JavaScript (no frameworks)
- Use fetch() to call the backend API
```

#### Step 4: Enable LSP for cross-language debugging

```
/lsp
```

With LSP on, the agent understands your Python backend, JavaScript frontend, AND SQL files. It starts **pyright** for `.py` files, **typescript-language-server** for `.js` files, and **sql-language-server** for `.sql` files automatically (if installed). Try:

```
Find the definition of the Todo model in the Python backend
```

Then:

```
Find all references to the fetchTodos function in the frontend
```

The agent routes each query to the correct LSP server based on file type.

> **Note**: If the agent can't find a symbol, make sure you have the LSP server installed: `pip install pyright` for Python, or `npm install -g typescript-language-server` for JS/TS.

#### Step 5: Add Python linting

```
Search the backend code for common issues — run "python -m py_compile backend/app.py"
```

This checks for syntax errors.

#### Step 6: Start the backend

```
Start the Flask server in the background:
cd todo-app && pip install -r backend/requirements.txt && python backend/app.py &
```

> If the agent can't install flask-cors due to naming, fix the requirements.txt to use `flask-cors` correctly.

#### Step 7: Test with curl

```
Test the API:
1. curl -X POST http://localhost:5000/api/todos -H "Content-Type: application/json" -d "{\"title\":\"Test todo\",\"completed\":false}"
2. curl http://localhost:5000/api/todos
3. curl -X DELETE http://localhost:5000/api/todos/1
```

#### Step 8: Open the frontend

Tell the user:
```
Open frontend/index.html in your browser to use the todo app.
The backend should be running on port 5000.
```

#### Step 9: Save this session

```
/session rename todo-app
/session list
```

Your entire conversation is saved and can be restored later.

#### Step 10: Restore later

When you start the agent next time:
```
/session list
/session switch todo-app
```

Your conversation continues from where you left off.

**What you learned**: Full-stack development with the agent, multi-language projects, REST API testing, session management for long-running projects.

---

## Complex & Large Projects: Step-by-Step Guide

This section is for when you're building something **serious** — not a calculator or todo app, but a real-world project with multiple modules, external dependencies, databases, and dozens of files.

> **Before you start**: If you've never built a multi-file project before, try the [Example Projects](#example-projects) first (especially Project 5: Full-Stack Todo). Those teach you the basics. This guide assumes you know what a database, API, and frontend are, and just need help using the agent effectively.

### Why Complex Projects Need a Different Approach

The agent is powerful, but it has limits:
- **Context window**: The AI can only "see" about 128K tokens (~50K words) of conversation at once. After ~20 exchanges, it starts forgetting details from the beginning.
- **One-shot limits**: The agent can't design the entire architecture in a single response — it needs step-by-step guidance.
- **Stuck detection**: If you give too broad a task (like "build me a full e-commerce site"), the agent may loop endlessly making similar tool calls.

For simple scripts, you can say "build a calculator" and get results. For a real project, you need to **scaffold, iterate, and verify** — just like a human developer. A project that takes 3-4 days for a solo developer will take about the same time with the agent.

### Three Golden Rules for Complex Projects

Before reading the detailed steps, remember these three rules:

1. **One thing at a time** — every prompt should ask for exactly one logical change. If you find yourself listing 5 things to do, split them into 5 separate messages.
2. **Test after every step** — run the code after each change, not after 10 changes. If something breaks, you know exactly which change caused it.
3. **Checkpoint often** — use `git_commit` or `/session rename` after each working milestone. If things go wrong, you can always go back.

---

### Phase 1: Planning & Architecture

**Goal**: Define the project structure before writing any code.

**Step 1: Start a dedicated session**

```bash
npm start
/session rename my-project-name
```

Each major project gets its own session — this keeps context clean and lets you resume work later. If you don't name your session, it gets an auto-title from your first message.

**Step 2: Plan on paper first**

Before talking to the agent, write down on a piece of paper:
- What do I want to build? (one sentence)
- What are the 3-5 main features?
- What technology will I use? (language, framework, database)

Example for a URL shortener:
> "A web app where users paste a long URL and get a short link. Features: create short URL, redirect to original, view click count. Tech: Node.js + Express + SQLite."

**Step 3: Ask the agent to design the structure**

Now prompt the agent:

```
I want to build a URL shortening service. Before writing code, help me plan:
1. What files and folders will I need? List them.
2. What's the data flow? (request → backend → database → response)
3. What dependencies are needed?
4. What's the order to build things in?
```

The agent will suggest an architecture. **Read it carefully** and adjust before proceeding. If you don't understand something the agent said, ask: "Explain what this part does in simple terms."

**Step 4: Capture decisions in AGENTS.md**

The agent reads `AGENTS.md` from the project root at startup. Use this to store architectural decisions:

```
Create AGENTS.md in the project root with:
- Project name and purpose
- Technology stack (language, frameworks, database)
- Project structure (folders and key files)
- Build and run commands
```

Now every time you start the agent in this project, it reads this file and knows the context — even after `/reset`.

**Step 5: Create the folder structure**

```
Create all the folders and empty placeholder files based on the structure we planned.
```

This gives the agent a "map" of the project to work with.

**Step 6: Save your first checkpoint**

```
Use git_commit to commit the empty project structure with message "Initial project scaffold"
```

Now you have a clean starting point. If things go wrong later, you can always return here.

---

### Phase 2: Build the Foundation

**Goal**: Get a working skeleton — not all features, just enough to prove the architecture works.

**Strategy: One module at a time**

Pick the **most independent** module first and complete it fully. For a web app, the order is typically:

1. Database schema & models
2. API layer (routes, controllers)
3. Core business logic
4. Frontend (if applicable)
5. Integration & tests

```
Let's start with the database layer. Create:
- A SQLite database initialization file
- A table for shortened URLs (id, original_url, short_code, created_at)
- Functions to insert and lookup URLs
Test it by inserting a record and querying it.
```

**Why this works**: Each step is small enough for the agent to handle well. Each step can be tested immediately. Changes are isolated to one module.

> **If the agent gets stuck**: If the agent starts reading files repeatedly or making the same tool call 3+ times, your task is probably too broad. Stop, type `/reset`, and give a more specific instruction.

**Save a checkpoint after the foundation works:**

```
Everything is working. Use git_commit to commit with message "Foundation: database schema and API skeleton"
```

---

### Phase 3: Feature-by-Feature Development

**Goal**: Add features one at a time, testing each before moving on.

**Step 1: Start each feature with a clear goal**

```
Feature: URL shortening endpoint.
Create a POST /api/shorten endpoint that:
1. Accepts { "url": "https://..." } in the request body
2. Validates the URL is well-formed
3. Generates a random 6-character short code
4. Stores it in the database
5. Returns { "shortUrl": "http://localhost:3000/abc123" }
```

**Step 2: Run and test immediately**

```
Start the server and test:
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

If it fails, the agent sees the error and can fix it:

```
The POST request returned a 404 error. Check the route registration and fix it.
```

**Step 3: Iterate, don't restart**

When you need changes, be specific:

❌ **Too vague**: "Fix the URL shortener"
✅ **Specific**: "The short code generation sometimes produces codes with ambiguous characters (0/O, 1/l/I). Update the generateShortCode function to exclude these characters."

**Step 4: Add features incrementally**

```
Now add a GET /:shortCode endpoint that:
1. Looks up the short code in the database
2. Redirects (302) to the original URL
3. Returns 404 if the code doesn't exist
```

Test again:

```
curl -v http://localhost:3000/abc123
```

**Step 5: Commit after each working feature**

```
git_commit with message "Add redirect endpoint"
```

This creates a save point you can return to if a later change breaks something.

---

### Phase 4: Integration & Testing

**Goal**: Verify all parts work together and handle edge cases.

**Integration testing workflow:**

```
Let's run through all the features end-to-end:
1. Create a short URL via POST
2. Follow the redirect via GET
3. Verify the redirect status is 302
4. Test with a non-existent short code (expect 404)
5. Test with an invalid URL (expect validation error)
```

**Adding automated tests:**

```
Write a test file that covers:
- URL validation (valid, invalid, empty)
- Short code generation (uniqueness, length)
- API endpoints (create, redirect, 404)
- Database operations (insert, lookup, missing)
Run the tests to verify.
```

**Stress-test the agent's understanding:**

```
Search for all places where we handle HTTP status codes. Are we using the right codes for each situation?
```

This uses `search_content` across your project — the agent will analyze all your error handling at once.

---

### Phase 5: What If Something Goes Wrong?

This is the most important section for beginners. Things WILL go wrong — here's what to do.

**Scenario 1: The agent breaks working code**

```
The redirect endpoint stopped working after you changed the database schema.
Use git_log to see recent commits, then git_diff to see what changed.
Fix the issue.
```

If you committed after each feature (as recommended), you can always recover.

**Scenario 2: The agent is confused or looping**

If the agent makes 3+ similar tool calls (e.g., reading the same file repeatedly):

1. Type `/reset` to clear the conversation
2. Re-read `AGENTS.md` context: "Read AGENTS.md and remind me of the project structure"
3. Give a more specific instruction
4. Switch to a smarter model: `/model 1`

**Scenario 3: The output is nonsense or wrong**

1. Check if the model is appropriate for the task. Switch to `/model 1` (deepseek) for reasoning-heavy tasks.
2. Be more specific about WHAT you want and WHY.
3. If the model keeps making the same mistake, include the fix in your prompt: "Don't use `var`, use `const` or `let`."
4. Use `git_diff` before and after to review changes before accepting them.

**Scenario 4: You want to undo everything and start fresh**

```bash
# If you committed checkpoints:
git log --oneline              # Find the commit you want to go back to
git reset --hard <commit-hash> # Go back to that point

# If you didn't commit but have session backups:
# Switch back to the previous session
/session switch my-project-v1

# Or create a completely new project from scratch
/session new my-project-redo
```

**Scenario 5: The agent runs a command you didn't expect**

Always read what the agent is doing before accepting changes. In the Web UI, tool calls are expanded by default so you can see every action. If the agent tries something dangerous:
- Type `/safe` to enable safe mode (restricts commands to a whitelist)
- The agent will ask for permission before running non-whitelisted commands

---

### Strategies for Success

#### 1. Use separate sessions per project

Treat each project as its own session:

- **CLI**: `/session new my-project`, `/session list`, `/session rename`, `/session delete`
- **Web UI**: Sessions panel → New / switch / rename (✏️) / export (💾) / import (📥) / delete (❌)

Sessions are saved to disk and survive server restarts. This keeps each project's context clean and lets you pick up exactly where you left off.

> **Tip**: Name your session after the project so you can quickly switch between multiple projects. Unused sessions (no messages) are automatically removed.

#### 2. Pick the right model

You don't need to learn all 5-10 models. For a complex project, just remember three:

| When | Model | Command |
|------|-------|---------|
| Planning, debugging hard problems | deepseek (smartest) | `/model 1` |
| Writing code, adding features | qwen (fast & good) | `/model 4` |
| Quick edits, frontend tweaks | qwen-fast (fastest) | `/model 2` |

Use `/model <n>` to switch mid-session. For example: plan with deepseek, code with qwen, debug with deepseek.

> **Model strategy for beginners**: Start each feature with `/model 4` (qwen). If the agent struggles, switch to `/model 1` (deepseek). If the agent is too slow, switch to `/model 2` (qwen-fast). That's all you need to know.

#### 3. Keep context windows manageable

After 15–20 exchanges, the agent starts forgetting early details. When you start a new feature:

```
/reset
```

This clears the conversation but `AGENTS.md` still provides project context on restart.

> **Tip**: After `/reset`, remind the agent: "We're building a URL shortener. Next feature: add click tracking."

#### 4. Use git checkpointing (you now have git tools!)

The agent has three dedicated git tools. Use them for safety:

| Tool | When to use |
|------|------------|
| `git_diff` | Before accepting changes — review what the agent is about to do |
| `git_commit` | After each working feature — create a save point |
| `git_log` | When something breaks — see what changed and when |

**Good habit**: After every feature that works, say: "Commit this with message 'Add X feature'". If a later change breaks something, you can always go back.

#### 5. Use LSP for code understanding

The agent can analyze your code semantically (not just text search):

| Tool | What it does |
|------|-------------|
| `code_definition` | "Where is this function defined?" |
| `code_references` | "Where is this function used?" |
| `code_hover` | "What does this function expect?" |
| `get_diagnostics` | "Are there errors in this file?" |

Enable with `/lsp` and install LSP servers for your languages:

```bash
# For JavaScript/TypeScript
npm install -g typescript-language-server

# For Python
pip install pyright

# For other languages, see the Configuration Reference table below
```

Then use it naturally:

```
Find all places where the authenticate() function is called.
What does calculateFee() expect as input?
Show me the definition of the User model.
Are there any errors in src/main.ts?
```

> **Windows note**: If you see "LSP server exited" errors, the server may not be installed or PATH needs a refresh. Run the install command in a fresh terminal.

#### 6. Connect MCP servers for external tools

MCP lets the agent use external tools like databases, GitHub, and web search. This is advanced — only use it when you need it:

```
/mcp list                    # See connected servers
/mcp toggle database         # Enable database access
```

Then:

```
Query the database for recent orders.
```

MCP servers are configured in `.coding-agent.json`. See the Example Projects section for MCP setup tutorials.

#### 7. Save checkpoints with sessions

```
Before making this big change, let's save the current state:
/session rename my-project-v1
```

Then start the refactoring in a new session:

```
/session new
/session rename my-project-v2-with-analytics
```

If the refactoring goes wrong, switch back:

```
/session switch my-project-v1
```

---

### Limitations & How to Work Around Them

#### Context Window Saturation

**Problem**: After ~20 exchanges, the agent forgets details from the start of the conversation.

**Workarounds**:
- `/reset` between feature work
- Store key decisions in `AGENTS.md` (the agent reads this on every start)
- Use specific filenames: "Read src/utils/urlValidator.ts and tell me..." (refreshes the agent's memory of that file)
- `/session new` for each major feature

#### Stuck Detection (Agent Looping)

**Problem**: If the agent makes 3 similar tool calls in a row (e.g., reading the same file 3 times), it may force a reset.

**Workarounds**:
- Give more context in your prompt so the agent doesn't need to explore
- If it happens, the agent auto-recovers and asks you to rephrase
- Use `/safe` mode to disable stuck detection (not recommended long-term)

#### Token Consumption

**Problem**: Each exchange costs tokens. Long conversations with large file reads consume your rate limit.

**Workarounds**:
- Read only the relevant parts of files, not entire large files
- Use `/model 2` (qwen-fast) for quick iterations, switch to smarter models only when needed
- Use `search_content` instead of reading entire files
- Keep file contents small when asking the agent to review

#### Model Capability Differences

**Problem**: Some models handle complex reasoning well; others are better at simple tasks.

**Workarounds**:
- Switch models mid-session with `/model <n>`
- Memory aid: deepseek = smart & slow, qwen = balanced, qwen-fast = quick & simple

#### Rate Limits on Free Tiers

**Problem**: Free APIs enforce rate limits. You might get "429 Rate limited" after heavy use.

**Workarounds**:
- Wait 30–60 seconds and retry
- Switch providers: `/model 1` → deepseek, `/model 5` → google
- The agent retries automatically up to 3 times with backoff

---

### Real-World Workflow Example

Here's how a full project session looks with these strategies:

```
# Day 1 — Planning
You: I want to build a personal finance tracker web app.
/session rename finance-tracker
You: Help me plan the architecture...
You: Create AGENTS.md with our decisions.
You: Create the folder structure.
git_commit: "Initial project scaffold"

# Day 2 — Database & Backend
/reset (new context for today's work)
You: We're building the finance tracker (AGENTS.md has details).
     Step 1: Create SQLite schema for transactions.
     Step 2: Create the Express API with CRUD endpoints.
     Step 3: Test each endpoint with curl.
git_commit: "Database schema and API endpoints"

# Day 3 — Frontend
/reset
You: Continuing the finance tracker from AGENTS.md.
     Step 1: Create the React app structure.
     Step 2: Build the transaction list component.
/model 4 (switch to qwen for faster frontend work)
You: Step 3: Build the "Add Transaction" form.
     Step 4: Connect to the API.
git_commit: "Frontend with transaction form"

# Day 3 — Debugging
/model 1 (switch to deepseek for hard problem)
You: The form submits but data doesn't persist after page refresh.
     Check the API response and database flow. Fix the issue.

# Day 4 — Polish
/reset
/model 2 (switch to fast model for small changes)
You: Add input validation:
     - Amount must be positive number
     - Description is required, max 200 chars
     - Date defaults to today
/session rename finance-tracker-v1 (checkpoint)

# Done! Later for v2:
/session new
/session rename finance-tracker-v2
You: Build on the existing tracker (read AGENTS.md).
     Add category analytics with charts.
```

This workflow takes 3-4 days of real work — about the same as a solo human developer. The key difference: you're **directing** the work, not typing the code.

---

### Quick-Reference Summary Tables

#### Configuration Reference

| What | Where | How |
|------|-------|-----|
| **Project context** | `AGENTS.md` (project root) | Create manually or ask agent. Read automatically on startup. Store architecture, tech stack, build commands. |
| **LSP servers** | `.coding-agent.json` (project root) | Default config has 10 languages. Add custom: `{ "lspServers": [{ "command": "my-lsp", "args": ["--stdio"], "languageId": "mylang", "filePatterns": ["**/*.my"] }] }` |
| **MCP servers** | `.coding-agent.json` (project root) | `{ "mcpServers": { "name": { "command": "npx", "args": ["-y", "@server"], "env": {} } } }` |
| **Install MCP server** | Terminal | `npm install -g @modelcontextprotocol/server-<name>` |
| **Install LSP server** | Terminal | `npm install -g typescript-language-server` (JS/TS), `pip install pyright` (Python), `gem install solargraph` (Ruby), `brew install lua-language-server` (Lua), `apt install clangd` (C/C++) |
| **Environment variables** | `.env` (project root) | `OPENROUTER_API_KEY=sk-or-v1-...` (one line per key) |
| **Docker sandbox** | `.env` (project root) | `DOCKER_SANDBOX_ENABLED=true` and `DOCKER_IMAGE=ubuntu:22.04`
| **Session persistence** | `sessions/` directory | Auto-saved. List: `/session list`, Switch: `/session switch <name>`, Rename: `/session rename <name>`, Delete: `/session delete <name>`, Export: 💾 (web), Import: 📥 (web) |

#### Model Selection Guide

| Phase / Task | Command | Best Model | Why |
|-------------|---------|------------|-----|
| Architecture planning | `/model 1` | deepseek-chat | Large 128K context, strong reasoning for design decisions |
| CRUD / boilerplate code | `/model 4` | qwen-2.5-coder-32b | Fast, good code quality, cheap |
| Frontend / UI work | `/model 2` | qwen-fast | Fastest response, good for iterative UI tweaks |
| Debugging complex bugs | `/model 1` | deepseek-chat | Deep analysis, traces root causes |
| Large refactoring | `/model 3` | qwen-32k-preview | 32K context loads more files at once |
| Code review / audit | `/model 3` or `/model 5` | qwen-32k / gemini | Good at spotting inconsistencies |
| Quick edits | `/model 2` | qwen-fast | Sub-second responses |
| Learning / exploration | Any | — | Experiment freely |

#### Limitations & Workarounds

| Limitation | Symptom | Workaround |
|-----------|---------|------------|
| **Context saturation** | Agent forgets early conversation | `/reset` between features; store decisions in `AGENTS.md`; use `/session new` per feature |
| **Stuck detection** | Agent resets mid-task after 3 similar tool calls | Be more specific in prompts; reduce `read_file` calls by including content in your message |
| **Token consumption** | Rate limits hit after many exchanges | Use `/model 2` for cheap iterations; read only relevant file sections; use `search_content` instead of `read_file` |
| **Rate limits (429)** | API returns "Rate limited" | Wait 30s; switch provider (`/model 1`→deepseek, `/model 5`→google); agent auto-retries 3× |
| **Model too slow** | Response takes 30s+ | Switch to `/model 2` or `/model 4` (faster models) |
| **Model can't do task** | Wrong tool calls or nonsense | Switch to a smarter model (`/model 1` or `/model 3`) |
| **LSP server not found** | `LSP server exited: <name>` | Install the LSP server for that language (see config table above) |
| **MCP connection fails** | `MCP server not connected` | Check `.coding-agent.json` syntax; verify server binary is installed; run `/mcp toggle` |
| **Windows .cmd files** | LSP/MCP binary not found on Windows | Agent auto-detects ENOENT and retries via `cmd /c`. Install server in a fresh terminal to update PATH. |
| **Large project navigation** | Agent reads wrong files | Refer to files by explicit path: "Read src/api/routes.py and tell me..." |

### Checklist for Complex Projects

Use this checklist to stay on track:

- [ ] **Session created** (`/session rename <project>`)
- [ ] **Architecture planned** (files, data flow, dependencies)
- [ ] **AGENTS.md written** (captures all decisions)
- [ ] **Folder structure created** (empty placeholder files)
- [ ] **LSP servers installed** for each language in the project
- [ ] **MCP servers configured** for external integrations (DB, search, etc.)
- [ ] **Base module built and tested** independently
- [ ] **Features added one at a time**, tested after each
- [ ] **Session checkpointed** after each feature (`/session rename <project>-featureX`)
- [ ] **Context reset** between major features (`/reset`)
- [ ] **Appropriate model selected** for each task (`/model <n>`)
- [ ] **LSP enabled** for cross-file analysis (`/lsp`)
- [ ] **Integration tested** end-to-end
- [ ] **Edge cases handled** (errors, invalid input, missing data)
- [ ] **Tests written** for core functionality

---

## Web Interface Guide

### Starting the Web UI

```bash
npm run web
```

Open http://localhost:3000 in your browser.

### Web UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│  ⏳ Session: my-project                                   │
│  ──────────────────────────────────────────────────────── │
│  You: create hello.py                                     │
│  ⏳ Thinking...                                           │
│  🛠  write_file(path="hello.py", content="...")           │
│  ✔  File written (25 bytes)                               │
│  🛠  run_command(command="python hello.py")               │
│  ✔  Hello from the Web UI!                                │
│  Done! Created hello.py and verified it runs.             │
│  ──────────────────────────────────────────────────────── │
│  [Message input...                        ] [Send]       │
│  [?] Help  [model 1/5]  [🔒 Safe]  [Sessions]  ⚙️       │
└──────────────────────────────────────────────────────────┘
```

### Features

1. **Streaming**: Responses appear token-by-token as the AI generates them
2. **Diff Viewer**: When files are written/edited, click the tool call to see line-level diffs (green = added, red = removed)
3. **Session Manager**: Click "Sessions" to create, switch, rename (✏️), export (💾), delete (❌), or import (📥) sessions. Persisted to disk — survives server restart. Empty sessions and test-like titles are filtered from the list
4. **Settings Panel** (⚙️): Adjust font size, toggle compact mode, enable auto-scroll. Settings persisted in localStorage
5. **Keyboard Shortcuts**:
   - `Ctrl+N` — New session
   - `Ctrl+D` or `Ctrl+B` — Toggle session panel
   - `Ctrl+K` — Focus message input
   - `Ctrl+L` — Reset conversation
   - `Ctrl+Shift+C` — Copy entire session as markdown
   - `Escape` — Close panels / cancel
   - `PgUp` / `PgDn` — Scroll chat
   - `Home` / `End` — Jump to top / bottom
6. **Collapsible Tool Calls**: Click ▶/▼ to expand or collapse tool call details (both during streaming and in history)
7. **Stop Button**: Click 🛑 to abort AI generation mid-stream via AbortController
8. **Auto-scroll Toggle**: A floating ⬇ button appears when you scroll up; click it to jump back to the latest message
9. **Per-message Copy Button**: 📋 on every user & assistant message — preserved during streaming (uses `.msg-content` wrapper)
10. **Copy Session**: 📄 Copy button or `Ctrl+Shift+C` formats the entire conversation as clean markdown-like text
11. **Toast Notifications**: Feedback messages auto-dismiss after 3 seconds
12. **Welcome Screen**: An empty-state guide shown before the first message; disappears once you send a message
13. **Help Modal**: Click `?` for usage guide, commands reference, keyboard shortcuts, and diff viewer explanation
14. **Model Selector**: Shows current model; click to switch
15. **LSP Toggle**: 🟢ON/⚫OFF status with active programming languages shown
16. **MCP Toggle**: 🟢ON/⚫OFF status of Model Context Protocol servers

### Session Persistence

Sessions are automatically saved to the `sessions/` directory as `{uuid}.json` after:
- Each user message
- Each AI response completion
- Model switches
- Session resets
- Session renames

On server startup, sessions are loaded from disk and restored. Sessions with zero non-system messages are not persisted or displayed in the list.

### Using as an OpenAI-compatible API

The web server at http://localhost:3000 also provides an API:

```javascript
// Use with Cline, Continue.dev, Cursor
fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'openrouter/free',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true,
  }),
});
```

To configure your IDE, run:
```bash
npm run setup-ide
```

---

## Troubleshooting

### Agent won't start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Error: No API keys found` | No `.env` file | Run `npm run setup` |
| `Error: connect ECONNREFUSED` | Network issue or proxy | Check internet, VPN, or use local model |
| `Error: Cannot find module` | Missing dependencies | Run `npm install` |
| `MODULE_NOT_FOUND` | Node.js version too old | Update to Node.js 18+ |

### Agent is stuck or repeating

| Symptom | Cause | Fix |
|---------|-------|-----|
| Same tool called 3×+ | Model is confused | Rephrase your request, or `/reset` to clear context |
| "All 3 attempts failed" | Model too slow | Try a smaller/faster model (`/model 1`) |
| Empty tool arguments | Model doesn't support function calling | Use a different model (`/model 2` or `/model 3`) |

### Model issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `429 Rate limit` | Free tier limit reached | Wait, or use `/model <n>` to switch providers |
| `403 Forbidden` | Invalid API key | Check `.env` for correct key |
| Slow responses | Large model or slow provider | Try Groq models for speed (`/add 6 groq:llama-3.3-70b-versatile`) |
| Wrong language | Model misinterprets | Be explicit: "Reply in English" |

### LSP not working

| Symptom | Cause | Fix |
|---------|-------|-----|
| `LSP tool unavailable` | LSP disabled | Type `/lsp` to enable |
| `Server not found` | LSP server binary missing | Install it: `npm install -g typescript-language-server` (JS/TS), `pip install pyright` (Python), `npm install -g sql-language-server` (SQL), `apt install clangd` or `winget install LLVM` (C/C++), `gem install solargraph` (Ruby), `brew install lua-language-server` (Lua) |
| `No results` | No matching file types | Check your file extensions match the LSP config |

### MCP not working

| Symptom | Cause | Fix |
|---------|-------|-----|
| `MCP server not connected` | Server not configured | Check `.coding-agent.json` and restart |
| `Connection refused` | Server binary not found | Install the MCP server first: `npm install -g @modelcontextprotocol/server-filesystem` |
| `/mcp list` shows nothing | MCP toggled off | Type `/mcp toggle` |

### Web UI issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Page loads but no response | Server not running | Run `npm run web` in a terminal |
| Connection lost | Server crashed | Check terminal for errors, restart |
| Diff not showing | Operation had no changes | Only write/replace/append show diffs |

### Windows-specific

| Symptom | Cause | Fix |
|---------|-------|-----|
| PowerShell permission prompt | Strict execution policy | Use `run-cli.bat` instead |
| "lf will be replaced by crlf" | Git line ending warning | Safe to ignore |
| Path too long | Windows path limit | Move project closer to root (e.g., `C:\agent`) |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Agent** | The AI-powered assistant that processes your requests |
| **Tool** | A capability the AI can use (read/write files, run commands, etc.) |
| **Preset** | A saved model configuration (provider + model name) |
| **Provider** | A service that hosts AI models (OpenRouter, Groq, Google, etc.) |
| **MCP** | Model Context Protocol — a standard for connecting tools to AI |
| **LSP** | Language Server Protocol — a standard for code analysis |
| **SSE** | Server-Sent Events — used for streaming responses in the web UI |
| **Safe Mode** | A security mode that restricts shell commands to a whitelist |
| **Session** | A saved conversation (in the `sessions/` folder) |
| **Token** | A unit of text the AI processes (roughly ¾ of a word) |
| **Context Window** | The amount of conversation the AI can "see" at once |
| **Fallback** | Automatically trying another model when one fails |
| **Rate Limit** | A limit on how many requests you can make in a time period |
| **JSON-RPC** | A protocol for calling remote methods (used by MCP and LSP) |
| **Stdio Transport** | Communication via standard input/output (used by subprocess MCP servers) |
| **HTTP Transport** | Communication via HTTP/SSE (used by remote MCP servers) |

---

## Next Steps

- ⭐ **Star the repo** on GitHub: https://github.com/maz557/coding-agent-free
- 🐛 **Report issues**: https://github.com/maz557/coding-agent-free/issues
- 🌐 **Read the README**: For quick reference of all features
- 🔧 **Configure MCP servers**: Connect databases, APIs, and more
- 🚀 **Build something**: Try the example projects above
- 📖 **Learn more**: Explore the source code in `src/` folder

---

*Happy coding! 🚀*
