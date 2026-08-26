# All-Global-Plugin Phase 1 (Core CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the All-Global-Plugin repo with a working Node CLI that can `add`, `update`, `status`, `doctor`, and `remove` vendored plugins through four validation gates with atomic swaps, and seed the catalog from the approved category map.

**Architecture:** Zero-dependency Node ≥20 ESM modules under `scripts/lib/*`, one module per responsibility, dispatched by `bin/agp.mjs`. Manifest-driven (`plugins.json` v2), portable home-relative paths, git-history-per-plugin updates. Later phases (adapters/sync, batch rollback, CI) are separate plans building on these interfaces.

**Tech Stack:** Node.js ≥20 (ESM, `node:test`, `node:child_process.spawnSync` for git), plain JSON manifests. No npm runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-26-all-global-plugin-design.md` (§3 structure, §4 manifest, §6 gates, §7 verbs)

## Global Constraints

- No username or absolute user path ever committed; all target paths are `~/`-relative or env-resolved (spec §4).
- Node engines `>=20.0.0`; zero runtime npm dependencies (spec header/Tech Stack).
- Plugin folders lowercase-kebab under `universal-plugin/<category>/<tier>/<name>` (spec §3).
- Every mutating command supports `--dry-run` (spec §5); every config mutation writes `.bak-<ts>` first (spec §8).
- One git commit per plugin update: `Update <name> → <version> (<shortSHA>)` (spec §7).
- Failed validation leaves previous folder intact (spec §8).
- Tests: `node --test tests/` must pass on every commit; integration tests use temp HOME fixtures, never the real profile (spec §9).

---

### Task 1: Repo scaffold + manifest loader/validator

**Files:**
- Create: `package.json`, `.gitignore`, `universal-plugin/_quarantine/.gitkeep`
- Create: `plugins.json` (initial, empty plugins array, portable targets block)
- Create: `scripts/lib/manifest.mjs`
- Test: `tests/manifest.test.mjs`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `loadManifest(repoRoot) → manifestObject` (throws on invalid), `validateManifest(manifestObj) → string[]` (empty array = valid). Shape locked by spec §4: `{version:2, plugin_dir:"universal-plugin", targets:{claude:{settings_path},opencode:{config_path},bridge:{path},cursor:{path},qwen:{path},mcp:{codex,cursor,gemini,qwen}}, plugins:[{name,category,tier,url,pin,wrapper,skill_entry,plugin_keys,marketplace_key,platforms}]}`.

- [ ] **Step 1: Write the failing test**

```js
// tests/manifest.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { validateManifest, loadManifest } from '../scripts/lib/manifest.mjs'

const valid = {
  version: 2,
  plugin_dir: 'universal-plugin',
  targets: {},
  plugins: [
    { name: 'superpowers', category: '_universal', tier: 'oss',
      url: 'https://github.com/obra/superpowers', pin: null, wrapper: false,
      skill_entry: null, plugin_keys: ['superpowers@superpowers-dev'],
      marketplace_key: 'superpowers-dev', platforms: ['*'] },
  ],
}

test('validateManifest accepts a well-formed manifest', () => {
  assert.deepEqual(validateManifest(valid), [])
})

test('validateManifest rejects wrong version, bad tier, missing name, duplicate names', () => {
  const bad = structuredClone(valid)
  bad.version = 1
  bad.plugins[0].tier = 'nope'
  bad.plugins[0].name = ''
  bad.plugins.push({ ...structuredClone(valid.plugins[0]), name: 'superpowers' })
  const errs = validateManifest(bad)
  assert.ok(errs.some(e => e.includes('version must be 2')))
  assert.ok(errs.some(e => e.includes('tier')))
  assert.ok(errs.some(e => e.includes('.name missing')))
  assert.ok(errs.some(e => e.includes('duplicate plugin names')))
})

test('loadManifest throws on invalid manifest, parses valid file from disk', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-manifest-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(valid))
  assert.deepEqual(loadManifest(root).plugins.length, 1)
  fs.writeFileSync(path.join(root, 'plugins.json'), '{"version":3}')
  assert.throws(() => loadManifest(root), /invalid manifest/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/manifest.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/lib/manifest.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/manifest.mjs
import fs from 'node:fs'
import path from 'node:path'

const REQUIRED = ['name', 'category', 'tier', 'url']
const TIERS = ['official', 'oss']

export function validateManifest(m) {
  const errs = []
  if (m.version !== 2) errs.push('version must be 2')
  for (const [i, p] of (m.plugins ?? []).entries()) {
    for (const k of REQUIRED) if (!p[k]) errs.push(`plugins[${i}].${k} missing`)
    if (p.tier && !TIERS.includes(p.tier)) errs.push(`plugins[${i}].tier must be official|oss`)
  }
  const names = (m.plugins ?? []).map(p => p.name)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length) errs.push(`duplicate plugin names: ${[...new Set(dupes)].join(', ')}`)
  return errs
}

export function loadManifest(repoRoot) {
  const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugins.json'), 'utf8'))
  const errs = validateManifest(m)
  if (errs.length) throw new Error('invalid manifest:\n' + errs.join('\n'))
  return m
}
```

Create `package.json`:

```json
{
  "name": "all-global-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": { "test": "node --test tests/" }
}
```

Create `.gitignore`: `node_modules/\npaths.local.json\nuniversal-plugin/**/*.old-*\n`

Create initial `plugins.json`:

```json
{
  "version": 2,
  "plugin_dir": "universal-plugin",
  "targets": {
    "claude": { "settings_path": "~/.claude/settings.json" },
    "opencode": { "config_path": "~/.config/opencode/opencode.jsonc" },
    "bridge": { "path": "~/.agents/skills" },
    "cursor": { "path": "~/.cursor/skills" },
    "qwen": { "path": "~/.qwen/skills" },
    "mcp": {
      "codex": "~/.codex/config.toml",
      "cursor": "~/.cursor/mcp.json",
      "gemini": "~/.gemini/settings.json",
      "qwen": "~/.qwen/settings.json"
    }
  },
  "plugins": []
}
```

Create empty dir marker: `New-Item -ItemType File universal-plugin\_quarantine\.gitkeep -Force`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/manifest.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore plugins.json scripts/lib/manifest.mjs tests/manifest.test.mjs universal-plugin/
git commit -m "feat: manifest schema v2 loader with validation"
```

---

### Task 2: Portable path resolver

**Files:**
- Create: `scripts/lib/paths.mjs`
- Test: `tests/paths.test.mjs`

**Interfaces:**
- Consumes: nothing yet.
- Produces: `expandHome(str) → str`, `targetPath(targetName, manifestTargets?, localOverrides?) → absolutePath` implementing spec §4 resolution order: localOverrides → manifestTargets entry → tool env vars (`CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`) → `os.homedir()` defaults.

