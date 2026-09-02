# Phase 4: Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the weekly maintenance loop (doctor → update → sync → release-notes → changelog → status → commit → push → tag batch) via GitHub Actions, add per-push CI smoke checks, generate per-plugin release notes from `state.json` batch deltas, and close the two scenario-matrix test gaps (#4 read-only config, #12 junction permission denied).

**Architecture:** Three new pure library/command modules (release-notes generation, changelog append, CI verification) wired into a new `verify` CLI verb and two workflow files. The weekly workflow shells out to the same `bin/agp.mjs` verbs humans use — no new orchestration code in YAML beyond sequencing, env setup, and git identity (required because `commitAll` at `scripts/lib/gitsrc.mjs:29` uses ambient git config). Everything library-level is testable in `node --test` with temp-dir fixtures; the workflow files themselves are validated by a structural content test (no YAML dependency — repo is zero-runtime-deps).

**Tech Stack:** Node ≥21 ESM, `node:test`, git CLI, GitHub Actions (cron + push triggers).

**Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` §7 (automation), §9 (CI smoke), M6. Feeds from `docs/TESTING-STRATEGY.md` §2 step 5 (CI smoke) + §5 (automation guardrails).

## Global Constraints

Copied verbatim from spec §7 and repo conventions:

- "Weekly GitHub Actions (`maintain.yml`): cron → doctor --fix → update --all → sync --all → changelog → status → commit → push → tag batch."
- "A failing plugin aborts only itself; the run continues. No force-push, ever."
- "No third-party bots (Dependabot-class tools don't understand vendored plugin trees)."
- "CI smoke: validate manifest + all vendored structures + uniqueness on every push."
- Node `>=21.0.0`, ESM, zero runtime dependencies (`package.json`).
- Test command: `node --test "tests/**/*.test.mjs"` (currently 121/121 across 23 files).
- All emitted paths forward-slash; no username or machine-specific absolute path in any committed file.
- Git identity: `commitAll` uses ambient `user.name`/`user.email` — workflows MUST run `git config user.name/user.email` before any committing verb.
- Spec CLI surface lists `doctor [--fix]` but no fix semantics exist (drift repair == `sync`, already built). The workflow uses plain `doctor` + `sync`; README documents `--fix` as unimplemented (fix == sync).
- Repo has **no git remote and no `.github/` today** — workflows are authored for the future GitHub home; local verification = workflow-content test + dry-running each command the workflow runs.
- Rollback is the batch safety *net* (undo verb for humans/automation on failure), not a step in the happy-path loop.

## Facts gathered (from the current codebase)

- `runUpdate` (`scripts/cmd/update.mjs:36`) returns `{updated, skipped, failed}`; its batch block (lines 109–119) records `{id: 'batch/<iso-colons→dashes>', pre, post: headSha(), at, tag: id, plugins: preFields}` where `preFields[name] = {pre_version, pre_upstream_sha}` from pre-loop `state.json`; then `commitAll('Record batch …')` + `createTag` (warn-and-continue).
- `state.json` post-update plugin fields: `{version, upstream_commit_sha, snapshot_commit, last_updated}` (+ append-only `history[]`). The batch record does NOT carry post per-plugin fields — post values must be read from `state.plugins[name]`.
- `commitAll` (`gitsrc.mjs:29`) stages only `COMMIT_PATHS = ['universal-plugin', 'plugins.json', 'state.json', 'QUARANTINE.md']` (present-filtered) and returns new SHA or null on no-op.
- `runDoctor` (`inspect.mjs:79`) → `{problems}` (structure + orphans + drift); CLI exit 1 when problems non-empty. `runStatus` prints table via `console.table`; per-plugin `lsRemote` (network).
- `generateIndex`/`writeIndex` (`scripts/cmd/index.mjs`) — name/tier/url tables only, `# Plugin Catalog` header, "do not edit by hand" line.
- Gates: `structureGate(dir) → {ok, reason?}`; `runGates({stagedDir, existingNames}) → {ok, failures, inventory, skillCount}`; `loadManifest` throws `invalid manifest:` on schema violations.
- `activePlugins(manifest, local)` / `readLocal` (`scripts/lib/local.mjs`) — active-set rule for sync and uniqueness.
- `discoverSkills(root, DEBRIS)` (`scripts/lib/discover.mjs`) walks dirs, skips `.git`/`node_modules` + custom skip.
- Manifest URLs are all `https://github.com/<org>/<repo>` today (superpowers, anthropics/skills, supabase/agent-skills, …) — compare-link generation is directly usable.
- `tests/batch.test.mjs` fixture pattern: `fixture()` → git init + upstream repo with `skills/demo/SKILL.md` + manifest v2; `bumpUpstream(up, body)` commits v2; e2e asserts batch/tag/history.
- `tests/mcp-adapter.test.mjs` fixture pattern: `repo()` seeds `universal-plugin/_universal/oss/plug-a/.mcp.json` + manifest; `PLUGINS` const.
- No `release-notes/` dir, no `CHANGELOG.md`, no `.github/` exists (verified by ls).
- `.gitignore`: `node_modules/`, `paths.local.json`, `local.json`, `.superpowers/`, `universal-plugin/**/*.old-*`.
- CLI exit contract: 0 ok, 1 validation/operation failure, 2 usage error; JSON results on stdout, human errors on stderr (`TESTING-STRATEGY.md` §1.5).

