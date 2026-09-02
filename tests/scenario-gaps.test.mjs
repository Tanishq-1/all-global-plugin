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
    assert.equal(after.mcpServers['server-one'], undefined, 'agp server must not land on a throwing write')
  }
  fs.chmodSync(cfg, 0o666)
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
