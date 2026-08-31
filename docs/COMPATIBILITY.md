# All-Global-Plugin — Cross-Tool Compatibility Matrix

> **Date:** 2026-09-01 | **Source catalog:** [`ai_coding_tools_and_ides_catalog.md`](../ai_coding_tools_and_ides_catalog.md) (30+ AI IDEs, 110+ AI CLIs)
> **Purpose:** map every catalog tool to a concrete integration path with agp — which are synced by adapters today, which consume skills without an adapter, which need format verification before an adapter can be built, and which have no local integration surface at all.

Statuses:

- **synced** — an agp sync target exists and is covered by tests; running `agp sync` wires the tool.
- **bridge** — the tool reads the `~/.agents/skills` bridge (or SKILL.md conventions) directly; junctions created by the bridge adapter make skills available with zero per-tool config.
- **documented** — no adapter needed (or possible) for the tool's core function, but skills/plugins from this catalog still feed it (e.g., via MCP servers fanned out to its config, or via files it already reads).
- **needs-verification** — integration is plausible but the config format/semantics are unverified; adapter design sketched, code deferred.
- **not-applicable** — no local skill/MCP config surface (model runners, web builders, benchmark engines); nothing for agp to integrate.

---

## 1. Synced targets (10 + MCP fan-out family)

These tools have first-class adapters. "Adoption gate" means agp writes only when the tool's config file/dir already exists on the machine — fresh installs produce no drift noise.

| Tool | Catalog entry | Config surface | Mechanism | Status |
|---|---|---|---|---|
| Claude Code | §2.1 #11 | `~/.claude/settings.json` | `extraKnownMarketplaces` + `enabledPlugins` merge, `source:"agp"` markers, CLAUDE_CONFIG_DIR-aware | synced |
| opencode | §2.1 #2 | `~/.config/opencode/opencode.jsonc` | `// agp:skills-start/end` managed marker block with `skills.paths`, XDG-aware | synced |
| Gemini CLI | §2.2 #27 | `~/.gemini/skills/` + `~/.gemini/antigravity-cli/skills/` | per-skill junctions, dual-path (`name@legacy`/`name@antigravity`) | synced |
| Qwen CLI | §2.2 | `~/.qwen/skills/` | per-skill junctions | synced |
| Codex CLI | §2.2 #12 | `~/.codex/config.toml` | `# agp:mcp-start/end` managed TOML marker block, `[mcp_servers.<name>]` tables, CODEX_HOME-aware | synced (Phase 3 Part 2) |
| Windsurf | §1.1 #2 | `~/.codeium/windsurf/mcp_config.json` | JSON `mcpServers` merge, `source:"agp"` field | synced (Phase 3 Part 2) |
| Amazon Q CLI (`q`) | §2.2 #28 | `~/.aws/amazonq/mcp.json` | JSON `mcpServers` merge, `source:"agp"` field | synced (Phase 3 Part 2) |
| Cursor (MCP) | §1.1 #1 | `~/.cursor/mcp.json` | JSON `mcpServers` merge, `source:"agp"` field | synced |
| MCP fan-out family | — | cursor + gemini + qwen settings + windsurf + q (5 JSON files) | one `collectMcpEntries` pass, per-target `syncJsonTarget` | synced |
| Bridge consumers | see §2 | `~/.agents/skills/` | per-skill NTFS junctions; any tool that reads that dir works | synced |

Tool selector values on the CLI: `agp sync --tool bridge|claude|opencode|gemini|qwen|mcp|codex|windsurf|q`. The `mcp` key keeps the legacy trio (`cursor`, `gemini`, `qwen`); `windsurf` and `q` are separate keys so each target can be synced in isolation.

---

## 2. Bridge consumers — tools that read `~/.agents/skills` (no per-tool adapter needed)

The bridge adapter creates a junction per skill in `~/.agents/skills`. Tools that discover skills from that directory (or whose community conventions point there) get every active plugin's skills automatically:

