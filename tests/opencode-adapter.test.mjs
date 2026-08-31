// tests/opencode-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncOpencode } from '../scripts/lib/adapters/opencode.mjs'

const START = '// agp:skills-start'
const END = '// agp:skills-end'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-oc-'))
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a'), { recursive: true })
  fs.writeFileSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a', 'README.md'), 'x')
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' }],
  }))
  return root
}

const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss' }]

function configHomeWith(root, source) {
  const home = path.join(root, 'home')
  const dir = path.join(home, '.config', 'opencode')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'opencode.jsonc'), source)
  return home
}
const CONFIG = (home) => path.join(home, '.config', 'opencode', 'opencode.jsonc')

test('no-op when opencode.jsonc missing (adoption gate)', () => {
  const root = repo()
  const home = path.join(root, 'home-empty')
  const res = syncOpencode({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, true)
  assert.equal(fs.existsSync(CONFIG(home)), false)
})

test('insert managed block with skills paths, backup written', () => {
  const root = repo()
  const home = configHomeWith(root, '{\n  "theme": "dark"\n}\n')
  const res = syncOpencode({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, false)
  assert.deepEqual(res.added, ['plug-a'])
  const src = fs.readFileSync(CONFIG(home), 'utf8')
  assert.ok(src.includes(START) && src.includes(END))
  assert.ok(src.includes('"theme": "dark"'))
  const parsed = JSON.parse(stripForParse(src))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  assert.deepEqual(parsed.skills.paths, [dest.replace(/\\/g, '/')])
  const baks = fs.readdirSync(path.dirname(CONFIG(home))).filter(f => f.startsWith('opencode.jsonc.bak-'))
  assert.equal(baks.length, 1)
})

test('update block replaces stale paths; outside content preserved', () => {
  const root = repo()
  const staleDest = path.join(root, 'universal-plugin', '_universal', 'oss', 'gone').replace(/\\/g, '/')
  const home = configHomeWith(root,
    `{\n  "theme": "dark",\n  ${START}\n  "skills": { "paths": ["${staleDest}"] }\n  ${END}\n}\n`)
  const res = syncOpencode({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  const src = fs.readFileSync(CONFIG(home), 'utf8')
  const parsed = JSON.parse(stripForParse(src))
  assert.equal(parsed.theme, 'dark')
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a').replace(/\\/g, '/')
  assert.deepEqual(parsed.skills.paths, [dest])
  assert.deepEqual(res.removed, ['gone'])
})

test('sync with empty plugin list removes the managed block entirely', () => {
  const root = repo()
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a').replace(/\\/g, '/')
  const home = configHomeWith(root,
    `{\n  "theme": "dark",\n  ${START}\n  "skills": { "paths": ["${dest}"] }\n  ${END}\n}\n`)
  const res = syncOpencode({ repoRoot: root, plugins: [], home, dryRun: false })
  const src = fs.readFileSync(CONFIG(home), 'utf8')
  assert.equal(src.includes(START), false)
  const parsed = JSON.parse(src)
  assert.equal(parsed.theme, 'dark')
  assert.deepEqual(res.removed, ['plug-a'])
})

test('dry-run reports without writing', () => {
  const root = repo()
  const home = configHomeWith(root, '{\n  "theme": "dark"\n}\n')
  const res = syncOpencode({ repoRoot: root, plugins: PLUGINS, home, dryRun: true })
  assert.deepEqual(res.added, ['plug-a'])
  const src = fs.readFileSync(CONFIG(home), 'utf8')
  assert.equal(src.includes(START), false)
})

function stripForParse(src) {
  return src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
}