## File Structure (created/modified map)

```
scripts/lib/releasenotes.mjs        # NEW — batch record + state → release-notes/<name>-<ts>.md
scripts/lib/changelog.mjs           # NEW — prepend batch section to CHANGELOG.md (create if absent)
scripts/cmd/verify.mjs              # NEW — manifest + structure + uniqueness + orphans → {ok, problems, skillCount}
bin/agp.mjs                         # MODIFY — 11th verb `verify` (COMMANDS, USAGE, dispatch)
scripts/lib/gitsrc.mjs              # MODIFY — COMMIT_PATHS += 'release-notes', 'CHANGELOG.md', 'INDEX.md'
scripts/cmd/update.mjs              # MODIFY — batch block also writes release-notes + changelog + index
.github/workflows/ci.yml            # NEW — push/PR: npm test + agp verify
.github/workflows/maintain.yml      # NEW — weekly cron loop
tests/releasenotes.test.mjs         # NEW
tests/changelog.test.mjs            # NEW
tests/verify.test.mjs               # NEW
tests/scenario-gaps.test.mjs        # NEW — matrix #4 + #12
tests/workflows.test.mjs            # NEW — workflow files exist + required steps present
tests/batch.test.mjs                # MODIFY — e2e asserts generated docs land in Record batch commit
README.md / docs/HANDOFF.md          # MODIFY — Phase 4 docs
docs/superpowers/plans/2026-09-03-phase4-automation.md  # this plan, committed first at execution start
```

`COMMIT_PATHS` extension matters: `runUpdate`'s final `commitAll` only stages listed paths, so release-notes/CHANGELOG/INDEX written after the update verbs must be staged by that same commit. Extending `COMMIT_PATHS` keeps one staging truth for every `commitAll`.

---

## Task 1: Scenario-gap regression tests #4 (locked/unwritable config) + #12 (junction path denied)

**Files:**
- Create: `tests/scenario-gaps.test.mjs`

**Interfaces:**
- Consumes: `syncMcp({repoRoot, plugins, home, targets, dryRun})` from `scripts/lib/adapters/mcp.mjs`; `ensureJunction(target, link)` from `scripts/lib/adapters/junctions.mjs`; fixture pattern from `tests/mcp-adapter.test.mjs`.
- Produces: two green regression pins. No production change expected — these close TESTING-STRATEGY.md §3 gaps #4/#12 by asserting the *already-implemented* invariants. If a gap reveals a real bug, fix the adapter inside this task.

Windows note: `chmod 0o444` does not reliably block `writeFileSync` on win32. Portable strategies: (a) for #4, assert the survive-contract — original user content intact after a locked-file sync attempt, `.bak` allowed (copy-first backup is by design, no data loss); on POSIX additionally assert the write throws; (b) for #12, make the link's parent path a regular *file* so `fs.mkdirSync(dirname)`/`symlinkSync` throws ENOTDIR — the same throw-path a permission-denied junction takes, and assert `ensureJunction` throws without clobbering the existing entry.

- [ ] **Step 1: Write the two tests**

```js
// tests/scenario-gaps.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncMcp } from '../scripts/lib/adapters/mcp.mjs'
import { ensureJunction } from '../scripts/lib/adapters/junctions.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-gap-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, '.mcp.json'), JSON.stringify({
    mcpServers: { 'server-one': { command: 'npx', args: ['-y', 'one'], env: { KEY: '${V}' } } },
  }))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' }],
  }))
  return root
}
const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss' }]

// Matrix #4: locked/unwritable target config — never a partial write
test('#4 locked target config: user content survives; POSIX write throws', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const dir = path.join(home, '.cursor')
  fs.mkdirSync(dir, { recursive: true })
  const cfg = path.join(dir, 'mcp.json')
  fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { 'user-srv': { command: 'keep' } } }))
  fs.chmodSync(cfg, 0o444)
  let threw = false
  try {
    syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['cursor'], dryRun: false })
  } catch { threw = true }
  const after = JSON.parse(fs.readFileSync(cfg, 'utf8'))
  assert.ok(after.mcpServers['user-srv'], 'user content must survive any failure mode')
  if (process.platform !== 'win32') {
    assert.ok(threw, 'on POSIX a read-only config write must throw, not silently no-op')
    const baks = fs.readdirSync(dir).filter(f => f.includes('.bak-'))
    // copy-first .bak before a throwing write is acceptable (backup, not data loss); no OTHER mutation:
    assert.equal(after.mcpServers['server-one'], undefined, 'agp server must not land on a throwing write')
  }
  fs.chmodSync(cfg, 0o666) // cleanup for tmpdir removal
})

// Matrix #12: junction path denied — throws, never clobbers the existing entry
test('#12 junction parent denied: ensureJunction throws, entry preserved', () => {
  const root = repo()
  const skillDir = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a', 'skills')
  fs.mkdirSync(skillDir, { recursive: true })
  // parent of the link path is a regular FILE => mkdir of dirname throws (same path as ACL denial)
  fs.writeFileSync(path.join(root, 'bridge-parent'), 'file')
  assert.throws(
    () => ensureJunction(skillDir, path.join(root, 'bridge-parent', 'skill-x')),
    /ENOTDIR|not a directory|EEXIST|EPERM|EACCES/i,
  )
  assert.equal(fs.readFileSync(path.join(root, 'bridge-parent'), 'utf8'), 'file',
    'existing entry must never be clobbered')
})
```