- [ ] **Step 1: Write the failing test**

```js
// tests/paths.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expandHome, targetPath } from '../scripts/lib/paths.mjs'

test('expandHome resolves ~/ against homedir', () => {
  assert.equal(expandHome('~/.claude/settings.json').endsWith('.claude/settings.json'), true)
  assert.equal(expandHome('/abs/x'), '/abs/x')
})

test('targetPath default bridge is ~/.agents/skills', () => {
  const got = targetPath('bridge', {})
  assert.ok(got.endsWith(path.join('.agents', 'skills')))
})

test('CLAUDE_CONFIG_DIR overrides claude settings location', () => {
  process.env.CLAUDE_CONFIG_DIR = '/custom/claude'
  assert.equal(path.resolve(targetPath('claude', {})),
               path.resolve('/custom/claude/settings.json'))
  delete process.env.CLAUDE_CONFIG_DIR
})

test('local overrides win over manifest targets', () => {
  const got = targetPath('opencode', { opencode: { config_path: '~/.other/oc.jsonc' } },
                                   { opencode: '~/.mine/oc.jsonc' })
  assert.ok(got.endsWith('oc.jsonc') && got.includes('.mine'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/paths.test.mjs`
Expected: FAIL — cannot find module `../scripts/lib/paths.mjs`

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/paths.mjs
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

export function expandHome(p) {
  if (!p) return p
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2))
  return p
}

function pick(raw) {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') return raw.settings_path ?? raw.config_path ?? raw.path
  return undefined
}

const DEFAULTS = {
  claude: () =>
    expandHome(process.env.CLAUDE_CONFIG_DIR ?? '~/.claude') + path.sep + 'settings.json',
  opencode: () =>
    path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'),
              'opencode', 'opencode.jsonc'),
  bridge: () => path.join(os.homedir(), '.agents', 'skills'),
  cursor: () => path.join(os.homedir(), '.cursor', 'skills'),
  qwen: () => path.join(os.homedir(), '.qwen', 'skills'),
}

export function targetPath(name, manifestTargets = {}, localOverrides = {}) {
  if (localOverrides[name] !== undefined) return expandHome(pick(localOverrides[name]))
  if (manifestTargets?.[name] !== undefined) return expandHome(pick(manifestTargets[name]))
  if (!DEFAULTS[name]) throw new Error(`unknown target: ${name}`)
  return DEFAULTS[name]()
}

export function loadLocalOverrides(repoRoot) {
  const f = path.join(repoRoot, 'paths.local.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
}
```

Fix the test's awkward platform assertion first if it fails on Windows separators — prefer normalizing both sides with `path.resolve()` in assertions instead of `require()` (not available in ESM). Corrected assertion:

```js
process.env.CLAUDE_CONFIG_DIR = '/custom/claude'
assert.equal(path.resolve(targetPath('claude', {})), path.resolve('/custom/claude/settings.json'))
delete process.env.CLAUDE_CONFIG_DIR
```

(add `import path from 'node:path'` to the test.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/paths.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/paths.mjs tests/paths.test.mjs
git commit -m "feat: portable target-path resolver with env + local overrides"
```

---

### Task 3: SKILL.md frontmatter parser + skill discovery

**Files:**
- Create: `scripts/lib/frontmatter.mjs`
- Create: `scripts/lib/discover.mjs`
- Test: `tests/discover.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseFrontmatter(markdownText) → {name, description, ...}|null`; `discoverSkills(rootDir) → [{dir, file, name, description}]` scanning recursively for `*/SKILL.md`, skipping `.git` and `node_modules`.

- [ ] **Step 1: Write the failing test**

```js
// tests/discover.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs'
import { discoverSkills } from '../scripts/lib/discover.mjs'

test('parseFrontmatter extracts name + folded multiline description', () => {
  const md = `---
name: my-skill
description: Does X. Use when
  the user asks for X handling.
license: MIT
---
body`
  const fm = parseFrontmatter(md)
  assert.equal(fm.name, 'my-skill')
  assert.equal(fm.description, 'Does X. Use when the user asks for X handling.')
})

test('parseFrontmatter returns null without frontmatter', () => {
  assert.equal(parseFrontmatter('just text'), null)
})

test('discoverSkills finds skills, skips .git and node_modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-disc-'))
  for (const d of ['skills/a', 'skills/b', 'node_modules/x', '.git/y']) {
    fs.mkdirSync(path.join(root, d), { recursive: true })
  }
  const sm = (name) => `---\nname: ${name}\ndescription: ${name} desc\n---\nbody`
  fs.writeFileSync(path.join(root, 'skills/a/SKILL.md'), sm('alpha'))
  fs.writeFileSync(path.join(root, 'skills/b/SKILL.md'), sm('beta'))
  fs.writeFileSync(path.join(root, 'node_modules/x/SKILL.md'), sm('junk'))
  fs.writeFileSync(path.join(root, '.git/y/SKILL.md'), sm('junk'))
  const got = discoverSkills(root)
  assert.deepEqual(got.map(s => s.name).sort(), ['alpha', 'beta'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/discover.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/frontmatter.mjs
export function parseFrontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)
  if (!m) return null
  const fm = {}
  let key = null
  for (const ln of m[1].split(/\r?\n/)) {
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(ln)
    if (top && !/^\s/.test(ln)) { key = top[1]; fm[key] = top[2].trim() }
    else if (key && /^\s+\S/.test(ln) && fm[key]) { fm[key] += ' ' + ln.trim() }
  }
  return fm
}
```

```js
// scripts/lib/discover.mjs
import fs from 'node:fs'
import path from 'node:path'
import { parseFrontmatter } from './frontmatter.mjs'

const SKIP = new Set(['.git', 'node_modules'])

export function discoverSkills(root) {
  const found = []
  if (!fs.existsSync(root)) return found
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || SKIP.has(e.name)) continue
      const full = path.join(dir, e.name)
      const sm = path.join(full, 'SKILL.md')
      if (fs.existsSync(sm)) {
        const fm = parseFrontmatter(fs.readFileSync(sm, 'utf8')) ?? {}
        found.push({ dir: full, file: sm, name: fm.name, description: fm.description })
      }
      walk(full)
    }
  }
  walk(root)
  return found
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/discover.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/frontmatter.mjs scripts/lib/discover.mjs tests/discover.test.mjs
git commit -m "feat: SKILL.md frontmatter parsing and recursive skill discovery"
```

---

### Task 4: JSONC parse + git helpers

**Files:**
- Create: `scripts/lib/jsonc.mjs`
- Create: `scripts/lib/gitsrc.mjs`
- Test: `tests/jsonc.test.mjs`, `tests/gitsrc.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `stripComments(text) → string` (handles `//`, `/*…*/`, strings with escapes), `parseJsonc(text) → object` (trailing commas unsupported — documented); `lsRemote(url) → shaOrNull`, `clone(url, pin, destDir)` (throws on failure), `headSha(dir) → shaOrNull`, `commitAll(dir, message) → void`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/jsonc.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonc, stripComments } from '../scripts/lib/jsonc.mjs'

test('parses jsonc with line comments and urls intact', () => {
  const src = `{
    // tool config
    "$schema": "https://example.com/x.json", // trailing comment
    "nested": { "deep": true }
  }`
  const o = parseJsonc(src)
  assert.equal(o.$schema, 'https://example.com/x.json')
  assert.equal(o.nested.deep, true)
})

test('block comments stripped, escaped quotes preserved', () => {
  assert.deepEqual(parseJsonc('{ /* c */ "a": "http://x // y" }'), { a: 'http://x // y' })
})
```

```js
// tests/gitsrc.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lsRemote } from '../scripts/lib/gitsrc.mjs'

test('lsLocalRepo roundtrip: init, commit, headSha reads it', async (t) => {
  const { headSha, commitAll } = await import('../scripts/lib/gitsrc.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const cp = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-git-'))
  cp.execFileSync('git', ['init', '-q'], { cwd: dir })
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x')
  commitAll(dir, 'test commit')
  assert.match(headSha(dir), /^[0-9a-f]{40}$/)
})

