# All-Global-Plugin Phase 3 (Rollback & Batch Tags) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) tracking. TDD per task: failing test → implement → focused PASS → full suite PASS → commit.

**Goal:** Give every update run an instant undo path — per-plugin and whole-batch rollback verbs backed by git history, `state.json` batch records, and annotated `batch/<utc-timestamp>` tags.

**Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` §7 (verb list, batch tags), §8 (rollback never touches unrelated plugins).

**Foundations:** per-plugin commit granularity already exists (one commit per plugin swap in `runUpdate`); `commitAll` stages `universal-plugin, plugins.json, state.json, QUARANTINE.md`; `state.json` holds per-plugin `{version, upstream_commit_sha, snapshot_commit, last_updated}`.

## Global Constraints

- **No history rewrites.** Rollback = `git checkout <sha> -- <paths>` + a new commit. Tags are annotated pointers, never moved. No force operations anywhere.
- **Scoped mutation.** Rollback touches only the named plugin's folder (or the batch's plugin folders) plus their `state.json` entries. `plugins.json`, unrelated plugins, and user tool configs are never modified.
- **Dry-run everywhere.** Every rollback path reports planned changes without mutation.
- **Skip, never delete.** A plugin absent at the batch's pre state (added during the batch window) is skipped with a warning.
- Existing 85 tests stay green; `commitAll` gaining a SHA return is backward-compatible.
- Tests: `node --test "tests/**/*.test.mjs"` green on every commit.

---

### Task P3-1: Git helpers + state batch/history records + tag creation

**Files:**
- Modify: `scripts/lib/gitsrc.mjs`
- Modify: `scripts/lib/state.mjs`
- Modify: `scripts/cmd/update.mjs`
- Test: `tests/batch.test.mjs`

**Interfaces:**
- `commitAll(dir, message) → sha|null` — returns new commit SHA (40-hex) after commit; `null` when nothing to commit.
- `createTag(repoRoot, name, message)` — `git tag -a <name> -m <message>`; throws on failure.
- `listCommits(repoRoot, path) → sha[]` — `git log --format=%H -- <path>`, newest first.
- `showFile(repoRoot, sha, file) → string|null` — `git show <sha>:<file>`; `null` when the file is absent at that commit.
- `checkoutPaths(repoRoot, sha, paths)` — `git checkout <sha> -- <paths...>`; throws on failure.
- `appendHistory(repoRoot, name, entry)` — appends `{repo_commit, version, upstream_commit_sha, ts}` to `state.plugins[name].history[]` (read-modify-write, accumulates).
- `recordBatch(repoRoot, batch)` — appends `{id, pre, post, at, tag, plugins: {name: {pre_version, pre_upstream_sha}}}` to `state.batches[]`.
- `findBatch(state, idOrLast)` — resolves `'last'` → newest; full `batch/<ts>` id; or bare timestamp suffix.
- `runUpdate` — captures pre-fields before swap; records `snapshot_commit: <repo commit sha>` (fixes the duplicate-upstream-sha bug); after the loop (non-dry-run, ≥1 updated) builds `id = batch/<UTC-ms-iso>` (colons → `-`), records the batch, commits bookkeeping, creates the annotated tag (warn-and-continue on tag failure).

- [ ] Step 1: failing `tests/batch.test.mjs` — (1) `commitAll` returns 40-hex SHA / `null` on no-op; (2) `appendHistory`/`recordBatch` roundtrip preserves prior entries; (3) `findBatch` resolves `last`/full-id/suffix; (4) e2e update → history 2 entries, 1 batch record, valid pre/post SHAs, `refs/tags/batch/...` exists, `snapshot_commit` ≠ `upstream_commit_sha`; (5) failed update run → no batch, no tag.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement gitsrc/state/update changes.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: batch tracking, history records, batch tags`.

---

### Task P3-2: Rollback engine

**Files:**
- Create: `scripts/cmd/rollback.mjs`
- Test: `tests/rollback.test.mjs`

**Interfaces:** `runRollback({repoRoot, name, to, batch, dryRun})`:
- **Per-plugin** (`name`): `listCommits` on the plugin dest; `< 2` commits → error `no previous version to roll back to`. Target = `--to` (validated ∈ commit set, else error listing candidates) else `commits[1]`. Restore `version`/`upstream_commit_sha` from `showFile(target, 'state.json')` (works for pre-Phase3 commits). Dry-run reports `{name, from, to, version}`. Real run: `checkoutPaths` → `recordUpdate` + `appendHistory` → `commitAll('Rollback <name> → <version> (<shortsha>)')`.
- **Batch** (`batch`): resolve via `findBatch`; probe each plugin's dest existence at `batch.pre` (`git cat-file -e`); missing → `skipped` with reason. Dry-run reports `{batch: id, restored[], skipped[]}`. Real run: `checkoutPaths(pre, ...dests)` → per-plugin state restore + history → single `commitAll('Rollback batch <id>: ...')`.
- Guards: exactly one of `name`/`batch`; `to` only with `name`; unknown plugin → error.

- [ ] Step 1: failing `tests/rollback.test.mjs` — (1) rollback restores v1 content + state + creates rollback commit; (2) `--to <add-commit>`; (3) `--to` foreign SHA → error; (4) batch restores both plugins; (5) batch skips plugin added after pre; (6) dry-run mutates nothing; (7) single-commit plugin → error; (8) rollback twice → oldest.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement `rollback.mjs`.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: rollback verb (per-plugin and batch)`.

---

### Task P3-3: CLI wiring

**Files:**
- Modify: `bin/agp.mjs`
- Test: extend `tests/cli.test.mjs`

**Wiring:** COMMANDS += `rollback`; USAGE += `agp rollback --plugin N [--to SHA] | agp rollback --batch last|<id> [--dry-run]`; VALUE_FLAGS += `to`, `batch`; dispatch: exactly one of `--plugin`/`--batch` (else exit 2 + usage), `--to` without `--plugin` → exit 2, delegate to `runRollback`, JSON output, exit 0/1.

- [ ] Step 1: failing CLI tests — parseArgs `--to`/`--batch`; no-selector exit 2; both-selectors exit 2; spawnSync e2e happy path (rollback after update, exit 0).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement dispatch branch.
- [ ] Step 4: focused PASS → full suite PASS.
- [ ] Step 5: Commit `feat: rollback CLI wiring`.

---

### Task P3-4: Docs + live verification

**Files:**
- Modify: `README.md` (verb table + "Rollback & batches" section), `docs/HANDOFF.md` (Phase 3 complete, test trajectory, future = Phase 4)
- Live verification in a temp git fixture (never the real repo): `add → update (upstream v2) → rollback --plugin → re-update → rollback --batch last → doctor clean`; `git tag -l 'batch/*'` shows tags; `git log --oneline` shows no rewrites.

- [ ] Step 1: README + HANDOFF updates.
- [ ] Step 2: live fixture e2e loop.
- [ ] Step 3: full suite green; username-leak scan clean.
- [ ] Step 4: Commit `docs: Phase 3 complete`.

---

## Out of scope (documented, not built in Phase 3)

- `doctor --fix` (spec §7 lists it; no fix semantics designed yet — drift repair == `sync`).
- `setup` verb (superseded by Phase 2 `sync`).
- Weekly automation + release-notes generation (Phase 4: `maintain.yml`).
- `update --pin` flag (spec §7; vendoring at a pinned tag — separate feature).
