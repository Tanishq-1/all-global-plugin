# All-Global-Plugin — Unified Cross-Tool Plugin Management Architecture

**Date:** 2026-08-26
**Status:** Approved design (pending implementation plan)
**Repo:** `D:\Agentic coding\Project\All-Global-Plugin` (new, standalone test lab)

---

## 1. Goals & Non-Goals

### Goals
1. Single organized home for AI agent skills/plugins across development categories
   (`_universal`, `fullstack`, `frontend`, `backend`, `mobile`, `cloud`, `salesforce`),
   with official-vs-OSS tier separation inside each category.
2. One vendored copy of every plugin (SKILL.md-native), wired automatically into every
   major AI CLI/app via per-tool adapters.
3. Automated maintenance: scheduled updates, validation gating, changelog capture,
   and instant rollback (per-plugin or whole-batch) when an update breaks something.
4. Portable by construction: zero usernames/hardcoded paths in any committed file.

### Non-Goals (v1)
- Publishing this repo as a public marketplace (hub-and-spoke `dist/` generation deferred).
- Converting Claude-specific agents/commands into other tools' agent formats (skills-only content sync; commands stay Claude-side via the claude adapter).
- Supporting GLM/DeepSeek first-party CLIs (none exist with own skill systems; they ride transitively).

### Relationship to existing repos
- `claude-global-plugins` remains in production, untouched. This new repo is an
  independent lab; proven patterns (manifest-driven CLI, atomic swap, validation
  gating, settings merge) are ported, not shared. Migration/retirement of the old
  repo is a future decision after parity is demonstrated.

---

## 2. Research Foundation (2026-08)

### Compatibility matrix (verified against vendor docs + directories)
The Agent Skills open standard (`SKILL.md`, agentskills.io, published by Anthropic
Dec 2025) is read natively by 68+ agents:

