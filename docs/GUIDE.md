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
7. [Web Interface Guide](#web-interface-guide)
8. [Troubleshooting](#troubleshooting)
9. [Glossary](#glossary)

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

| Provider | Sign Up | Free Tier |
|----------|---------|-----------|
| **OpenRouter** (easiest) | https://openrouter.ai/keys | 18+ free models, single key |
| **Groq** (fastest) | https://console.groq.com/keys | 30 req/min on many models |
| **Google Gemini** | https://aistudio.google.com/apikey | 60 req/min, generous free tier |
| **DeepSeek** | https://platform.deepseek.com | Credit-based free tier |
| **Mistral** | https://console.mistral.ai | Free tier available |

> 💡 **Recommendation**: Start with **OpenRouter** — one key gives you access to 18+ free tool-calling models. If Groq is available in your region, add that too for faster responses.

#### Direct Links to Get API Keys

| Provider | Get Your Key | Environment Variable |
|----------|-------------|---------------------|
| **OpenRouter** | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |
| **Groq** | https://console.groq.com/keys | `GROQ_API_KEY` |
| **Google Gemini** | https://aistudio.google.com/apikey | `GOOGLE_API_KEY` |
| **DeepSeek** | https://platform.deepseek.com/api_keys | `DEEPSEEK_API_KEY` |
| **Mistral** | https://console.mistral.ai/api-keys | `MISTRAL_API_KEY` |
| **Anthropic** | https://console.anthropic.com/ | `ANTHROPIC_API_KEY` |
| **Together AI** | https://api.together.xyz/settings/api-keys | `TOGETHER_API_KEY` |
| **Perplexity** | https://www.perplexity.ai/settings/api | `PERPLEXITY_API_KEY` |
| **xAI** | https://console.x.ai/ | `XAI_API_KEY` |
| **Cohere** | https://dashboard.cohere.com/api-keys | `COHERE_API_KEY` |

#### Check Which Keys Are Active

After creating your `.env` file (Step 5), you can check which keys are detected:

```bash
node -e "require('dotenv').config(); Object.entries({OPENROUTER_API_KEY:'OpenRouter',GROQ_API_KEY:'Groq',GOOGLE_API_KEY:'Google',DEEPSEEK_API_KEY:'DeepSeek',MISTRAL_API_KEY:'Mistral',ANTHROPIC_API_KEY:'Anthropic',TOGETHER_API_KEY:'Together',PERPLEXITY_API_KEY:'Perplexity',XAI_API_KEY:'xAI',COHERE_API_KEY:'Cohere'}).forEach(([env,name])=>console.log(process.env[env]?`  ✅ ${name} configured`:`  ❌ ${name} missing`))"
```

You should see green checkmarks next to every provider you've configured. Missing ones show a red cross — just get that key from the link above and add it to `.env`:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxx
GROQ_API_KEY=gsk_yyyyyyyyy
```

The agent will automatically use the best available key when you switch models with `/model <n>`.

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

| Interface | Start Command | Best For |
|-----------|--------------|----------|
| **CLI (terminal)** | `npm start` | Quick tasks, scripting, when you're already in the terminal, minimal resource usage |
| **Web UI** | `npm run web` | Visual diff viewer, session manager, model switching UI, team collaboration via browser |
| **OpenAI-compatible API** | `npm run web` | Integration with IDEs (Cline, Continue.dev, Cursor), custom tools, programmatic access |

**CLI or Web UI?** Start with CLI for simple edits and quick commands. Switch to Web UI when you need to review file diffs visually, manage multiple sessions, or prefer a graphical chat interface. The Web UI runs at http://localhost:3000.

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

### Safe Mode

When **safe mode** is on (`[🔒 Safe]`), the agent can only run commands from a whitelist:
- `node`, `npm`, `npx`, `python`, `python3`, `pip`, `pip3`
- `dir`, `ls`, `cat`, `type`, `echo`, `pwd`, `cd`
- `git`, `cargo`, `go`, `rustc`, `gcc`, `clang`
- `mkdir`, `cp`, `mv`, `rm`, `touch`

Toggle with `/safe` or start with `npm start -- --safe`.

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

### Project Files

When you run the agent, it creates and manages several files in the project root:

| File / Folder | Purpose | Created By |
|--------------|---------|------------|
| **`.env`** | Stores your API keys and environment variables | `npm run setup` |
| **`.coding-agent.json`** | Configuration for MCP servers and custom LSP servers | You (or the agent) |
| **`sessions/`** | Saved conversation history — each session is a JSON file | Agent (auto) |
| **`workspace/`** | Default working directory where the agent creates projects by default | `npm run setup` |
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
│  [?] Help  [model 1/5]  [🔒 Safe]  [Sessions]           │
└──────────────────────────────────────────────────────────┘
```

### Features

1. **Streaming**: Responses appear token-by-token as the AI generates them
2. **Diff Viewer**: When files are written/edited, click the tool call to see line-level diffs (green = added, red = removed)
3. **Session Manager**: Click "Sessions" to create, switch, or rename sessions
4. **Help Modal**: Click `?` for quick reference
5. **Model Selector**: Shows current model; click to switch

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
| `Server not found` | LSP server binary missing | Install it: `npm install -g typescript-language-server` (JS/TS), `pip install pyright` (Python), `npm install -g sql-language-server` (SQL), `apt install clangd` or `winget install LLVM` (C/C++) |
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
