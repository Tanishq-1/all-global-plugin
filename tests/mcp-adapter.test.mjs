// tests/mcp-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { collectMcpEntries, syncMcp } from '../scripts/lib/adapters/mcp.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-mcp-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, '.mcp.json'), JSON.stringify({
    mcpServers: {
      'server-one': { command: 'npx', args: ['-y', 'one'], env: { KEY: '${ONE_VAR}' } },
      'server-two': { command: 'node', env: { SECRET: 'literal-value' } },
    },
  }))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' }],
  }))
  return root
}

const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss' }]

test('collectMcpEntries reads servers, flags literal secrets', () => {
  const root = repo()
  const { servers, warnings } = collectMcpEntries(root, PLUGINS)
  assert.equal(servers['server-one'].env.KEY, '${ONE_VAR}')
  assert.ok(warnings.some(w => w.includes('server-two') && w.includes('literal')))
})

test('cursor target: merge preserves user servers, adds agp servers, removes stale', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const dir = path.join(home, '.cursor')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({
    mcpServers: {
      'user-srv': { command: 'keep' },
      'stale-srv': { command: 'old', source: 'agp' },
    },
  }))
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['cursor'], dryRun: false })
  assert.equal(res.cursor.skipped, false)
  assert.ok(res.cursor.added.includes('server-one'))
  assert.deepEqual(res.cursor.removed, ['stale-srv'])
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp.json'), 'utf8'))
  assert.ok(after.mcpServers['user-srv'])
  assert.ok(after.mcpServers['server-one'])
  assert.equal(after.mcpServers['stale-srv'], undefined)
  assert.equal(after.mcpServers['server-two'], undefined, 'literal-secret server must be skipped')
})

test('per-target no-op when target config missing (adoption gate)', () => {
  const root = repo()
  const home = path.join(root, 'home-empty')
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['cursor', 'gemini', 'qwen', 'windsurf', 'q'], dryRun: false })
  assert.equal(res.cursor.skipped, true)
  assert.equal(res.gemini.skipped, true)
  assert.equal(res.qwen.skipped, true)
  assert.equal(res.windsurf.skipped, true)
  assert.equal(res.q.skipped, true)
})

test('windsurf target: merge preserves user servers, adds agp, removes stale', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const dir = path.join(home, '.codeium', 'windsurf')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp_config.json'), JSON.stringify({
    mcpServers: {
      'user-srv': { command: 'keep' },
      'stale-srv': { command: 'old', source: 'agp' },
    },
  }))
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['windsurf'], dryRun: false })
  assert.equal(res.windsurf.skipped, false)
  assert.ok(res.windsurf.added.includes('server-one'))
  assert.deepEqual(res.windsurf.removed, ['stale-srv'])
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp_config.json'), 'utf8'))
  assert.ok(after.mcpServers['user-srv'])
  assert.ok(after.mcpServers['server-one'])
  assert.equal(after.mcpServers['stale-srv'], undefined)
  assert.equal(after.mcpServers['server-two'], undefined, 'literal-secret server must be skipped')
})

test('amazon q target: merge preserves user servers, adds agp, removes stale', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const dir = path.join(home, '.aws', 'amazonq')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({
    mcpServers: {
      'user-srv': { command: 'keep' },
      'stale-srv': { command: 'old', source: 'agp' },
    },
  }))
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['q'], dryRun: false })
  assert.equal(res.q.skipped, false)
  assert.ok(res.q.added.includes('server-one'))
  assert.deepEqual(res.q.removed, ['stale-srv'])
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp.json'), 'utf8'))
  assert.ok(after.mcpServers['user-srv'])
  assert.ok(after.mcpServers['server-one'])
  assert.equal(after.mcpServers['stale-srv'], undefined)
  assert.equal(after.mcpServers['server-two'], undefined, 'literal-secret server must be skipped')
})

test('default targets include windsurf and q', () => {
  const root = repo()
  const home = path.join(root, 'home-empty')
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  for (const t of ['cursor', 'gemini', 'qwen', 'windsurf', 'q']) {
    assert.ok(res[t], `default target '${t}' present`)
    assert.equal(res[t].skipped, true)
  }
})

test('gemini/qwen settings.json: mcpServers merged with user entries', () => {
  const root = repo()
  const home = path.join(root, 'home')
  for (const d of ['.gemini', '.qwen']) {
    fs.mkdirSync(path.join(home, d), { recursive: true })
    fs.writeFileSync(path.join(home, d, 'settings.json'), JSON.stringify({ theme: 'dark' }))
  }
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['gemini', 'qwen'], dryRun: false })
  const g = JSON.parse(fs.readFileSync(path.join(home, '.gemini', 'settings.json'), 'utf8'))
  const q = JSON.parse(fs.readFileSync(path.join(home, '.qwen', 'settings.json'), 'utf8'))
  assert.equal(g.theme, 'dark')
  assert.ok(g.mcpServers['server-one'])
  assert.ok(q.mcpServers['server-one'])
  assert.equal(g.mcpServers['server-two'], undefined)
})

test('dry-run reports without writing', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const dir = path.join(home, '.cursor')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({ mcpServers: {} }))
  const res = syncMcp({ repoRoot: root, plugins: PLUGINS, home, targets: ['cursor'], dryRun: true })
  assert.ok(res.cursor.added.includes('server-one'))
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp.json'), 'utf8'))
  assert.deepEqual(after.mcpServers, {})
})
