// tests/codex-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncCodex } from '../scripts/lib/adapters/codex.mjs'

// Hermetic: a contributor with CODEX_HOME set would have these tests read/
// rewrite their real ~/.codex/config.toml instead of the fixture home.
delete process.env.CODEX_HOME

function repo(servers) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-codex-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, '.mcp.json'), JSON.stringify({ mcpServers: servers ?? {
    'server-one': { command: 'npx', args: ['-y', 'one'], env: { KEY: '${ONE_VAR}' } },
    'server-two': { command: 'node', env: { SECRET: 'literal-value' } },
  } }))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' }],
  }))
  return root
}

const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss' }]

const USER_TOML = 'model = "gpt-5"\n\n[projects]\ndefault = "demo"\n'

function adoptedHome(root, content = USER_TOML) {
  const home = path.join(root, 'home')
  fs.mkdirSync(path.join(home, '.codex'), { recursive: true })
  fs.writeFileSync(path.join(home, '.codex', 'config.toml'), content)
  return home
}

const cfg = (home) => path.join(home, '.codex', 'config.toml')

test('skips when config.toml absent (adoption gate)', () => {
  const root = repo()
  const home = path.join(root, 'home-empty')
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, true)
  assert.deepEqual(res.added, [])
  assert.deepEqual(res.removed, [])
})

test('inserts marker block with correct TOML, user content preserved', () => {
  const root = repo()
  const home = adoptedHome(root)
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, false)
  assert.ok(res.added.includes('server-one'))
  const after = fs.readFileSync(cfg(home), 'utf8')
  assert.ok(after.includes('model = "gpt-5"'), 'user content preserved')
  assert.ok(after.includes('[projects]'), 'user table preserved')
  assert.ok(after.includes('# agp:mcp-start'))
  assert.ok(after.includes('# agp:mcp-end'))
  assert.ok(after.includes('[mcp_servers.server-one]'))
  assert.ok(after.includes('command = "npx"'))
  assert.ok(after.includes('args = ["-y", "one"]'))
  assert.ok(after.includes('env = { KEY = "${ONE_VAR}" }'))
  assert.ok(!after.includes('server-two'), 'literal-secret server must be skipped')
})

test('idempotent: second run reports no diff and does not rewrite', () => {
  const root = repo()
  const home = adoptedHome(root)
  syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  const once = fs.readFileSync(cfg(home), 'utf8')
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.deepEqual(res.added, [])
  assert.deepEqual(res.removed, [])
  assert.equal(res.backupPath, undefined)
  assert.equal(fs.readFileSync(cfg(home), 'utf8'), once)
})

test('stale agp servers removed when block regenerated', () => {
  const root = repo()
  const existing = USER_TOML + '\n# agp:mcp-start\n\n[mcp_servers.old-srv]\ncommand = "old"\n\n# agp:mcp-end\n'
  const home = adoptedHome(root, existing)
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.deepEqual(res.removed, ['old-srv'])
  assert.ok(res.added.includes('server-one'))
  const after = fs.readFileSync(cfg(home), 'utf8')
  assert.ok(!after.includes('old-srv'))
  assert.ok(after.includes('[mcp_servers.server-one]'))
})

test('dry-run reports without writing', () => {
  const root = repo()
  const home = adoptedHome(root)
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: true })
  assert.ok(res.added.includes('server-one'))
  assert.equal(fs.readFileSync(cfg(home), 'utf8'), USER_TOML)
})

test('creates .bak-<ts> backup before mutation', () => {
  const root = repo()
  const home = adoptedHome(root)
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.ok(res.backupPath)
  assert.ok(fs.existsSync(res.backupPath))
  assert.ok(path.basename(res.backupPath).startsWith('config.toml.bak-'))
  assert.equal(fs.readFileSync(res.backupPath, 'utf8'), USER_TOML)
})

test('url-style server skipped with warning', () => {
  const root = repo({
    'http-srv': { type: 'http', url: 'https://example.com/mcp' },
    'stdio-srv': { command: 'node', args: ['s.js'] },
  })
  const home = adoptedHome(root)
  const res = syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.ok(res.warnings.some(w => w.includes('http-srv')))
  assert.ok(res.added.includes('stdio-srv'))
  const after = fs.readFileSync(cfg(home), 'utf8')
  assert.ok(!after.includes('http-srv'))
  assert.ok(after.includes('[mcp_servers.stdio-srv]'))
})

test('env values emitted as "${VAR}" strings', () => {
  const root = repo()
  const home = adoptedHome(root)
  syncCodex({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  const after = fs.readFileSync(cfg(home), 'utf8')
  assert.ok(after.includes('env = { KEY = "${ONE_VAR}" }'))
})