| Tool | Catalog entry | Notes |
|---|---|---|
| Codex CLI (skills) | §2.2 #12 | skills via bridge; MCP via TOML adapter (§1) |
| Warp | §1.1 #13 | bridge convention adopter |
| Copilot / Cursor (skills) | §2.2 #26, §1.1 #1 | bridge junctions; Cursor's MCP config separately synced |
| Pi coding agent | §2.1 #1 | reads SKILL.md conventions + skills dirs |
| goose | §2.1 #4 | MCP-first agent — consumes skills through MCP servers fanned out from plugin `.mcp.json` |
| Aider | §2.1 #3 | no skills surface of its own; benefits from MCP fan-out where plugins ship `.mcp.json` |
| crush | §2.1 #22 | consumes `~/.agents/skills` bridge; its own MCP config shape unverified (see §3) |

---

## 3. Needs-verification — designs sketched, adapters deferred

| Tool | Catalog entry | Candidate config surface | Why deferred |
|---|---|---|---|
| Zed | §1.3 #12 | `~/.config/zed/settings.json` → `context_servers` | JSON shape for MCP servers unverified; settings.json rejects unknown fields/schema risk; no documented ownership field — registry approach needed |
| Crush MCP | §2.1 #22 | `~/.config/crush/crush.json` → `mcp_servers` | key naming and entry shape unverified; needs a format probe against a live install |
| Amazon Q IDE (VS Code/JetBrains ext) | §1.5 #32 | per-IDE config paths | distinct from the `q` CLI config synced in §1; IDE-side config location/shape unverified |
| JetBrains AI Assistant | §1.5 #29 | per-IDE (`IntelliJ`, `PyCharm`, ...) config paths | no documented global skills/MCP config path; per-IDE variance |
| Wave Terminal | §1.3 #14 | embedded assistant config | no documented skills/MCP surface |
| Trae | §1.1 #3 | VS Code-fork conventions | MCP config location undocumented |
| PearAI / Void | §1.2 #6/#7 | VS Code-fork conventions | community conventions may follow bridge or `.vscode` mcp.json — unverified |

**Recommended next steps** for each: (a) install the tool, (b) locate its MCP/skills config by running it once and watching filesystem writes, (c) verify entry shape, (d) if JSON `mcpServers`-shaped → add a `targetFile()` entry (Windsurf pattern, ~10 lines); if marker-block-shaped → add a Codex-style adapter; if registry/ownership fields are absent → design an ownership sidecar (e.g., `.agp-managed.json` next to the config) before writing.

---

## 4. Not-applicable — no local integration surface

One line each; these tools have no local skills/MCP config file that agp could own:

