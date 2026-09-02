// tests/sync.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runSync } from '../scripts/cmd/sync.mjs'

function seed() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-sync-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(path.join(dest, 'skills', 'alpha'), { recursive: true })
  fs.writeFileSync(path.join(dest, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: d\n---\n')
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [
      { name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' },
      { name: 'ecc', category: '_universal', tier: 'oss', url: 'https://x/ecc',
        enabled_by_default: false },
    ],
  }))
  return root
}

function home() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-home-'))
  const claude = path.join(h, '.claude')
  fs.mkdirSync(claude, { recursive: true })
  fs.writeFileSync(path.join(claude, 'settings.json'), '{"model":"opus"}')
  const oc = path.join(h, '.config', 'opencode')
  fs.mkdirSync(oc, { recursive: true })
  fs.writeFileSync(path.join(oc, 'opencode.jsonc'), '{\n  "theme": "dark"\n}\n')
  return h
}

function seedMcp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-mcpsync-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-mcp')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, '.mcp.json'), JSON.stringify({
    mcpServers: { 'demo-srv': { command: 'npx', args: ['-y', 'demo'] } },
  }))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-mcp', category: '_universal', tier: 'oss', url: 'https://x/m' }],
  }))
  return root
}

test('runSync --tool codex writes TOML block, other tools untouched', async () => {
  const root = seedMcp()
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-cxhome-'))
  fs.mkdirSync(path.join(h, '.codex'), { recursive: true })
  fs.writeFileSync(path.join(h, '.codex', 'config.toml'), 'model = "gpt-5"\n')
  const res = await runSync({ repoRoot: root, home: h, tool: 'codex', dryRun: false })
  assert.equal(res.codex.skipped, false)
  assert.ok(res.codex.added.includes('demo-srv'))
  assert.equal(res.claude, undefined)
  assert.equal(res.mcp, undefined)
  const toml = fs.readFileSync(path.join(h, '.codex', 'config.toml'), 'utf8')
  assert.ok(toml.includes('[mcp_servers.demo-srv]'))
  assert.ok(toml.includes('model = "gpt-5"'))
})

test('runSync --tool windsurf writes its own JSON target', async () => {
  const root = seedMcp()
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-wshome-'))
  const dir = path.join(h, '.codeium', 'windsurf')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp_config.json'), '{"mcpServers":{"user-srv":{"command":"keep"}}}')
  const res = await runSync({ repoRoot: root, home: h, tool: 'windsurf', dryRun: false })
  assert.equal(res.windsurf.skipped, false)
  assert.ok(res.windsurf.added.includes('demo-srv'))
  assert.equal(res.mcp, undefined)
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp_config.json'), 'utf8'))
  assert.ok(after.mcpServers['user-srv'])
  assert.ok(after.mcpServers['demo-srv'])
})

test('runSync --tool q writes its own JSON target', async () => {
  const root = seedMcp()
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-qhome-'))
  const dir = path.join(h, '.aws', 'amazonq')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mcp.json'), '{"mcpServers":{"user-srv":{"command":"keep"}}}')
  const res = await runSync({ repoRoot: root, home: h, tool: 'q', dryRun: false })
  assert.equal(res.q.skipped, false)
  assert.ok(res.q.added.includes('demo-srv'))
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'mcp.json'), 'utf8'))
  assert.ok(after.mcpServers['user-srv'])
  assert.ok(after.mcpServers['demo-srv'])
})

test('runSync --tool mcp keeps legacy three targets only', async () => {
  const root = seedMcp()
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-mcp3-'))
  const cursorDir = path.join(h, '.cursor')
  fs.mkdirSync(cursorDir, { recursive: true })
  fs.writeFileSync(path.join(cursorDir, 'mcp.json'), '{"mcpServers":{}}')
  const res = await runSync({ repoRoot: root, home: h, tool: 'mcp', dryRun: false })
  assert.ok(res.mcp.cursor)
  assert.equal(res.mcp.windsurf, undefined)
  assert.equal(res.mcp.q, undefined)
  assert.equal(res.codex, undefined)
})

test('runSync orchestrates adapters; ECC excluded via enabled_by_default', async () => {
  const root = seed()
  const h = home()
  const res = await runSync({ repoRoot: root, home: h, dryRun: false })
  assert.ok(res.bridge.created.includes('alpha'))
  assert.deepEqual(res.claude.added, ['plug-a'])
  assert.deepEqual(res.opencode.added, ['plug-a'])
  assert.ok(res.gemini.created.includes('alpha@legacy'))
  assert.deepEqual(res.qwen.created, ['alpha'])
  // bridge honors injected home, not the real profile
  assert.equal(fs.existsSync(path.join(h, '.agents', 'skills', 'alpha', 'SKILL.md')), true)
  // ECC never lands anywhere
  const settings = JSON.parse(fs.readFileSync(path.join(h, '.claude', 'settings.json'), 'utf8'))
  assert.equal(settings.extraKnownMarketplaces['ecc'], undefined)
})

test('runSync selector --tool claude only touches claude', async () => {
  const root = seed()
  const h = home()
  const res = await runSync({ repoRoot: root, home: h, tool: 'claude', dryRun: false })
  assert.equal(res.bridge, undefined)
  assert.equal(fs.existsSync(path.join(h, '.agents')), false)
  assert.deepEqual(res.claude.added, ['plug-a'])
})

test('dry-run mutates nothing', async () => {
  const root = seed()
  const h = home()
  await runSync({ repoRoot: root, home: h, dryRun: true })
  assert.equal(fs.existsSync(path.join(h, '.agents')), false)
  const settings = JSON.parse(fs.readFileSync(path.join(h, '.claude', 'settings.json'), 'utf8'))
  assert.equal(settings.extraKnownMarketplaces, undefined)
  const oc = fs.readFileSync(path.join(h, '.config', 'opencode', 'opencode.jsonc'), 'utf8')
  assert.equal(oc.includes('agp:skills-start'), false)
})

// Regression: the CLI invokes runSync without `home`, so every adapter must
// default to os.homedir() itself. gemini and qwen used to crash with
// ERR_INVALID_ARG_TYPE (path.join(undefined, ...)).
test('runSync without home (CLI path) defaults to os.homedir for every tool', async (t) => {
  const root = seed()
  const h = home()
  const restore = t.mock.method(os, 'homedir', () => h)
  try {
    const res = await runSync({ repoRoot: root, dryRun: false })
    assert.ok(res.bridge.created.includes('alpha'), 'bridge honors mocked homedir')
    assert.ok(res.gemini.created.includes('alpha@legacy'), 'gemini defaults home')
    assert.deepEqual(res.qwen.created, ['alpha'], 'qwen defaults home')
    assert.equal(fs.existsSync(path.join(h, '.qwen', 'skills', 'alpha')), true)
  } finally {
    restore.mock.restore()
  }
})