| Tool | Skills path(s) | Notes |
|---|---|---|
| Claude Code | `~/.claude/skills/`, plugin marketplaces | reference implementation; `CLAUDE_CONFIG_DIR` relocates |
| OpenAI Codex | `~/.codex/skills/`, `~/.agents/skills/` | own marketplace system since v0.128 (`.agents/plugins/marketplace.json`) |
| Gemini CLI / Antigravity | `~/.gemini/skills/`, `~/.agents/skills/` alias | extensions bundle `skills/` |
| Qwen Code | `~/.qwen/skills/` | installs Claude marketplaces directly; no `.agents` alias yet (upstream issue #7394) |
| Grok CLI | `~/.grok/skills/`, `[skills] paths` in config.toml, `~/.agents/skills/` | auto-reads Claude marketplaces/plugins zero-config |
| Cursor | `~/.cursor/skills/` | tolerates `.agents/` |
| Cline / Roo / Warp / Copilot / Goose / Amp / Kiro | mostly `~/.agents/skills/` or tool dir | see skill.md/agents table |
| opencode | `skills.paths` in `~/.config/opencode/opencode.jsonc` | XDG on all platforms incl. Windows |

**Consequence:** one universal bridge (`~/.agents/skills/`) + thin native adapters
covers the entire tool list. DeepSeek/GLM have no first-party CLI skill systems;
they consume these ecosystems transitively.

### Official marketplace facts
- `anthropics/claude-plugins-official`: 39 first-party plugins (12 LSP integrations),
  ~235 external vendor entries, 15 bundled external plugins (context7, github,
  playwright, terraform, …).
- Strongest cross-directory quality signals: superpowers, anthropics/skills,
  wshobson/agents, microsoft/azure-skills, forcedotcom/sf-skills,
  vercel-labs find-skills (~3M installs).

### Data hygiene rule
Directory-site star counts are mutually contradictory and inflated. Install counts
are tracked directionally in `INDEX.md` only; trust hierarchy
(official > vendor OSS > known-team OSS > viral solo > unproven) governs tiers.
Safety review of `hooks/`, `scripts/`, `.mcp.json` precedes any adoption regardless
of popularity.

### Category map (seed set)

| Category | Official tier | OSS/Vendor tier |
|---|---|---|
| `_universal` | skill-creator, code-review, commit-commands | superpowers, karpathy-skills, mattpocock-skills, prompts-chat, context7, vercel-labs/skills (find-skills) |
| `fullstack` | feature-dev, typescript-lsp, github | anthropics/skills |
| `frontend` | frontend-design, playground | ui-ux-pro-max-skill, greensock/gsap-skills, antfu/skills, shadcn-ui/ui |
| `backend` | pyright/jdtls/gopls/rust-analyzer LSPs, mcp-server-dev | supabase/agent-skills, prisma/skills, firebase/agent-skills, get-convex/agent-skills |
| `mobile` | swift-lsp, kotlin-lsp | expo/skills, flutter/agent-plugins, AvdLee/SwiftUI-Agent-Skill, callstackincubator/agent-skills, software-mansion/argent |
| `cloud` | aws-core, aws-serverless, deploy-on-aws, azure, terraform | microsoft/azure-skills, google/adk-docs, LukasNiessen/kubernetes-skill, terrashark |
| `salesforce` | agentforce-adlc | forcedotcom/sf-skills, forcedotcom/afv-library |

ECC excluded by policy (≈900 skills would flood session context). claude-mem
deferred (requires its npm background service).

---

## 3. Folder Structure & Naming

```
All-Global-Plugin/
├── universal-plugin/
│   ├── _universal/{official,oss}/
│   ├── fullstack/{official,oss}/
│   ├── frontend/{official,oss}/
│   ├── backend/{official,oss}/
│   ├── mobile/{official,oss}/
│   ├── cloud/{official,oss}/
│   ├── salesforce/{official,oss}/
│   └── _quarantine/                 # failed-validation clones; never synced
├── plugins.json                     # single source of truth (schema below)
├── state.json                       # auto-managed: version, upstream SHA, batch id
├── INDEX.md                         # human-readable catalog w/ descriptions, install counts
├── QUARANTINE.md                    # failure log: plugin, gate failed, reason
├── release-notes/<name>-<ts>.md     # upstream delta per update
├── scripts/                         # CLI + adapters
└── .github/workflows/maintain.yml   # weekly automation
```

Naming rules:
- Plugin folders: lowercase-kebab, matching upstream plugin id where one exists.
- Skill identity = `SKILL.md` frontmatter `name`; global uniqueness enforced at add/update time.
- Tier separation is physical (`official/` vs `oss/`); re-tiering only via CLI move (atomic manifest update).
- A plugin lives in exactly one category; cross-listing via metadata `also_relevant`, never duplication.
- `_quarantine/` holds clones that failed gates; visible, never synced.

---

## 4. Manifest Schema (plugins.json v2)

```jsonc
{
  "version": 2,
  "plugin_dir": "universal-plugin",
  "targets": {
    "claude":   { "settings_path": "~/.claude/settings.json" },
    "opencode": { "config_path": "~/.config/opencode/opencode.jsonc" },
    "bridge":   { "path": "~/.agents/skills" },
    "cursor":   { "path": "~/.cursor/skills" },
    "qwen":     { "path": "~/.qwen/skills" },
    "mcp": {
      "codex":    "~/.codex/config.toml",
      "cursor":   "~/.cursor/mcp.json",
      "gemini":   "~/.gemini/settings.json",
      "qwen":     "~/.qwen/settings.json"
    }
  },
  "plugins": [
    {
      "name": "superpowers",
      "category": "_universal",
      "tier": "oss",                          // official | oss
      "url": "https://github.com/obra/superpowers",
      "pin": null,                            // tag | SHA | null (= HEAD)
      "wrapper": false,                       // maintain local .claude-plugin overlay
      "skill_entry": null,                    // nested plugin dir override (e.g. prompts-chat → "plugins/claude/prompts.chat")
      "plugin_keys": ["superpowers@superpowers-dev"],   // claude enabledPlugins keys
      "marketplace_key": "superpowers-dev",             // claude extraKnownMarketplaces key
      "platforms": ["*"]                      // explicit list excludes tools; ["claude"] = claude-only
    }
  ]
}
```

### Portable path resolution
Resolver order: CLI flag → tool-specific env override (`CLAUDE_CONFIG_DIR`,
`XDG_CONFIG_HOME`) → `os.homedir()` expansion of leading `~/`.
No username ever appears in committed files. Non-standard layouts use an optional
gitignored `paths.local.json`.

Discoverability prose (descriptions, star/install counts, research URLs) lives in
generated `INDEX.md`, kept out of the machine-read manifest so validation stays strict.

---

## 5. Sync Engine & Adapters

Six adapters cover all supported tools:

| Adapter | Mechanism | Covers |
|---|---|---|
| bridge (default) | Per-skill NTFS junctions in `~/.agents/skills/<skill>` → vendored skill folders (no admin rights on Windows) | Codex, Gemini/Antigravity, Grok, Cline, Warp, Copilot |
| claude | Key-by-key merge of `extraKnownMarketplaces` + `enabledPlugins` into `~/.claude/settings.json` (.bak-\<ts\> backup first) | Claude Code (+ GLM via its endpoint) |
| opencode | Merge `skills.paths` array entries into `~/.config/opencode/opencode.jsonc` | opencode |
| cursor | Junctions into `~/.cursor/skills/` | Cursor |
| qwen | Junctions into `~/.qwen/skills/` | Qwen Code |
| mcp | Read each plugin's `.mcp.json`; emit normalized MCP config: opencode `mcp{}` object, `~/.codex/config.toml [mcp_servers.*]`, `~/.cursor/mcp.json`, Gemini/Qwen `settings.json mcpServers` | all tools' MCP wiring |

CLI: `sync --all | --tool T | --plugin N | --category C [--dry-run]`.
Idempotent; every run converges observed state to manifest-declared state.
Secrets: adapters write env-var references (`CONTEXT7_API_KEY` etc.), never literal keys.

Platform gating: `platforms: ["*"]` syncs everywhere; an explicit list restricts.
Claude-only plugins (hooks/commands-heavy) get `platforms: ["claude"]` automatically
at add time when they contain no SKILL.md skills.

---

## 6. Verification Gates

All four must pass before a plugin enters a category:

1. **Reachability** — `git ls-remote <url>` succeeds.
2. **Structure** — `.claude-plugin/marketplace.json` parses OR ≥1 `SKILL.md` with valid
   `name`+`description` frontmatter exists; declared skills/commands paths resolve.
3. **Uniqueness** — no skill-name collisions with already-imported skills.
4. **Safety inventory** — scan `hooks/`, `scripts/`, `.mcp.json`; executable content is
   flagged for manual review; hooks are never synced cross-tool by default.

Failures → `_quarantine/<name>/` + `QUARANTINE.md` entry (gate, reason, timestamp).
Non-git sources (claude.com/plugins pages without repos): documentation-only rows in
INDEX.md until a clonable URL is identified.

Atomic swap discipline (ported from claude-global-plugins v1): stage temp clone on same
volume → validate → rename-old/move-new → strip nested `.git` → re-validate → delete
retired folder only after post-swap validation passes; reverse on any failure.

---

## 7. Updates, Rollback & Automation

CLI verbs:
```
update   --all | --plugin N | --category C [--dry-run] [--pin TAG|SHA]
sync     --all | --tool T | --plugin N | --category C [--dry-run]
rollback NAME [--to SHA]          # surgical per-plugin revert via git history
rollback --batch last | --batch <id>
doctor   [--fix]                  # structure checks + drift detection (manifest ↔ tool configs)
status                            # table: version, SHA, behind-by-N, platforms
setup    [--dry-run]              # idempotent tool-config wiring from manifest
add NAME --url U --category C --tier T [--marketplace K] [--wrapper]
remove NAME                       # disable in configs; folder retained until explicit delete
help
```

Batch safety net: every automated run ends by pushing tag `batch/<utc-timestamp>`.
`rollback --batch last` restores all plugins to pre-pull state instantly; per-plugin
rollback remains available. `state.json` records per-plugin pre/post SHAs per batch.

Weekly GitHub Actions (`maintain.yml`):
cron → doctor --fix → update --all → sync --all → changelog → status → commit → push → tag batch.
A failing plugin aborts only itself; the run continues. No force-push, ever.
No third-party bots (Dependabot-class tools don't understand vendored plugin trees).

---

## 8. Error Handling & Safety Guarantees

- Config files are never overwritten wholesale: key-by-key merges only; `.bak-<ts>` before mutation.
- Clone/swap failures leave the previous folder intact (atomic swap + rollback paths).
- Quarantined plugins are unreachable by every adapter by construction (not in manifest-synced sets).
- Rollback never touches unrelated plugins (one commit per plugin; batch tags are annotated, not moves).
- Windows specifics: junctions (`New-Item -ItemType Junction`) require no elevation; same-volume staging preserves atomicity.

## 9. Testing Strategy

- Unit tests for: manifest parse/validate, path resolver (env overrides), merge engines (JSONC/TOML), junction create/remove idempotency.
- Integration tests run against temp HOME dirs (fixture configs); assert each adapter produces exact expected file diffs.
- Dry-run snapshot tests: `update --dry-run` and `sync --dry-run` outputs stable given fixed fixtures.
- CI smoke: validate manifest + all vendored structures + uniqueness on every push.

## 10. Milestones

1. **M1 Skeleton**: repo init, folder tree, manifest schema + validator, path resolver.
2. **M2 Core CLI**: add/update/status/doctor with gates + atomic swap (ported patterns).
3. **M3 Seed catalog**: import seed-set plugins per category map; INDEX.md generation.
4. **M4 Adapters**: bridge, claude, opencode, cursor, qwen, mcp; sync verb; drift doctor.
5. **M5 Rollback**: batch tags, rollback verbs, state.json batch tracking.
6. **M6 Automation**: weekly workflow, changelog, release-notes.
7. **M7 Parity check**: side-by-side vs claude-global-plugins; decide migration.