test('lsRemote returns null for unreachable url', () => {
  assert.equal(lsRemote('https://invalid.invalid/nope.git'), null)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/jsonc.test.mjs tests/gitsrc.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/jsonc.mjs
// Note: does not tolerate trailing commas; generated files avoid them.
export function stripComments(text) {
  let out = '', i = 0
  const n = text.length
  let inStr = false
  while (i < n) {
    const c = text[i]
    if (inStr) {
      out += c
      if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue }
      if (c === '"') inStr = false
      i++; continue
    }
    if (c === '"') { inStr = true; out += c; i++; continue }
    if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2; continue
    }
    out += c; i++
  }
  return out
}

export function parseJsonc(text) {
  return JSON.parse(stripComments(text))
}
```

```js
// scripts/lib/gitsrc.mjs
import { spawnSync } from 'node:child_process'

function run(args, opts = {}) { return spawnSync('git', args, { encoding: 'utf8', ...opts }) }

export function lsRemote(url) {
  const r = run(['ls-remote', url, 'HEAD'])
  return r.status === 0 ? (r.stdout.split('\t')[0] ?? '').trim() || null : null
}

export function clone(url, pin, dest) {
  const args = ['clone', '--depth', '1', ...(pin ? ['--branch', pin] : []), url, dest]
  const r = run(args)
  if (r.status !== 0) throw new Error(`git clone failed for ${url}: ${r.stderr}`)
}

export function headSha(dir) {
  const r = run(['-C', dir, 'rev-parse', 'HEAD'])
  return r.status === 0 ? r.stdout.trim() : null
}