- [ ] **Step 2: Run** `node --test tests/scenario-gaps.test.mjs` — both green expected (regression pins). If either fails, fix the adapter (minimal diff) and note it.
- [ ] **Step 3: Full suite** — `node --test "tests/**/*.test.mjs"` (121 + 2 = 123)
- [ ] **Step 4: Commit** — `test: scenario-matrix gaps #4 locked config and #12 denied junction`

## Task 2: `scripts/lib/releasenotes.mjs` — batch → release-notes files

**Files:**
- Create: `scripts/lib/releasenotes.mjs`, `tests/releasenotes.test.mjs`

**Interfaces:**
- Consumes: `readState(repoRoot)` (`scripts/lib/state.mjs`) — batch `{id, pre, post, at, tag, plugins: {name: {pre_version, pre_upstream_sha}}}`; `loadManifest(repoRoot)` → `{plugins: [{name, url, ...}]}`.
- Produces (used by Task 5): `generateReleaseNotes({repoRoot, batch})` → `{files: [{file, content}], skipped: [names]}` — `file` is repo-relative `release-notes/<name>-<at-with-colons-dashed>.md`; `writeReleaseNotes({repoRoot, batch})` → `{written: [relative paths], skipped: [names]}`. `skipped` = names absent from manifest/state, or with no upstream-SHA delta (nothing to report).

Design decisions:
- Post per-plugin values come from `state.json` `plugins.<name>` (batch record carries only pre fields).
- Filename ts = batch `at` with `:` → `-` (matches batch-id convention, sortable, unique per batch).
- Per-plugin content: `# <name>`, upstream URL, date, `Version: <pre> → <post>`, `Upstream SHA: <pre7> → <post7>`, `Compare: <url>/compare/<preSha>...<postSha>` (only when url is `https://github.com/*` and both SHAs are 40-hex), `Vendored in repo snapshot: <snapshot7>`.
- No-delta plugin (pre_upstream_sha === post upstream_commit_sha) → skipped, no file (nothing changed).

- [ ] **Step 1: Write failing tests**

```js
// tests/releasenotes.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateReleaseNotes, writeReleaseNotes } from '../scripts/lib/releasenotes.mjs'
import { readState } from '../scripts/lib/state.mjs'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-rn-'))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss',
                url: 'https://github.com/acme/demo-skills' }],
  }))
  fs.writeFileSync(path.join(root, 'state.json'), JSON.stringify({
    plugins: { demo: { version: '2.0.0', upstream_commit_sha: 'c'.repeat(40),
                       snapshot_commit: 'd'.repeat(40), last_updated: '2026-09-03T00:00:00.000Z' } },
    batches: [{ id: 'batch/2026-09-03T00-00-00-000Z', pre: 'a'.repeat(40), post: 'b'.repeat(40),
                at: '2026-09-03T00:00:00.000Z', tag: 'batch/2026-09-03T00-00-00-000Z',
                plugins: { demo: { pre_version: '1.0.0', pre_upstream_sha: 'e'.repeat(40) } } }],
  }))
  return root
}

test('generateReleaseNotes: one file per changed plugin, delta + compare link', () => {
  const root = fixture()
  const s = readState(root)
  const { files, skipped } = generateReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.deepEqual(skipped, [])
  assert.equal(files.length, 1)
  assert.ok(files[0].file.replace(/\\/g, '/').startsWith('release-notes/demo-2026-09-03T00-00-00-000Z.md'))
  assert.match(files[0].content, /# demo/)
  assert.match(files[0].content, /Version: 1\.0\.0 → 2\.0\.0/)
  assert.match(files[0].content, /github\.com\/acme\/demo-skills\/compare\/e{40}\.\.\.c{40}/)
  assert.match(files[0].content, /snapshot: d{7}/i)
})

test('writeReleaseNotes: creates release-notes/ on demand, writes file', () => {
  const root = fixture()
  const s = readState(root)
  const res = writeReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.equal(res.written.length, 1)
  const abs = path.join(root, 'release-notes', 'demo-2026-09-03T00-00-00-000Z.md')
  assert.ok(fs.existsSync(abs))
  assert.match(fs.readFileSync(abs, 'utf8'), /# demo/)
})

test('generateReleaseNotes: skips unmanifested plugin and no-delta plugin', () => {
  const root = fixture()
  const s = readState(root)
  const b = { ...s.batches[0], plugins: {
    ghost: { pre_version: null, pre_upstream_sha: 'f'.repeat(40) },        // not in manifest
    demo: { pre_version: '2.0.0', pre_upstream_sha: 'c'.repeat(40) },      // pre == post => no delta
  } }
  const { files, skipped } = generateReleaseNotes({ repoRoot: root, batch: b })
  assert.deepEqual(files, [])
  assert.deepEqual(skipped.sort(), ['demo', 'ghost'])
})

test('non-github url omits compare link', () => {
  const root = fixture()
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss', url: 'https://gitlab.com/acme/demo' }],
  }))
  const s = readState(root)
  const { files } = generateReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.equal(files.length, 1)
  assert.ok(!/compare\//.test(files[0].content))
})
```

