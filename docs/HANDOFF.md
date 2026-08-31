# All-Global-Plugin — Session Handoff

> **Date:** 2026-08-31 | **Repo:** `D:\Agentic coding\Project\All-Global-Plugin` | **Branch:** `main`
> **Purpose:** Complete session capture for human and AI consumers. Covers project context, completed work, verification, and sequenced future tasks.

---

## Project Context

- **Objective:** Unified cross-tool AI plugin management. Vendors SKILL.md-native plugins into `universal-plugin/<category>/<tier>/`, syncs them into 10+ AI CLIs/IDEs via adapters, with per-user enable/disable overlay.
- **Stack:** Node `>=21.0.0` ESM, zero runtime deps, `node:test`, NTFS junctions via `fs.symlinkSync(target, link, 'junction')` (no admin), `git` with `core.longpaths=true`.
- **Test command:** `node --test "tests/**/*.test.mjs"` — currently **104/104 passing**.
- **Source of truth:** `plugins.json` (manifest v2, `version:2`, `plugin_dir: universal-plugin`). Per-user overlay `local.json` (gitignored) never mutates manifest. Active-set rule: `local.plugins[name].enabled` → else `enabled_by_default` (absent = true).
- **Safety guarantees:** Ownership rule — only junctions whose resolved target is inside repo are removed; plain dirs/files never touched. `.bak-<ts>` before mutating existing user configs. Adoption-gate — config-file adapters write only when destination file already exists. MCP secrets emitted as `${VAR}` refs only.
- **Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` (goals, compatibility matrix, folder structure, manifest schema, adapters, gates, rollback, testing).
- **Phase 2 plan:** `docs/superpowers/plans/2026-08-27-phase2-sync-adapters.md` (all 7 tasks executed).
- **Prior repo:** `D:\Agentic coding\claude-global-plugins` remains in production untouched; this repo is independent lab.

### Folder Structure

```
All-Global-Plugin/
├── universal-plugin/{_universal,fullstack,frontend,backend,mobile,cloud,salesforce}/{official,oss}/  + _quarantine/
├── plugins.json, state.json, local.json (gitignored), INDEX.md, QUARANTINE.md, README.md, package.json, .gitignore
├── bin/agp.mjs                              # CLI dispatcher (10 verbs)
├── scripts/lib/{manifest,paths,discover,frontmatter,gates,quarantine,atomic,state,layout,jsonc,gitsrc,local}.mjs
├── scripts/lib/adapters/{junctions,bridge,claude,opencode,gemini,qwen,mcp}.mjs
├── scripts/cmd/{update,manage,inspect,index,sync,rollback}.mjs
├── tests/*.test.mjs  (22 files)
└── docs/superpowers/{specs,plans}/
```

### Plugin Catalog (manifest state 2026-08-31)

| Plugin | Category | Tier | Version | Status |
|---|---|---|---|---|
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
| **ecc** | _universal | oss | 2.2.0 | **off (default)** — disabled-by-default showcase |
| flutter-agent-plugins | — | — | — | quarantined — duplicate skill names: `code-review`, `grill-with-docs` |

---

## Completed Work

### Phase 1 (complete — commits through `6cba56f`)

Manifest v2 CLI, 4 validation gates, atomic swap, quarantine, 11 plugins seeded across 7 categories, 48/48 tests. Details preserved in git history and prior handoff versions.

### Phase 2 (complete — commits `5deacc8` through `824a7fe`)

- **P2-1 Customize layer** (`d4fce23`) — `scripts/lib/local.mjs` (`readLocal`/`writeLocal`/`isEnabled`/`activeState`/`setEnabled`/`activePlugins`); manifest validator accepts `enabled_by_default`; `status` gained Active column; `enable`/`disable` verbs; `.gitignore` += `local.json`. Tests: `tests/local.test.mjs` (5).
- **P2-2 Junction engine + bridge** (`157e111`) — `scripts/lib/adapters/junctions.mjs` (`ensureJunction` idempotent + refuses replacing foreign entries; `removeJunctionIfOwn` ownership rule: removes only junctions resolving inside repo), `scripts/lib/adapters/bridge.mjs` (`bridgeRoot` with `local.paths` override; `syncBridge` per-skill junctions into `~/.agents/skills`). Tests: `tests/bridge.test.mjs` (6).
- **P2-3 Claude adapter** (`ea37cd6`) — `syncClaude`: adoption-gated merge of `extraKnownMarketplaces` (`{path, source:"agp"}`) + `enabledPlugins` into `~/.claude/settings.json` (CLAUDE_CONFIG_DIR-aware); removes only stale agp-owned entries (path inside repo or marketplace stale/absent); `.bak-<ts>`. Tests: `tests/claude-adapter.test.mjs` (4).
- **P2-4 opencode adapter** (`509a17c`) — `syncOpencode`: managed `// agp:skills-start/end` marker block in `~/.config/opencode/opencode.jsonc` (XDG-aware); JSONC-safe insert before closing brace, update, full-block removal when plugin set empties; preserves all user content outside markers; `.bak-<ts>`. Tests: `tests/opencode-adapter.test.mjs` (5).
- **P2-5 Gemini dual-path + Qwen** (`3a91ec7`) — `syncGemini` writes junctions to BOTH `~/.gemini/skills/` (legacy) and `~/.gemini/antigravity-cli/skills/` (post 2026-06-18 global path), results tagged `name@legacy`/`name@antigravity`; `syncQwen` junctions into `~/.qwen/skills/`. Both use shared junction engine + ownership rule. Tests: gemini (3) + qwen (3).
- **P2-6 MCP emitter** (`cc4cbf5`) — `collectMcpEntries` reads each active plugin's `.mcp.json`, skips servers with literal secrets (8+ char non-`${VAR}` env values) with warnings, tags kept servers `source:"agp"`; `syncMcp` per-target merge (`~/.cursor/mcp.json`, `~/.gemini/settings.json`, `~/.qwen/settings.json`), adoption-gated, preserves user servers, removes stale agp servers, `.bak-<ts>`. Codex TOML target deferred. Tests: `tests/mcp-adapter.test.mjs` (5).
- **P2-7 Sync verb + drift doctor + ECC import** (`16b73bb`, `7694c79`, `824a7fe`)
  - `scripts/cmd/sync.mjs` `runSync` — orchestrates all six adapters with `--tool|--plugin|--category` selectors; **bridge honors injected home** (fixed a real-profile junction leak found during verification).
  - `bin/agp.mjs` — `sync` verb with tool validation and required-selector guard; `add --disabled` flag.
  - `scripts/cmd/inspect.mjs` — `driftProblems`: runs every adapter in dry-run, reports non-empty diffs as `drift [tool]: ...`; adoption-gated (only tools whose target dirs exist). `doctor` now checks structure + orphans + drift.
  - **Uniqueness gate made active-set-aware**: a plugin being installed disabled bypasses the uniqueness check entirely, and uniqueness baselines exclude disabled plugins' skills (they never sync, so their names cannot collide in any target). This is what allowed ECC (288 skills, `design-system` collides with `ui-ux-pro-max`) to import as disabled.
  - **ECC imported** (`agp add --plugin ecc --url https://github.com/affaan-m/ecc --category _universal --tier oss --disabled`): vendored at `universal-plugin/_universal/oss/ecc/`, `enabled_by_default:false`, shows `off (default)` in status, has hooks/scripts flagged by safety inventory (never synced while disabled).

### Live verification (temp HOME fixture, 2026-08-31)

- `runSync --all` against a temp HOME with adopted configs: 322 bridge junctions created (all resolving inside the repo), claude settings gained 11 marketplaces + `enabledPlugins` (ECC absent), opencode marker block inserted (no `/ecc/` path), gemini/qwen junctions, cursor mcp.json gained supabase+azure servers.
- **ECC exclusion proven**: zero ECC skills in bridge (the one `design-system` junction resolves into `ui-ux-pro-max`, not ecc); `extraKnownMarketplaces.ecc` absent; opencode block contains no ecc path.
- `runSync --plugin ecc` (disabled selection) → all adds empty (no partial merges).
- `runDoctor` after full sync → **0 problems** (drift detection converges).
- No leakage into the real `~/.agents` during testing (leak found and fixed during P2-7; stale junction removed).

### Test trajectory

48 (Phase 1) → 53 (P2-1) → 59 (P2-2) → 63 (P2-3) → 68 (P2-4) → 74 (P2-5) → 79 (P2-6) → 85 (P2-7) → **104 (Phase 3)** — all green.

---

### Phase 3 (complete — commits `90823ec` through `f1300ef`)

- **P3-1 Batch tracking, history, tags** (`90823ec`) — `commitAll` now returns the new commit SHA (or `null` on no-op); `gitsrc.mjs` gained `createTag`/`listCommits`/`showFile`/`checkoutPaths`/`pathTree`; `state.mjs` gained `appendHistory` (accumulating `plugins.<name>.history[]` of `{repo_commit, version, upstream_commit_sha, ts}`), `recordBatch` (`batches[]` of `{id, pre, post, at, tag, plugins}`), `findBatch` (resolves `last`/full id/timestamp suffix). `runUpdate` captures pre-fields before each swap, records `snapshot_commit` = repo commit (fixes the pre-P3 bug where it duplicated `upstream_commit_sha`), appends history, and after the loop builds `batch/<UTC-ms-iso>` (colons → `-`), records the batch, commits bookkeeping, creates the annotated tag (warn-and-continue). `runAdd`'s internal update passes `recordBatch: false` so adds don't double-record batches. Tests: `tests/batch.test.mjs` (5).
- **P3-2 Rollback engine** (`8e7c947`) — `scripts/cmd/rollback.mjs` `runRollback({repoRoot, name, to, batch, dryRun})`. Per-plugin: walks the plugin folder's **distinct git tree states in first-introduction order** (a raw `git log` walk breaks once rollback commits re-create older trees — dedupe by `pathTree`), targets `--to` (validated against commit history) else one state back, restores `version`/`upstream_commit_sha` from `showFile(target, 'state.json')` (works for pre-Phase3 commits), `checkoutPaths` + `recordUpdate` + `appendHistory` + `Rollback <name> → <version> (<shortsha>)` commit. Batch: resolves via `findBatch`, probes each plugin's dest existence at `batch.pre`, skips added-during-window plugins with a warning, restores all present dests in one commit `Rollback batch <id>: ...`. Guards: exactly one of `name`/`batch`; `to` only with `name`; unknown plugin → error. Tests: `tests/rollback.test.mjs` (9).
- **P3-3 CLI wiring** (`f1300ef`) — `bin/agp.mjs` 10th verb `rollback`; `--to`/`--batch` value flags; dispatch guards (no selector → exit 2, both selectors → exit 2, `--to` without `--plugin` → exit 2), JSON output, exit 0/1. Tests: `tests/cli.test.mjs` extended (+5, incl. spawnSync e2e add→update→rollback via real CLI).
- **P3-4 Docs + live verification** — README verb row + "Rollback & batches" section; this handoff.

### Live verification (temp git fixture, 2026-08-31)

Full CLI loop in a throwaway git repo: `add → update (upstream v2) → rollback --plugin demo --dry-run` (plan only, nothing mutated) `→ rollback --plugin demo` (v1 content restored, `Rollback demo → …` commit) `→ update again → rollback --batch last` (v1 restored, single `Rollback batch <id>` commit). `git tag -l 'batch/*'` shows one annotated tag per update run; `git log --oneline` shows append-only linear history (no rewrites). Doctor on the fixture reports **drift only** — expected, since the fixture never synced into the adopted tool configs (its plugin set differs from the real repo's; structure/orphan checks clean, so the rollback left no catalog damage). On the real repo, `rollback --plugin superpowers --dry-run` exercises the "no previous version" path cleanly (every current plugin has exactly one snapshot commit). All 104 tests green; username-leak scan clean.

---

## Future Tasks

- **Phase 4 — Automation (not yet planned)**
  - **Objective:** Weekly GitHub Actions workflow `maintain.yml`: `doctor → update --all → sync --all → changelog → status → commit → push → tag batch`. No force-push, no third-party bots.
  - **Next steps:** Author plan `docs/superpowers/plans/<date>-phase4-automation.md`, implement `.github/workflows/maintain.yml` (cron weekly), `release-notes/<name>-<ts>.md` generation from `state.json` deltas, changelog, CI smoke checks (validate manifest + structures + uniqueness on every push). Reference spec §7.

- **Deferred small items**
  - MCP emitter: Codex `~/.codex/config.toml` TOML target (spec §5 lists it; only cursor/gemini/qwen JSON targets implemented).
  - `agp enable --plugin ecc` live smoke on the real profile (fixture-verified only so far).
  - GitHub-search-assisted `add` (user provides URL today; search UX post-Phase-2 per plan out-of-scope).

### Resume Sequence

1. Author and execute Phase 4 plan (automation: `maintain.yml` weekly loop).
2. Optional: Codex TOML MCP target; real-profile `sync --dry-run` smoke; `agp enable --plugin ecc` live smoke.

### Key Files to Read Before Continuing

- `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` — architecture + adapter matrix
- `docs/superpowers/plans/2026-08-27-phase2-sync-adapters.md` — executed Phase 2 plan
- `docs/superpowers/plans/2026-08-31-phase3-rollback.md` — executed Phase 3 plan
- `plugins.json` + `state.json` + `bin/agp.mjs` + `scripts/lib/*.mjs` + `scripts/lib/adapters/*.mjs` + `scripts/cmd/*.mjs` + `tests/*.test.mjs`
- `git log --oneline -20` and `git show --stat HEAD` for recent changes