export function commitAll(dir, message) {
  run(['-C', dir, 'add', '-A'])
  const r = run(['-C', dir, 'commit', '-q', '-m', message])
  if (r.status !== 0 && !/nothing to commit/.test(r.stdout + r.stderr)) {
    throw new Error(`git commit failed: ${r.stderr}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/jsonc.test.mjs tests/gitsrc.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/jsonc.mjs scripts/lib/gitsrc.mjs tests/jsonc.test.mjs tests/gitsrc.test.mjs
git commit -m "feat: jsonc stripping and git source helpers"
```

---

### Task 5: Validation gates + quarantine

**Files:**
- Create: `scripts/lib/gates.mjs`
- Create: `scripts/lib/quarantine.mjs`
- Test: `tests/gates.test.mjs`

**Interfaces:**
- Consumes: `discoverSkills` (Task 3).
- Produces:
  - `structureGate(dir) → {ok, reason?}` — marketplace.json parses OR ≥1 valid skill
  - `uniquenessGate(dir, Set existingNames) → {ok, reason?, names[]}`
  - `safetyInventory(dir) → string[]` — files under `hooks/`, `scripts/`, plus `.mcp.json`
  - `runGates({stagedDir, existingNames}) → {ok, failures[{gate,reason}], inventory, skillCount}` (reachability is enforced by callers before cloning, recorded separately)
  - `quarantine(repoRoot, name, stagedDir, failures) → void` — moves clone to `universal-plugin/_quarantine/<name>-<ts>`, appends `QUARANTINE.md` row

- [ ] **Step 1: Write the failing test**

```js
// tests/gates.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { structureGate, uniquenessGate, safetyInventory, runGates } from '../scripts/lib/gates.mjs'
import { quarantine } from '../scripts/lib/quarantine.mjs'

function makePlugin(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-gate-'))
  const skillDir = path.join(dir, 'skills', 'sample')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'),
    `---\nname: ${opts.skillName ?? 'sample'}\ndescription: sample desc\n---\nbody`)
  if (opts.marketplace) {
    fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.claude-plugin', 'marketplace.json'),
      opts.marketplace === 'broken' ? '{oops' : '{"name":"x"}')
  }
  if (opts.hooks) {
    fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'hooks', 'h.sh'), 'echo hi')
  }
  return dir
}

test('structureGate: valid skill passes; broken marketplace fails', () => {
  assert.equal(structureGate(makePlugin()).ok, true)
  const bad = structureGate(makePlugin({ marketplace: 'broken', skillName: '' }))
  assert.equal(bad.ok, false)
})

test('uniquenessGate detects collisions', () => {
  const u = uniquenessGate(makePlugin(), new Set(['sample']))
  assert.equal(u.ok, false)
  assert.match(u.reason, /duplicate skill names: sample/)
})

test('safetyInventory reports hooks and .mcp.json', () => {
  const dir = makePlugin({ hooks: true })
  fs.writeFileSync(path.join(dir, '.mcp.json'), '{}')
  const inv = safetyInventory(dir)
  assert.ok(inv.some(f => f.startsWith('hooks')))
  assert.ok(inv.includes('.mcp.json'))
})

test('runGates aggregates failures and counts skills', () => {
  const r = runGates({ stagedDir: makePlugin(), existingNames: new Set() })
  assert.equal(r.ok, true)
  assert.equal(r.skillCount, 1)
})

test('quarantine moves clone and logs QUARANTINE.md row', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-q-'))
  fs.mkdirSync(path.join(repo, 'universal-plugin', '_quarantine'), { recursive: true })
  const staged = makePlugin()
  quarantine(repo, 'badplug', staged, [{ gate: 'structure', reason: 'no valid skill' }])
  assert.equal(fs.existsSync(staged), false)
  const qdir = path.join(repo, 'universal-plugin', '_quarantine')
  const moved = fs.readdirSync(qdir).find(d => d.startsWith('badplug-'))
  assert.ok(moved)
  const log = fs.readFileSync(path.join(repo, 'QUARANTINE.md'), 'utf8')
  assert.match(log, /badplug.*structure.*no valid skill/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gates.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/gates.mjs
import fs from 'node:fs'
import path from 'node:path'
import { discoverSkills } from './discover.mjs'

export function structureGate(dir) {
  const mp = path.join(dir, '.claude-plugin', 'marketplace.json')
  if (fs.existsSync(mp)) {
    try { JSON.parse(fs.readFileSync(mp, 'utf8')); return { ok: true } }
    catch (e) { return { ok: false, reason: `marketplace.json unparseable: ${e.message}` } }
  }
  if (discoverSkills(dir).some(s => s.name && s.description)) return { ok: true }
  return { ok: false, reason: 'no marketplace.json and no valid SKILL.md' }
}

export function uniquenessGate(dir, existingNames) {
  const names = discoverSkills(dir).map(s => s.name).filter(Boolean)
  const dupes = [...new Set(names.filter(n => existingNames.has(n)))]
  return dupes.length
    ? { ok: false, reason: `duplicate skill names: ${dupes.join(', ')}` }
    : { ok: true, names }
}

export function safetyInventory(dir) {
  const hits = []
  for (const d of ['hooks', 'scripts']) {
    const p = path.join(dir, d)
    if (fs.existsSync(p)) {
      for (const f of fs.readdirSync(p, { recursive: true })) hits.push(`${d}/${f}`)
    }
  }
  if (fs.existsSync(path.join(dir, '.mcp.json'))) hits.push('.mcp.json')
  return hits
}

export function runGates({ stagedDir, existingNames }) {
  const failures = []
  const s = structureGate(stagedDir)
  if (!s.ok) failures.push({ gate: 'structure', reason: s.reason })
  const u = uniquenessGate(stagedDir, existingNames)
  if (!u.ok) failures.push({ gate: 'uniqueness', reason: u.reason })
  return { ok: failures.length === 0, failures, inventory: safetyInventory(stagedDir),
           skillCount: u.names?.length ?? 0 }
}
```

```js
// scripts/lib/quarantine.mjs
import fs from 'node:fs'
import path from 'node:path'

export function quarantine(repoRoot, name, stagedDir, failures) {
  const qroot = path.join(repoRoot, 'universal-plugin', '_quarantine')
  fs.mkdirSync(qroot, { recursive: true })
  const dest = path.join(qroot, `${name}-${Date.now()}`)
  try { fs.renameSync(stagedDir, dest) } catch { fs.cpSync(stagedDir, dest, { recursive: true }); fs.rmSync(stagedDir, { recursive: true, force: true }) }
  const row = `| ${new Date().toISOString()} | ${name} | ${failures.map(f => `${f.gate}: ${f.reason}`).join('; ')} |\n`
  const log = path.join(repoRoot, 'QUARANTINE.md')
  if (!fs.existsSync(log)) fs.writeFileSync(log, '# Quarantine Log\n\n| time | plugin | failures |\n|---|---|---|\n')
  fs.appendFileSync(log, row)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gates.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/gates.mjs scripts/lib/quarantine.mjs tests/gates.test.mjs QUARANTINE.md
git commit -m "feat: validation gates and quarantine flow"
```

(If `QUARANTINE.md` was not created because no test ran quarantine at repo root, commit only the two lib/test files.)

---

### Task 6: Atomic swap engine

**Files:**
- Create: `scripts/lib/atomic.mjs`
- Test: `tests/atomic.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `stageDir(destParent) → tempDirPath` (same volume, mkdtemp), `stripGit(dir)`, `swapIn(staged, dest, validateFn)` — renames old aside, moves new in, runs `validateFn(dest)`, deletes retired on success; reverses completely on move or validation failure.

- [ ] **Step 1: Write the failing test**

```js
// tests/atomic.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { stageDir, stripGit, swapIn } from '../scripts/lib/atomic.mjs'

test('swapIn replaces destination and removes retired copy', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  const dest = path.join(parent, 'plug')
  fs.mkdirSync(dest); fs.writeFileSync(path.join(dest, 'old.txt'), 'old')
  const staged = stageDir(parent)
  fs.writeFileSync(path.join(staged, 'new.txt'), 'new')
  swapIn(staged, dest, () => {})
  assert.equal(fs.readFileSync(path.join(dest, 'new.txt'), 'utf8'), 'new')
  assert.equal(fs.existsSync(path.join(dest, 'old.txt')), false)
  assert.equal(fs.readdirSync(parent).filter(f => f.includes('.old-')).length, 0)
})

test('swapIn restores original when validation fails', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  const dest = path.join(parent, 'plug')
  fs.mkdirSync(dest); fs.writeFileSync(path.join(dest, 'old.txt'), 'old')
  const staged = stageDir(parent)
  assert.throws(() => swapIn(staged, dest, () => { throw new Error('bad clone') }), /bad clone/)
  assert.equal(fs.readFileSync(path.join(dest, 'old.txt'), 'utf8'), 'old')
  assert.equal(fs.existsSync(staged), false)
})

test('stripGit removes nested .git', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  fs.mkdirSync(path.join(parent, 'x', '.git'), { recursive: true })
  stripGit(path.join(parent, 'x'))
  assert.equal(fs.existsSync(path.join(parent, 'x', '.git')), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/atomic.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/atomic.mjs
import fs from 'node:fs'
import path from 'node:path'

export function stageDir(dest) {
  const parent = fs.existsSync(dest) ? path.dirname(dest) : dest
  fs.mkdirSync(parent, { recursive: true })
  return fs.mkdtempSync(path.join(parent, '.stage-'))
}

export function stripGit(dir) {
  const g = path.join(dir, '.git')
  if (fs.existsSync(g)) fs.rmSync(g, { recursive: true, force: true })
}

export function swapIn(staged, dest, validateFn) {
  const retired = `${dest}.old-${Date.now()}`
  const hadOld = fs.existsSync(dest)
  if (hadOld) fs.renameSync(dest, retired)
  try {
    fs.renameSync(staged, dest)
  } catch (moveErr) {
    if (hadOld) fs.renameSync(retired, dest)
    throw moveErr
  }
  try {
    validateFn(dest)
  } catch (valErr) {
    fs.rmSync(dest, { recursive: true, force: true })
    if (hadOld) fs.renameSync(retired, dest)
    throw valErr
  }
  if (hadOld) fs.rmSync(retired, { recursive: true, force: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/atomic.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/atomic.mjs tests/atomic.test.mjs
git commit -m "feat: atomic swap engine with failure reversal"
```

---

### Task 7: State store + plugin destination helper

**Files:**
- Create: `scripts/lib/state.mjs`
- Create: `scripts/lib/layout.mjs`
- Test: `tests/state-layout.test.mjs`

**Interfaces:**
- Consumes: manifest shape (Task 1).
- Produces: `readState(repoRoot) → {plugins:{}}`, `writeState(repoRoot, state)`, `recordUpdate(repoRoot, name, fields)` merging into `state.plugins[name]`; `pluginDest(repoRoot, entry) → absPath` computing `universal-plugin/<category>/<tier>/<name>`; `collectExistingSkillNames(repoRoot) → Set` across all installed plugins.

- [ ] **Step 1: Write the failing test**

```js
// tests/state-layout.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readState, writeState, recordUpdate } from '../scripts/lib/state.mjs'
import { pluginDest, collectExistingSkillNames } from '../scripts/lib/layout.mjs'

test('state roundtrip and recordUpdate merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-state-'))
  assert.deepEqual(readState(root), { plugins: {} })
  recordUpdate(root, 'x', { version: '1.0', upstream_commit_sha: 'abc' })
  recordUpdate(root, 'x', { last_updated: 'now' })
  assert.deepEqual(readState(root).plugins.x,
    { version: '1.0', upstream_commit_sha: 'abc', last_updated: 'now' })
})

test('pluginDest follows category/tier/name layout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-layout-'))
  const dest = pluginDest(root, { category: 'mobile', tier: 'oss', name: 'expo-skills' })
  assert.ok(dest.includes(path.join('universal-plugin', 'mobile', 'oss', 'expo-skills')))
})

