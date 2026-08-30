# All-Global-Plugin Phase 2 (Sync Adapters + Customize Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) tracking. TDD per task: failing test → implement → focused PASS → full suite PASS → commit.

**Goal:** Wire the vendored catalog into every supported AI tool via six sync adapters, add the per-user customize layer (`local.json`), and prove it with ECC imported as a disabled-by-default plugin.

**Architecture:** Adapters live in `scripts/lib/adapters/*.mjs`, one per target family, orchestrated by `scripts/cmd/sync.mjs`. Junction-based adapters (bridge/gemini/qwen/cursor) create NTFS junctions (`fs.symlinkSync(target, link, 'junction')`, no admin). Config-file adapters (claude/opencode/mcp targets) merge key-by-key with `.bak-<ts>` backups and adoption gates. Active-set filtering happens once via `local.mjs` and feeds every adapter.

**Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` (§4 customize layer, §5 adapter matrix, §8 safety). Reconstituted from `docs/HANDOFF.md` (2026-08-30) after the original plan write was interrupted.

## Global Constraints

- **Ownership rule:** only junctions whose resolved target is inside the repo are removed; plain dirs/files are never touched.
- **Adoption gate:** config-file adapters write only when the destination file already exists (never create a user's config from nothing).
- `.bak-<ts>` backup before mutating any existing config file.
- No username or absolute user path in committed files; targets resolve via `paths.mjs` (`~/`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `local.json` `paths` overrides).
- Every verb supports `--dry-run`; dry-run mutates nothing and reports planned diffs.
- MCP secrets emitted as `${VAR}` references only; literal secrets produce warnings, never writes.
- Tests: `node --test "tests/**/*.test.mjs"` green on every commit; integration tests use temp HOME fixtures, never the real profile.

---

### Task P2-1: Customize layer (`local.json`, active set, enable/disable)

**Files:**
- Create: `scripts/lib/local.mjs`
- Modify: `scripts/lib/manifest.mjs` (validate optional `enabled_by_default` boolean), `scripts/cmd/inspect.mjs` (status `active` field), `bin/agp.mjs` (`enable`/`disable` verbs), `.gitignore` (`local.json`)
- Test: `tests/local.test.mjs`

**Interfaces:** `readLocal(repoRoot) → {paths:{},plugins:{}}` (missing file → defaults; unknown keys preserved), `writeLocal(repoRoot, local)`, `isEnabled(manifestEntry, local) → bool`, `activeState(manifestEntry, local) → 'active'|'off (you)'|'off (default)'`, `setEnabled(repoRoot, name, bool)` (upsert), `activePlugins(manifest, local) → entries[]`.

**Active-set rule (spec §4):** `local.plugins[name].enabled` wins; else manifest `enabled_by_default` (absent = true).

- [ ] Step 1: failing `tests/local.test.mjs` — 5 cases: (1) missing file → defaults + all-active; (2) `local.plugins.x.enabled=false` → off (you); (3) manifest `enabled_by_default:false` → off (default); (4) local true beats manifest false; (5) `setEnabled` roundtrip preserves unknown keys.
- [ ] Step 2: run → FAIL (module missing).
- [ ] Step 3: implement `local.mjs`; manifest validator: if `enabled_by_default` present and not boolean → error; `inspect.mjs` status rows gain `active: activeState(...)`; dispatcher adds `enable`/`disable` (`--plugin` required, `--dry-run` guard); `.gitignore` += `local.json`.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: local.json customize layer`.

---

### Task P2-2: Junction engine + universal bridge adapter

**Files:**
- Create: `scripts/lib/adapters/junctions.mjs`, `scripts/lib/adapters/bridge.mjs`
- Test: `tests/bridge.test.mjs`

**Interfaces:** `ensureJunction(target, link) → 'created'|'exists'` (idempotent; verifies existing junction points at target), `removeJunctionIfOwn(link, repoRoot) → 'removed'|'skipped'` (only when `fs.lstatSync(link).isSymbolicLink()` and `fs.realpathSync(link)` starts with repoRoot). `bridgeRoot(repoRoot) → absPath` (targetPath 'bridge' with local overrides), `syncBridge({repoRoot, plugins, dryRun}) → {created[], removed[], skipped[]}` — one junction per active plugin's skill folder set into `~/.agents/skills/<skill-name>`; orphans (junctions under bridge root pointing into repo but not in active set) removed via ownership rule.

- [ ] Step 1: failing `tests/bridge.test.mjs` — 5 cases: create+idempotent, remove-own, refuse plain dir, sync creates expected set, custom bridge path via `local.json`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement both modules.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: junction engine and universal bridge`.

---

### Task P2-3: Claude adapter (settings.json merge)

**Files:**
- Create: `scripts/lib/adapters/claude.mjs`
- Test: `tests/claude-adapter.test.mjs`

**Interfaces:** `syncClaude({repoRoot, plugins, dryRun}) → {added[], removed[], skipped, backupPath?}` — adoption gate (no-op when `~/.claude/settings.json` absent), key-by-key merge of `extraKnownMarketplaces` (path per vendored plugin, forward slashes) + `enabledPlugins` (`plugin_keys` ∪ `plugin_key`), entries tagged removable via exact-match against manifest-derived desired set (agp-managed entries are exactly those whose marketplace path is inside repoRoot), `.bak-<ts>` before write, user entries untouched.

- [ ] Step 1: failing `tests/claude-adapter.test.mjs` — 4 cases: no-op when settings missing, merge adds entries, stale agp entries removed, backup written.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: claude settings adapter`.