- [ ] **Step 2: Run to verify red** — `node --test tests/releasenotes.test.mjs` (module not found)
- [ ] **Step 3: Implement**

```js
// scripts/lib/releasenotes.mjs
import fs from 'node:fs'
import path from 'node:path'
import { readState } from './state.mjs'
import { loadManifest } from './manifest.mjs'

function tsSlug(iso) { return iso.replaceAll(':', '-') }

function noteFor(name, { batch, post, entry }) {
  const pre = batch.plugins[name]
  const preSha = pre?.pre_upstream_sha ?? null
  const postSha = post.upstream_commit_sha ?? null
  const lines = [
    `# ${name}`,
    '',
    `Upstream: ${entry.url}`,
    `Date: ${batch.at}`,
    `Version: ${pre?.pre_version ?? 'unknown'} → ${post.version ?? 'unknown'}`,
    `Upstream SHA: ${(preSha ?? '').slice(0, 7) || 'unknown'} → ${(postSha ?? '').slice(0, 7) || 'unknown'}`,
  ]
  if (/^https:\/\/github\.com\//.test(entry.url ?? '')
      && /^[0-9a-f]{40}$/.test(preSha ?? '') && /^[0-9a-f]{40}$/.test(postSha ?? '')) {
    lines.push(`Compare: ${entry.url}/compare/${preSha}...${postSha}`)
  }
  lines.push(`Vendored in repo snapshot: ${(post.snapshot_commit ?? '').slice(0, 7) || 'unknown'}`, '')
  return lines.join('\n')
}

export function generateReleaseNotes({ repoRoot, batch }) {
  const manifest = loadManifest(repoRoot)
  const state = readState(repoRoot)
  const byName = new Map(manifest.plugins.map(p => [p.name, p]))
  const files = [], skipped = []
  for (const [name, pre] of Object.entries(batch.plugins ?? {})) {
    const entry = byName.get(name)
    const post = state.plugins?.[name]
    if (!entry || !post) { skipped.push(name); continue }
    if ((pre?.pre_upstream_sha ?? null) === (post.upstream_commit_sha ?? null)) { skipped.push(name); continue }
    files.push({ file: path.join('release-notes', `${name}-${tsSlug(batch.at)}.md`).replace(/\\/g, '/'),
                 content: noteFor(name, { batch, post, entry }) })
  }
  return { files, skipped }
}

export function writeReleaseNotes({ repoRoot, batch }) {
  const { files, skipped } = generateReleaseNotes({ repoRoot, batch })
  for (const f of files) {
    const abs = path.join(repoRoot, f.file)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, f.content)
  }
  return { written: files.map(f => f.file), skipped }
}
```

- [ ] **Step 4: Green** — `node --test tests/releasenotes.test.mjs`
- [ ] **Step 5: Full suite + commit** — `feat: release-notes generation from batch records`

## Task 3: `scripts/lib/changelog.mjs` — CHANGELOG.md appender

**Files:**
- Create: `scripts/lib/changelog.mjs`, `tests/changelog.test.mjs`

**Interfaces:**
- Consumes: batch record; `updateResult {updated, skipped, failed}` (shape from `runUpdate`).
- Produces (used by Task 5): `appendChangelog({repoRoot, batch, updateResult})` → `{changed: boolean, section: string}`. Creates `CHANGELOG.md` with `# Changelog` header if absent; prepends a `## <YYYY-MM-DD> — batch <ts-slug> (<full id>)` section with updated/skipped/failed lines. Idempotent: re-append of the same batch id → `{changed: false}`, file untouched.

- [ ] **Step 1: Failing tests** — fixture repo:
  (1) absent CHANGELOG → `{changed: true}` + file has `# Changelog` header, section contains `batch/2026-09-03T00-00-00-000Z`, `updated: demo`, `failed: none`;
  (2) second call same batch → `{changed: false}`, mtime-safe assertion: file content unchanged (read before/after, equal);
  (3) pre-existing user changelog content below header is preserved verbatim after prepend;
  (4) `updateResult {failed: ['x']}` renders `failed: x`;
  (5) batch id appears once even after calling with two different batches (ordering: newest section on top).