- **Model runners/servers** (§2.2 #35–45): `ollama`, `llama-cli`, `vllm`, `replicate`, `together`, `fireworks`, `groq`, `huggingface-cli`, `openrouter`, `wrangler ai`, `cerebras` — they serve models; agp is a skills/plugins manager.
- **Web-native builders** (§1.4 #17–25): Devin, Replit Agent, Bolt.new, Lovable, v0, Marblism, Create.xyz, Magic.dev, GitHub Spark — cloud sandboxes; no local config surface.
- **Benchmark/orchestration engines** (§2.6): SWE-bench, AutoGen, CrewAI, ChatDev, MetaGPT, DSPy, LangGraph, smolagents, OpenManus, Swarms, AgentBench, CAMEL, BabyAGI, gpt-researcher, gorilla-runner, evalplus, instructcode — harnesses that *consume* models, not tools that load local skills.
- **Shell pipers / one-liner utilities** (§2.3): `sgpt`, `mods`, `llm`, `aichat`, `tgpt`, `gorilla-cli`, `ask`, `ai-cli`, `how2`, `cmd-gpt`, `bito`, `clai`, `navi`, `butterfish`, `shell-genie`, `zsh-ai-commands`, `bash-ai`, `ai-sh`, `prompt-cli` — stdin/stdout transformers with no persistent skills/config file; nothing to sync.
- **Editor completion plugins** (§2.4): `copilot.vim/lua`, `copilot.el`, `llm.nvim`, `minuet-ai.nvim`, `ollama.nvim`, `gen.nvim`, `gp.nvim`, `chatgpt.nvim`, `codecompanion.nvim`, `gptel`, `ellama` — configured per-plugin in editor init files, not a global skills dir. (Exception path: Neovim users can point `avante.nvim`/`codecompanion.nvim` MCP config at bridge-managed files manually.)
- **Git/PR automators** (§2.5): PR-Agent, CodeRabbit, opencommit, aicommits, cz-git, git-review, sourcery, reviewdog etc. — operate on diffs/PRs, no skills surface.
- **Enterprise analysis suites** (§1.5 #26–28, #31): CodeSee, CodeScene, Tabnine Enterprise, Cody — platform-specific; no documented global skills file.

---

## 5. Compatibility issues found (research findings)

1. **MCP server-name collisions across plugins.** `collectMcpEntries` iterates active plugins in manifest order; two plugins shipping the same server name resolve last-wins, silently. **Mitigation today:** rename upstream or disable one plugin (`agp disable`). **Recommended fix (Phase 4):** warn on collision at `sync` time and add a manifest-level `mcp_server_prefix` option.
2. **Codex TOML env semantics.** Codex expects `env = { KEY = "..." }` inline tables with string values only; `${VAR}` refs are emitted as literal strings (Codex performs its own env expansion at load). Non-stdio servers (`type:"http"`/`url`) are skipped with a warning — the TOML target is stdio-only in v1.
3. **Windows path separators.** All emitted paths are forward-slash (`\` → `/`) repo-wide; junctions remain NTFS junctions via `fs.symlinkSync(..., 'junction')`. Verified in the claude adapter (`pluginDest(...).replace(/\\/g, '/')`) and opencode `desired` paths.
4. **Zed settings.json constraints.** No `//` comments allowed (JSON, not JSONC) and unknown fields risk schema rejection — the marker-block technique cannot be transplanted; an ownership sidecar registry is the viable design, deferred pending format verification.
5. **Adoption gating is a feature, not a gap.** Fresh machines with no `~/.codex`, `~/.codeium`, `~/.aws/amazonq`, `~/.cursor` etc. produce no drift noise — doctor only reports tools whose configs exist. Documented so it's not mistaken for missing coverage.
6. **Per-user enable/disable interplay.** A disabled plugin's skills and MCP servers never sync (active-set rule), so a disabled plugin with colliding skill names (e.g. ecc's `design-system` vs ui-ux-pro-max) cannot collide in any target — this is load-bearing for the uniqueness gate's active-set-awareness.
7. **Secret hygiene is enforced at emission.** Literal env values (8+ char non-`${VAR}` strings) are skipped with warnings by `collectMcpEntries`; the Codex TOML adapter inherits the same filter. No secret ever lands in a synced config.
8. **`q` key naming.** Amazon Q's tool key is `q` (matching its CLI command), not `amazonq` — the CLI `--tool` value and `paths.mjs` DEFAULTS key are both `q`.

---

## 6. Recommended solutions / next steps

- **Near-term (Phase 4):** MCP collision warning + `mcp_server_prefix`; Codex streamable-http table support once Codex documents its TOML semantics for URLs; CI smoke check that every `DEFAULTS` key has a matching `TOOL_KEYS` entry (prevents wiring drift between paths.mjs and sync.mjs).
- **Verification backlog (each unlocks an adapter):** Zed `context_servers` shape → registry-based ownership; Crush `mcp_servers` shape; Trae/PearAI/Void MCP config location (likely VS Code-fork `mcp.json` conventions); JetBrains global AI config path; Amazon Q IDE extension config.
- **Keep as-is:** bridge-first strategy covers the long tail of skills-consumers without per-tool adapters; not-applicable categories stay out of scope by design.
