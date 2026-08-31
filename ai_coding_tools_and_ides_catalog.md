# The Definitive Catalog of AI Coding Tools: 30+ AI IDEs & 110+ AI Terminal CLIs

A comprehensive, categorized guide and reference index covering AI-native Integrated Development Environments (IDEs), desktop developer platforms, autonomous coding harnesses, terminal agents, shell utilities, and editor plugins.

---

## Table of Contents
1. [Overview & Ecosystem Architecture](#overview--ecosystem-architecture)
2. [Section 1: 30+ AI IDEs & Dedicated Developer Environments](#section-1-30-ai-ides--dedicated-developer-environments)
   - 1.1 Next-Gen Native AI Desktop IDEs
   - 1.2 Open-Source & Privacy-First AI IDEs
   - 1.3 High-Performance & Terminal-Native IDEs
   - 1.4 Web-Native Autonomous Coding Environments & Canvas Builders
   - 1.5 Enterprise & Data Science AI IDEs
3. [Section 2: 110+ AI Coding CLIs, Harnesses & Terminal Agents](#section-2-110-ai-coding-clis-harnesses--terminal-agents)
   - 2.1 Autonomous Terminal Coding Agents & Core Harnesses (1–25)
   - 2.2 Platform-Native & Foundation Model CLIs (26–45)
   - 2.3 Shell Enhancers, LLM Pipers & Stdin/Stdout Utilities (46–65)
   - 2.4 Neovim, Emacs & Terminal Editor Agent Plugins (66–80)
   - 2.5 Code Review, Diff Analysis & Git Automation CLIs (81–95)
   - 2.6 Multi-Agent Orchestration & SWE Benchmark CLI Engines (96–115)
4. [Section 3: Feature & Architecture Comparison Matrix](#section-3-feature--architecture-comparison-matrix)
5. [Summary & Recommendations by Workflow](#summary--recommendations-by-workflow)

---

## Overview & Ecosystem Architecture

The AI software engineering landscape has bifurcated into two dominant interaction paradigms:

1. **AI IDEs & GUI Environments**: Rich visual editors offering background codebase indexing, multi-tab orchestration, inline diff viewing, visual debuggers, and interactive canvases.
2. **Terminal CLIs & Autonomous Harnesses**: Fast, composable, scriptable command-line tools that integrate directly into developer shells, Git loops, SSH sessions, and CI/CD pipelines.

```
+-----------------------------------------------------------------------------------+
|                           AI Developer Tooling Landscape                          |
+-----------------------------------------------------------------------------------+
|  [ Dedicated AI IDEs / Desktop Apps ]     |  [ Terminal CLIs & Coding Harnesses ]  |
|  * Cursor, Windsurf, Trae, PearAI         |  * Pi, OpenCode, Aider, Claude Code    |
|  * Zed AI, Warp, Void, Melty              |  * Goose, Mentat, Plandex, SWE-agent   |
|  * Devin, OpenHands, Bolt, Lovable        |  * Shell-GPT, Mods, llm, Avante.nvim   |
+-----------------------------------------------------------------------------------+
```

---

## Section 1: 30+ AI IDEs & Dedicated Developer Environments

### 1.1 Next-Gen Native AI Desktop IDEs

1. **Cursor**
   - **Type**: Desktop IDE (VS Code Fork)
   - **License**: Proprietary / Freemium
   - **Key Features**: Composer multi-file editing, codebase vector indexing, shadow workspace diffing, background terminal agent execution, inline Copilot++.
   - **Platforms**: macOS, Linux, Windows

2. **Windsurf (by Codeium)**
   - **Type**: Desktop IDE (VS Code Fork)
   - **License**: Proprietary / Freemium
   - **Key Features**: "Cascade" collaborative agentic engine, deep workspace real-time indexing, multi-file synchronous edits, proactive context suggestion ("Flows").
   - **Platforms**: macOS, Linux, Windows

3. **Trae**
   - **Type**: Desktop IDE (VS Code Fork by ByteDance)
   - **License**: Proprietary / Free
   - **Key Features**: Native integration with Claude 3.7 Sonnet and GPT-4o, dual Builder and Chat modes, interactive inline preview, project-wide refactoring.
   - **Platforms**: macOS, Windows

4. **Augment Code IDE Integration**
   - **Type**: Enterprise Developer Platform & Plugin/Client
   - **License**: Proprietary (Enterprise)
   - **Key Features**: Massive multi-repo semantic code indexing, real-time code completion, enterprise codebase reasoning.
   - **Platforms**: VS Code, JetBrains, macOS

5. **Apus Studio**
   - **Type**: AI Native Application Builder & IDE
   - **License**: Proprietary
   - **Key Features**: Autonomous full-stack app generation with visual preview, database schema designer, and live code modification.
   - **Platforms**: Web / macOS

---

### 1.2 Open-Source & Privacy-First AI IDEs

6. **PearAI**
   - **Type**: Open-Source AI IDE (VS Code Fork)
   - **License**: Apache 2.0 / Open Source
   - **Key Features**: Transparent LLM proxying (bring your own key or local Ollama), integrated Continue/Roo-Code inspired agent engine, inventory management for tools.
   - **Platforms**: macOS, Linux, Windows

7. **Void Editor**
   - **Type**: Open-Source AI IDE (VS Code Fork)
   - **License**: MIT
   - **Key Features**: 100% privacy-focused, zero telemetry, local LLM first-class support, direct API key routing without intermediate proxy servers.
   - **Platforms**: macOS, Linux, Windows

8. **Melty**
   - **Type**: Open-Source AI IDE
   - **License**: MIT
   - **Key Features**: Self-aware code editor that tracks developer git commits, shell interactions, and editor state to anticipate next steps.
   - **Platforms**: macOS, Linux

9. **OpenHands Desktop (formerly OpenDevin)**
   - **Type**: Autonomous Agent IDE / Web / Desktop
   - **License**: MIT
   - **Key Features**: Sandboxed Docker runtime, autonomous task execution, integrated file browser, terminal, and browser preview.
   - **Platforms**: Docker, macOS, Linux, Windows

10. **Refact.ai**
    - **Type**: Open-Source AI Code Assistant & Editor
    - **License**: Apache 2.0
    - **Key Features**: Self-hostable fine-tuned models, autonomous refactoring agents, privacy-compliant enterprise on-prem deployment.
    - **Platforms**: VS Code, JetBrains, Web

11. **Supermaven Desktop/Editor Suite**
    - **Type**: High-Speed AI IDE Extension & Client
    - **License**: Proprietary / Freemium
    - **Key Features**: Ultra-fast 300,000-token context window with sub-second latency via custom "Babble" architecture.
    - **Platforms**: VS Code, Neovim, JetBrains

---

### 1.3 High-Performance & Terminal-Native IDEs

12. **Zed AI**
    - **Type**: Native High-Performance IDE (Rust-based)
    - **License**: GPL / Apache 2.0
    - **Key Features**: Multi-model context panel (Anthropic, OpenAI, Ollama), inline prompt transformation, CRDT-based real-time multiplayer, 120 FPS GPU rendering.
    - **Platforms**: macOS, Linux, Windows

13. **Warp**
    - **Type**: AI Terminal IDE & Shell Environment
    - **License**: Proprietary / Freemium
    - **Key Features**: AI Agent Mode for terminal workflows, natural language to bash, workflow runbooks, collaborative team terminal sessions.
    - **Platforms**: macOS, Linux, Windows

14. **Wave Terminal**
    - **Type**: Open-Source Graphical AI Terminal Workspace
    - **License**: Apache 2.0
    - **Key Features**: Inline web rendering, embedded AI assistant, visual code inspection, persistent SSH sessions.
    - **Platforms**: macOS, Linux, Windows

15. **Positron**
    - **Type**: Data Science & Machine Learning IDE (by Posit)
    - **License**: Elastic 2.0
    - **Key Features**: Native Python and R support, integrated AI data explorer, variable state inspection, automated notebook generation.
    - **Platforms**: macOS, Linux, Windows

16. **Lapce + AI Engine**
    - **Type**: Lightweight Rust IDE
    - **License**: Apache 2.0
    - **Key Features**: Embedded WASI plugin architecture, local AI completion integrations, ultra-low memory footprint.
    - **Platforms**: macOS, Linux, Windows

---

### 1.4 Web-Native Autonomous Coding Environments & Canvas Builders

17. **Devin (by Cognition Labs)**
    - **Type**: Autonomous Cloud AI Software Engineer
    - **License**: Proprietary
    - **Key Features**: Long-horizon planning, sandboxed cloud runtime with dedicated browser, terminal, code editor, and automatic verification loop.
    - **Platforms**: Cloud / Web

18. **Replit Agent**
    - **Type**: Cloud IDE & Autonomous Full-Stack Builder
    - **License**: Proprietary
    - **Key Features**: Natural-language specification to deployed database, backend, and frontend with zero local configuration.
    - **Platforms**: Cloud / Web

19. **Bolt.new (by StackBlitz)**
    - **Type**: Web-Native In-Browser Full-Stack AI IDE
    - **License**: MIT (Core) / Commercial
    - **Key Features**: WebContainers technology (Node.js running directly in browser WebAssembly), real-time live preview, zero-latency server execution.
    - **Platforms**: Browser / Web

20. **Lovable.dev**
    - **Type**: Visual Full-Stack Web App Creator
    - **License**: Proprietary
    - **Key Features**: Chat-to-React/Tailwind builder, instant Supabase backend integration, visual UI click-to-edit canvas.
    - **Platforms**: Cloud / Web

21. **v0 (by Vercel)**
    - **Type**: Generative Frontend & Full-Stack UI Studio
    - **License**: Proprietary
    - **Key Features**: Next.js, React, Tailwind, and shadcn/ui code generation with live interactive preview and CLI pull synchronization.
    - **Platforms**: Cloud / Web

22. **Marblism**
    - **Type**: Prompt-to-SaaS AI Web IDE
    - **License**: Proprietary
    - **Key Features**: Generates fully functional SaaS boilerplate (authentication, database schema, Stripe billing, API routes) from text.
    - **Platforms**: Cloud / Web

23. **Create.xyz**
    - **Type**: Visual AI App Builder
    - **License**: Proprietary
    - **Key Features**: Component-level visual layout generation with real-time API integrations and Python backend triggers.
    - **Platforms**: Cloud / Web

24. **Magic.dev (Loom Workspace)**
    - **Type**: Ultra-Long Context AI Autonomous Engineer
    - **License**: Proprietary
    - **Key Features**: Proprietary 100M+ token context foundation models designed for massive multi-million line codebase refactoring.
    - **Platforms**: Cloud

25. **GitHub Spark**
    - **Type**: Micro-App AI Creation Platform (by GitHub Next)
    - **License**: Proprietary
    - **Key Features**: Interactive natural-language app builder with built-in data persistence and theme generation.
    - **Platforms**: Cloud / Web

---

### 1.5 Enterprise & Specialized AI IDEs

26. **CodeSee Enterprise IDE**
    - **Type**: Codebase Visualization & Architecture AI Studio
    - **License**: Proprietary
    - **Key Features**: Auto-generated architectural maps, PR impact visualization, code tour generation.
    - **Platforms**: Web / VS Code

27. **CodeScene AI Suite**
    - **Type**: Behavioral Code Analysis & Technical Debt AI IDE
    - **License**: Proprietary
    - **Key Features**: Hotspot analysis, automated refactoring suggestions based on commit churn and complexity.
    - **Platforms**: Web / Desktop

28. **Tabnine Enterprise Workspace**
    - **Type**: Secure Enterprise AI IDE Suite
    - **License**: Proprietary
    - **Key Features**: Zero data retention, locally deployable models, air-gapped support, IP indemnification.
    - **Platforms**: VS Code, JetBrains, Eclipse

29. **JetBrains AI Assistant Suite**
    - **Type**: IDE-Native Assistant (IntelliJ, PyCharm, WebStorm, CLion)
    - **License**: Commercial
    - **Key Features**: Deep AST semantic understanding, language-specific refactoring, test generation, commit message drafting.
    - **Platforms**: macOS, Linux, Windows

30. **CoScreen AI**
    - **Type**: Multiplayer Collaborative IDE Workspace
    - **License**: Proprietary
    - **Key Features**: Real-time collaborative screen sharing with synchronized multi-user AI pair programming.
    - **Platforms**: macOS, Windows

31. **Sourcegraph Cody App / IDE Engine**
    - **Type**: Enterprise Codebase AI Assistant & App
    - **License**: Apache 2.0 / Commercial
    - **Key Features**: Multi-repo vector context retrieval, precise symbol graph navigation, enterprise security.
    - **Platforms**: VS Code, JetBrains, Web

32. **Amazon Q Developer Studio**
    - **Type**: Cloud Infrastructure & Full-Stack AI IDE Environment
    - **License**: Proprietary
    - **Key Features**: End-to-end legacy code transformation (e.g., Java 8 to Java 17/21), security vulnerability scanning, automated remediation.
    - **Platforms**: VS Code, JetBrains, AWS Console

---

## Section 2: 110+ AI Coding CLIs, Harnesses & Terminal Agents

### 2.1 Autonomous Terminal Coding Agents & Core Harnesses (1–25)

1. **`pi` (Pi Coding Agent)**
   - **Repository/Command**: `@earendil-works/pi-coding-agent` / `pi`
   - **License**: MIT
   - **Description**: Minimalist, hackable TypeScript-based terminal coding agent. Exposes simple primitives (`read`, `write`, `edit`, `bash`) and delegates control to extensions, skills, and branching session trees.

2. **`opencode` (OpenCode)**
   - **Repository/Command**: `opencode-ai/opencode` / `opencode`
   - **License**: MIT
   - **Description**: High-productivity Go-based terminal coding agent. Features dual **Plan** (read-only architecture planning) and **Build** (safe execution) modes, multi-session concurrency, and integrated LSP diagnostics.

3. **`aider` (Aider)**
   - **Repository/Command**: `paul-gauthier/aider` / `aider`
   - **License**: Apache 2.0
   - **Description**: The industry-standard CLI pair programming agent. Builds AST-based repository maps with Tree-sitter, edits multiple files, and automatically creates clean, descriptive Git commits for every step.

4. **`goose` (Goose by Block / AAIF)**
   - **Repository/Command**: `block/goose` / `goose`
   - **License**: Apache 2.0
   - **Description**: Open-source autonomous developer agent backed by the Linux Foundation. Features deep Model Context Protocol (MCP) tool integration, automation recipes, and extensibility.

5. **`plandex` (Plandex)**
   - **Repository/Command**: `plandex-ai/plandex` / `plandex`
   - **License**: AGPL-3.0
   - **Description**: Terminal-based AI coding engine specialized in complex, multi-file software engineering tasks. Executes changes in a sandboxed background branch with interactive diff review.

6. **`mentat` (Mentat)**
   - **Repository/Command**: `AbanteAI/mentat` / `mentat`
   - **License**: Apache 2.0
   - **Description**: Autonomous AI coding assistant that operates directly from command line, capable of coordinating edits across large codebases using interactive syntax trees.

7. **`ante` (Ante CLI)**
   - **Repository/Command**: `ante-lang/ante` / `ante`
   - **License**: MIT
   - **Description**: Blazing-fast Rust-based AI agent harness featuring a daemon-client architecture and embedded local GGUF inference via `llama.cpp`.

8. **`gptme` (gptme)**
   - **Repository/Command**: `ErikBjare/gptme` / `gptme`
   - **License**: MIT
   - **Description**: Lightweight personal terminal companion capable of executing shell commands, browsing documentation, inspecting files, and maintaining persistent self-updating memory.

9. **`openhands` (OpenHands CLI)**
   - **Repository/Command**: `all-hands-ai/openhands` / `openhands-cli`
   - **License**: MIT
   - **Description**: Headless command-line execution runner for the OpenHands agent framework, running autonomous software engineering loops inside Docker containers.

10. **`swe-agent` (SWE-agent)**
    - **Repository/Command**: `princeton-nlp/swe-agent` / `swe-agent`
    - **License**: MIT
    - **Description**: State-of-the-art autonomous agent developed by Princeton University, designed to solve real-world GitHub issues end-to-end via an Agent-Computer Interface (ACI).

11. **`claude-code` (`claude`)**
    - **Repository/Command**: `@anthropic-ai/claude-code` / `claude`
    - **License**: Commercial / Source-Available
    - **Description**: Anthropic's official terminal coding agent. Navigates repos, executes bash commands, runs tests, fixes build errors, and manages Git pull requests autonomously.

12. **`codex` (OpenAI Codex CLI)**
    - **Repository/Command**: `openai/codex-cli` / `codex`
    - **License**: Apache 2.0
    - **Description**: Command-line interface for running automated reasoning and shell generation loops directly against OpenAI foundation APIs.

13. **`code-agent` (CodeAgent CLI)**
    - **Repository/Command**: `codeagent/cli` / `code-agent`
    - **License**: Apache 2.0
    - **Description**: Terminal agent focusing on test-driven development (TDD) cycles, auto-generating unit tests and editing source files until all assertions pass.

14. **`smol-developer` (Smol Developer)**
    - **Repository/Command**: `smol-ai/developer` / `smol-dev`
    - **License**: MIT
    - **Description**: Ultra-compact autonomous software developer CLI that converts natural language specs into full-fledged repository codebases.

15. **`devlooper`**
    - **Repository/Command**: `devlooper/devlooper` / `devlooper`
    - **License**: MIT
    - **Description**: Automated loop agent that reads compiler/test output in the terminal, plans fixes, and iteratively patches the codebase.

16. **`chatgpt-cli`**
    - **Repository/Command**: `kardolus/chatgpt-cli` / `chatgpt-cli`
    - **License**: MIT
    - **Description**: Fast, dependency-free Go CLI for interacting with LLM models with context streaming, shell pipe inputs, and multi-line editor integration.

17. **`gpt-engineer` (GPT Engineer)**
    - **Repository/Command**: `gpt-engineer-org/gpt-engineer` / `gpt-engineer`
    - **License**: MIT
    - **Description**: Specify what you want to build, and the agent asks clarifying questions before scaffolding and building the complete application codebase.

18. **`auto-code` (AutoCode)**
    - **Repository/Command**: `bloopai/auto-code` / `auto-code`
    - **License**: MIT
    - **Description**: Bloop's CLI engine for precise code navigation, semantic search, and autonomous multi-file refactoring.

19. **`devops-agent`**
    - **Repository/Command**: `devops-agent/cli` / `devops-agent`
    - **License**: MIT
    - **Description**: Specialized terminal agent for Docker, Kubernetes, Terraform, and CI/CD pipeline authoring and debugging.

20. **`tenere` (Tenere TUI)**
    - **Repository/Command**: `pythops/tenere` / `tenere`
    - **License**: AGPL-3.0
    - **Description**: Terminal User Interface (TUI) for LLM chat and coding sessions written in Rust with vim-keybindings.

21. **`kodu` (Kodu CLI)**
    - **Repository/Command**: `kodu-ai/kodu-cli` / `kodu`
    - **License**: Apache 2.0
    - **Description**: Autonomous coding agent with file system tools, semantic search, and step-by-step diff verification.

22. **`crush` (Crush Coding Agent)**
    - **Repository/Command**: `crush-sh/crush` / `crush`
    - **License**: MIT
    - **Description**: Rust-based terminal companion designed for rapid AST queries, code generation, and shell automation.

23. **`code-cli` (CodeCLI)**
    - **Repository/Command**: `code-cli-org/code-cli` / `code-cli`
    - **License**: Apache 2.0
    - **Description**: General-purpose interactive terminal coding assistant with support for custom tool definitions and local file indexing.

24. **`devika` (Devika CLI)**
    - **Repository/Command**: `stitionai/devika` / `devika-cli`
    - **License**: MIT
    - **Description**: Open-source agentic software engineer capable of breaking down high-level instructions into research, planning, and coding sub-tasks.

25. **`autonome` (Autonome Agent)**
    - **Repository/Command**: `autonome-ai/autonome` / `autonome`
    - **License**: MIT
    - **Description**: Lightweight agentic CLI with deterministic state management and interactive rollback capabilities.

---

### 2.2 Platform-Native & Foundation Model CLIs (26–45)

26. **`gh copilot` (GitHub Copilot CLI)**
    - **Repository/Command**: `github/gh-copilot` / `gh copilot`
    - **License**: Commercial / Proprietary
    - **Description**: GitHub's official command-line extension for synthesizing shell commands, explaining terminal errors, and assisting with git workflows.

27. **`gemini` (Gemini CLI)**
    - **Repository/Command**: `google-gemini/gemini-cli` / `gemini`
    - **License**: Apache 2.0
    - **Description**: Command-line interface leveraging Gemini's 1M+ token context window to ingest entire repositories into prompts for context-wide refactoring.

28. **`q` (Amazon Q Developer CLI)**
    - **Repository/Command**: `aws/amazon-q-cli` / `q`
    - **License**: Apache 2.0 / Commercial
    - **Description**: Amazon's terminal assistant tailored for cloud engineers, infrastructure as code, AWS SDK troubleshooting, and shell completions.

29. **`cursor-cli` (`cursor agent`)**
    - **Repository/Command**: `cursor/cursor-cli` / `cursor agent`
    - **License**: Proprietary
    - **Description**: Headless command-line interface for triggering Cursor background agent loops, indexing workspaces, and applying diffs.

30. **`auggie` (Augment Code CLI)**
    - **Repository/Command**: `augmentcode/auggie` / `auggie`
    - **License**: Proprietary
    - **Description**: Terminal agent client for Augment Code, providing multi-repo codebase awareness in headless terminal workflows.

31. **`cody` (Sourcegraph Cody CLI)**
    - **Repository/Command**: `sourcegraph/cody` / `cody`
    - **License**: Apache 2.0
    - **Description**: Command-line client for Sourcegraph's code intelligence platform, providing deep semantic codebase queries.

32. **`tabnine` (Tabnine CLI)**
    - **Repository/Command**: `codota/tabnine-cli` / `tabnine`
    - **License**: Proprietary
    - **Description**: Headless daemon and CLI for managing local Tabnine models, running team policy checks, and generating shell completions.

33. **`codegeex` (CodeGeeX CLI)**
    - **Repository/Command**: `THUDM/CodeGeeX` / `codegeex`
    - **License**: Apache 2.0
    - **Description**: Open multilingual code generation CLI supporting cross-language translation and automated docstring generation.

34. **`mistral` (Mistral CLI / Codestral Client)**
    - **Repository/Command**: `mistralai/mistral-cli` / `mistral`
    - **License**: Apache 2.0
    - **Description**: Terminal client optimized for Codestral models, featuring fill-in-the-middle (FIM) and fast repository completions.

35. **`ollama` (Ollama CLI)**
    - **Repository/Command**: `ollama/ollama` / `ollama run <model>`
    - **License**: MIT
    - **Description**: The standard tool for serving and interacting with open-source coding LLMs (DeepSeek-Coder, Qwen2.5-Coder, Llama 3) locally on CPU/GPU.

36. **`llama-cli` (`llama.cpp`)**
    - **Repository/Command**: `ggerganov/llama.cpp` / `llama-cli`
    - **License**: MIT
    - **Description**: High-performance C/C++ command-line inference engine for running quantized local models with near-zero latency.

37. **`vllm-cli` (vLLM)**
    - **Repository/Command**: `vllm-project/vllm` / `vllm`
    - **License**: Apache 2.0
    - **Description**: High-throughput distributed LLM serving and CLI client with PagedAttention support for high-concurrency coding workloads.

38. **`replicate-cli`**
    - **Repository/Command**: `replicate/cli` / `replicate run`
    - **License**: Apache 2.0
    - **Description**: Run cloud-hosted open-source coding models directly from shell scripts and pipelines.

39. **`together` (Together AI CLI)**
    - **Repository/Command**: `togethercomputer/together-cli` / `together`
    - **License**: Apache 2.0
    - **Description**: Fast terminal interface for inference, fine-tuning, and running specialized coding models on Together's cloud.

40. **`fireworks` (Fireworks AI CLI)**
    - **Repository/Command**: `fireworks-ai/fireworks-cli` / `fireworks`
    - **License**: Apache 2.0
    - **Description**: Ultra-low-latency model runner CLI tailored for function calling and streaming code generation.

41. **`groq` (Groq CLI)**
    - **Repository/Command**: `groq/groq-cli` / `groq`
    - **License**: MIT
    - **Description**: Terminal interface providing 500+ tokens/sec inference speeds for instant code completion and analysis on LPU hardware.

42. **`huggingface-cli`**
    - **Repository/Command**: `huggingface/huggingface_hub` / `huggingface-cli`
    - **License**: Apache 2.0
    - **Description**: Download, quantize, test, and manage coding datasets and foundation checkpoints locally.

43. **`openrouter-cli`**
    - **Repository/Command**: `openrouter/cli` / `openrouter`
    - **License**: MIT
    - **Description**: Terminal client for dynamically routing prompts across 200+ AI models with automated fallback and cost tracking.

44. **`cloudflare-ai` (Wrangler AI CLI)**
    - **Repository/Command**: `cloudflare/workers-sdk` / `wrangler ai`
    - **License**: Apache 2.0
    - **Description**: Run serverless AI models on Cloudflare Workers AI directly from the command line.

45. **`cerebras-cli`**
    - **Repository/Command**: `cerebras/cerebras-cli` / `cerebras`
    - **License**: Apache 2.0
    - **Description**: Terminal tool for interacting with Cerebras ultra-fast wafer-scale engine inference.

---

### 2.3 Shell Enhancers, LLM Pipers & Stdin/Stdout Utilities (46–65)

46. **`sgpt` (Shell-GPT)**
    - **Repository/Command**: `therootcompany/shell_gpt` / `sgpt`
    - **License**: MIT
    - **Description**: Versatile CLI tool to generate shell commands, automate complex pipes, and write code directly in bash/zsh/fish.

47. **`mods` (Mods by Charm)**
    - **Repository/Command**: `charmbracelet/mods` / `mods`
    - **License**: MIT
    - **Description**: Built for Unix pipelines; format, pipe, and transform stdout/stderr through LLMs with formatted markdown terminal output.

48. **`llm` (by Simon Willison)**
    - **Repository/Command**: `simonw/llm` / `llm`
    - **License**: Apache 2.0
    - **Description**: Modular CLI utility and Python library for running prompts against local and remote models with SQLite-backed prompt logging.

49. **`aichat`**
    - **Repository/Command**: `sigoden/aichat` / `aichat`
    - **License**: MIT / Apache 2.0
    - **Description**: All-in-one Rust CLI for chat, shell assistant, code generation, and RAG execution across 20+ LLM providers.

50. **`copilot-cli` (OpenAI Copilot Prototype)**
    - **Repository/Command**: `github/copilot-cli` / `github-copilot-cli`
    - **License**: MIT
    - **Description**: Precursor natural-language shell helper for explaining and generating terminal commands.

51. **`terminal-gpt` (`tgpt`)**
    - **Repository/Command**: `aandrew-me/tgpt` / `tgpt`
    - **License**: GPL-3.0
    - **Description**: Seamless terminal AI runner that requires no API keys, providing instant answers and shell one-liners.

52. **`gorilla-cli`**
    - **Repository/Command**: `gorilla-llm/gorilla-cli` / `gorilla`
    - **License**: Apache 2.0
    - **Description**: Generates accurate CLI invocations with complex arguments across 1,500+ CLI tools (AWS, GCP, Docker, Kubernetes).

53. **`ask` (Ask CLI)**
    - **Repository/Command**: `privatenumber/ask` / `ask`
    - **License**: MIT
    - **Description**: Natural language question answering directly from your command prompt with interactive execution confirmation.

54. **`ai-cli`**
    - **Repository/Command**: `abhigs98/ai-cli` / `ai`
    - **License**: MIT
    - **Description**: Terminal utility providing instant conversion of natural language phrases into POSIX shell commands.

55. **`how2` (AI Edition)**
    - **Repository/Command**: `santinic/how2` / `how2`
    - **License**: MIT
    - **Description**: StackOverflow and AI-assisted terminal lookup tool for quick command-line instructions.

56. **`cmd-gpt`**
    - **Repository/Command**: `cmd-gpt/cmd-gpt` / `cmd-gpt`
    - **License**: MIT
    - **Description**: Interactive CLI assistant that translates questions into verified bash scripts and provides line-by-line breakdowns.

57. **`bito` (Bito CLI)**
    - **Repository/Command**: `gitbito/bito-cli` / `bito`
    - **License**: Proprietary
    - **Description**: Developer terminal automation tool for generating unit tests, code explanations, and security review checks.

58. **`clai` (Command Line AI by IBM Research)**
    - **Repository/Command**: `ibm/clai` / `clai`
    - **License**: Apache 2.0
    - **Description**: Research platform bringing AI intelligence directly to Bash plugins and subroutines.

59. **`navi` + AI**
    - **Repository/Command**: `denisidoro/navi` / `navi`
    - **License**: Apache 2.0
    - **Description**: Interactive cheatsheet tool for command-line syntax with AI-assisted cheatsheet authoring.

60. **`butterfish`**
    - **Repository/Command**: `bakks/butterfish` / `butterfish`
    - **License**: MIT
    - **Description**: Terminal wrapper that embeds LLMs directly into standard ptys, offering inline autosuggestions as you type.

61. **`shell-genie`**
    - **Repository/Command**: `游-boy/shell-genie` / `shell-genie`
    - **License**: MIT
    - **Description**: Python CLI to translate natural language wishes directly into shell commands with explain-first safe execution.

62. **`zsh-ai-commands`**
    - **Repository/Command**: `zsh-users/zsh-ai-commands` / `zsh-ai`
    - **License**: MIT
    - **Description**: ZSH plugin that binds hotkeys to trigger instant AI command completion in the current terminal prompt buffer.

63. **`bash-ai`**
    - **Repository/Command**: `bash-ai/bash-ai` / `bash-ai`
    - **License**: MIT
    - **Description**: Standalone Bash function suite for querying AI models and capturing shell history for error self-healing.

64. **`ai-sh`**
    - **Repository/Command**: `alexstroukov/ai-sh` / `ai-sh`
    - **License**: MIT
    - **Description**: Interactive shell helper that inspects previous command exit codes and automatically proposes fixes.

65. **`prompt-cli`**
    - **Repository/Command**: `prompt-cli/prompt` / `prompt`
    - **License**: MIT
    - **Description**: Fast templated prompt runner that injects Git repository metadata into prompt templates from stdin.

---

### 2.4 Neovim, Emacs & Terminal Editor Agent Plugins (66–80)

66. **`avante.nvim`**
    - **Repository/Command**: `yetone/avante.nvim`
    - **License**: Apache 2.0
    - **Description**: Cursor-like AI experience inside Neovim. Features multi-file sidebar agents, inline diff application, and tree-sitter context parsing.

67. **`codecompanion.nvim`**
    - **Repository/Command**: `olimorris/codecompanion.nvim`
    - **License**: Apache 2.0
    - **Description**: LLM-powered coding companion for Neovim with chat buffers, inline code generation, variables context injection, and tool calling.

68. **`gp.nvim` (GPT Powers for Neovim)**
    - **Repository/Command**: `Robitx/gp.nvim`
    - **License**: MIT
    - **Description**: Fast, minimalist Neovim plugin for AI chat sessions, code rewrites, completions, and visual selection transformations.

69. **`llm.nvim`**
    - **Repository/Command**: `huggingface/llm.nvim`
    - **License**: Apache 2.0
    - **Description**: Hugging Face's official Neovim plugin for ultra-fast inline code completion powered by local or remote FIM models.

70. **`gen.nvim`**
    - **Repository/Command**: `David-Kunz/gen.nvim`
    - **License**: MIT
    - **Description**: Lightweight Neovim plugin designed specifically for querying local Ollama instances and applying text operations.

71. **`chatgpt.nvim`**
    - **Repository/Command**: `jackMort/ChatGPT.nvim`
    - **License**: Apache 2.0
    - **Description**: Full-featured ChatGPT and GPT-4 integration inside Neovim with interactive popup windows and diff views.

72. **`copilot.vim` / `copilot.lua`**
    - **Repository/Command**: `zbirenbaum/copilot.lua` / `github/copilot.vim`
    - **License**: MIT / Proprietary
    - **Description**: Official and high-performance Lua-native GitHub Copilot clients for Vim and Neovim.

73. **`minuet-ai.nvim`**
    - **Repository/Command**: `milanglacier/minuet-ai.nvim`
    - **License**: Apache 2.0
    - **Description**: High-performance multi-provider completion engine supporting Claude 3.5, OpenAI, Gemini, and Ollama in Neovim.

74. **`ollama.nvim`**
    - **Repository/Command**: `nomnivore/ollama.nvim`
    - **License**: MIT
    - **Description**: Neovim interface for managing and prompting local Ollama models with pre-configured prompts for code review and refactoring.

75. **`nvim-treesitter-ai`**
    - **Repository/Command**: `nvim-treesitter-ai/plugin`
    - **License**: MIT
    - **Description**: Syntactically aware prompt generation that extracts relevant function scopes and AST context directly from Neovim.

76. **`gptel` (Emacs)**
    - **Repository/Command**: `karthink/gptel`
    - **License**: GPL-3.0
    - **Description**: Seamless, fast LLM client for GNU Emacs supporting multiple LLM backends with org-mode integration.

77. **`copilot.el` (Emacs)**
    - **Repository/Command**: `copilot-emacs/copilot.el`
    - **License**: GPL-3.0
    - **Description**: Native GitHub Copilot client for Emacs with ghost-text suggestions and completion triggers.

78. **`ellama` (Emacs)**
    - **Repository/Command**: `s-kostyaev/ellama`
    - **License**: GPL-3.0
    - **Description**: Emacs client for Ollama enabling local LLM-assisted coding, translation, and text refactoring directly within buffers.

79. **`aide.nvim`**
    - **Repository/Command**: `aide-dev/aide.nvim`
    - **License**: MIT
    - **Description**: Neovim terminal harness connecting editor buffers directly to autonomous CLI agents like Aider and OpenCode.

80. **`helix-ai` (Helix AI Companion)**
    - **Repository/Command**: `helix-ai/helix-ai`
    - **License**: MIT
    - **Description**: IPC daemon and CLI companion bringing AI prompt transforms and inline code completions to the Helix modal editor.

---

### 2.5 Code Review, Diff Analysis & Git Automation CLIs (81–95)

81. **`pr-agent` (Qodo PR-Agent)**
    - **Repository/Command**: `qodo-ai/pr-agent` / `pr-agent`
    - **License**: Apache 2.0
    - **Description**: Autonomous AI agent for automated PR reviews, description generation, question answering, and code improvement suggestions.

82. **`coderabbit-cli` (CodeRabbit CLI)**
    - **Repository/Command**: `coderabbitai/coderabbit-cli` / `coderabbit`
    - **License**: Proprietary / Freemium
    - **Description**: Command-line tool for running local CodeRabbit AI code reviews, AST security checks, and line-by-line feedback before pushing code.

83. **`git-review` (Git Review AI)**
    - **Repository/Command**: `git-review/ai-cli` / `git-review`
    - **License**: MIT
    - **Description**: Reviews uncommitted git diffs or staged changes in your terminal, identifying logic bugs and security flaws.

84. **`git-commitgpt`**
    - **Repository/Command**: `appleboy/git-commitgpt` / `git-commitgpt`
    - **License**: MIT
    - **Description**: CLI utility that reads `git diff` and generates clean Conventional Commit messages automatically.

85. **`opencommit`**
    - **Repository/Command**: `di-sukharev/opencommit` / `opencommit`
    - **License**: MIT
    - **Description**: Popular AI git commit message generator supporting custom translation, emoji conventions, and pre-commit hooks.

86. **`aicommits`**
    - **Repository/Command**: `Nutlope/aicommits` / `aicommits`
    - **License**: MIT
    - **Description**: Lightweight CLI that writes commit messages for you using AI based on staged git changes.

87. **`cz-git` + AI**
    - **Repository/Command**: `Zhengqbbb/cz-git` / `cz`
    - **License**: MIT
    - **Description**: Interactive Commitizen CLI adapter with built-in AI assistance for crafting consistent commit metadata.

88. **`git-explain`**
    - **Repository/Command**: `git-explain/git-explain` / `git-explain`
    - **License**: MIT
    - **Description**: Terminal tool that breaks down complex git merge conflicts and commit diffs into plain-English explanations.

89. **`reviewdog` + AI**
    - **Repository/Command**: `reviewdog/reviewdog` / `reviewdog`
    - **License**: MIT
    - **Description**: Automated code review linter reporter that pipes LLM-generated code reviews into GitHub/GitLab PR annotations.

90. **`diff-gpt`**
    - **Repository/Command**: `diff-gpt/diff-gpt` / `diff-gpt`
    - **License**: MIT
    - **Description**: Terminal utility that consumes patch files and outputs semantic explanations and risk assessment matrices.

91. **`commit-ai`**
    - **Repository/Command**: `commit-ai/cli` / `commit-ai`
    - **License**: MIT
    - **Description**: Rust-based CLI that integrates with Git hooks to automatically generate and validate commit descriptions.

92. **`git-sage`**
    - **Repository/Command**: `git-sage/sage` / `git-sage`
    - **License**: Apache 2.0
    - **Description**: Git assistant that offers intelligent conflict resolution strategies and automated branch summaries.

93. **`sourcery-cli` (Sourcery)**
    - **Repository/Command**: `sourcery-ai/sourcery-cli` / `sourcery`
    - **License**: Proprietary / Freemium
    - **Description**: Automated refactoring CLI for Python, TypeScript, and JavaScript that suggests instant code quality improvements.

94. **`refactor-ai`**
    - **Repository/Command**: `refactor-ai/refactor` / `refactor-ai`
    - **License**: MIT
    - **Description**: Command-line engine that applies architectural refactoring patterns to source trees based on natural language prompts.

95. **`code-analyzer-cli`**
    - **Repository/Command**: `code-analyzer/cli` / `code-analyzer`
    - **License**: Apache 2.0
    - **Description**: Static analysis enhancer that combines linters (ESLint, Ruff, Clippy) with AI reasoning to filter false positives.

---

### 2.6 Multi-Agent Orchestration & SWE Benchmark CLI Engines (96–115)

96. **`autogen` (AutoGen CLI / Studio CLI)**
    - **Repository/Command**: `microsoft/autogen` / `autogenstudio`
    - **License**: MIT
    - **Description**: Microsoft's multi-agent framework for orchestrating collaborative conversations among specialized coding agents.

97. **`crewai` (CrewAI CLI)**
    - **Repository/Command**: `crewAIInc/crewAI` / `crewai`
    - **License**: MIT
    - **Description**: CLI tooling for scaffolding, running, and managing role-playing autonomous agent teams (e.g. Researcher, Coder, QA).

98. **`chatdev` (ChatDev)**
    - **Repository/Command**: `OpenBMB/ChatDev` / `chatdev`
    - **License**: Apache 2.0
    - **Description**: Virtual software company CLI where simulated CEO, CTO, Programmer, and Tester agents design and implement complete software products.

99. **`metagpt` (MetaGPT)**
    - **Repository/Command**: `geekan/MetaGPT` / `metagpt`
    - **License**: MIT
    - **Description**: Multi-agent framework that takes one-line requirements and outputs user stories, competitive analysis, data structures, and code.

100. **`dspy` (DSPy CLI)**
     - **Repository/Command**: `stanfordnlp/dspy` / `dspy`
     - **License**: MIT
     - **Description**: Stanford's framework for optimizing and compiling LM pipelines rather than manual prompt engineering.

101. **`langgraph-cli`**
     - **Repository/Command**: `langchain-ai/langgraph-cli` / `langgraph`
     - **License**: MIT
     - **Description**: Command-line runner and development server for cyclical, graph-based agent workflows and coding assistants.

102. **`smolagents` (Smolagents by Hugging Face)**
     - **Repository/Command**: `huggingface/smolagents` / `smolagents`
     - **License**: Apache 2.0
     - **Description**: Lightweight agent library where actions are written directly in Python code snippets rather than raw JSON strings.

103. **`openmanus`**
     - **Repository/Command**: `mannaandpoem/OpenManus` / `openmanus`
     - **License**: Apache 2.0
     - **Description**: Open-source, agentic execution CLI capable of autonomous browser interaction, tool execution, and code synthesis.

104. **`swarms-cli` (Swarms)**
     - **Repository/Command**: `kyegomez/swarms` / `swarms`
     - **License**: MIT
     - **Description**: High-throughput orchestration CLI for deploying swarms of coding agents in parallel.

105. **`agent-bench`**
     - **Repository/Command**: `THUDM/AgentBench` / `agentbench`
     - **License**: Apache 2.0
     - **Description**: Benchmarking and execution harness for evaluating autonomous coding agents across OS, DB, and bash environments.

106. **`swe-bench-cli`**
     - **Repository/Command**: `princeton-nlp/SWE-bench` / `swe-bench`
     - **License**: MIT
     - **Description**: The gold-standard evaluation harness for autonomous software engineering models solving real GitHub repository issues.

107. **`camel` (CAMEL Multi-Agent)**
     - **Repository/Command**: `camel-ai/camel` / `camel`
     - **License**: Apache 2.0
     - **Description**: Communicative agent framework for exploring collaborative multi-agent code design and automated debugging.

108. **`babyagi` (BabyAGI CLI)**
     - **Repository/Command**: `yoheinakajima/babyagi` / `babyagi`
     - **License**: MIT
     - **Description**: Autonomous task-driven CLI agent system that creates, prioritizes, and executes software engineering sub-tasks.

109. **`gpt-researcher-cli`**
     - **Repository/Command**: `assafelovic/gpt-researcher` / `gpt-researcher`
     - **License**: Apache 2.0
     - **Description**: Autonomous research CLI agent that scours API docs, technical papers, and GitHub repos to produce technical specs.

110. **`gorilla-runner`**
     - **Repository/Command**: `gorilla-llm/gorilla-runner`
     - **License**: Apache 2.0
     - **Description**: Headless test harness for evaluating model API calling accuracy against thousands of real REST and SDK APIs.

111. **`claude-engineer`**
     - **Repository/Command**: `Drakident/claude-engineer`
     - **License**: MIT
     - **Description**: Terminal agent leveraging Claude's multi-step tool use to manage file systems, edit source code, and run tests.

112. **`jarvis-cli`**
     - **Repository/Command**: `microsoft/JARVIS` / `jarvis`
     - **License**: MIT
     - **Description**: Microsoft's collaborative agent CLI linking foundation LLMs with multimodal specialist models to complete coding tasks.

113. **`code-interpreter-cli`**
     - **Repository/Command**: `shroominic/codebox-api` / `codebox`
     - **License**: MIT
     - **Description**: Sandboxed Python and Bash REPL execution CLI for running model-generated code in isolated containers.

114. **`evalplus-cli`**
     - **Repository/Command**: `evalplus/evalplus` / `evalplus`
     - **License**: Apache 2.0
     - **Description**: Rigorous evaluation harness for testing code generation robustness with automated test case synthesis.

115. **`instructcode`**
     - **Repository/Command**: `instructcode/cli` / `instructcode`
     - **License**: Apache 2.0
     - **Description**: Instruction-following code transformation CLI for large-scale automated code migrations and lint remediation.

---

## Section 3: Feature & Architecture Comparison Matrix

| Category | Representative Tools | Primary Interaction | Typical Context Mechanism | Best Used For |
| :--- | :--- | :--- | :--- | :--- |
| **Native AI IDEs** | Cursor, Windsurf, Trae | Visual Desktop App | AST Indexing + Vector DB | Whole-project multi-file development & daily authoring |
| **Open-Source IDEs** | PearAI, Void, Melty | Visual Desktop App | Local Context Engine | Privacy-first workflows with self-hosted models |
| **High-Perf / Term IDEs**| Zed AI, Warp, Wave | Rust GUI / GPU Term | CRDT Context Panels | Ultra-low latency, real-time multiplayer, shell workflows |
| **Web-Native Agent IDEs**| Devin, Bolt.new, v0 | Browser Cloud Runtime| Sandboxed Virtual Machine | Full-stack scaffolding, web apps, autonomous issues |
| **Terminal Coding Agents**| Pi, OpenCode, Aider, Claude Code | TUI / REPL / Terminal | AST Repo Maps / MCP Tools | Focused feature additions, bug fixing, test loops |
| **Shell AI Pipers** | Shell-GPT, Mods, llm, aichat | POSIX Pipeline / Stdout | Stdin Stream Buffer | Ad-hoc one-liners, log transformation, CLI querying |
| **Neovim / Editor Agents**| Avante.nvim, CodeCompanion | Editor Buffers / Lua | Tree-sitter AST | Seamless AI inside keyboard-driven modal workflows |
| **Git / PR Automators** | PR-Agent, CodeRabbit, OpenCommit | Git Hooks / GitHub Actions | Git Diff Buffers | Code review gating, changelog authoring, commit hygiene |
| **Multi-Agent Engines** | AutoGen, MetaGPT, SWE-agent | CLI Process Orchestrator | Shared Multi-Agent Memory | Complex multi-role software simulations & SWE benchmarks |

---

## Summary & Recommendations by Workflow

- **For Full-Time Interactive GUI Coding**: Choose **Cursor** or **Windsurf** for standard visual development, or **Zed AI** for high-speed performance.
- **For Terminal-First Developers & Git Pair Programming**: Choose **Aider** for git auto-commits, **Claude Code** for multi-step agentic execution, **Pi** for modular hackability, or **OpenCode** for dual Plan/Build terminal modes.
- **For Neovim Enthusiasts**: Use **Avante.nvim** or **CodeCompanion.nvim** alongside **Ollama** or **Anthropic API**.
- **For Headless CI/CD & Automated Code Review**: Integrate **Qodo PR-Agent** or **CodeRabbit CLI** into repository webhooks.
- **For Shell Scripting & Pipe Automation**: Pair **Mods** or **Shell-GPT (`sgpt`)** with unix utilities (`grep`, `awk`, `curl`).
- **For 100% Offline & Private Workflows**: Run **Ollama** with **Qwen2.5-Coder / DeepSeek-Coder** connected to **Void Editor** or **Aider (`--model ollama/...`)**.