```js
// scripts/lib/changelog.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILE = 'CHANGELOG.md'
const HEADER = '# Changelog\n\n'

export function appendChangelog({ repoRoot, batch, updateResult }) {
  const abs = path.join(repoRoot, FILE)
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : ''
  if (existing.includes(`(${batch.id})`)) return { changed: false, section: '' }
  const { updated = [], skipped = [], failed = [] } = updateResult ?? {}
  const section = [
    `## ${batch.at.slice(0, 10)} — batch ${batch.id.replace('batch/', '')} (${batch.id})`,
    '',
    `- updated: ${updated.join(', ') || 'none'}`,
    `- skipped: ${skipped.join(', ') || 'none'}`,
    `- failed: ${failed.join(', ') || 'none'}`,
    '',
  ].join('\n')
  const body = existing.startsWith('# Changelog') ? existing.slice(HEADER.length) : existing
  fs.writeFileSync(abs, HEADER + section + body)
  return { changed: true, section }
}
```

- [ ] **Step 2: Red** → **Step 3: implement (above)** → **Step 4: green + full suite** → **Step 5: commit** `feat: changelog appender per update batch`

## Task 4: `scripts/cmd/verify.mjs` + `agp verify` — CI smoke as a verb

**Files:**
- Create: `scripts/cmd/verify.mjs`, `tests/verify.test.mjs`
- Modify: `bin/agp.mjs` (COMMANDS + USAGE + dispatch), `tests/cli.test.mjs` (verify usage row)

**Interfaces:**
- Consumes: `loadManifest` (throws on invalid — surfaced as exit 1), `structureGate`, `pluginDest`, `discoverSkills`, `readLocal`/`activePlugins`.
- Produces: `runVerify({repoRoot})` → `{ok: boolean, problems: string[], skillCount: number}`. Implements spec §9 "validate manifest + all vendored structures + uniqueness on every push" — manifest validity (via load), per-plugin structure (active set only), cross-plugin skill-name uniqueness (active set), orphan folders (all manifest plugins, matching doctor). CLI exit 0/1.

```js
// scripts/cmd/verify.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { structureGate } from '../lib/gates.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { discoverSkills } from '../lib/discover.mjs'
import { readLocal, activePlugins } from '../lib/local.mjs'

const DEBRIS = (name) => name === '_quarantine' || name.startsWith('.stage-') || name.includes('.old-')

export function runVerify({ repoRoot }) {
  const manifest = loadManifest(repoRoot) // throws on invalid manifest
  const local = readLocal(repoRoot)
  const base = path.join(repoRoot, manifest.plugin_dir ?? 'universal-plugin')
  const problems = []
  const seen = new Map()
  let skillCount = 0
  for (const p of activePlugins(manifest, local)) {
    const dest = pluginDest(repoRoot, p)
    const g = structureGate(dest)
    if (!g.ok) problems.push(`structure problem in ${p.name}: ${g.reason}`)
    for (const s of discoverSkills(dest, DEBRIS)) {
      if (!s.name) continue
      skillCount++
      const owner = seen.get(s.name)
      if (owner !== undefined && owner !== p.name) {
        problems.push(`duplicate skill name '${s.name}' in ${p.name} and ${owner}`)
      } else seen.set(s.name, p.name)
    }
  }
  const wanted = new Set(manifest.plugins.map(p => path.relative(base, pluginDest(repoRoot, p))))
  if (fs.existsSync(base)) {
    for (const cat of fs.readdirSync(base, { withFileTypes: true })) {
      if (!cat.isDirectory() || cat.name === '_quarantine') continue
      const catPath = path.join(base, cat.name)
      for (const tier of fs.readdirSync(catPath, { withFileTypes: true })) {
        if (!tier.isDirectory()) continue
        const tierPath = path.join(catPath, tier.name)
        for (const leaf of fs.readdirSync(tierPath, { withFileTypes: true })) {
          if (!leaf.isDirectory()) continue
          const rel = path.relative(base, path.join(tierPath, leaf.name))
          if (!wanted.has(rel)) problems.push(`orphan folder (not in manifest): ${rel}`)
        }
      }
    }
  }
  return { ok: problems.length === 0, problems, skillCount }
}
```

`bin/agp.mjs` — add `'verify'` to `COMMANDS`, USAGE line `'       agp verify',`, and before the `index` handler:

```js
if (cmd === 'verify') {
  const { runVerify } = await import('../scripts/cmd/verify.mjs')
  try {
    const res = runVerify({ repoRoot })
    for (const p of res.problems) console.log(p)
    console.log(JSON.stringify({ ok: res.ok, skillCount: res.skillCount }))
    process.exitCode = res.ok ? 0 : 1
  } catch (e) {
    console.error(e.message)
    process.exitCode = 1
  }
  return
}
```

- [ ] **Step 1: Failing tests** — fixture (manifest + one plugin with valid SKILL.md): `{ok: true, skillCount: 1}`; two active plugins both shipping skill name `demo-skill` → `ok: false` + `duplicate skill name 'demo-skill' in b and a`; second plugin disabled via `local.json` → `ok: true` (active-set rule); orphan folder under a category dir → problem; invalid manifest (`version: 1`) → `assert.throws(() => runVerify({repoRoot}))`; CLI (spawnSync `node bin/agp.mjs verify` in fixture cwd): clean → exit 0, duplicate → exit 1. Extend `tests/cli.test.mjs` usage assertions if they enumerate COMMANDS/USAGE rows.
- [ ] **Step 2: Red** → **Step 3: implement verify.mjs + bin wiring** → **Step 4: green + full suite** → **Step 5: commit** `feat: agp verify verb for ci smoke checks`

## Task 5: Wire docs generation into `runUpdate` + extend `COMMIT_PATHS`

**Files:**
- Modify: `scripts/lib/gitsrc.mjs` (line 5 COMMIT_PATHS), `scripts/cmd/update.mjs` (lines 109–119 batch block), `tests/batch.test.mjs` (extend e2e)

**Interfaces:**
- Consumes: Task 2 `writeReleaseNotes`, Task 3 `appendChangelog`, `writeIndex` (`scripts/cmd/index.mjs`).
- Produces: `COMMIT_PATHS = ['universal-plugin', 'plugins.json', 'state.json', 'QUARANTINE.md', 'release-notes', 'CHANGELOG.md', 'INDEX.md']`; `runUpdate` batch block (non-dry-run, updated.length, wantBatch) now also generates the three docs **before** the `Record batch` commit so the extended `commitAll` stages them together. Return shape unchanged. Docs generation is warn-and-continue (try/catch each) — docs never fail an otherwise-successful update (per-plugin isolation applies to docs too). `runAdd`'s `recordBatch: false` path untouched (no batch docs on add).

Restructure the batch block (current code inlines the record; extract to a `const batch`):

```js
  if (!dryRun && updated.length && wantBatch) {
    const id = `batch/${new Date().toISOString().replaceAll(':', '-')}`
    const at = new Date().toISOString()
    const batch = { id, pre, post: headSha(repoRoot), at, tag: id, plugins: preFields }
    recordBatch(repoRoot, batch)
    const { writeReleaseNotes } = await import('../lib/releasenotes.mjs')
    const { appendChangelog } = await import('../lib/changelog.mjs')
    const { writeIndex } = await import('./index.mjs')
    try { writeReleaseNotes({ repoRoot, batch }) } catch (e) { console.warn(`  warning: release notes: ${e.message}`) }
    try { appendChangelog({ repoRoot, batch, updateResult: { updated, skipped, failed } }) } catch (e) { console.warn(`  warning: changelog: ${e.message}`) }
    try { writeIndex({ repoRoot }) } catch (e) { console.warn(`  warning: index: ${e.message}`) }
    commitAll(repoRoot, `Record batch ${id} — ${updated.join(', ')}`)
    try {
      createTag(repoRoot, id, `agp batch: ${updated.length} plugin${updated.length === 1 ? '' : 's'}`)
    } catch (e) {
      console.warn(`  warning: could not create tag ${id}: ${e.message}`)
    }
  }
