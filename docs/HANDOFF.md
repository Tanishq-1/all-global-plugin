# All-Global-Plugin — Session Handoff

> **Purpose:** This document captures everything another AI agent needs to pick up this project and continue where we left off. It covers project state, architecture decisions, completed work, interrupted work, and future tasks.

---

## 1. Project Overview

**All-Global-Plugin** is a unified cross-tool AI plugin management system. It vendors SKILL.md-based plugins into categorized folders, syncs them automatically into 10+ AI CLI tools via adapters, and supports per-user enable/disable customization.

**Repo:** `D:\Agentic coding\Project\All-Global-Plugin`  
**Current branch:** `main`  
**HEAD:** `0861d14` (feat: spec Phase 2 — customize layer, adapter corrections, Antigravity paths)  
**Node requirement:** `>=21.0.0` (test-runner glob support; Windows `core.longpaths`)  
**Runtime deps:** Zero  
**Test command:** `node --test "tests/**/*.test.mjs"`  

---

## 2. Architecture Decisions (Key)

### Core Design
- **Canonical vendored SKILL.md-native clones** → universal `~/.agents/skills/` junction bridge + thin native adapters per tool
- One **manifest** (`plugins.json`) = source of truth
- **`local.json`** (gitignored) holds per-user enable/disable preferences
- **`local.json` never mutates `plugins.json`**

### Active-set Rule
`local.plugins[name].enabled` → else manifest's `enabled_by_default` (absent = true)

### Ownership Safety
Only junctions whose target resolves inside the repo are ever removed; plain directories never touched; `.bak-<ts>` backups before config mutations.

### Adoption-gating
Config-file adapters (opencode, codex, cursor, qwen, gemini settings) only write when the target file already exists. Junction roots always created.

### MCP Secrets
Emitted as env-var references only, never resolved values.

### Windows
NTFS junctions via `fs.symlinkSync(target, link, 'junction')` — no admin rights needed; `core.longpaths=true` for clone paths; `node --test "tests/**/*.test.mjs"` glob form required (directory form broken on Node 26/Win32).

---

## 3. Folder Structure

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
│   └── _quarantine/
├── plugins.json              # manifest v2 (11 active plugins + templates)
├── state.json                # version/SHA tracking per plugin
├── INDEX.md                  # generated catalog
├── QUARANTINE.md             # failure log (1 entry: flutter-agent-plugins)
├── README.md
├── package.json
├── .gitignore
├── bin/agp.mjs              # CLI dispatcher
├── scripts/
│   ├── lib/
│   │   ├── manifest.mjs      # loadManifest, validateManifest
│   │   ├── paths.mjs         # expandHome, targetPath, loadLocalOverrides
│   │   ├── discover.mjs      # discoverSkills (recursive SKILL.md finder)
│   │   ├── frontmatter.mjs   # parseFrontmatter
│   │   ├── gates.mjs         # structureGate, uniquenessGate, safetyInventory, runGates
│   │   ├── quarantine.mjs    # quarantine
│   │   ├── atomic.mjs        # stageDir, stripGit, swapIn
│   │   ├── state.mjs         # readState, writeState, recordUpdate
│   │   ├── layout.mjs        # pluginDest, collectExistingSkillNames
│   │   ├── jsonc.mjs         # stripComments, parseJsonc
│   │   ├── gitsrc.mjs        # lsRemote, clone, headSha, commitAll
│   │   └── local.mjs         # (TO BE CREATED in Phase 2)
│   └── cmd/
│       ├── update.mjs        # runUpdate (clone → gates → atomic swap → commit)
│       ├── manage.mjs        # runAdd, runRemove, saveManifest
│       ├── inspect.mjs       # runDoctor, runStatus
│       └── index.mjs         # generateIndex, writeIndex
├── tests/                    # 13 test files, 48 tests total
│   ├── atomic.test.mjs
│   ├── cli.test.mjs
│   ├── discover.test.mjs
│   ├── gates.test.mjs
│   ├── gitsrc.test.mjs
│   ├── index.test.mjs
│   ├── jsonc.test.mjs
│   ├── layout-skillentry.test.mjs
│   ├── manifest.test.mjs
│   ├── paths.test.mjs
│   ├── state-layout.test.mjs
│   ├── update.test.mjs
│   └── verbs.test.mjs
└── docs/superpowers/
    ├── specs/2026-08-26-all-global-plugin-design.md
    └── plans/
        ├── 2026-08-26-phase1-core-cli.md    # Phase 1 plan (COMPLETED)
        ├── .p2-part1.md                     # temp: Phase 2 plan part 1
        └── .p2-part2.md                     # temp: Phase 2 plan part 2