---

### Task P2-4: opencode adapter (`skills.paths` marker block)

**Files:**
- Create: `scripts/lib/adapters/opencode.mjs`
- Test: `tests/opencode-adapter.test.mjs`

**Interfaces:** `syncOpencode({repoRoot, plugins, dryRun})` — adoption-gated on `opencode.jsonc` (via `targetPath('opencode')`, XDG-aware); manages a `// agp:skills-start` … `// agp:skills-end` marker block containing the JSONC `"skills": { "paths": [...] }` entries pointing at each active plugin's skill root; content outside markers byte-preserved; `.bak-<ts>` first; stale entries gone on next sync. Parse via `lib/jsonc.mjs` for validation only — edits are textual inside the marker block.

- [ ] Step 1: failing `tests/opencode-adapter.test.mjs` — no-op when missing, insert block, update block, remove stale, preserve outside content, backup.
- [ ] Step 2–5: FAIL → implement → PASS → full suite → commit `feat: opencode adapter`.

---

### Task P2-5: Gemini/Antigravity dual-path + Qwen junction adapters

**Files:**
- Create: `scripts/lib/adapters/gemini.mjs`, `scripts/lib/adapters/qwen.mjs`
- Test: `tests/gemini-adapter.test.mjs`, `tests/qwen-adapter.test.mjs`

**Interfaces:** `syncGemini({repoRoot, plugins, dryRun})` — junctions into BOTH `~/.gemini/skills/` (legacy) and `~/.gemini/antigravity-cli/skills/` (new global, post 2026-06-18); workspace `.agents/skills/` already covered by bridge. `syncQwen({repoRoot, plugins, dryRun})` — junctions into `~/.qwen/skills/` (no `.agents` alias, upstream issue #7394). Both reuse `junctions.mjs` helpers, honor `local.json` `paths` overrides, remove orphans via ownership rule.

- [ ] Step 1: failing tests — dual-path creation, orphan removal, override respect, idempotency.
- [ ] Step 2–5: FAIL → implement → PASS → full suite → commit `feat: gemini dual-path and qwen adapters`.

---

### Task P2-6: MCP emitter adapter

**Files:**
- Create: `scripts/lib/adapters/mcp.mjs`
- Test: `tests/mcp-adapter.test.mjs`

**Interfaces:** `collectMcpEntries(repoRoot, plugins) → {servers: {name: config}, warnings[]}` reading each active plugin's `.mcp.json`; `syncMcp({repoRoot, plugins, targets?, dryRun})` emitting per target: opencode `mcp{}` object (inside its config, adoption-gated), `~/.codex/config.toml` `[mcp_servers.*]` tables, `~/.cursor/mcp.json`, Gemini + Qwen `settings.json` `mcpServers`. Env values pass through only as `${VAR}` references; literal-looking secrets → warning, skipped. agp-managed entries keyed by name; stale agp entries removed, user servers preserved. Each target independently adoption-gated.

- [ ] Step 1: failing `tests/mcp-adapter.test.mjs` — collect, `${VAR}` passthrough, literal warning, per-target no-op when missing, merge preserves user servers, stale removal.
- [ ] Step 2–5: FAIL → implement → PASS → full suite → commit `feat: mcp emitter adapter`.

---

### Task P2-7: `sync` verb + drift doctor + ECC disabled import + docs

**Files:**
- Create: `scripts/cmd/sync.mjs`
- Modify: `bin/agp.mjs` (`sync` verb + usage), `scripts/cmd/inspect.mjs` (drift section in `doctor`), `plugins.json` (ECC entry), `README.md`, `docs/HANDOFF.md`
- Test: `tests/sync.test.mjs`

**Interfaces:** `runSync({repoRoot, tool=null, plugin=null, category=null, dryRun}) → {bridge: {...}, claude: {...}, opencode: {...}, gemini: {...}, qwen: {...}, mcp: {...}}` — filters `activePlugins()` by selectors, invokes each adapter (or one via `--tool`), aggregates per-adapter `{created, removed, skipped}`. `runDoctor` gains drift detection: runs adapters in dry-run and reports any non-empty diff as drift.

**ECC showcase:** add manifest entry `ecc` → `category: _universal, tier: oss, url: https://github.com/affaan-m/ECC, enabled_by_default: false` (folder vendored via normal `add` path; uniqueness gate must pass against current catalog). Verify `activePlugins` excludes it, `status` shows `off (default)`, `enable ecc` flips via `local.json` only.

- [ ] Step 1: failing `tests/sync.test.mjs` — sync orchestrates all adapters against temp HOME, dry-run reports without writing, selector filtering, doctor drift zero after sync, ECC inactive by default.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement; import ECC via CLI; update README (Phase 2 done), usage text, HANDOFF.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: live verification against temp HOME fixture (exact expected diffs per adapter) + portability check `git grep -n "xeon" -- . ':!docs'` empty.
- [ ] Step 6: Commit `feat: sync verb, drift doctor, ECC disabled import` + `docs: Phase 2 complete`.

---

## Out of scope (later phases)

- **Phase 3:** batch tags, `rollback NAME [--to SHA]`, `rollback --batch`, state batch records.
- **Phase 4:** `.github/workflows/maintain.yml` weekly run, release-notes generation, CI smoke.
- GitHub-search-assisted `add` (discovery UX) — post-Phase-2 enhancement.
- claude-mem import (needs npm background service).