```

(Field order `pre, post, at` preserved from current code; only the object extraction + three generator calls change.)

- [ ] **Step 1: Extend failing tests** — in `tests/batch.test.mjs` e2e test after `runUpdate`: assert `release-notes/demo-<batch.at dashed>.md` exists (glob the dir for `demo-*.md`), content matches `/→ /` version-delta line; `CHANGELOG.md` exists at root and contains the batch id from `state.json` batches[0]; `git show --name-only <Record batch sha>` output includes a `release-notes/` path and `CHANGELOG.md`; INDEX.md regenerated (exists, contains `# Plugin Catalog`).
- [ ] **Step 2: Red** → **Step 3: implement COMMIT_PATHS + update.mjs block** → **Step 4: green + full suite** → **Step 5: commit** `feat: update flow generates release notes, changelog, index per batch`

## Task 6: `.github/workflows/ci.yml` + workflow structural test

**Files:**
- Create: `.github/workflows/ci.yml`, `tests/workflows.test.mjs`

**Interfaces:**
- Consumes: `package.json` test script; `agp verify` (Task 4).
- Produces: per-push/PR CI (checkout → node 21 → `npm test` → `node bin/agp.mjs verify`) and a test asserting workflow files exist with required content. `tests/workflows.test.mjs` computes repo root via `fileURLToPath(new URL('../..', import.meta.url))` — works on win32 (drive-letter paths) and POSIX.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '21'
      - run: npm test
      - run: node bin/agp.mjs verify
```

```js
// tests/workflows.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const wf = (f) => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8')

test('ci.yml: tests + verify on push and PR', () => {
  const y = wf('ci.yml')
  assert.match(y, /push:/)
  assert.match(y, /pull_request:/)
  assert.match(y, /node-version: '?21'?/)
  assert.match(y, /npm test/)
  assert.match(y, /node bin\/agp\.mjs verify/)
})