```

---

## 4. Completed Work (Phase 1 — 34 commits, 48/48 tests passing)

### Tasks T1-T11 (all committed and merged to main)

| Task | Commit | What it did |
|------|--------|-------------|
| T1 | `217f792` | Manifest v2 loader + validator (`manifest.mjs`) |
| T2 | `21ad421` | Portable path resolver with `~/` expansion + env overrides (`paths.mjs`) |
| T3 | `1ff0112` | SKILL.md frontmatter parser + recursive discovery (`frontmatter.mjs`, `discover.mjs`) |
| T4 | N/A | JSONC parse + git helpers (`jsonc.mjs`, `gitsrc.mjs`) |
| T5 | `db10fc7` | Validation gates (structure/uniqueness/safety) + quarantine (`gates.mjs`, `quarantine.mjs`) |
| T6 | `33e314c` | Atomic swap engine with failure reversal (`atomic.mjs`) |
| T7 | N/A | State store + layout helpers (`state.mjs`, `layout.mjs`) |
| T8 | N/A | `update` verb + CLI dispatcher (`update.mjs`, `agp.mjs`) |
| T9 | N/A | `add`/`remove`/`status`/`doctor` verbs (`manage.mjs`, `inspect.mjs`) |
| T10 | N/A | INDEX generator + 11 real plugin seed imports (flutter quarantined for name collision) |
| T11 | `905acab` | README and usage screen |

### Final review wave (5 fixes applied)
- Quarantine debris baseline: `_quarantine` and `.stage-*` excluded from uniqueness gate
- Engines raised to `>=21.0.0` for test-runner glob support
- Frontmatter fold: continuation lines after empty inline value
- commitAll pathspecs: explicit plugin paths instead of `-A` sweep
- dryRun markers in verb output

### CLI verbs available
```
agp update [--all|--plugin N|--category C] [--dry-run]
agp add --plugin N --url U --category C [--tier oss] [--marketplace-key K] [--skill-entry P] [--dry-run]
agp remove --plugin N [--dry-run]
agp status
agp doctor
agp index
```

---

## 5. Interrupted Work (What Was In Progress)

### Phase 2 Plan Writing — BLOCKED

The Phase 2 implementation plan was being written to `docs/superpowers/plans/2026-08-27-phase2-sync-adapters.md` but the write tool kept failing due to JSON serialization issues with large payloads (>50KB).

**What exists now:**
- `.p2-part1.md` — contains header, global constraints, and Task P2-1 (customize layer) complete with tests + implementation code
- `.p2-part2.md` — contains Tasks P2-2 (junction engine + bridge) and P2-3 (Claude adapter) complete with tests + implementation code

**What's MISSING from the plan:**
- Tasks P2-4 through P2-7 (opencode adapter, Gemini/Antigravity + Qwen adapters, MCP emitter, sync verb + ECC import + docs)

**To finish the plan:**
1. Write tasks P2-4 to P2-7 into a `.p2-part3.md`
2. Concatenate all 3 parts into `2026-08-27-phase2-sync-adapters.md`
3. Delete the temp `.p2-*` files
4. Commit: `docs: Phase 2 implementation plan`

---

## 6. Future Tasks

### Phase 2 — Adapters & Sync (7 tasks, plan partially written)

**P2-1: Customize layer (`local.json`, active set, enable/disable)**
- Create: `scripts/lib/local.mjs`
- Modify: `manifest.mjs`, `inspect.mjs`, `agp.mjs`, `.gitignore`
- Test: `tests/local.test.mjs`
- CLI: `agp enable --plugin N` / `agp disable --plugin N [--dry-run]`
- Add `enabled_by_default` boolean validation to manifest
- Add `active` column to `runStatus` output

**P2-2: Junction engine + universal bridge adapter**
- Create: `scripts/lib/adapters/junctions.mjs`, `scripts/lib/adapters/bridge.mjs`
- Test: `tests/bridge.test.mjs`
- `ensureJunction()`, `removeJunctionIfOwn()`, `bridgeRoot()`, `syncBridge()`
- Configurable bridge path via `local.paths.bridge`

**P2-3: Claude adapter (settings.json merge)**
- Create: `scripts/lib/adapters/claude.mjs`
- Test: `tests/claude-adapter.test.mjs`
- Adoption-gated (no-op if settings.json missing)
- Merges `skills.paths` entries with `source: "agp"` marker
- `.bak-<ts>` backup before mutation

**P2-4: opencode adapter (skills.paths management)**
- Create: `scripts/lib/adapters/opencode.mjs`
- Test: `tests/opencode-adapter.test.mjs`
- Marker-block `// agp:skills-start` / `// agp:skills-end` in `opencode.jsonc`
- Adoption-gated