test('collectExistingSkillNames scans installed plugin folders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-names-'))
  const sd = path.join(root, 'universal-plugin', '_universal', 'oss', 'sp', 'skills', 'brainstorming')
  fs.mkdirSync(sd, { recursive: true })
  fs.writeFileSync(path.join(sd, 'SKILL.md'), '---\nname: brainstorming\ndescription: d\n---\n')
  assert.deepEqual([...collectExistingSkillNames(root)], ['brainstorming'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/state-layout.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/state.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILE = 'state.json'

export function readState(repoRoot) {
  const f = path.join(repoRoot, FILE)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { plugins: {} }
}

export function writeState(repoRoot, state) {
  fs.writeFileSync(path.join(repoRoot, FILE), JSON.stringify(state, null, 2) + '\n')
}

export function recordUpdate(repoRoot, name, fields) {
  const s = readState(repoRoot)
  s.plugins[name] = { ...(s.plugins[name] ?? {}), ...fields }
  writeState(repoRoot, s)
}
```

```js
// scripts/lib/layout.mjs
import path from 'node:path'
import { discoverSkills } from './discover.mjs'
import { loadManifest } from './manifest.mjs'

export function pluginDest(repoRoot, entry) {
  const m = loadManifest(repoRoot)
  return path.join(repoRoot, m.plugin_dir ?? 'universal-plugin',
                   entry.category, entry.tier, entry.name)
}

export function collectExistingSkillNames(repoRoot) {
  const m = loadManifest(repoRoot)
  const base = path.join(repoRoot, m.plugin_dir ?? 'universal-plugin')
  const names = new Set()
  for (const p of m.plugins) {
    for (const s of discoverSkills(pluginDest(repoRoot, p))) {
      if (s.name) names.add(s.name)
    }
  }
  return names
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/state-layout.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/state.mjs scripts/lib/layout.mjs tests/state-layout.test.mjs
git commit -m "feat: state store and category/tier layout helpers"
```

---

### Task 8: `update` verb (clone → gates → swap → commit)

**Files:**
- Create: `scripts/cmd/update.mjs`
- Modify: `bin/agp.mjs` (create with dispatcher)
- Test: `tests/update.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–7 exports.
- Produces: `runUpdate({repoRoot, name|null, category|null, dryRun}) → Promise<{updated:string[], skipped:string[], failed:string[]}>`; CLI: `node bin/agp.mjs update --all|--plugin N|--category C [--dry-run]`.

- [ ] **Step 1: Write the failing test**

Uses a local fixture git repo as upstream (offline-safe):

```js
// tests/update.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

async function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-up-'))
  // upstream fixture repo containing one valid skill
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'demo')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: demo\ndescription: demo desc\n---\nb')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t',
                       'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss',
                url: up.replace(/\\/g, '/'), pin: null, wrapper: false, skill_entry: null,
                plugin_keys: [], marketplace_key: 'demo', platforms: ['*'] }],
  }))
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss'), { recursive: true })
  process.chdir(root)
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  return { root, runUpdate }
}

test('runUpdate installs plugin, records state, commits once', async () => {
  const { root, runUpdate } = await setup()
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: false })
  assert.deepEqual(res.failed, [])
  assert.deepEqual(res.updated, ['demo'])
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')
  assert.equal(fs.existsSync(path.join(dest, 'skills', 'demo', 'SKILL.md')), true)
  assert.equal(fs.existsSync(path.join(dest, '.git')), false)
  const st = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))
  assert.match(st.plugins.demo.upstream_commit_sha, /^[0-9a-f]{40}$/)
})

test('runUpdate quarantines structurally broken upstream and leaves dest untouched', async () => {
  const { root, runUpdate } = await setup()
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, 'sentinel.txt'), 'keep me')
  // break upstream: replace skill with junk (no valid frontmatter, no marketplace)
  const sk = path.join(root, 'upstream', 'skills', 'demo')
  fs.writeFileSync(path.join(sk, 'SKILL.md'), 'no frontmatter here')
  execFileSync('git', ['-C', path.join(root, 'upstream'), 'add', '-A'])
  execFileSync('git', ['-C', path.join(root, 'upstream'), '-c', 'user.email=t@t',
                       '-c', 'user.name=t', 'commit', '-qm', 'break'])
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: false })
  assert.deepEqual(res.failed, ['demo'])
  assert.equal(fs.readFileSync(path.join(dest, 'sentinel.txt'), 'utf8'), 'keep me')
})

test('dry-run mutates nothing', async () => {
  const { root, runUpdate } = await setup()
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: true })
  assert.deepEqual(res.skipped, ['demo'])
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/update.test.mjs`
Expected: FAIL — cannot find module `../scripts/cmd/update.mjs`

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/cmd/update.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { lsRemote, clone, headSha, commitAll } from '../lib/gitsrc.mjs'
import { runGates } from '../lib/gates.mjs'
import { quarantine } from '../lib/quarantine.mjs'
import { stageDir, stripGit, swapIn } from '../lib/atomic.mjs'
import { pluginDest, collectExistingSkillNames } from '../lib/layout.mjs'
import { recordUpdate } from '../lib/state.mjs'

function selectPlugins(manifest, { name, category }) {
  if (name) return manifest.plugins.filter(p => p.name === name)
  if (category) return manifest.plugins.filter(p => p.category === category)
  return manifest.plugins
}

function readVersion(dir) {
  for (const f of ['.claude-plugin/plugin.json', 'plugin.json', 'package.json']) {
    const p = path.join(dir, f)
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')).version ?? null } catch { /* ignore */ }
    }
  }
  return null
}

function reValidate(dest) {
  // structure-only: uniqueness against the full installed set is enforced pre-swap
  const g = runGates({ stagedDir: dest, existingNames: new Set() })
  if (g.failures.some(f => f.gate === 'structure')) throw new Error('post-swap validation failed')
}

export async function runUpdate({ repoRoot, name = null, category = null, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  const updated = [], skipped = [], failed = []
  for (const entry of selectPlugins(manifest, { name, category })) {
    const dest = pluginDest(repoRoot, entry)
    console.log(`update: ${entry.name}${dryRun ? ' (dry-run)' : ''}`)
    if (dryRun) { skipped.push(entry.name); continue }
    const reach = lsRemote(entry.url)
    if (!reach) {
      failed.push(entry.name)
      console.error(`  unreachable upstream: ${entry.url}`)
      continue
    }
    const staged = stageDir(dest)
    try {
      clone(entry.url, entry.pin, staged)
    } catch (e) {
      fs.rmSync(staged, { recursive: true, force: true }); failed.push(entry.name)
      console.error(`  ${e.message}`); continue
    }
    const gates = runGates({ stagedDir: staged,
                             existingNames: collectExistingSkillNames(repoRoot) })
    if (!gates.ok) {
      quarantine(repoRoot, entry.name, staged, gates.failures); failed.push(entry.name)
      console.error(`  gates failed: ${gates.failures.map(f => f.gate).join(', ')}`); continue
    }
    if (gates.inventory.length) {
      console.warn(`  executable content present (review before enabling hooks): ${gates.inventory.join(', ')}`)
    }
    stripGit(staged)
    try {
      swapIn(staged, dest, reValidate)
    } catch (e) {
      failed.push(entry.name); console.error(`  swap failed: ${e.message}`); continue
    }
    recordUpdate(repoRoot, entry.name, {
      version: readVersion(dest),
      upstream_commit_sha: reach,
      snapshot_commit: reach,
      last_updated: new Date().toISOString(),
    })
    commitAll(repoRoot, `Update ${entry.name} → ${readVersion(dest) ?? 'n/a'} (${String(reach).slice(0, 7)})`)
    updated.push(entry.name)
  }
  return { updated, skipped, failed }
}
```

Create dispatcher:

```js
// bin/agp.mjs
#!/usr/bin/env node
import path from 'node:path'
import { runUpdate } from '../scripts/cmd/update.mjs'

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all' || a === '--dry-run') args[a.slice(2)] = true
    else if (a === '--plugin' || a === '--category') args[a.slice(2)] = argv[++i]
    else args._.push(a)
  }
  return args
}

async function main() {
  const repoRoot = process.cwd()
  const [cmd, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  if (cmd === 'update') {
    const res = await runUpdate({ repoRoot, name: args.plugin ?? null,
                                  category: args.category ?? null, dryRun: !!args['dry-run'] })
    console.log(JSON.stringify(res, null, 2))
    process.exitCode = res.failed.length ? 1 : 0
    return
  }
  console.error(`unknown command: ${cmd ?? '(none)'}`)
  process.exitCode = 2
}

main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/update.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/cmd/update.mjs bin/agp.mjs tests/update.test.mjs
git commit -m "feat: update verb with gated atomic installs"
```

---

### Task 9: `add`, `remove`, `status`, `doctor` verbs

**Files:**
- Create: `scripts/cmd/manage.mjs` (add/remove), `scripts/cmd/inspect.mjs` (status/doctor)
- Modify: `bin/agp.mjs` (dispatch new verbs)
- Test: `tests/verbs.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–8.
- Produces:
  - `runAdd({repoRoot, name, url, category, tier, marketplaceKey, dryRun}) → {ok, error?}` — appends manifest entry, runs `runUpdate({name})`, rolls back manifest entry on failure
  - `runRemove({repoRoot, name, dryRun})` — flips `platforms: []` + sets `removed: true` marker entry removal: actually removes entry from manifest; folder retained (spec §7)
  - `runStatus({repoRoot}) → rows[]` printing name/category/tier/version/behind-by
  - `runDoctor({repoRoot}) → {problems[]}` — structure-checks every installed folder; verifies manifest↔folders consistency (folder missing, orphan folder)

- [ ] **Step 1: Write the failing test**

```js
// tests/verbs.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verbs-'))
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'one')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: one\ndescription: one\n---\n')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(
    { version: 2, plugin_dir: 'universal-plugin', targets: {}, plugins: [] }))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  process.chdir(root)
  return root
}

test('add installs through update and persists manifest entry', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                             category: '_universal', tier: 'oss', dryRun: false })
  assert.equal(res.ok, true, res.error)
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 1)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'one')), true)
})

test('add rolls manifest back when install fails', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot: root, name: 'two', url: 'https://invalid.invalid/x.git',
                             category: '_universal', tier: 'oss', dryRun: false })
  assert.equal(res.ok, false)
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 0)
})

test('remove drops manifest entry but keeps folder', async () => {
  const root = fixtureRepo()
  const { runAdd, runRemove } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  runRemove({ repoRoot: root, name: 'one', dryRun: false })
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'one')), true)
})

test('doctor flags orphan folders; status lists installed', async () => {
  const root = fixtureRepo()
  fs.mkdirSync(path.join(root, 'universal-plugin', 'frontend', 'official', 'ghost'), { recursive: true })
  const { runDoctor, runStatus } = await import('../scripts/cmd/inspect.mjs')
  const d = runDoctor({ repoRoot: root })
  assert.ok(d.problems.some(p => p.includes('ghost')))
  const rows = runStatus({ repoRoot: root })
  assert.ok(Array.isArray(rows))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/verbs.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/cmd/manage.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { runUpdate } from './update.mjs'

export function saveManifest(repoRoot, m) {
  fs.writeFileSync(path.join(repoRoot, 'plugins.json'), JSON.stringify(m, null, 2) + '\n')
}

export async function runAdd({ repoRoot, name, url, category, tier,
                               marketplaceKey = null, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  if (manifest.plugins.some(p => p.name === name)) {
    return { ok: false, error: `plugin already present: ${name}` }
  }
  const entry = { name, category, tier, url, pin: null, wrapper: false, skill_entry: null,
                  plugin_keys: [], marketplace_key: marketplaceKey, platforms: ['*'] }
  if (!dryRun) {
    manifest.plugins.push(entry)
    saveManifest(repoRoot, manifest)
  }
  const res = await runUpdate({ repoRoot, name, category: null, dryRun })
  if (res.failed.length) {
    if (!dryRun) {
      const m2 = loadManifest(repoRoot)
      m2.plugins = m2.plugins.filter(p => p.name !== name)
      saveManifest(repoRoot, m2)
    }
    return { ok: false, error: `install failed for ${name}; manifest rolled back` }
  }
  return { ok: true }
}

export function runRemove({ repoRoot, name, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  if (!manifest.plugins.some(p => p.name === name)) {
    throw new Error(`plugin not in manifest: ${name}`)
  }
  if (!dryRun) {
    manifest.plugins = manifest.plugins.filter(p => p.name !== name)
    saveManifest(repoRoot, manifest)
    const st = JSON.parse(fs.readFileSync(path.join(repoRoot, 'state.json'), 'utf8'))
    delete st.plugins?.[name]
    fs.writeFileSync(path.join(repoRoot, 'state.json'), JSON.stringify(st, null, 2) + '\n')
  }
  return { removed: name, folderRetained: true }
}
```

```js
// scripts/cmd/inspect.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { structureGate } from '../lib/gates.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { lsRemote } from '../lib/gitsrc.mjs'
import { readState } from '../lib/state.mjs'

export function runDoctor({ repoRoot }) {
  const manifest = loadManifest(repoRoot)
  const base = path.join(repoRoot, manifest.plugin_dir ?? 'universal-plugin')
  const problems = []
  for (const p of manifest.plugins) {
    const dest = pluginDest(repoRoot, p)
    if (!fs.existsSync(dest)) { problems.push(`missing folder for ${p.name}: ${dest}`); continue }
    const g = structureGate(dest)
    if (!g.ok) problems.push(`structure problem in ${p.name}: ${g.reason}`)
  }
  // orphan folders: exist on disk but not in manifest
  const wanted = new Set(manifest.plugins.map(p => path.relative(base, pluginDest(repoRoot, p))))
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const tierDir of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      if (!tierDir.isDirectory() || tierDir.name === '_quarantine') continue
      const tierPath = path.join(dir, tierDir.name)
      for (const cat of fs.readdirSync(tierPath, { withFileTypes: true })) {
        if (!cat.isDirectory()) continue
        const rel = path.relative(base, path.join(tierPath, cat.name))
        if (!wanted.has(rel)) problems.push(`orphan folder (not in manifest): ${rel}`)
      }
    }
  }
  walk(base)
  return { problems }
}

export function runStatus({ repoRoot }) {
  const manifest = loadManifest(repoRoot)
  const state = readState(repoRoot)
  return manifest.plugins.map(p => {
    const remote = lsRemote(p.url)
    const known = state.plugins[p.name]?.upstream_commit_sha ?? null
    return { name: p.name, category: p.category, tier: p.tier,
             version: state.plugins[p.name]?.version ?? null,
             behindBy: remote && known && remote !== known ? 1 : 0,
             url: p.url }
  })
}
```

Wire dispatch in `bin/agp.mjs` — inside `main()` extend the switch:

```js
  const { runAdd, runRemove } = await import('../scripts/cmd/manage.mjs')
  const { runDoctor, runStatus } = await import('../scripts/cmd/inspect.mjs')
  if (cmd === 'add') {
    const res = await runAdd({ repoRoot, name: args.plugin, url: args.url,
                               category: args.category, tier: args.tier ?? 'oss',
                               dryRun: !!args['dry-run'] })
    console.log(JSON.stringify(res)); process.exitCode = res.ok ? 0 : 1; return
  }
  if (cmd === 'remove') { console.log(runRemove({ repoRoot, name: args.plugin, dryRun: !!args['dry-run'] })); return }
  if (cmd === 'doctor') { console.log(JSON.stringify(runDoctor({ repoRoot }), null, 2)); process.exitCode = runDoctor({ repoRoot }).problems.length ? 1 : 0; return }
  if (cmd === 'status') { console.table(runStatus({ repoRoot })); return }
```

and extend `parseArgs` to accept `--url KEY VALUE` style flags:

```js
    else if (a === '--url' || a === '--tier' || a === '--marketplace-key') args[a.slice(2)] = argv[++i]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/verbs.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/cmd/manage.mjs scripts/cmd/inspect.mjs bin/agp.mjs tests/verbs.test.mjs
git commit -m "feat: add/remove/status/doctor verbs"
```

---

### Task 10: Seed catalog import

**Files:**
- Modify: `plugins.json` (via CLI, not by hand)
- Create: `INDEX.md` (generated)
- Create: `scripts/cmd/index.mjs`
- Test: `tests/index.test.mjs`

**Interfaces:**
- Consumes: `runAdd` (Task 9).
- Produces: `generateIndex({repoRoot}) → markdown string` grouping manifest plugins by category/tier with name/url; CLI `index` verb writes `INDEX.md`.

- [ ] **Step 1: Write the failing test**

```js
// tests/index.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateIndex } from '../scripts/cmd/index.mjs'

test('generateIndex groups by category and tier', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-index-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [
      { name: 'expo-skills', category: 'mobile', tier: 'oss', url: 'https://github.com/expo/skills' },
      { name: 'feature-dev', category: 'fullstack', tier: 'official', url: 'https://x/y' },
    ],
  }))
  const md = generateIndex({ repoRoot: root })
  assert.match(md, /# Plugin Catalog/)
  assert.match(md, /## mobile/)
  assert.match(md, /\| expo-skills \| oss \| https:\/\/github\.com\/expo\/skills \|/)
  assert.match(md, /## fullstack/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/index.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/cmd/index.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'

export function generateIndex({ repoRoot }) {
  const m = loadManifest(repoRoot)
  const lines = ['# Plugin Catalog', '',
    `_Generated ${new Date().toISOString().slice(0, 10)} — do not edit by hand_`, '']
  const cats = [...new Set(m.plugins.map(p => p.category))].sort()
  for (const c of cats) {
    lines.push(`## ${c}`, '', '| name | tier | url |', '|---|---|---|')
    for (const p of m.plugins.filter(p => p.category === c)
                            .sort((a, b) => a.tier.localeCompare(b.tier))) {
      lines.push(`| ${p.name} | ${p.tier} | ${p.url} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export function writeIndex({ repoRoot }) {
  const md = generateIndex({ repoRoot })
  fs.writeFileSync(path.join(repoRoot, 'INDEX.md'), md)
  return md
}
```

Add dispatch in `bin/agp.mjs`:

```js
  if (cmd === 'index') {
    const { writeIndex } = await import('../scripts/cmd/index.mjs')
    writeIndex({ repoRoot }); return
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/index.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Seed the catalog via CLI (real network)**

Import the approved seed set one plugin at a time (each produces its own commit):

```bash
node bin/agp.mjs add superpowers   --url https://github.com/obra/superpowers                    --category _universal --tier oss
node bin/agp.mjs add karpathy-skills --url https://github.com/multica-ai/andrej-karpathy-skills --category _universal --tier oss
node bin/agp.mjs add mattpocock-skills --url https://github.com/mattpocock/skills              --category _universal --tier oss
node bin/agp.mjs add prompts-chat  --url https://github.com/f/prompts.chat                      --category _universal --tier oss --skill-entry plugins/claude/prompts.chat
node bin/agp.mjs add anthropic-doc-skills --url https://github.com/anthropics/skills            --category fullstack --tier official
node bin/agp.mjs add ui-ux-pro-max --url https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --category frontend --tier oss
node bin/agp.mjs add gsap-skills   --url https://github.com/greensock/gsap-skills               --category frontend --tier oss
node bin/agp.mjs add supabase-agent-skills --url https://github.com/supabase/agent-skills       --category backend  --tier oss
node bin/agp.mjs add expo-skills   --url https://github.com/expo/skills                         --category mobile   --tier oss
node bin/agp.mjs add flutter-agent-plugins --url https://github.com/flutter/agent-plugins       --category mobile   --tier oss
node bin/agp.mjs add azure-skills  --url https://github.com/microsoft/azure-skills              --category cloud    --tier oss
node bin/agp.mjs add sf-skills     --url https://github.com/forcedotcom/sf-skills               --category salesforce --tier oss
node bin/agp.mjs index
```

Notes:
- If a plugin fails gates, verify the failure is genuine (check `QUARANTINE.md`) before excluding it; do not weaken gates to make an import pass.
- **`skill_entry` support (required before importing prompts-chat):** plugins like prompts-chat keep their actual plugin at a nested path. Wire it TDD-style — first add this test:

```js
// tests/layout-skillentry.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('collectExistingSkillNames honors skill_entry override', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-se-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'prompts-chat', category: '_universal', tier: 'oss',
                url: 'https://x', pin: null, wrapper: false,
                skill_entry: 'plugins/claude/prompts.chat',
                plugin_keys: [], marketplace_key: null, platforms: ['*'] }],
  }))
  const nested = path.join(root, 'universal-plugin', '_universal', 'oss', 'prompts-chat',
                           'plugins', 'claude', 'prompts.chat', 'skills', 'lookup')
  fs.mkdirSync(nested, { recursive: true })
  fs.writeFileSync(path.join(nested, 'SKILL.md'), '---\nname: prompt-lookup\ndescription: d\n---\n')
  const { collectExistingSkillNames } = await import('../scripts/lib/layout.mjs')
  const names = collectExistingSkillNames(root)
  assert.deepEqual([...names], ['prompt-lookup'])
})
```

Then change two spots in `scripts/lib/layout.mjs`:

```js
export function skillRoot(repoRoot, entry) {
  const dest = pluginDest(repoRoot, entry)
  return entry.skill_entry ? path.join(dest, ...entry.skill_entry.split('/')) : dest
}