test('maintain.yml: weekly cron full loop, append-only push', () => {
  const y = wf('maintain.yml')
  assert.match(y, /cron:/)
  for (const s of [
    'git config user.name',
    'git config user.email',
    'node bin/agp.mjs doctor',
    'node bin/agp.mjs update --all',
    'node bin/agp.mjs sync --all',
    'node bin/agp.mjs status',
    'git push origin HEAD --follow-tags',
  ]) assert.ok(y.includes(s), `maintain.yml missing: ${s}`)
  assert.ok(!y.includes('--force'), 'no force-push anywhere')
  assert.ok(!/uses: (?!actions\/)/.test(y), 'only first-party actions allowed')
  assert.ok(y.includes('# undo: node bin/agp.mjs rollback --batch last'),
    'rollback undo path documented in file')
})
```

- [ ] **Step 1: Write both tests** (maintain part will be red until Task 7 — acceptable: write the full test file now, or split: this task adds the ci.yml test, Task 7 adds the maintain test. **Decision: write both now; Task 6 creates ci.yml and temporarily skips the maintain test via `test('maintain.yml …', { skip: 'Task 7' }` or simply accept 1 red file until Task 7 — cleaner: add the maintain test in Task 7.**) → run, ci test red
- [ ] **Step 2: Create `.github/workflows/ci.yml`** (above) → ci test green
- [ ] **Step 3: Full suite + commit** `ci: per-push smoke workflow`

## Task 7: `.github/workflows/maintain.yml` — weekly loop

**Files:**
- Create: `.github/workflows/maintain.yml`
- Modify: `tests/workflows.test.mjs` (add maintain test — code in Task 6)

Loop per spec §7. Guardrails encoded: git identity first (commitAll needs it), doctor first (abort on structural problems), per-plugin failure isolation (update `continue-on-error` + final explicit fail step so the run is red but the batch still lands), append-only push (`git push origin HEAD --follow-tags`, never `--force`), only `actions/*` first-party actions, concurrency group prevents overlapping weekly runs, manual `workflow_dispatch` for first-run review (dry-run discipline: review before enabling cron in production).

```yaml
# .github/workflows/maintain.yml
name: Weekly maintain
on:
  schedule:
    - cron: '23 4 * * 1'   # Mondays 04:23 UTC (off the :00 mark)
  workflow_dispatch: {}    # manual trigger — use for the first reviewed run

permissions:
  contents: write

concurrency:
  group: maintain
  cancel-in-progress: false

jobs:
  maintain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history: rollback + batch walks need plugin trees
      - uses: actions/setup-node@v4
        with:
          node-version: '21'

      - name: Configure git identity (commitAll uses ambient config)
        run: |
          git config user.name "agp-bot"
          git config user.email "agp-bot@users.noreply.github.com"

      - name: Doctor (abort on structural problems before touching upstream)
        run: node bin/agp.mjs doctor

      - name: Update all plugins (changelog + release-notes generated per batch)
        id: update
        continue-on-error: true   # a failing plugin aborts only itself
        run: node bin/agp.mjs update --all

      # sync is adoption-gated: the runner adopts no tool configs, so all
      # targets report skipped — correct by design; step kept per spec §7.
      - name: Sync all targets
        run: node bin/agp.mjs sync --all

      - name: Status
        run: node bin/agp.mjs status

      # undo for any failed run: node bin/agp.mjs rollback --batch last
      # (kept manual by design — the safety net, not a loop step)

      - name: Push (append-only, never force)
        run: git push origin HEAD --follow-tags

      - name: Fail if any plugin failed
        if: steps.update.outcome == 'failure'
        run: |
          echo "::warning::Some plugins failed to update — successes were batched, tagged, and pushed; see logs. Undo with: node bin/agp.mjs rollback --batch last"
          exit 1
```

Design notes (for README + HANDOFF):
- **Runner sync no-op**: adoption gating means the runner's empty HOME has none of `~/.claude`, `~/.codex`, `~/.codeium`, `~/.aws/amazonq` etc. — every target returns `{skipped: true}`. The weekly run's job is to vendor + batch + tag + document; actual config sync happens per-machine by the humans running `agp sync --all` locally. Spec's loop keeps the step; the README documents the semantics.
- **`agp status`** does network `lsRemote` per plugin — fine on a runner; output goes to the job log.
- **`doctor --fix`**: spec names it, no fix semantics exist (fix == `sync`). The loop runs plain `doctor` (abort gate) + `sync --all`; README documents this mapping.
- **First activation**: repo currently has no remote. When pushed to GitHub, run via `workflow_dispatch` once and review the log before the Monday cron takes over.
- **Default GITHUB_TOKEN** is used for push (no PAT, no third-party bots); `permissions: contents: write` grants it.

- [ ] **Step 1: Add the maintain.yml test to `tests/workflows.test.mjs`** (Task 6 code) → red
- [ ] **Step 2: Create `.github/workflows/maintain.yml`** (above) → green
- [ ] **Step 3: Full suite + commit** `ci: weekly maintain workflow`

## Task 8: Docs — README Phase 4 section + HANDOFF

**Files:**
- Modify: `README.md`, `docs/HANDOFF.md`
- (Execution start: copy this plan to `docs/superpowers/plans/2026-09-03-phase4-automation.md`, first commit `docs: phase 4 plan`)

**README changes:**
1. Verb table — new row: `verify` | `agp verify` | CI smoke: manifest + structure + uniqueness + orphans (exit 0/1)`.
2. Roadmap — replace "Phase 4 — Automation: weekly GitHub Actions workflow…" line with "✅ complete" bullet: weekly `maintain.yml` loop (doctor → update --all → sync --all → status → push --follow-tags), per-push `ci.yml` smoke (full test suite + `agp verify`), and per-batch generated docs (release-notes, CHANGELOG, INDEX) inside every update run.
3. New "Automation" section after "Sync targets":
   - Table: `ci.yml` (push/PR → `npm test` + `agp verify`) | `maintain.yml` (weekly Mon 04:23 UTC + manual dispatch → full loop).
   - Runner note: sync is adoption-gated — runner HOME adopts nothing, so weekly runs vendor/batch/tag/document; per-machine sync stays a local `agp sync --all`.
   - Failure isolation: a failing plugin lands in `failed[]`, its batch/docs/tag still record successes, the run ends red with a warning linking `rollback --batch last`.
   - `doctor --fix` mapping: fix == `sync` (documented; no separate flag).
   - Undo: `agp rollback --batch last` after any weekly run.
4. Release-notes paragraph in "Rollback & batches": every recorded batch also writes `release-notes/<name>-<ts>.md` (version/SHA delta + GitHub compare link) and prepends a `CHANGELOG.md` section; both ride the `Record batch` commit.

**HANDOFF changes:** Phase 4 section — tasks with commit SHAs, test trajectory (121 → final), design decisions (runner adoption no-op, docs warn-and-continue, COMMIT_PATHS extension, agp-bot identity, concurrency group, workflow_dispatch-first activation), verification summary; Future Tasks — push repo to GitHub to activate workflows (first run via dispatch, review, then cron), then Phase 4 live-profile items (`sync --all --dry-run` real smoke, `agp enable --plugin ecc` live smoke) and the standing compatibility backlog (Zed/Crush/…). Commits: `docs: readme phase 4 automation section`, then `docs: phase 4 complete`.

---

## Commit sequence (TDD per task)

1. `docs: phase 4 plan` (this plan → `docs/superpowers/plans/2026-09-03-phase4-automation.md`)
2. `test: scenario-matrix gaps #4 locked config and #12 denied junction` (Task 1)
3. `feat: release-notes generation from batch records` (Task 2)
4. `feat: changelog appender per update batch` (Task 3)
5. `feat: agp verify verb for ci smoke checks` (Task 4)
6. `feat: update flow generates release notes, changelog, index per batch` (Task 5)
7. `ci: per-push smoke workflow` (Task 6)
8. `ci: weekly maintain workflow` (Task 7)
9. `docs: readme phase 4 automation section` (Task 8)
10. `docs: phase 4 complete` (Task 8)

## Verification

1. `node --test "tests/**/*.test.mjs"` green after every task (121 → ~131 final).
2. Fixture e2e (Task 5 test): temp git repo → `runAdd` → `bumpUpstream` → `runUpdate` → release-notes file + CHANGELOG.md + INDEX.md + batch tag + `Record batch` commit containing all three.
3. Real repo: `node bin/agp.mjs verify` exits 0; `node bin/agp.mjs doctor` still exits 0; `node bin/agp.mjs update --all --dry-run` and `sync --all --dry-run` report plans only.
4. `tests/workflows.test.mjs` green — both workflow files exist with required steps, no `--force`, only `actions/*` uses.
5. `git grep -n "xeon" -- . ':!docs'` clean.
6. GitHub activation is post-plan (repo has no remote today): first `workflow_dispatch` run reviewed before cron.

## Self-review

- **Spec coverage:** §7 loop — doctor ✓ (abort gate), update --all ✓, sync --all ✓ (runner-adoption documented), changelog ✓ (inside update), status ✓, commit ✓ (verb commits + final push), push ✓ (append-only, tags via `--follow-tags`), tag batch ✓ (update creates it). "A failing plugin aborts only itself; the run continues" ✓ (`continue-on-error` + fail-late step). "No force-push, ever" ✓ (test-enforced). "No third-party bots" ✓ (only `actions/checkout`, `actions/setup-node`; default GITHUB_TOKEN). §9 CI smoke ✓ (ci.yml: tests + `agp verify` = manifest + structures + uniqueness). M6 changelog + release-notes ✓. TESTING-STRATEGY §5 guardrails all encoded (doctor first, isolation, idempotent sync, append-only, batch-undo documented). Scenario gaps #4/#12 closed (Task 1).
- **Placeholder scan:** no TBD/TODO/"similar to" — every task carries full code or exact assertions; Task 1's two sketch-asides (scratch line, first-half) are explicitly resolved into the final two-test form.
- **Type consistency:** `generateReleaseNotes → {files: [{file, content}], skipped}` (Task 2 def = Task 5 consumer via `writeReleaseNotes`); `appendChangelog({repoRoot, batch, updateResult})` (Task 3 = Task 5 call); `runVerify → {ok, problems, skillCount}` (Task 4 lib = CLI handler); batch object fields verbatim from `update.mjs:112`; `updateResult {updated, skipped, failed}` verbatim from `runUpdate` return; COMMIT_PATHS strings match actual repo files (`release-notes` dir, `CHANGELOG.md`, `INDEX.md`).
- **Risk register:** (a) win32 chmod test variance → handled by platform-gated assertions; (b) `update --all` on GitHub runners needs network reachability of 12 plugin URLs — per-plugin isolation absorbs failures; (c) `syncMcp` collects before the runner's HOME check — already adoption-gated per file, no-op safe; (d) `git push` on runners uses GITHUB_TOKEN — requires `permissions: contents: write` (present); (e) maintain.yml Push step has no `if:` guard about remote — on GitHub origin always exists; local dry-run of that step is out of scope.