**P2-5: Gemini/Antigravity dual-path + Qwen junction adapters**
- Create: `scripts/lib/adapters/gemini.mjs`, `scripts/lib/adapters/qwen.mjs`
- Shared junction factory pattern
- Gemini: writes both legacy `~/.gemini/skills/` and new `~/.gemini/antigravity-cli/skills/`
- Qwen: junctions into `~/.qwen/skills/`

**P2-6: MCP emitter adapter**
- Create: `scripts/lib/adapters/mcp.mjs`
- Reads each plugin's `.mcp.json`, emits normalized MCP config
- Targets: opencode `mcp{}` object, codex `[mcp_servers.*]`, cursor `mcp.json`, gemini/qwen `settings.json mcpServers`
- Adoption-gated for each target

**P2-7: sync verb + drift doctor + ECC import + docs + live verification**
- `agp sync --all | --tool T | --plugin N | --category C [--dry-run]`
- `doctor --fix` drift detection per adapter
- ECC imported as disabled flagship test (add to manifest with `enabled_by_default: false`)
- Update README, USAGE, AGENTS.md
- Live verification against real tool configs

### Phase 3 — Rollback & Tags (not yet planned)
- Batch tags: `batch/<utc-timestamp>`
- `agp rollback NAME [--to SHA]`
- `agp rollback --batch last | --batch <id>`
- `state.json` batch tracking
- Per-plugin git history for surgical revert

### Phase 4 — Automation (not yet planned)
- Weekly GitHub Actions workflow (`maintain.yml`)
- cron → doctor --fix → update --all → sync --all → changelog → status → commit → push → tag batch
- Release notes generation (`release-notes/<name>-<ts>.md`)
- Changelog capture

---

## 7. Existing Plugin Catalog (11 active + 1 quarantined)

| Plugin | Category | Tier | Version | Status |
|--------|----------|------|---------|--------|
| superpowers | _universal | oss | 6.3.0 | active |
| karpathy-skills | _universal | oss | 1.0.0 | active |
| mattpocock-skills | _universal | oss | 1.2.3 | active |
| prompts-chat | _universal | oss | 0.1.0 | active |
| anthropic-doc-skills | fullstack | official | — | active |
| ui-ux-pro-max | frontend | oss | 2.13.0 | active |
| gsap-skills | frontend | oss | 1.0.0 | active |
| supabase-agent-skills | backend | oss | 0.1.8 | active |
| expo-skills | mobile | oss | — | active |
| azure-skills | cloud | oss | 1.2.35 | active |
| sf-skills | salesforce | oss | 1.42.0 | active |
| flutter-agent-plugins | — | — | — | **QUARANTINED** (duplicate skill names: code-review, grill-with-docs) |

---

## 8. Tools Covered by Adapters (from spec §2 research)

| Tool | Adapter | Mechanism |
|------|---------|-----------|
| Claude Code | claude | settings.json merge (`skills.paths`) |
| OpenAI Codex | bridge | `~/.agents/skills/` junctions |
| Gemini CLI / Antigravity | gemini | dual-path junctions + settings |
| Qwen Code | qwen | `~/.qwen/skills/` junctions |
| Cursor | bridge | reads `~/.agents/skills/` natively |
| opencode | opencode | `skills.paths` in `opencode.jsonc` |
| Grok CLI | bridge | `~/.agents/skills/` junctions |
| Cline / Roo / Warp / Copilot / Goose / Amp / Kiro | bridge | `~/.agents/skills/` junctions |

---

## 9. Key Files to Read Before Continuing

1. **Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` — full architecture
2. **Phase 1 plan:** `docs/superpowers/plans/2026-08-26-phase1-core-cli.md` — completed tasks reference
3. **Manifest:** `plugins.json` — current plugin catalog
4. **State:** `state.json` — per-plugin version/SHA tracking
5. **CLI:** `bin/agp.mjs` — current verb dispatch (needs `enable`/`disable`/`sync`)
6. **Git log:** `git log --oneline -34` — full commit history

---

## 10. Quick Resume Instructions

```
# 1. Finish writing Phase 2 plan (tasks P2-4 to P2-7)
#    Write to .p2-part3.md, then concatenate all parts

# 2. Commit the plan
git add docs/superpowers/plans/2026-08-27-phase2-sync-adapters.md
git commit -m "docs: Phase 2 implementation plan"

# 3. Implement tasks P2-1 through P2-7 following the plan
#    Each task: write tests → run → FAIL → implement → run → PASS → commit

# 4. After Phase 2, plan Phase 3 (rollback/tags) and Phase 4 (automation)
```