// inside collectExistingSkillNames, replace discoverSkills(pluginDest(...)) with:
for (const s of discoverSkills(skillRoot(repoRoot, p))) {
```

and in `scripts/cmd/update.mjs` replace both `runGates({ stagedDir: staged, ... })` staging-scan call sites' `stagedDir` argument for gates with the staged equivalent of `skillRoot` (`entry.skill_entry ? path.join(staged, ...entry.skill_entry.split('/')) : staged`). Keep `swapIn` validating the whole clone.

- ECC and claude-mem are deliberately absent (spec §2 policy).
- Context7/MCP-class plugins are documentation-only rows for now (added to INDEX.md manually under "Documentation-only" until Phase 2's mcp adapter ships).

- [ ] **Step 6: Verify catalog health**

Run:
```
node --test tests/
node bin/agp.mjs doctor
node bin/agp.mjs status
```
Expected: all tests PASS; doctor reports no problems; status table lists all imported plugins.

- [ ] **Step 7: Commit**

```bash
git add plugins.json state.json INDEX.md scripts/cmd/index.mjs scripts/lib/layout.mjs tests/index.test.mjs tests/layout-skillentry.test.mjs
git commit -m "feat: seed catalog imports + INDEX.md generator"
```

---

### Task 11: Full-suite green + README

**Files:**
- Create: `README.md`
- Modify: none

**Interfaces:**
- Consumes: everything.
- Produces: contributor-facing README documenting verbs, layout, gates, and Phase roadmap.

- [ ] **Step 1: Run the entire suite**

Run: `node --test tests/`
Expected: ALL PASS. Fix any regression before proceeding.

- [ ] **Step 2: Smoke-test CLI help surface**

Run: `node bin/agp.mjs` (no args)
Expected: exit code 2, usage line listing: `update add remove status doctor index`

Add usage text to dispatcher's unknown-command branch if missing:

```js
console.error(`usage: agp <update|add|remove|status|doctor|index> [--plugin N] [--category C] [--url U] [--tier T] [--dry-run]`)
```

- [ ] **Step 3: Write README**

Cover: purpose (spec link), folder layout diagram (spec §3), quickstart (`add` example from Task 10), verb reference table, validation-gate summary, quarantine explanation, roadmap (Phase 2: adapters/sync incl. mcp adapter; Phase 3: batch rollback + tags; Phase 4: weekly Actions workflow), and the portability guarantee ("cloning this repo wires to YOUR home dir; no usernames committed").

- [ ] **Step 4: Commit**

```bash
git add README.md bin/agp.mjs
git commit -m "docs: README and usage screen"
```

---

## Out of scope for this plan (later phases, per spec milestones)

- **Phase 2 (M4):** six sync adapters (bridge junctions, claude settings merge, opencode skills.paths, cursor/qwen junctions, mcp emitters) + `sync` verb + drift doctor.
- **Phase 3 (M5):** batch tags, `rollback NAME/--batch`, state batch tracking.
- **Phase 4 (M6):** `maintain.yml` weekly workflow + release-notes generator.
- **M7:** parity audit vs `claude-global-plugins`.
